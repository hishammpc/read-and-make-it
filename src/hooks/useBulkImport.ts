import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { parseUserCSV, ParsedUser } from '@/lib/csvParser';
import { toast } from 'sonner';

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
    throw new Error('No valid users found in CSV file');
  }

  // Get existing users by email
  const emails = users.map((u) => u.email);
  const { data: existingProfiles, error: fetchError } = await supabase
    .from('profiles')
    .select('id, email')
    .in('email', emails);

  if (fetchError) {
    throw new Error(`Failed to check existing users: ${fetchError.message}`);
  }

  // Create map of existing emails
  const existingEmailMap = new Map(
    existingProfiles?.map((p) => [p.email, p.id]) || []
  );

  // Separate users into create and update lists
  const usersToCreate: ParsedUser[] = [];
  const usersToUpdate: Array<ParsedUser & { id: string }> = [];

  users.forEach((user) => {
    const existingId = existingEmailMap.get(user.email);
    if (existingId) {
      usersToUpdate.push({ ...user, id: existingId });
    } else {
      usersToCreate.push(user);
    }
  });

  // Create new profiles
  if (usersToCreate.length > 0) {
    const newProfiles = usersToCreate.map((user) => ({
      id: crypto.randomUUID(),
      name: user.name,
      email: user.email,
      position: user.position || null,
      department: null,
      grade: null,
      status: 'active',
    }));

    const { data: createdProfiles, error: createError } = await supabase
      .from('profiles')
      .insert(newProfiles)
      .select();

    if (createError) {
      usersToCreate.forEach((user) => {
        result.errors.push({
          row: user.rowNumber,
          email: user.email,
          error: `Failed to create: ${createError.message}`,
        });
        result.failed++;
      });
    } else if (createdProfiles) {
      result.created = createdProfiles.length;

      // Create roles for new users
      const roles = createdProfiles.map((p) => ({
        user_id: p.id,
        role: 'employee' as const,
      }));

      const { error: roleError } = await supabase.from('user_roles').insert(roles);

      if (roleError) {
        console.error('Failed to create roles:', roleError);
        // Don't fail the import if roles fail, just log it
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
          position: user.position || null,
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

  return useMutation({
    mutationFn: bulkImportUsers,
    onSuccess: (data) => {
      // Invalidate users query to refresh list
      queryClient.invalidateQueries({ queryKey: ['users'] });

      // Show success message
      const message = `Import complete: ${data.created} created, ${data.updated} updated${
        data.failed > 0 ? `, ${data.failed} failed` : ''
      }`;

      if (data.failed > 0) {
        toast.warning(message);
      } else {
        toast.success(message);
      }
    },
    onError: (error: Error) => {
      toast.error(`Import failed: ${error.message}`);
    },
  });
}
