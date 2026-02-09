# Supabase Migration Guide
## Migrating from Lovable Cloud to Your Own Supabase Instance

This guide will help you migrate your MyLearning Pro application from the Lovable Cloud-managed Supabase instance to your own Supabase project.

---

## Why Migrate?

- ✅ **Full Control**: Direct access to your database and configuration
- ✅ **Better for Production**: Your own backups, monitoring, and scaling
- ✅ **Easy Admin Creation**: Create admin users directly in your instance
- ✅ **Cost Control**: Manage your own billing and usage
- ✅ **Security**: Keep your credentials private

---

## Prerequisites

- [ ] A Supabase account (sign up at https://supabase.com)
- [ ] Access to this project's codebase
- [ ] Node.js and npm installed locally

---

## Step-by-Step Migration

### Step 1: Create New Supabase Project

1. **Go to Supabase Dashboard:**
   - Visit https://supabase.com/dashboard
   - Click **"New Project"**

2. **Configure Your Project:**
   - **Name**: `mylearning-pro` (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is fine for testing, Pro for production

3. **Wait for Project Setup:**
   - This takes 1-2 minutes
   - ☕ Grab a coffee while Supabase sets up your database

4. **Collect Your Credentials:**
   - Once ready, go to **Settings** → **API**
   - Copy and save these values:
     - **Project URL**: `https://xxxxx.supabase.co`
     - **anon/public key**: `eyJhbGc...` (long JWT token)
     - **Project Reference ID**: `xxxxx` (from the URL)

---

### Step 2: Run Database Migration

1. **Open Supabase SQL Editor:**
   - In your new project dashboard
   - Click **SQL Editor** in the left sidebar
   - Click **"New Query"**

2. **Copy the Migration SQL:**
   - Open this file in your project: `supabase/migrations/20251113021553_404470f6-cf71-4af0-b754-ea1832b8e48a.sql`
   - Copy **ALL** the contents (it's about 375 lines)

3. **Paste and Run:**
   - Paste the entire SQL into the SQL editor
   - Click **"Run"** or press `Ctrl+Enter` (Windows) / `Cmd+Enter` (Mac)
   - Wait for completion (should take 5-10 seconds)

4. **Verify Migration:**
   - Click **Table Editor** in the left sidebar
   - You should see these tables:
     - ✅ `user_roles`
     - ✅ `profiles`
     - ✅ `programs`
     - ✅ `program_assignments`
     - ✅ `evaluation_templates`
     - ✅ `evaluations`
     - ✅ `certificates`
     - ✅ `reminders_log`

5. **Verify Storage Bucket:**
   - Click **Storage** in the left sidebar
   - You should see a bucket named: `certificates`

---

### Step 3: Update Your Local Environment

1. **Copy `.env.example` to `.env`:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` file:**
   ```env
   VITE_SUPABASE_PROJECT_ID="your-project-id-here"
   VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key-here"
   VITE_SUPABASE_URL="https://your-project-id.supabase.co"
   ```

   Replace with your actual values from Step 1.4

3. **Update `supabase/config.toml`:**
   ```toml
   project_id = "your-project-id-here"
   ```

4. **Test Locally:**
   ```bash
   npm install
   npm run dev
   ```

   Open http://localhost:5173 - you should see the app!

---

### Step 4: Create Your First Admin User

Now you can create admin accounts directly!

#### Option A: Via Supabase Dashboard (Easiest)

1. **Go to Authentication → Users**
2. **Click "Add user" or "Invite"**
3. **Fill in:**
   - **Email**: `admin@yourcompany.com`
   - **Password**: Create a strong password
   - **Auto Confirm User**: ✅ Check this
   - **User Metadata**: (Optional) Add:
     ```json
     {
       "name": "Admin User",
       "department": "IT",
       "position": "Administrator"
     }
     ```
4. **Click "Create user"**
5. **Copy the User ID** (the UUID shown)

6. **Update Role to Admin:**
   - Go to **Table Editor** → **user_roles** table
   - Find the row with your user_id
   - Click to edit
   - Change `role` from `employee` to `admin`
   - Click **Save**

#### Option B: Via SQL (Faster)

1. **Create the auth user via UI first** (steps 1-5 above)
2. **Then run this SQL:**
   ```sql
   -- Update role to admin
   UPDATE user_roles
   SET role = 'admin'
   WHERE user_id = (
     SELECT id FROM auth.users
     WHERE email = 'admin@yourcompany.com'
   );
   ```

3. **Verify:**
   ```sql
   -- Check admin users
   SELECT u.email, ur.role, p.name
   FROM auth.users u
   JOIN user_roles ur ON u.id = ur.user_id
   JOIN profiles p ON u.id = p.id
   WHERE ur.role = 'admin';
   ```

---

### Step 5: Test the Application

1. **Login as Admin:**
   - Go to http://localhost:5173/auth
   - Login with your admin credentials
   - You should see the **Admin Dashboard**

2. **Test Core Features:**
   - [ ] Create a test program
   - [ ] Create a test employee user
   - [ ] Assign employee to program
   - [ ] Try navigation - all pages load correctly

3. **Create Test Employee:**
   - Use the admin interface: `/admin/users/create`
   - Create a test employee account
   - Try logging in as employee
   - Verify employee dashboard shows correctly

---

### Step 6: Deploy to Production

#### Update Environment Variables on Hosting Platform:

**For Lovable.dev:**
1. Go to your project settings
2. Update environment variables with your new Supabase credentials

**For Vercel:**
```bash
vercel env add VITE_SUPABASE_URL production
vercel env add VITE_SUPABASE_PUBLISHABLE_KEY production
vercel env add VITE_SUPABASE_PROJECT_ID production
```

**For Netlify:**
1. Go to Site settings → Environment variables
2. Update all three variables with new values

#### Deploy:
```bash
git add .
git commit -m "Migrate to own Supabase instance"
git push

# Then deploy (depending on your platform)
npm run build  # Test build locally first
```

---

## Troubleshooting

### Issue: "Invalid API key"
**Solution:** Double-check your `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env`

### Issue: "Failed to fetch"
**Solution:**
- Verify `VITE_SUPABASE_URL` is correct
- Check if Supabase project is active
- Disable any VPN/firewall temporarily

### Issue: "Row Level Security policy violation"
**Solution:**
- Make sure migration ran successfully
- Verify RLS policies exist: `SELECT * FROM pg_policies;`

### Issue: "User has no role"
**Solution:**
- Check `user_roles` table
- The trigger should auto-assign 'employee' role
- Manually insert role if missing

### Issue: "Cannot login as admin"
**Solution:**
- Verify user exists in `auth.users`
- Check `user_roles` table - role should be 'admin'
- Try resetting password in Supabase dashboard

### Issue: "Storage/Certificate upload fails"
**Solution:**
- Verify `certificates` bucket exists
- Check storage policies in SQL migration
- Check bucket is private (not public)

---

## Data Migration (Optional)

If you have existing data in Lovable Cloud that you want to keep:

### Export from Lovable Cloud:

1. **Via Supabase Dashboard:**
   - Go to old project dashboard
   - Table Editor → Select table
   - Click "..." → Export as CSV
   - Repeat for all tables

2. **Via SQL:**
   ```sql
   -- Export as JSON
   COPY (SELECT * FROM profiles) TO STDOUT WITH (FORMAT csv, HEADER);
   ```

### Import to New Instance:

1. **Via Supabase Dashboard:**
   - Go to new project
   - Table Editor → Select table
   - Click "Insert" → "Import from CSV"

2. **Via SQL:**
   ```sql
   -- Import data
   COPY profiles FROM '/path/to/profiles.csv' WITH (FORMAT csv, HEADER);
   ```

---

## Security Checklist

After migration:

- [ ] `.env` file is in `.gitignore` (not committed)
- [ ] Production environment variables are set
- [ ] Database password is secure
- [ ] RLS policies are enabled (verify in Table Editor)
- [ ] Storage policies are correct
- [ ] Admin users have strong passwords
- [ ] Test employee cannot access admin routes

---

## Rollback Plan

If something goes wrong:

1. **Keep old `.env` file as `.env.backup`:**
   ```bash
   cp .env .env.backup
   ```

2. **To rollback:**
   ```bash
   cp .env.backup .env
   npm run dev
   ```

3. **Old Lovable Cloud credentials are still in git history** (until you update them)

---

## Next Steps After Migration

1. **Set up Database Backups:**
   - Supabase → Database → Backups
   - Enable Point-in-Time Recovery (PITR) for Pro plan

2. **Configure Email Templates:**
   - Authentication → Email Templates
   - Customize signup/reset emails

3. **Monitor Usage:**
   - Dashboard shows database size, API calls, bandwidth
   - Set up alerts for quota limits

4. **Invite Your Team:**
   - Settings → Team
   - Invite other admins to Supabase project

---

## Support

If you encounter issues:

1. Check Supabase logs: Dashboard → Logs
2. Check browser console for errors
3. Verify migration ran completely
4. Review this guide's troubleshooting section
5. Check Supabase docs: https://supabase.com/docs

---

## Summary

You've successfully migrated to your own Supabase instance! 🎉

**What You Accomplished:**
- ✅ Created your own Supabase project
- ✅ Ran complete database migration
- ✅ Updated environment variables
- ✅ Created first admin user
- ✅ Tested the application
- ✅ Ready for production deployment

**You Now Have:**
- Full control over your database
- Direct SQL access
- Your own backups and monitoring
- Ability to create admin users anytime
- Production-ready setup

---

**Migration Date:** _______________
**New Project ID:** _______________
**Admin Email:** _______________

Keep this guide for reference!
