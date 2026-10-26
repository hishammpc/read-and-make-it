import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { parseUserCSV, ParsedUser } from '@/lib/csvParser';
import { fetchAllRows } from '@/lib/fetchAllRows';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';

/** Thrown when the CSV has no importable rows; the hook shows a translated message. */
class NoValidUsersError extends Error {
  constructor() {
    super('No valid users found in CSV file');
    this.name = 'NoValidUsersError';
  }
}

export interface BulkImportResult {
  success: boolean;
  created: number;
  updated: number;
  failed: number;
  errors: Array<{
    row: number;
    email: string;
    error: string;
  }>;
}

interface BulkImportInput {
  file: File;
  uploadedBy: string;
}

async function bulkImportUsers(input: BulkImportInput): Promise<BulkImportResult> {
  const { file, uploadedBy } = input;

  // Parse CSV
  const { users, errors: parseErrors } = await parseUserCSV(file);

  const result: BulkImportResult = {
    success: false,
    created: 0,
    updated: 0,
    failed: parseErrors.length,
    errors: [...parseErrors],
  };

  if (users.length === 0) {
    throw new NoValidUsersError();
  }

  // The same email twice in one file: keep the first row, report the rest (emails are
  // unique, so inserting both would fail the whole batch)
  const firstRowByEmail = new Map<string, number>();
  const uniqueUsers = users.filter((user) => {
    const key = user.email.toLowerCase();
    const firstRow = firstRowByEmail.get(key);
    if (firstRow === undefined) {
      firstRowByEmail.set(key, user.rowNumber);
      return true;
    }
    result.errors.push({ row: user.rowNumber, email: user.email, error: `Duplicate email in this file (same as row ${firstRow})` });
    result.failed++;
    return false;
  });

  // Existing users, matched case-insensitively: stored emails can be mixed-case, and the
  // unique index is on lower(email)
  let existingProfiles: Array<{ id: string; email: string }>;
  try {
    existingProfiles = await fetchAllRows((from, to) =>
      supabase.from('profiles').select('id, email').order('id').range(from, to)
    );
  } catch (fetchError) {
    throw new Error(`Failed to check existing users: ${(fetchError as Error).message}`);
  }
  const existingEmailMap = new Map(existingProfiles.map((p) => [p.email.toLowerCase(), p.id]));

  // Separate users into create and update lists
  const usersToCreate: ParsedUser[] = [];
  const usersToUpdate: Array<ParsedUser & { id: string }> = [];

  uniqueUsers.forEach((user) => {
    const existingId = existingEmailMap.get(user.email.toLowerCase());
    if (existingId) {
      usersToUpdate.push({ ...user, id: existingId });
    } else {
      usersToCreate.push(user);
    }
  });

  // Create new profiles: one batch; if it fails, row by row so one bad row doesn't block the rest
  if (usersToCreate.length > 0) {
    const toProfile = (user: ParsedUser) => ({
      id: crypto.randomUUID(),
      name: user.name,
      email: user.email,
      position: user.position || null,
      department: null,
      grade: null,
      status: 'active',
    });

    let created: Array<{ id: string; user: ParsedUser }> = [];
    const batch = usersToCreate.map((user) => ({ user, profile: toProfile(user) }));
    const { error: batchError } = await supabase.from('profiles').insert(batch.map((b) => b.profile));

    if (!batchError) {
      created = batch.map((b) => ({ id: b.profile.id, user: b.user }));
    } else {
      for (const { user, profile } of batch) {
        const { error: rowError } = await supabase.from('profiles').insert(profile);
        if (rowError) {
          result.errors.push({ row: user.rowNumber, email: user.email, error: `Failed to create: ${rowError.message}` });
          result.failed++;
        } else {
          created.push({ id: profile.id, user });
        }
      }
    }

    if (created.length > 0) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert(created.map((c) => ({ user_id: c.id, role: 'employee' as const })));

      if (roleError) {
        // Login requires a user_roles row, so these profiles exist but can't sign in.
        created.forEach(({ user }) => {
          result.errors.push({
            row: user.rowNumber,
            email: user.email,
            error: `Profile created but role not assigned, so this user cannot log in: ${roleError.message}`,
          });
        });
        result.failed += created.length;
      } else {
        result.created = created.length;
      }
    }
  }

  // Update existing profiles
  if (usersToUpdate.length > 0) {
    for (const user of usersToUpdate) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          name: user.name,
          // A blank JAWATAN keeps the position already on record
          ...(user.position?.trim() ? { position: user.position.trim() } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        result.errors.push({
          row: user.rowNumber,
          email: user.email,
          error: `Failed to update: ${updateError.message}`,
        });
        result.failed++;
      } else {
        result.updated++;
      }
    }
  }

  // Log import to bulk_uploads table
  const totalRows = users.length + parseErrors.length;
  await supabase.from('bulk_uploads').insert({
    uploaded_by: uploadedBy,
    file_name: file.name,
    total_rows: totalRows,
    success_count: result.created + result.updated,
    failed_count: result.failed,
    errors: result.errors.length > 0 ? result.errors : null,
    status: result.failed === 0 ? 'completed' : 'completed',
  });

  result.success = true;
  return result;
}

export function useBulkImportUsers() {
  const queryClient = useQueryClient();

  const { t } = useLanguage();

  return useMutation({
    mutationFn: bulkImportUsers,
    onSuccess: (data) => {
      // Invalidate users query to refresh list
      queryClient.invalidateQueries({ queryKey: ['users'] });

      // Show success message
      const message = t.toasts.importComplete(data.created, data.updated, data.failed);

      if (data.failed > 0) {
        toast.warning(message);
      } else {
        toast.success(message);
      }
    },
    onError: (error: Error) => {
      toast.error(
        error instanceof NoValidUsersError ? t.toasts.importNoValidUsers : t.toasts.importFailed(error.message)
      );
    },
  });
}
