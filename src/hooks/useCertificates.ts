import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Certificate {
  id: string;
  user_id: string;
  program_id: string;
  file_url: string;
  issued_at: string;
  uploaded_by: string;
  created_at: string;
}

export function useCertificates() {
  return useQuery({
    queryKey: ['certificates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          *,
          profiles:user_id(id, name, email),
          programs:program_id(id, title, hours),
          uploader:uploaded_by(name)
        `)
        .order('issued_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useUserCertificates(userId: string) {
  return useQuery({
    queryKey: ['certificates', 'user', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          *,
          programs:program_id(id, title, hours, category)
        `)
        .eq('user_id', userId)
        .order('issued_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useProgramCertificates(programId: string) {
  return useQuery({
    queryKey: ['certificates', 'program', programId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('certificates')
        .select(`
          *,
          profiles:user_id(id, name, email, department)
        `)
        .eq('program_id', programId)
        .order('issued_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!programId,
  });
}

export function useUploadCertificate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      file,
      userId,
      programId,
      uploadedBy,
    }: {
      file: File;
      userId: string;
      programId: string;
      uploadedBy: string;
    }) => {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${programId}/${Date.now()}.${fileExt}`;
      const filePath = `certificates/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('certificates')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('certificates')
        .getPublicUrl(filePath);

      // Create certificate record
      const { data, error } = await supabase
        .from('certificates')
        .insert({
          user_id: userId,
          program_id: programId,
          file_url: publicUrl,
          uploaded_by: uploadedBy,
          issued_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      toast({
        title: 'Success',
        description: 'Certificate uploaded successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteCertificate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      // First get the certificate to get the file URL
      const { data: certificate, error: fetchError } = await supabase
        .from('certificates')
        .select('file_url')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage
      if (certificate?.file_url) {
        const filePath = certificate.file_url.split('/').slice(-3).join('/');
        await supabase.storage.from('certificates').remove([filePath]);
      }

      // Delete certificate record
      const { error } = await supabase
        .from('certificates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['certificates'] });
      toast({
        title: 'Success',
        description: 'Certificate deleted successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
}
