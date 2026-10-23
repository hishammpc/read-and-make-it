# MyLearning Pro - Project Reference

## Overview

**MyLearning Pro** is a comprehensive Learning Management System (LMS) built for MPC (Malaysian Productivity Corporation). It handles training program management, employee development tracking, annual performance evaluations, and compliance monitoring.

## Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 18.3 + TypeScript 5.8 |
| **Build Tool** | Vite 5.4 |
| **Styling** | Tailwind CSS 3.4 + Radix UI (Shadcn/ui) |
| **State Management** | React Query (TanStack Query 5) |
| **Database** | Supabase (PostgreSQL) |
| **Forms** | React Hook Form + Zod |
| **PDF Generation** | jsPDF |
| **Charts** | Recharts |
| **Icons** | Lucide React |

## Project Structure

```
src/
├── components/
│   ├── ui/                    # Shadcn/ui components (47 files)
│   ├── layout/                # AdminLayout, EmployeeLayout
│   ├── dashboard/             # AdminDashboard, EmployeeDashboard
│   ├── evaluations/           # EvaluationTemplateBuilder, QuestionRenderer
│   ├── users/                 # UserForm
│   ├── programs/              # ProgramForm
│   ├── certificates/          # CertificateUpload
│   └── employee/              # ProposedTrainingDialog
├── pages/
│   ├── admin/                 # 18 admin pages
│   └── employee/              # 12 employee pages
├── hooks/                     # 13 custom hook files
├── contexts/                  # AuthContext, ThemeContext
├── lib/                       # Utility functions
└── integrations/supabase/     # Supabase client & types
```

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `profiles` | User info (name, email, department, position, supervisor_id) |
| `user_roles` | Role assignments (admin/employee) |
| `programs` | Training programs |
| `program_assignments` | User enrollment & attendance |
| `evaluations` | Program feedback submissions |
| `evaluation_templates` | Reusable evaluation forms |
| `certificates` | Completion certificates |
| `annual_evaluation_cycles` | Yearly evaluation periods |
| `annual_evaluations` | Staff & supervisor assessments |
| `proposed_trainings` | Employee training proposals |
| `system_settings` | Key-value config store (JSONB) |

### Key Relationships

- `profiles.supervisor_id` → `profiles.id` (self-referencing for hierarchy)
- `program_assignments` links users to programs
- `annual_evaluations` has both `user_id` and `supervisor_id`

## Authentication

**Hybrid Authentication Model:**

- **Employees**: Email-only login (no password, stored in localStorage)
- **Admins**: Email + password via Supabase Auth
- **Admin PIN Lock**: PIN `101010` required for admin pages (session-based)

```typescript
// Key auth functions in src/lib/emailOnlyAuth.ts
loginWithEmailOnly(email)      // Employee login
loginAdmin(email, password)    // Admin login
getCurrentSession()            // Get stored session
logout()                       // Clear session
```

## Key Features

### 1. Training Program Management
- Create/edit/delete programs
- Assign employees to programs
- Track attendance (Attended/No-Show)
- Upload certificates

### 2. Training Evaluations
- Custom evaluation templates with multiple question types
- 3-tier rating: BAGUS (3) / SEDERHANA (2) / LEMAH (1)
- Aggregate statistics and reporting

### 3. Annual Performance Evaluations
- **Two-stage process**: Staff self-evaluation → Supervisor evaluation
- **Status flow**: `pending_staff` → `pending_supervisor` → `completed`
- **10 competency questions** across 4 categories
- **5-level rating** (Tahap 1-5): 2, 4, 6, 8, 10 points
- **Reset functionality**: Reset staff/supervisor/full responses
- Spider web chart visualization for results

### 4. Proposed Trainings
- **Open period**: December 1 - February 28
- One proposal per staff per year: **training title, details, notes** (changed at MPC's request, 2026-10-23; columns `training_title`, `training_details`, `notes`; "considered" = `is_entertained`)
- Up to 2026 the form was two one-line proposals (`proposal_1`/`proposal_2` + `*_entertained`). That data is kept in the DB; the admin page uses one layout for every year and shows an old row's `proposal_1` as its training (tick = `proposal_1_entertained`); `proposal_2` is not shown (100 of 115 rows in 2026 have one). See `isLegacyProposal()`
- Admin approval workflow

### 5. Dashboards
- **Admin**: KPIs, monthly trends, leaderboard, evaluation summary
- **Employee**: Training progress, compliance %, pending items

### 6. Reports & PDF Export
- Training hours by user
- Program lists
- Evaluation reports
- CSV export capability

## Important Hooks

### User Management
```typescript
useUsers()                    // All users
useUsersWithTrainingHours()   // Users + hours + supervisor
useCreateUser() / useUpdateUser()
```

### Programs
```typescript
usePrograms() / useProgram(id)
useProgramAssignments(programId)
useAssignUsersToProgram()
useUpdateAssignmentStatus()   // Mark attendance
```

### Evaluations
```typescript
useEvaluationsByProgram(year, fromMonth, toMonth)
useSubmitEvaluation()
```

### Annual Evaluations
```typescript
useAnnualEvaluationCycles()
useAnnualEvaluationCycle(cycleId)
useMyPendingAnnualEvaluations(userId)
useSubmitStaffEvaluation()
useSubmitSupervisorEvaluation()
useResetAnnualEvaluation()    // Admin reset
usePendingSuperviseeCount(supervisorId)
```

### Proposed Trainings
```typescript
isProposalPeriodOpen()        // Check if Dec 1 - Feb 28
useMyProposedTraining(userId, year)
useSubmitProposedTraining()
useMarkAsEntertained()        // Admin approval
```

## Utility Functions

### Date Utils (`src/lib/dateUtils.ts`)
```typescript
formatMalaysianDate(date)     // "12 Oktober 2025"
formatMalaysianDateRange()    // Smart range formatting
```

### Calculations (`src/lib/calculations.ts`)
```typescript
calculateCompliancePercentage()  // Against 40-hour target
calculateHoursByCategory()       // Technical, Leadership, etc.
```

### Annual Evaluation (`src/lib/annualEvaluationQuestions.ts`)
```typescript
calculateTotalScore(answers)     // Max 100
calculatePercentage(answers)
getRatingLabel(percentage)       // Cemerlang, Bagus, etc.
```

## Routing

### Admin Routes
- `/dashboard` - Admin dashboard
- `/dashboard/programs` - Program management
- `/admin/users` - User management
- `/dashboard/evaluations` - Training evaluations
- `/dashboard/annual-evaluations` - Annual evaluation cycles
- `/dashboard/proposed-trainings` - Proposed trainings
- `/dashboard/reports` - Reports

### Employee Routes
- `/dashboard` - Employee dashboard
- `/dashboard/my-trainings` - My training programs
- `/dashboard/my-evaluations` - Pending evaluations
- `/dashboard/my-annual-evaluation` - Annual evaluation
- `/dashboard/supervisee-evaluations` - Evaluate staff (supervisors)

## UI Patterns

### Layouts
- `AppShell` (`components/layout/AppShell.tsx`) — shared frame: fixed sidebar (stays put on scroll), sticky top bar with BM/EN switch, theme switch and user menu, mobile drawer. Takes `sections: NavSection[]`.
- `AdminLayout` — PIN gate, then `AppShell` with admin nav. `EmployeeLayout` — `AppShell` with staff nav; "Penilaian kakitangan" only when `useIsSupervisor`.
- `AuthLayout` — split-screen frame for `/auth` and `/admin/login`.

### Shared components (`components/common/`) — use these, don't hand-roll
- `PageHeader` (title, description, actions, `backTo`) — the only page-title pattern
- `StatCard` (label, value, icon, tone, hint, onClick) — every KPI tile
- `StatusBadge kind=… status=…` / `ToneBadge tone=…` — every coloured label
- `EmptyState` (compact inside cards/tables), `PageSkeleton` (dashboard/table/form/detail), `ErrorState`

### Colour
- Tokens only: `success` / `warning` / `info` / `destructive` each with `-soft` + `-soft-foreground`, plus `primary`, `muted`, `accent` (neutral hover). No raw Tailwind palette classes or hex in pages — they break dark mode.
- Status → tone lives in `lib/status.ts` (`getStatusTone`, `getRatingLevelTone`, `getRatingPercentageTone`, `getComplianceTone`, `getTrainingRatingTone`, `toneClasses`). Annual 5-level scale is diverging: danger, warning, muted, info, success.
- Theme defaults to light until every page is dark-safe; switch offers Light/Dark/System.
- Font: Plus Jakarta Sans (self-hosted, `@fontsource-variable`).

## Localization

- **Dual language, BM default** — `useLanguage()` → `t` (typed dictionary). `i18n/ms.ts` holds `common`, `status`, shell/auth strings; page strings live in `i18n/sections/{dashboard,adminTraining,adminStaff,employee}.ts`. `en` is typed against `ms`, so a missing key fails the typecheck.
- Choice persisted in localStorage `mylearning_language`; sets `<html lang>`.
- **Stays BM only (official content):** annual-evaluation questions/categories and rating words, BAGUS/SEDERHANA/LEMAH, PDF output, certificates, CSV exports.
- Auth library returns `AuthErrorCode`s; UI translates via `t.auth.errors[code]`.
- Malaysian date formatting (`formatMalaysianDate`) is BM regardless of language.

## Development Commands

```bash
npm run dev      # Start dev server (port 8080)
npm run build    # Production build
npm run lint     # ESLint check
```

## Environment Variables

```env
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[anon-key]
```

## Key Business Rules

1. **Training Compliance**: 40 hours/year target per employee
2. **Evaluation Window**: Programs must be evaluated within 3 days of completion
3. **Annual Evaluation**: All staff must have supervisors before creating cycle
4. **Proposal Period**: Admin-configurable via `system_settings` table (default Dec 1 - Feb 28); admin manual override `mode: 'auto' | 'open' | 'closed'` in the same JSON (missing = auto). New proposals count for the end date's year
5. **Admin PIN**: `101010` (session-based, stored in sessionStorage)

## Database Security Note

**RLS (Row Level Security) is DISABLED** on all tables to support the hybrid authentication model:
- Employees use email-only auth (no Supabase JWT token)
- RLS policies that rely on `auth.uid()` or JWT claims don't work with email-only auth
- Security is enforced at the application level instead

Migration: `supabase/migrations_archive/20260202100000_disable_rls_for_hybrid_auth.sql` (archived; see below)

## Migrations

- `supabase/migrations/20261023035000_baseline_production_schema.sql` is the source of truth: a structure-only dump of production (2026-10-23) plus the auth sign-up trigger and certificates bucket/policies. Verified to rebuild a schema identical to production.
- Earlier files are in `supabase/migrations_archive/` (reference only; they don't rebuild production).
- New schema changes go in new timestamped files after the baseline. Apply to production deliberately (there is no CLI migration history there yet; see the baseline header for `migration repair`).
- Local `.env.local` (gitignored) holds `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_URL`; the direct DB host is IPv6-only, so connect through the session pooler `aws-1-ap-southeast-1.pooler.supabase.com:5432` (user `postgres.ecoxrleadphtiaoxaswl`).

## Recent Updates

- Proposed training dialog button text updated to Malay ("Sila Cadangkan" with descriptive subtitle)
- **Disabled RLS** on all tables for hybrid auth compatibility (assessment submission & program creation fixes)
- Admin PIN lock for security
- Evaluation reset functionality (staff/supervisor/full)
- Search filter in annual evaluation cycle page
- Participant column in Training Evaluation table
- Year filter for dashboard and stats (including pending training evaluations)
- Supervisor info display in evaluation forms
- Flashing reminder badges for pending items
- Supervisor change now updates both `profiles` and `annual_evaluations` tables
- Fixed annual evaluation mutations using `maybeSingle()` to prevent JSON coerce errors
- Fixed ProgramEdit routing (uses `/dashboard/programs/` not `/admin/programs/`)
- Added "Penilaian" column to Programs List showing evaluation requirement status (Diperlukan/Tidak) based on `notify_for_evaluation` flag
- Program Details conditionally hides Evaluation Summary card and Penilaian column when `notify_for_evaluation` is false
- Training Evaluations page eye icon now navigates to Program Details instead of opening a feedback dialog
- Annual evaluation year filters hide 2024 (demo data) — only 2025+ shown across admin, employee, and supervisee pages
- Employee dashboard "Sejarah Penilaian Tahunan" shows supervisor score (not self-score), or status if pending
- Supervisee Evaluations "Markah" column shows colour-coded badge (e.g. "85% - Bagus") based on rating tier
- Training Evaluations page: added "Penilaian" filter dropdown (Semua/Diperlukan/Tidak Diperlukan) with label, and "Penilaian" column in table; PDF respects filter
- Removed MyCertificates page and nav link from employee layout
- Proposed Training dialog: moved descriptive text below subtitle, simplified submit button to "Hantar"
- **Configurable dates**: Annual evaluation cycle dates editable via "Tetapkan Tarikh" button; create dialog includes date pickers
- **Configurable proposal period**: Admin can set proposal start/end dates on Proposed Trainings page; `system_settings` table stores config; `useProposalPeriod()` hook replaces hardcoded `isProposalPeriodOpen()`
- New table: `system_settings` (key/value JSONB) — migration `supabase/migrations_archive/20260209_system_settings.sql` (archived)
- **Timezone fix**: `ProgramForm` appends local timezone offset to `datetime-local` values before saving (prevents PostgreSQL from interpreting as UTC); `ProgramEdit` uses local time components instead of `.toISOString()` when loading dates
- **Date range filters**: use `getYearBounds` / `getMonthRangeBounds` + `.gte(col, start).lt(col, end)` (and `isWithinBounds` in JS) from `src/lib/dateUtils.ts`. Never filter timestamptz columns with `'YYYY-12-31'` or offset-less `'...T23:59:59'` — Postgres reads them as UTC and drops most of 31 Dec (MYT)
- **Admin routes** use `<ProtectedRoute requireAdmin>`; role resolves to admin if any `user_roles` row is admin. Annual-evaluation submits are guarded by owner/supervisor + expected status in the `update` filter
- Embedding `profiles` from `program_assignments` must name the FK (`profiles:user_id(...)`) — the table has two FKs to profiles (`user_id`, `attendance_marked_by`) and an unhinted embed makes PostgREST reject the query
