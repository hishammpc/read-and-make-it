# Quick Migration Reference Card
## Switch from Lovable Cloud to Your Own Supabase in 10-15 Minutes

**✨ Good news:** Since you already have admin access working, this will be smooth!

### ⚡ Quick Steps:

1. **Create Supabase Project** (2 min)
   - Go to https://supabase.com → New Project
   - Save: URL, anon key, project ID

2. **Run Migration** (2 min)
   - Copy `supabase/migrations/20251113021553_404470f6-cf71-4af0-b754-ea1832b8e48a.sql`
   - Paste in Supabase SQL Editor → Run

3. **Update Config** (1 min)
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

4. **Create Admin** (2 min)
   - Supabase → Authentication → Add User
   - Table Editor → user_roles → Change to 'admin'

5. **Test** (3 min)
   ```bash
   npm run dev
   ```
   Login as admin at http://localhost:5173

### 📋 Credentials Checklist:

From Supabase Settings → API, copy to `.env`:
- [ ] `VITE_SUPABASE_URL` = Project URL
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` = anon key
- [ ] `VITE_SUPABASE_PROJECT_ID` = Project ID

### 🎯 Quick SQL to Make Admin:

```sql
UPDATE user_roles
SET role = 'admin'
WHERE user_id = (
  SELECT id FROM auth.users
  WHERE email = 'your-admin@email.com'
);
```

### ✅ Verify Migration Worked:

Check these tables exist:
- user_roles, profiles, programs, program_assignments
- evaluation_templates, evaluations, certificates
- Storage bucket: certificates

---

**Full guide:** See `SUPABASE_MIGRATION_GUIDE.md`
