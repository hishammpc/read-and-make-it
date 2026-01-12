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
- Employees propose up to 2 trainings
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
- `AdminLayout` - PIN-protected, sidebar navigation, mobile menu
- `EmployeeLayout` - Dynamic menu (shows supervisor items if applicable)

### Common Components
- Cards with stats and KPIs
- Tables with search/filter
- Dialogs for confirmations
- Toast notifications (Sonner)
- Progress indicators (circular and linear)

## Localization

- **Primary language**: Malay (Bahasa Malaysia)
- Malaysian date formatting
- Status messages in Malay
- Form labels bilingual

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
4. **Proposal Period**: December 1 - February 28 only
5. **Admin PIN**: `101010` (session-based, stored in sessionStorage)

## Recent Updates

- Admin PIN lock for security
- Evaluation reset functionality (staff/supervisor/full)
- Search filter in annual evaluation cycle page
- Participant column in Training Evaluation table
- Year filter for dashboard and stats
- Supervisor info display in evaluation forms
- Flashing reminder badges for pending items
