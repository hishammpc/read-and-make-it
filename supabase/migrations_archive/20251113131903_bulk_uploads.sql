-- Create bulk_uploads table for tracking CSV imports
CREATE TABLE public.bulk_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID REFERENCES public.profiles(id) NOT NULL,
  file_name TEXT NOT NULL,
  total_rows INTEGER NOT NULL,
  success_count INTEGER NOT NULL,
  failed_count INTEGER NOT NULL,
  errors JSONB,
  status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.bulk_uploads ENABLE ROW LEVEL SECURITY;

-- RLS policies for bulk_uploads
CREATE POLICY "Admins can view all bulk uploads"
  ON public.bulk_uploads
  FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert bulk uploads"
  ON public.bulk_uploads
  FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
