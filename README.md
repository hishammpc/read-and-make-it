# MyLearning Pro

**A modern training management portal for MPC workforce (300+ employees)**

## 📋 Project Overview

MyLearning Pro is an internal training management platform that enables:
- 📚 Training program management & tracking
- ✅ Employee attendance management  
- 📝 Evaluation collection & analysis
- 🏆 Certificate generation & distribution
- 📊 Dashboard analytics & reporting

**Status:** ✅ MVP v1.0 COMPLETE - Ready for Production Deployment
**Version:** MVP v1.0
**Completed:** 2025-11-13

## 🚀 Quick Start

```sh
# Install dependencies
npm i

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🛠️ Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **UI:** shadcn-ui + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Auth + Storage)
- **State Management:** TanStack Query (React Query)
- **Routing:** React Router v6
- **Forms:** React Hook Form + Zod validation
- **Icons:** Lucide React

## 📁 Project Structure

```
src/
├── components/        # Reusable UI components
│   ├── dashboard/    # Dashboard-specific components
│   └── ui/           # shadcn-ui components
├── contexts/         # React contexts (AuthContext)
├── hooks/            # Custom React hooks
├── integrations/     # External integrations (Supabase)
├── lib/              # Utility functions
├── pages/            # Page components
└── main.tsx          # Entry point
```

## 🔐 Environment Variables

**Important:** This project currently uses Lovable Cloud's Supabase instance. To use your own Supabase instance, follow the [Supabase Migration Guide](./SUPABASE_MIGRATION_GUIDE.md).

Create a `.env` file in the root directory (copy from `.env.example`):

```bash
cp .env.example .env
```

Then edit `.env` with your Supabase credentials:

```env
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

Get these from your Supabase project: **Settings → API**

## 📖 Documentation

All documentation is organized in the [`/docs`](./docs/) directory:

- **[📚 Documentation Index](./docs/README.md)** - Start here for all documentation
- **[🚀 Quick Start Guide](./docs/QUICK_START.md)** - Quick reference for developers
- **[📋 Implementation Brief](./docs/IMPLEMENTATION_BRIEF.md)** - Complete feature specifications and implementation guide
- **[📖 Project Specification](./docs/mylearning%20promd.txt)** - Original project requirements
- **[🔄 Supabase Migration Guide](./SUPABASE_MIGRATION_GUIDE.md)** - Migrate from Lovable Cloud to your own Supabase
- **[📝 Implementation Summary](./IMPLEMENTATION_SUMMARY.md)** - Complete implementation details
- **[🚀 Deployment Guide](./DEPLOYMENT_GUIDE.md)** - Production deployment instructions

## ✅ Implementation Status

### ✅ ALL FEATURES COMPLETED

**Admin Features:**
- ✅ Super Dashboard with real data and charts
- ✅ Program Management (CRUD, assignment, details)
- ✅ User Management (CRUD, role management)
- ✅ Attendance Management (manual marking, bulk actions)
- ✅ Evaluation Management (templates, responses)
- ✅ Certificate Management (upload, download, batch processing)
- ✅ Reports Generation (6 report types with CSV export)

**Employee Features:**
- ✅ Employee Dashboard with statistics
- ✅ My Trainings (view, filter by status)
- ✅ My Evaluations (submit, view history)
- ✅ My Certificates (view, download)
- ✅ My Training Hours (progress tracking, breakdown)

**Technical:**
- ✅ 94+ files created/modified
- ✅ 30+ routes configured
- ✅ 7 custom hooks
- ✅ Full TypeScript support
- ✅ Build successful (no errors)
- ✅ Responsive design
- ✅ Dark mode ready

See [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) for complete details.

## 👥 User Roles

### Admin
- Manage training programs (CRUD)
- Manage users
- Assign programs to employees
- Mark attendance
- Manage evaluations
- Upload/generate certificates
- Generate reports

### Employee
- View assigned trainings
- Submit evaluations
- Download certificates
- View training hours & history

## 🗄️ Database

The project uses Supabase PostgreSQL with the following main tables:
- `profiles` - User profiles
- `user_roles` - Role assignments
- `programs` - Training programs
- `program_assignments` - Program assignments
- `evaluation_templates` - Evaluation templates
- `evaluations` - Evaluation responses
- `certificates` - Certificates
- `reminders_log` - Reminder tracking

See migration file: `supabase/migrations/`

## 🧪 Testing

```sh
# Run tests (when implemented)
npm test

# Run tests in watch mode
npm test:watch
```

## 🚀 Deployment

### Vercel/Netlify
1. Connect your repository
2. Set environment variables
3. Deploy

### Manual Build
```sh
npm run build
# Output in dist/ directory
```

## 📝 Development Notes

- **Project URL:** https://lovable.dev/projects/bae639bd-90ee-40c9-b0c8-1f02911a6272
- **Documentation:** All docs in [`/docs`](./docs/) directory
- **Quick Start:** See [docs/QUICK_START.md](./docs/QUICK_START.md)
- **Full Specs:** See [docs/IMPLEMENTATION_BRIEF.md](./docs/IMPLEMENTATION_BRIEF.md)
