# MyLearning Pro - Deployment Guide

## 🚀 Quick Deployment to Production

This guide will help you deploy MyLearning Pro to production on Lovable.dev or any hosting platform.

---

## Prerequisites

- ✅ Supabase project created and configured
- ✅ Database migrations applied
- ✅ Environment variables ready
- ✅ First admin user credentials

**Note:** If you're currently using Lovable Cloud's Supabase instance, see the [Supabase Migration Guide](./SUPABASE_MIGRATION_GUIDE.md) first to migrate to your own Supabase instance.

---

## Deployment Options

### Option 1: Lovable.dev (Current Hosting)

Your project is already connected to Lovable.dev!

**Project URL:** https://lovable.dev/projects/bae639bd-90ee-40c9-b0c8-1f02911a6272

#### Steps:
1. **Push to Lovable:**
   ```bash
   git add .
   git commit -m "Complete MVP v1.0 implementation"
   git push
   ```

2. **Lovable will automatically:**
   - Build the project
   - Deploy to production
   - Provide a live URL

3. **Configure Environment Variables:**
   - Go to Lovable.dev project settings
   - Add environment variables:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_PUBLISHABLE_KEY`

4. **Access Your Application:**
   - Visit the provided Lovable.dev URL
   - Login with your admin credentials

---

### Option 2: Vercel

#### Steps:
1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

4. **Set Environment Variables:**
   ```bash
   vercel env add VITE_SUPABASE_URL
   vercel env add VITE_SUPABASE_PUBLISHABLE_KEY
   ```

5. **Deploy to Production:**
   ```bash
   vercel --prod
   ```

---

### Option 3: Netlify

#### Steps:
1. **Install Netlify CLI:**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify:**
   ```bash
   netlify login
   ```

3. **Initialize Site:**
   ```bash
   netlify init
   ```

4. **Build and Deploy:**
   ```bash
   netlify deploy --prod
   ```

5. **Configure Environment Variables:**
   - Go to Netlify dashboard
   - Site settings → Environment variables
   - Add:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_PUBLISHABLE_KEY`

---

## Post-Deployment Setup

### 1. Create First Admin User

**Option A: Via Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to Authentication → Users
3. Click "Add User"
4. Fill in:
   - Email: `admin@yourcompany.com`
   - Password: Create a strong password
5. After user is created, go to Table Editor
6. Open `user_roles` table
7. Insert a record:
   - `user_id`: [The UUID of the created user]
   - `role`: `admin`

**Option B: Via SQL**
```sql
-- First, create the auth user in Supabase Auth UI
-- Then run this SQL to assign admin role:

INSERT INTO user_roles (user_id, role)
VALUES ('[user-uuid-here]', 'admin');
```

### 2. Test Core Functionality

After deployment, test these critical flows:

#### Admin Flow:
1. ✅ Login as admin
2. ✅ View admin dashboard with real data
3. ✅ Create a test program
4. ✅ Create a test employee user
5. ✅ Assign employee to program
6. ✅ Mark attendance
7. ✅ Create evaluation template
8. ✅ Generate a report
9. ✅ Upload a certificate

#### Employee Flow:
1. ✅ Login as employee
2. ✅ View employee dashboard
3. ✅ Check assigned trainings
4. ✅ Submit evaluation (if available)
5. ✅ View training hours
6. ✅ Download certificate (if available)

---

## Environment Variables

### Required Variables:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

### Where to Get These:
1. Go to your Supabase project
2. Settings → API
3. Copy:
   - Project URL → `VITE_SUPABASE_URL`
   - anon/public key → `VITE_SUPABASE_PUBLISHABLE_KEY`

⚠️ **Important:** Never expose the service role key to the client!

---

## Supabase Setup Checklist

Make sure your Supabase project has:

- [x] Database schema created (migrations applied)
- [x] RLS policies enabled on all tables
- [x] Storage bucket `certificates` created
- [x] Storage policies configured
- [x] Auth settings configured
- [x] First admin user created

### Verify RLS Policies:
```sql
-- Check if RLS is enabled on all tables
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';
```

All tables should have `rowsecurity = true`.

---

## Performance Optimization

### Current Build Size:
- CSS: ~64 KB (gzipped: ~11 KB)
- JS: ~1.2 MB (gzipped: ~340 KB)

### Recommendations for Production:
1. **Enable Gzip/Brotli compression** on your hosting platform
2. **Configure CDN** for static assets
3. **Enable caching** headers
4. **Consider code splitting** for large routes (Phase 2)

---

## Monitoring & Analytics (Optional)

### Error Monitoring:
1. **Sentry** (Recommended)
   ```bash
   npm install @sentry/react
   ```

2. Configure in `main.tsx`:
   ```typescript
   import * as Sentry from "@sentry/react";

   Sentry.init({
     dsn: "your-sentry-dsn",
     environment: "production",
   });
   ```

### Analytics:
1. **Google Analytics**
2. **Plausible Analytics** (Privacy-friendly)
3. **Posthog** (Product analytics)

---

## Security Checklist

Before going live:

- [x] RLS policies verified
- [x] Service role key NOT exposed to client
- [x] CORS configured properly in Supabase
- [x] Auth settings reviewed
- [ ] SSL/HTTPS enabled on domain
- [ ] Environment variables secured
- [ ] Admin credentials strong and secure
- [ ] File upload size limits configured
- [ ] Rate limiting configured (if needed)

---

## Backup & Recovery

### Database Backups:
Supabase automatically backs up your database. To enable additional backups:

1. Go to Supabase Dashboard
2. Database → Backups
3. Configure backup schedule

### Manual Backup:
```bash
# Export database
pg_dump -h your-db.supabase.co -U postgres -d postgres > backup.sql
```

---

## Troubleshooting

### Build Fails:
```bash
# Clear cache and reinstall
rm -rf node_modules
rm package-lock.json
npm install
npm run build
```

### RLS Policy Issues:
- Check if user is authenticated
- Verify role assignments in `user_roles` table
- Test policies in Supabase SQL Editor

### File Upload Issues:
- Check storage policies
- Verify bucket exists
- Check file size limits

### Authentication Issues:
- Verify Supabase URL and keys
- Check if user exists in auth.users
- Verify email confirmation settings

---

## Custom Domain Setup

### For Vercel:
1. Go to project settings
2. Domains → Add domain
3. Follow DNS configuration instructions

### For Netlify:
1. Go to domain management
2. Add custom domain
3. Configure DNS records

---

## Maintenance

### Regular Tasks:
- Monitor error logs
- Review user feedback
- Check database usage
- Monitor storage usage
- Update dependencies monthly
- Review security advisories

### Monthly Checklist:
- [ ] Review error logs
- [ ] Check database performance
- [ ] Update packages: `npm update`
- [ ] Test critical flows
- [ ] Review user feedback
- [ ] Check storage usage

---

## Support Resources

- **Supabase Docs:** https://supabase.com/docs
- **React Query Docs:** https://tanstack.com/query/latest
- **Vite Docs:** https://vitejs.dev
- **shadcn/ui Docs:** https://ui.shadcn.com

---

## Contact & Support

For issues or questions:
1. Check documentation in `/docs` folder
2. Review implementation brief
3. Check Supabase logs
4. Review browser console for errors

---

**🎉 Congratulations on your deployment! Your MyLearning Pro application is now live!**

Generated: 2025-11-13
Version: MVP v1.0
