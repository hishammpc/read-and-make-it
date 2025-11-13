-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'employee');

-- Create user_roles table for role-based access control
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create profiles table for extended user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  department TEXT,
  grade TEXT,
  position TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create programs table
CREATE TABLE public.programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('Technical', 'Leadership', 'Soft Skill', 'Mandatory', 'Others')),
  start_date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_date_time TIMESTAMP WITH TIME ZONE NOT NULL,
  location TEXT,
  organizer TEXT,
  trainer TEXT,
  hours NUMERIC NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'Planned' CHECK (status IN ('Planned', 'Ongoing', 'Completed', 'Cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.programs ENABLE ROW LEVEL SECURITY;

-- Create program_assignments table
CREATE TABLE public.program_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'Assigned' CHECK (status IN ('Assigned', 'Registered', 'Attended', 'No-Show')),
  attendance_marked_by UUID REFERENCES public.profiles(id),
  attendance_marked_at TIMESTAMP WITH TIME ZONE,
  certificate_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, program_id)
);

ALTER TABLE public.program_assignments ENABLE ROW LEVEL SECURITY;

-- Create evaluation_templates table
CREATE TABLE public.evaluation_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  questions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.evaluation_templates ENABLE ROW LEVEL SECURITY;

-- Create evaluations table
CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
  template_id UUID REFERENCES public.evaluation_templates(id) ON DELETE SET NULL,
  answers JSONB NOT NULL DEFAULT '{}',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, program_id)
);

ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- Create certificates table
CREATE TABLE public.certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
  file_url TEXT NOT NULL,
  issued_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  uploaded_by UUID REFERENCES public.profiles(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

-- Create reminders_log table
CREATE TABLE public.reminders_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  program_id UUID REFERENCES public.programs(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.reminders_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for programs
CREATE POLICY "Anyone authenticated can view programs"
  ON public.programs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert programs"
  ON public.programs FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update programs"
  ON public.programs FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete programs"
  ON public.programs FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for program_assignments
CREATE POLICY "Users can view their own assignments"
  ON public.program_assignments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all assignments"
  ON public.program_assignments FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert assignments"
  ON public.program_assignments FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update assignments"
  ON public.program_assignments FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete assignments"
  ON public.program_assignments FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for evaluation_templates
CREATE POLICY "Authenticated users can view templates"
  ON public.evaluation_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage templates"
  ON public.evaluation_templates FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for evaluations
CREATE POLICY "Users can view their own evaluations"
  ON public.evaluations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all evaluations"
  ON public.evaluations FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert their own evaluations"
  ON public.evaluations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own evaluations"
  ON public.evaluations FOR UPDATE
  USING (auth.uid() = user_id);

-- RLS Policies for certificates
CREATE POLICY "Users can view their own certificates"
  ON public.certificates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all certificates"
  ON public.certificates FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage certificates"
  ON public.certificates FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for reminders_log
CREATE POLICY "Admins can view all reminders"
  ON public.reminders_log FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert reminders"
  ON public.reminders_log FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_programs_updated_at
  BEFORE UPDATE ON public.programs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_program_assignments_updated_at
  BEFORE UPDATE ON public.program_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_evaluation_templates_updated_at
  BEFORE UPDATE ON public.evaluation_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, name, email, department, grade, position)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'department', ''),
    COALESCE(NEW.raw_user_meta_data->>'grade', ''),
    COALESCE(NEW.raw_user_meta_data->>'position', '')
  );
  
  -- Assign default employee role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'employee');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for certificates
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for certificates bucket
CREATE POLICY "Users can view their own certificates"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'certificates' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Admins can view all certificates"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'certificates' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can upload certificates"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'certificates' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update certificates"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'certificates' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete certificates"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'certificates' AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );