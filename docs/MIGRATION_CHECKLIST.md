# 🚀 MyLearning Pro - Supabase Migration Checklist

**Goal:** Migrate from Lovable Cloud to your own Supabase in 15 minutes

**Date Started:** _______________

---

## ✅ Pre-Migration Checklist

- [ ] I have a Supabase account (https://supabase.com)
- [ ] Current app is working with Lovable Cloud
- [ ] I have admin access to current system
- [ ] I've backed up my `.env` file (already done: `.env.lovable-backup`)

---

## 📋 Step-by-Step Migration

### Step 1: Create New Supabase Project (2 minutes)

- [ ] Go to https://supabase.com/dashboard
- [ ] Click **"New Project"**
- [ ] Fill in:
  - [ ] **Name:** `mylearning-pro` (or your choice)
  - [ ] **Database Password:** __________________ (SAVE THIS!)
  - [ ] **Region:** Select closest to you
  - [ ] **Plan:** Free (or Pro for production)
- [ ] Click **"Create new project"**
- [ ] ☕ Wait 1-2 minutes for setup

---

### Step 2: Collect Your Credentials (1 minute)

Once project is ready:

- [ ] Go to **Settings** → **API**
- [ ] Copy and save these:

```
Project URL: https://__________________.supabase.co
anon/public key: eyJhbGc________________________________
Project ID: __________________
```

---

### Step 3: Run Database Migration (3 minutes)

- [ ] In Supabase dashboard, click **SQL Editor** (left sidebar)
- [ ] Click **"New Query"**
- [ ] Open local file: `supabase/migrations/20251113021553_404470f6-cf71-4af0-b754-ea1832b8e48a.sql`
- [ ] Copy **ALL** contents (375 lines)
- [ ] Paste into SQL Editor
- [ ] Click **"Run"** or press `Cmd+Enter`
- [ ] ✅ Wait for "Success" message

**Verify Migration Worked:**

- [ ] Click **Table Editor** (left sidebar)
- [ ] Verify these tables exist:
  - [ ] `user_roles`
  - [ ] `profiles`
  - [ ] `programs`
  - [ ] `program_assignments`
  - [ ] `evaluation_templates`
  - [ ] `evaluations`
  - [ ] `certificates`
  - [ ] `reminders_log`

- [ ] Click **Storage** (left sidebar)
- [ ] Verify bucket exists:
  - [ ] `certificates`

**If tables are missing:** Re-run the migration SQL

---

### Step 4: Update Local Configuration (2 minutes)

**Update `.env` file:**

```bash
# Edit your .env file with new credentials
```

- [ ] Open `.env` file
- [ ] Replace these values with your new ones from Step 2:

```env
VITE_SUPABASE_PROJECT_ID="your-new-project-id"
VITE_SUPABASE_PUBLISHABLE_KEY="your-new-anon-key"
VITE_SUPABASE_URL="https://your-new-project-id.supabase.co"
```

- [ ] Save the file

**Update `supabase/config.toml`:**

- [ ] Open `supabase/config.toml`
- [ ] Replace `project_id` with your new project ID
- [ ] Save the file

---

### Step 5: Create Admin User (3 minutes)

**Option A: Via Supabase Dashboard (Recommended)**

- [ ] Go to **Authentication** → **Users**
- [ ] Click **"Add user"** or **"Invite"**
- [ ] Fill in:
  - [ ] **Email:** __________________ (your admin email)
  - [ ] **Password:** __________________ (create strong password)
  - [ ] **Auto Confirm User:** ✅ Check this box
  - [ ] **User Metadata (optional):**
    ```json
    {
      "name": "Your Name",
      "department": "IT",
      "position": "Administrator"
    }
    ```
- [ ] Click **"Create user"**
- [ ] **COPY THE USER ID (UUID):** __________________

**Update Role to Admin:**

- [ ] Go to **Table Editor** → **user_roles** table
- [ ] Find the row with your user_id
- [ ] Click to edit the row
- [ ] Change `role` from `'employee'` to `'admin'`
- [ ] Click **Save**

**Option B: Quick SQL (After creating auth user via UI)**

- [ ] SQL Editor → New Query
- [ ] Paste this (replace email):
```sql
UPDATE user_roles
SET role = 'admin'
WHERE user_id = (
  SELECT id FROM auth.users
  WHERE email = 'your-admin@email.com'
);
```
- [ ] Click **Run**

**Verify Admin Created:**

- [ ] SQL Editor → New Query
- [ ] Run this:
```sql
SELECT u.email, ur.role, p.name
FROM auth.users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN profiles p ON u.id = p.id
WHERE ur.role = 'admin';
```
- [ ] Should show your admin user

---

### Step 6: Test Locally (2 minutes)

**Install dependencies (if needed):**
```bash
npm install
```

**Run development server:**
```bash
npm run dev
```

- [ ] App starts without errors
- [ ] Open http://localhost:5173
- [ ] Click on "Sign in"

**Test Admin Login:**

- [ ] Login with your admin email and password
- [ ] ✅ Redirected to Admin Dashboard
- [ ] ✅ Dashboard shows (may be empty data - that's fine!)
- [ ] ✅ Sidebar navigation works
- [ ] ✅ Can navigate to Programs, Users, etc.

**Quick Feature Test:**

- [ ] Try creating a test program
- [ ] Try creating a test user
- [ ] Everything works? ✅ **MIGRATION SUCCESS!**

---

### Step 7: Deploy to Production (Optional)

**If deploying now:**

- [ ] Update environment variables on hosting platform:
  - [ ] Lovable.dev / Vercel / Netlify
  - [ ] Set new `VITE_SUPABASE_URL`
  - [ ] Set new `VITE_SUPABASE_PUBLISHABLE_KEY`
  - [ ] Set new `VITE_SUPABASE_PROJECT_ID`

- [ ] Build and deploy:
```bash
npm run build
# Then deploy via your platform
```

- [ ] Test production deployment
- [ ] ✅ Login as admin in production

**Or deploy later - local testing is enough for now!**

---

## 🎉 Migration Complete!

### Post-Migration Verification:

- [ ] Can login as admin ✅
- [ ] Dashboard loads with data ✅
- [ ] Can create programs ✅
- [ ] Can create users ✅
- [ ] All features work ✅

### What You Now Have:

✅ Your own Supabase instance
✅ Full database control
✅ Direct SQL access
✅ Easy admin creation
✅ Production-ready setup

---

## 🆘 Troubleshooting

**Problem: "Invalid API key"**
- [ ] Double-check `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env`
- [ ] Make sure you copied the **anon/public** key, not service role

**Problem: "Failed to fetch"**
- [ ] Verify `VITE_SUPABASE_URL` is correct
- [ ] Check Supabase project is active (not paused)

**Problem: Can't login**
- [ ] Verify user exists in Authentication → Users
- [ ] Check `user_roles` table has 'admin' role
- [ ] Try password reset in Supabase dashboard

**Problem: Tables missing**
- [ ] Re-run the migration SQL completely
- [ ] Check for any error messages in SQL Editor

**Need to rollback?**
```bash
cp .env.lovable-backup .env
npm run dev
```

---

## 📝 Notes & Important Info

**Admin Credentials:**
- Email: __________________
- Password: __________________ (keep secure!)

**Supabase Project:**
- Project Name: __________________
- Project ID: __________________
- Database Password: __________________

**Migration Date:** __________________

**Next Steps:**
- [ ] Create additional admin users (if needed)
- [ ] Import existing data (if any)
- [ ] Set up database backups
- [ ] Configure email templates
- [ ] Invite team members

---

**🎊 Congratulations! You've successfully migrated to your own Supabase instance!**

Keep this checklist for reference.
