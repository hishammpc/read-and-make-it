-- =====================================================================================
-- Baseline: the production schema as it actually is (dumped 2026-10-23).
--
-- Why: production was changed by hand in the SQL Editor over time, so the earlier
-- migrations no longer rebuilt it (e.g. programs.category is nullable in prod but NOT NULL
-- in the old files; proposed_trainings.proposal_1/2_entertained and entertained_proposal
-- existed only in prod; no migration history table existed). Those earlier files now live
-- in supabase/migrations_archive/ for reference only.
--
-- How: `supabase db dump` of production (structure only, no data), plus the three pieces
-- that dump skips because they live outside `public`, taken from production's catalog:
-- the auth.users sign-up trigger, the `certificates` storage bucket and its 5 policies.
--
-- This file is ordered before 20261023035322_unique_email_single_role.sql even though it
-- already contains those two constraints; that migration is idempotent, so replaying both
-- in order is safe.
--
-- Do NOT run this against production: production already has all of it (the CREATE
-- statements would fail). It is for rebuilding the schema elsewhere (local, staging,
-- recovery). If you later adopt `supabase db push`, first mark it as applied on production:
--   supabase migration repair --status applied 20261023035000 20261023035322
--
-- Verified 2026-10-23: replayed into an empty Supabase Postgres 17.6 (supabase/postgres
-- image, plus a stand-in for the storage tables the storage service normally creates) and
-- compared with production: 272/272 structural items identical (columns, constraints,
-- indexes, policies, function bodies, triggers, grants, RLS flags, enum, bucket).
--
-- Note: it records production faithfully, including that RLS is enabled only on
-- bulk_uploads; the policies on other tables exist but are inactive. See tasks/todo.md (A1/D4).
-- =====================================================================================




SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."app_role" AS ENUM (
    'admin',
    'employee'
);


ALTER TYPE "public"."app_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;


ALTER FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."annual_evaluation_cycles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "year" integer NOT NULL,
    "start_date" "date" NOT NULL,
    "end_date" "date" NOT NULL,
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    CONSTRAINT "annual_evaluation_cycles_status_check" CHECK (("status" = ANY (ARRAY['active'::"text", 'closed'::"text"])))
);


ALTER TABLE "public"."annual_evaluation_cycles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."annual_evaluations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cycle_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "supervisor_id" "uuid",
    "staff_answers" "jsonb",
    "supervisor_answers" "jsonb",
    "staff_submitted_at" timestamp with time zone,
    "supervisor_submitted_at" timestamp with time zone,
    "status" "text" DEFAULT 'pending_staff'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "annual_evaluations_status_check" CHECK (("status" = ANY (ARRAY['pending_staff'::"text", 'pending_supervisor'::"text", 'completed'::"text"])))
);


ALTER TABLE "public"."annual_evaluations" OWNER TO "postgres";


COMMENT ON TABLE "public"."annual_evaluations" IS 'RLS disabled for hybrid auth compatibility - security handled at application level';



CREATE TABLE IF NOT EXISTS "public"."bulk_uploads" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "uploaded_by" "uuid" NOT NULL,
    "file_name" "text" NOT NULL,
    "total_rows" integer NOT NULL,
    "success_count" integer NOT NULL,
    "failed_count" integer NOT NULL,
    "errors" "jsonb",
    "status" "text" DEFAULT 'processing'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "bulk_uploads_status_check" CHECK (("status" = ANY (ARRAY['processing'::"text", 'completed'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."bulk_uploads" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."certificates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "program_id" "uuid" NOT NULL,
    "file_url" "text" NOT NULL,
    "issued_at" timestamp with time zone DEFAULT "now"(),
    "uploaded_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."certificates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evaluation_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "program_id" "uuid",
    "title" "text" NOT NULL,
    "questions" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."evaluation_templates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."evaluations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "program_id" "uuid" NOT NULL,
    "template_id" "uuid",
    "answers" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "submitted_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."evaluations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "department" "text",
    "grade" "text",
    "position" "text",
    "status" "text" DEFAULT 'active'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "supervisor_id" "uuid"
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON TABLE "public"."profiles" IS 'RLS disabled for hybrid auth compatibility - security handled at application level';



CREATE TABLE IF NOT EXISTS "public"."program_assignments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "program_id" "uuid" NOT NULL,
    "status" "text" DEFAULT 'Assigned'::"text",
    "attendance_marked_by" "uuid",
    "attendance_marked_at" timestamp with time zone,
    "certificate_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "program_assignments_status_check" CHECK (("status" = ANY (ARRAY['Assigned'::"text", 'Registered'::"text", 'Attended'::"text", 'No-Show'::"text"])))
);


ALTER TABLE "public"."program_assignments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."programs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "category" "text",
    "start_date_time" timestamp with time zone NOT NULL,
    "end_date_time" timestamp with time zone NOT NULL,
    "location" "text",
    "organizer" "text",
    "trainer" "text",
    "hours" numeric DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'Planned'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "training_type" "text" DEFAULT 'Local'::"text",
    "notify_for_evaluation" boolean DEFAULT false,
    CONSTRAINT "programs_category_check" CHECK (("category" = ANY (ARRAY['Technical'::"text", 'Leadership'::"text", 'Soft Skill'::"text", 'Mandatory'::"text", 'Others'::"text"]))),
    CONSTRAINT "programs_status_check" CHECK (("status" = ANY (ARRAY['Planned'::"text", 'Ongoing'::"text", 'Completed'::"text", 'Cancelled'::"text"]))),
    CONSTRAINT "programs_training_type_check" CHECK (("training_type" = ANY (ARRAY['Local'::"text", 'International'::"text"])))
);


ALTER TABLE "public"."programs" OWNER TO "postgres";


COMMENT ON TABLE "public"."programs" IS 'RLS disabled for hybrid auth compatibility - security handled at application level';



CREATE TABLE IF NOT EXISTS "public"."proposed_trainings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "year" integer NOT NULL,
    "proposal_1" "text",
    "proposal_2" "text",
    "is_entertained" boolean DEFAULT false,
    "entertained_at" timestamp with time zone,
    "entertained_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "entertained_proposal" integer,
    "proposal_1_entertained" boolean DEFAULT false,
    "proposal_2_entertained" boolean DEFAULT false,
    CONSTRAINT "proposed_trainings_entertained_proposal_check" CHECK (("entertained_proposal" = ANY (ARRAY[1, 2])))
);


ALTER TABLE "public"."proposed_trainings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reminders_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "program_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "sent_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."reminders_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."system_settings" (
    "key" "text" NOT NULL,
    "value" "jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "updated_by" "uuid"
);


ALTER TABLE "public"."system_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."app_role" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


ALTER TABLE ONLY "public"."annual_evaluation_cycles"
    ADD CONSTRAINT "annual_evaluation_cycles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."annual_evaluation_cycles"
    ADD CONSTRAINT "annual_evaluation_cycles_year_key" UNIQUE ("year");



ALTER TABLE ONLY "public"."annual_evaluations"
    ADD CONSTRAINT "annual_evaluations_cycle_id_user_id_key" UNIQUE ("cycle_id", "user_id");



ALTER TABLE ONLY "public"."annual_evaluations"
    ADD CONSTRAINT "annual_evaluations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."bulk_uploads"
    ADD CONSTRAINT "bulk_uploads_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evaluation_templates"
    ADD CONSTRAINT "evaluation_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evaluations"
    ADD CONSTRAINT "evaluations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."evaluations"
    ADD CONSTRAINT "evaluations_user_id_program_id_key" UNIQUE ("user_id", "program_id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."program_assignments"
    ADD CONSTRAINT "program_assignments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."program_assignments"
    ADD CONSTRAINT "program_assignments_user_id_program_id_key" UNIQUE ("user_id", "program_id");



ALTER TABLE ONLY "public"."programs"
    ADD CONSTRAINT "programs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."proposed_trainings"
    ADD CONSTRAINT "proposed_trainings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."proposed_trainings"
    ADD CONSTRAINT "proposed_trainings_user_id_year_key" UNIQUE ("user_id", "year");



ALTER TABLE ONLY "public"."reminders_log"
    ADD CONSTRAINT "reminders_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_role_key" UNIQUE ("user_id", "role");



CREATE INDEX "idx_annual_evaluations_cycle_id" ON "public"."annual_evaluations" USING "btree" ("cycle_id");



CREATE INDEX "idx_annual_evaluations_status" ON "public"."annual_evaluations" USING "btree" ("status");



CREATE INDEX "idx_annual_evaluations_supervisor_id" ON "public"."annual_evaluations" USING "btree" ("supervisor_id");



CREATE INDEX "idx_annual_evaluations_user_id" ON "public"."annual_evaluations" USING "btree" ("user_id");



CREATE INDEX "idx_profiles_supervisor_id" ON "public"."profiles" USING "btree" ("supervisor_id");



CREATE INDEX "idx_proposed_trainings_user_year" ON "public"."proposed_trainings" USING "btree" ("user_id", "year");



CREATE INDEX "idx_proposed_trainings_year" ON "public"."proposed_trainings" USING "btree" ("year");



CREATE UNIQUE INDEX "profiles_email_lower_key" ON "public"."profiles" USING "btree" ("lower"("email"));



CREATE OR REPLACE TRIGGER "update_evaluation_templates_updated_at" BEFORE UPDATE ON "public"."evaluation_templates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_program_assignments_updated_at" BEFORE UPDATE ON "public"."program_assignments" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_programs_updated_at" BEFORE UPDATE ON "public"."programs" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."annual_evaluation_cycles"
    ADD CONSTRAINT "annual_evaluation_cycles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."annual_evaluations"
    ADD CONSTRAINT "annual_evaluations_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "public"."annual_evaluation_cycles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."annual_evaluations"
    ADD CONSTRAINT "annual_evaluations_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."annual_evaluations"
    ADD CONSTRAINT "annual_evaluations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."bulk_uploads"
    ADD CONSTRAINT "bulk_uploads_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."certificates"
    ADD CONSTRAINT "certificates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."evaluation_templates"
    ADD CONSTRAINT "evaluation_templates_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."evaluations"
    ADD CONSTRAINT "evaluations_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."evaluations"
    ADD CONSTRAINT "evaluations_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "public"."evaluation_templates"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."evaluations"
    ADD CONSTRAINT "evaluations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_supervisor_id_fkey" FOREIGN KEY ("supervisor_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."program_assignments"
    ADD CONSTRAINT "program_assignments_attendance_marked_by_fkey" FOREIGN KEY ("attendance_marked_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."program_assignments"
    ADD CONSTRAINT "program_assignments_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."program_assignments"
    ADD CONSTRAINT "program_assignments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."proposed_trainings"
    ADD CONSTRAINT "proposed_trainings_entertained_by_fkey" FOREIGN KEY ("entertained_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."proposed_trainings"
    ADD CONSTRAINT "proposed_trainings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reminders_log"
    ADD CONSTRAINT "reminders_log_program_id_fkey" FOREIGN KEY ("program_id") REFERENCES "public"."programs"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reminders_log"
    ADD CONSTRAINT "reminders_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_settings"
    ADD CONSTRAINT "system_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Admin can update all proposals" ON "public"."proposed_trainings" FOR UPDATE USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admin can view all proposals" ON "public"."proposed_trainings" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can insert bulk uploads" ON "public"."bulk_uploads" FOR INSERT WITH CHECK ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Admins can view all bulk uploads" ON "public"."bulk_uploads" FOR SELECT USING ("public"."has_role"("auth"."uid"(), 'admin'::"public"."app_role"));



CREATE POLICY "Allow public read evaluations" ON "public"."evaluations" FOR SELECT USING (true);



CREATE POLICY "Allow public read profiles" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Allow public read profiles for login" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Allow public read program_assignments" ON "public"."program_assignments" FOR SELECT USING (true);



CREATE POLICY "Allow public read programs" ON "public"."programs" FOR SELECT USING (true);



CREATE POLICY "Allow public read user_roles for login" ON "public"."user_roles" FOR SELECT USING (true);



CREATE POLICY "Anyone can view evaluations" ON "public"."annual_evaluations" FOR SELECT USING (true);



CREATE POLICY "Users can insert own proposals" ON "public"."proposed_trainings" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update own proposals" ON "public"."proposed_trainings" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view own proposals" ON "public"."proposed_trainings" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."bulk_uploads" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "anon";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_role"("_user_id" "uuid", "_role" "public"."app_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."annual_evaluation_cycles" TO "anon";
GRANT ALL ON TABLE "public"."annual_evaluation_cycles" TO "authenticated";
GRANT ALL ON TABLE "public"."annual_evaluation_cycles" TO "service_role";



GRANT ALL ON TABLE "public"."annual_evaluations" TO "anon";
GRANT ALL ON TABLE "public"."annual_evaluations" TO "authenticated";
GRANT ALL ON TABLE "public"."annual_evaluations" TO "service_role";



GRANT ALL ON TABLE "public"."bulk_uploads" TO "anon";
GRANT ALL ON TABLE "public"."bulk_uploads" TO "authenticated";
GRANT ALL ON TABLE "public"."bulk_uploads" TO "service_role";



GRANT ALL ON TABLE "public"."certificates" TO "anon";
GRANT ALL ON TABLE "public"."certificates" TO "authenticated";
GRANT ALL ON TABLE "public"."certificates" TO "service_role";



GRANT ALL ON TABLE "public"."evaluation_templates" TO "anon";
GRANT ALL ON TABLE "public"."evaluation_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."evaluation_templates" TO "service_role";



GRANT ALL ON TABLE "public"."evaluations" TO "anon";
GRANT ALL ON TABLE "public"."evaluations" TO "authenticated";
GRANT ALL ON TABLE "public"."evaluations" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."program_assignments" TO "anon";
GRANT ALL ON TABLE "public"."program_assignments" TO "authenticated";
GRANT ALL ON TABLE "public"."program_assignments" TO "service_role";



GRANT ALL ON TABLE "public"."programs" TO "anon";
GRANT ALL ON TABLE "public"."programs" TO "authenticated";
GRANT ALL ON TABLE "public"."programs" TO "service_role";



GRANT ALL ON TABLE "public"."proposed_trainings" TO "anon";
GRANT ALL ON TABLE "public"."proposed_trainings" TO "authenticated";
GRANT ALL ON TABLE "public"."proposed_trainings" TO "service_role";



GRANT ALL ON TABLE "public"."reminders_log" TO "anon";
GRANT ALL ON TABLE "public"."reminders_log" TO "authenticated";
GRANT ALL ON TABLE "public"."reminders_log" TO "service_role";



GRANT ALL ON TABLE "public"."system_settings" TO "anon";
GRANT ALL ON TABLE "public"."system_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."system_settings" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";
































-- =====================================================================================
-- Outside the public schema (not captured by `supabase db dump`)
-- =====================================================================================

-- Sign-up trigger (auth schema): every new Supabase Auth user gets a profile + employee role.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Private bucket for certificate PDFs.
INSERT INTO storage.buckets (id, name, public) VALUES ('certificates', 'certificates', false) ON CONFLICT (id) DO NOTHING;

-- Storage access rules for the certificates bucket.
DROP POLICY IF EXISTS "Admins can delete certificates" ON storage.objects;
CREATE POLICY "Admins can delete certificates" ON storage.objects AS PERMISSIVE FOR DELETE TO public
  USING (((bucket_id = 'certificates'::text) AND (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role))))));
DROP POLICY IF EXISTS "Admins can update certificates" ON storage.objects;
CREATE POLICY "Admins can update certificates" ON storage.objects AS PERMISSIVE FOR UPDATE TO public
  USING (((bucket_id = 'certificates'::text) AND (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role))))));
DROP POLICY IF EXISTS "Admins can upload certificates" ON storage.objects;
CREATE POLICY "Admins can upload certificates" ON storage.objects AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((bucket_id = 'certificates'::text) AND (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role))))));
DROP POLICY IF EXISTS "Admins can view all certificates" ON storage.objects;
CREATE POLICY "Admins can view all certificates" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING (((bucket_id = 'certificates'::text) AND (EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = 'admin'::public.app_role))))));
DROP POLICY IF EXISTS "Users can view their own certificates" ON storage.objects;
CREATE POLICY "Users can view their own certificates" ON storage.objects AS PERMISSIVE FOR SELECT TO public
  USING (((bucket_id = 'certificates'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));
