# Bulk User Import - Setup Instructions

## Overview
The bulk user import feature allows you to upload 300+ employees from a CSV file in one go. All imported users will have login access using email-only authentication.

## Setup Steps

### 1. Run Database Migration

You need to create the `bulk_uploads` audit table in your Supabase database:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of: `supabase/migrations/20251113131903_bulk_uploads.sql`
5. Click **Run** to execute the migration

**OR** use the SQL below:

```sql
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
```

### 2. Access the Bulk Import Page

1. Login as admin at `/admin/login`
2. Navigate to **Users** from the sidebar
3. Click the **Bulk Import** button

### 3. Prepare Your CSV File

Your CSV file should have these columns:

- **NAMA** - Full name (required)
- **EMEL** - Email address (required, must be unique)
- **JAWATAN** - Position/Job title (optional)

**Important Notes:**
- ✅ **No CSV editing needed!** Parser automatically handles:
  - Empty lines at the start
  - Column name variations (BIL. or BIL, both work)
  - Extra whitespace
- All imported users will be assigned the "employee" role
- Duplicate emails will **update** existing user records (name and position)
- Invalid rows (missing name/email, invalid email format) will be reported as errors

**Example CSV format:**
```csv
BIL.,NAMA,JAWATAN,EMEL
1,Zahid Ismail,Ketua Pengarah,zahid@mpc.gov.my
2,Mazrina Mohamed,Timbalan Ketua Pengarah,mazrina@mpc.gov.my
3,Ahmad Abdullah,Pegawai Eksekutif,ahmad@mpc.gov.my
```

**Your CSV file works as-is!** Even if it has empty lines at the top, the parser will handle it automatically.

### 4. Import Process

1. Click **Choose File** and select your CSV
2. Click **Import Users** button
3. Wait for processing (should take 10-30 seconds for 300 users)
4. Review the results:
   - ✅ **Created** - New users added
   - 🔄 **Updated** - Existing users updated
   - ❌ **Failed** - Errors (invalid data)

5. If there are errors, click **Download Error Report** to see which rows failed

### 5. Post-Import

After successful import:
- All users can now login at `/auth` using just their email (no password)
- Users will appear in the Users list
- You can assign them to training programs
- You can manually update their department and grade fields later

## Troubleshooting

### "Error Loading" on Import Page
- Make sure you ran the database migration (Step 1)
- Check your Supabase connection in `.env`

### "Email not registered" when users try to login
- This is expected! The import creates profile records only
- Users will still work with the email-only login system we configured
- The system checks the `profiles` table (not `auth.users`)

### Some users show as "Failed"
- Download the error report CSV to see specific errors
- Common issues:
  - Invalid email format
  - Missing name or email
  - Duplicate within the same CSV file

### Users can't login after import
- Verify the user's email exists in the `profiles` table
- Check that their status is `active`
- Make sure they're using the correct login page: `/auth` (not `/admin/login`)

## File Locations

- **Page**: `src/pages/admin/BulkUserImport.tsx`
- **Hook**: `src/hooks/useBulkImport.ts`
- **Parser**: `src/lib/csvParser.ts`
- **Migration**: `supabase/migrations/20251113131903_bulk_uploads.sql`
- **Route**: `/admin/users/bulk-import`

## Technical Details

### How It Works

1. CSV is parsed using papaparse library
2. Data validation:
   - Email format check
   - Required fields check (name, email)
   - Skip first 2 rows (headers)
3. Check for existing users by email
4. Bulk insert new profiles (with generated UUIDs)
5. Bulk update existing profiles
6. Insert user_roles as 'employee' for new users
7. Log import results to bulk_uploads table

### Data Flow

```
CSV File
  ↓ (papaparse)
Parsed Data
  ↓ (validation)
Valid Users + Errors
  ↓ (check existing)
Create List + Update List
  ↓ (bulk operations)
Profiles Table + User_Roles Table
  ↓ (audit log)
Bulk_Uploads Table
```

### Why No Supabase Auth?

This system uses custom email-only authentication (no passwords). Users are created in the `profiles` table with generated UUIDs, NOT in Supabase's `auth.users` table. This is intentional for internal network use where password authentication is not required.

When a user logs in, the system:
1. Checks if their email exists in `profiles` table
2. Verifies their status is 'active'
3. Creates a localStorage session
4. Grants access based on their role

This approach was chosen because:
- Internal network only (no public internet access)
- Simplified user experience (no passwords to manage)
- Faster onboarding for 300+ employees
- Still maintains role-based access control

## Support

If you encounter issues, check:
1. Browser console for errors
2. Supabase logs in dashboard
3. Network tab for API failures
4. The error report CSV if import fails
