# SCOPE OF WORK: MyLearning Pro

## Project Overview

**MyLearning Pro** is a full-scale, enterprise-grade **Training & Performance Management System** custom-built for Malaysian Productivity Corporation (MPC). What was originally scoped as a simple training tracker has evolved into a comprehensive human capital development platform encompassing training program management, annual competency evaluations, compliance tracking, supervisor hierarchy, PDF reporting, and configurable system settings.

**Technology**: React 18 + TypeScript + Supabase (PostgreSQL) + Tailwind CSS + 63 npm packages

---

## Summary of Deliverables

| Category | Count |
|----------|-------|
| Total source files | ~124 |
| Pages built | 39 |
| Custom components | 61 |
| Custom hooks (functions) | 80+ |
| Utility libraries | 9 |
| Database tables | 11 |
| SQL migrations | 9 |
| Protected routes | 32 |
| PDF exports | 4 |
| Charts/visualizations | 5 |

---

## 1. AUTHENTICATION & ACCESS CONTROL SYSTEM

| # | Scope Item | Description |
|---|-----------|-------------|
| 1.1 | Employee email-only login | Custom authentication — employees log in with email only (no password), session stored in localStorage |
| 1.2 | Admin email + password login | Supabase Auth integration for admin accounts |
| 1.3 | Admin PIN lock | Secondary PIN verification (`101010`) on every admin page load, stored in sessionStorage |
| 1.4 | Role-based access control (RBAC) | `admin` and `employee` roles via `user_roles` table, enforced via `ProtectedRoute` wrapper |
| 1.5 | Session management | `getCurrentSession()`, `logout()`, auto-redirect on session expiry |
| 1.6 | Auth context provider | Global `AuthContext` providing user state, role, loading, signIn/signOut to entire app |

---

## 2. DATABASE DESIGN & MIGRATIONS

| # | Scope Item | Description |
|---|-----------|-------------|
| 2.1 | `profiles` table | User profiles with name, email, department, grade, position, status, supervisor_id (self-referencing FK for hierarchy) |
| 2.2 | `user_roles` table | Role assignments (admin/employee) with `app_role` enum |
| 2.3 | `programs` table | Training programs with title, description, category, type (Local/International), dates, hours, location, organizer, trainer, notify_for_evaluation flag |
| 2.4 | `program_assignments` table | Junction table linking users to programs with status tracking (Assigned/Registered/Attended/No-Show), attendance timestamps, certificate linkage |
| 2.5 | `evaluation_templates` table | Reusable evaluation form templates with JSONB questions |
| 2.6 | `evaluations` table | Training feedback submissions with JSONB answers, linked to user/program/template |
| 2.7 | `certificates` table | Training certificates with file URLs, issued dates, uploaded_by tracking |
| 2.8 | `annual_evaluation_cycles` table | Yearly evaluation periods with year, start_date, end_date, status (active/closed) |
| 2.9 | `annual_evaluations` table | Two-stage staff + supervisor assessments with JSONB answers, timestamps, status flow (pending_staff -> pending_supervisor -> completed) |
| 2.10 | `proposed_trainings` table | Employee training proposals (2 per year) with entertained status, admin approval tracking |
| 2.11 | `system_settings` table | Key-value config store (JSONB) for proposal period dates and future settings |
| 2.12 | `reminders_log` table | Reminder/notification send history |
| 2.13 | 9 SQL migrations | Schema creation, bulk uploads support, FK removal for hybrid auth, evaluation flags, annual evaluation system, backfill data, proposed trainings, RLS disable, system settings |
| 2.14 | RLS disable migration | Disabled Row Level Security on ALL tables to support hybrid auth model — security enforced at application level |
| 2.15 | Database indexes | Performance indexes on supervisor_id, cycle_id, user_id, status, year |
| 2.16 | Unique constraints | user+program assignments, user+year proposals, cycle+user evaluations |

---

## 3. ADMIN PANEL (18 Pages)

### 3A. Admin Dashboard
| # | Scope Item | Description |
|---|-----------|-------------|
| 3.1 | Admin dashboard page | Full analytics dashboard with year selector (2023-2035) |
| 3.2 | KPI cards | Total Programs, Active Participants, Completed Programs, Compliance Rate |
| 3.3 | Monthly trend line chart | Recharts line chart showing training activity by month |
| 3.4 | Evaluation summary | Average ratings breakdown by question |
| 3.5 | Leaderboard | Top performers ranked by training hours |

### 3B. Training Program Management (5 Pages)
| # | Scope Item | Description |
|---|-----------|-------------|
| 3.6 | Programs list page | Searchable, filterable table with year/month range filters |
| 3.7 | Program create form | Full form with title, type (Local/International), location, start/end datetime, hours, evaluation flag — Zod validation |
| 3.8 | Program edit form | Edit all program fields with pre-filled values |
| 3.9 | Program details page | Program info card, evaluation summary with radar chart, stacked bar charts, comments list, assigned employees table |
| 3.10 | Program assign page | Bulk employee assignment with department filter, search, checkbox selection, already-assigned table with remove |
| 3.11 | "Penilaian" column | Evaluation requirement status column (Diperlukan/Tidak) based on `notify_for_evaluation` flag |
| 3.12 | Conditional evaluation UI | Program Details hides evaluation summary when `notify_for_evaluation` is false |

### 3C. User Management (4 Pages)
| # | Scope Item | Description |
|---|-----------|-------------|
| 3.13 | Users list page | Searchable table with year/month filter, training hours display, footer totals |
| 3.14 | User create form | Name, email, position with Zod validation |
| 3.15 | User edit form | Edit name, position, supervisor assignment dropdown |
| 3.16 | Bulk user import | CSV file upload, validation, progress indication, success/error counts, downloadable error report |
| 3.17 | Supervisor assignment | Dropdown to assign supervisor, updates both `profiles` and `annual_evaluations` tables simultaneously |

### 3D. Training Evaluations (3+ Pages)
| # | Scope Item | Description |
|---|-----------|-------------|
| 3.18 | Evaluations list page | Year/month filter, "Penilaian" filter dropdown (Semua/Diperlukan/Tidak Diperlukan), table with program name, participant count, response count, average rating badge |
| 3.19 | Evaluation template builder | Custom question builder with add/remove/edit, multiple question types |
| 3.20 | Evaluation template edit | Edit existing templates |
| 3.21 | PDF export | Evaluations summary PDF with MPC logo, filters, detailed table, footer totals |
| 3.22 | Eye icon navigation | Navigates to Program Details instead of feedback dialog |

### 3E. Annual Performance Evaluations (3 Pages)
| # | Scope Item | Description |
|---|-----------|-------------|
| 3.23 | Annual evaluations list | Cycles table with year, period, status, date created; stats cards with year filter |
| 3.24 | Create cycle dialog | Year picker, **configurable start/end date pickers**, staff supervisor validation, auto-creates evaluation records for all active staff |
| 3.25 | Cycle detail page | Header with year and date range, 4 stat cards (Total/Pending Staff/Pending Supervisor/Completed), progress bar |
| 3.26 | Staff evaluations table | Name, position, supervisor, status badge, supervisor score, actions (View/Reset) |
| 3.27 | Search within cycle | Filter staff by name |
| 3.28 | Reset functionality | Reset staff/supervisor/full responses with confirmation dialog and type selector |
| 3.29 | Close cycle | "Tutup Kitaran" button to mark cycle as closed |
| 3.30 | **Edit cycle dates** | "Tetapkan Tarikh" button + calendar date picker dialog to update start/end dates on existing cycle |
| 3.31 | Evaluation result view | View completed evaluation with staff/supervisor answers, radar chart comparison |
| 3.32 | Year filter (2025+) | Hides 2024 demo data across all annual evaluation pages |

### 3F. Attendance Management
| # | Scope Item | Description |
|---|-----------|-------------|
| 3.33 | Attendance page | Program selector, assignments table with toggle buttons for Attended/No-Show per employee |

### 3G. Certificate Management
| # | Scope Item | Description |
|---|-----------|-------------|
| 3.34 | Certificates page | Search + filter by program/user, table with download/delete actions |
| 3.35 | Certificate upload | File upload form with validation |

### 3H. Reports
| # | Scope Item | Description |
|---|-----------|-------------|
| 3.36 | Reports page | 3 report types with tab interface: Training Hours by Users, Program List, International Programs |
| 3.37 | CSV export | Downloadable CSV for all report types |
| 3.38 | PDF export | Formatted PDF reports with MPC logo |

### 3I. Proposed Trainings
| # | Scope Item | Description |
|---|-----------|-------------|
| 3.39 | Proposed trainings page | Year filter, proposals table with employee name, 2 proposals, entertained checkboxes, delete button |
| 3.40 | **Configurable proposal period** | Admin date pickers (Mula/Akhir) with Save button, persisted to `system_settings` table |
| 3.41 | Entertained toggle | Inline checkbox to mark proposals as entertained |

---

## 4. EMPLOYEE PORTAL (8+ Pages)

### 4A. Employee Dashboard
| # | Scope Item | Description |
|---|-----------|-------------|
| 4.1 | Employee dashboard | Year selector, welcome message, training progress, compliance %, pending items |
| 4.2 | Training progress bar | Animated gradient bar showing hours vs 40-hour target |
| 4.3 | 5 KPI stat cards | Training Hours, Compliance %, Pending Evaluations (with flash alert), My Trainings, Propose Training |
| 4.4 | Pending annual eval alert | Orange card with flashing badge, cycle dates, "Mula Penilaian" button |
| 4.5 | Pending supervisee alert | Blue card showing count of staff awaiting evaluation |
| 4.6 | Training leaderboard | Top 10 with rank badges (gold/silver/bronze), hours, circular progress rings, current user highlight |
| 4.7 | Annual evaluation history | List of all years with status badges, supervisor score + rating for completed |
| 4.8 | Propose training card | Appears only during open proposal period, shows year and due date from system settings |

### 4B. Training Management (3 Pages)
| # | Scope Item | Description |
|---|-----------|-------------|
| 4.9 | My Trainings page | Search, year filter, program table with dates/hours/status, certificate download, "Download My Trainings" PDF button |
| 4.10 | My Hours page | KPI cards (Hours Completed, Target, Compliance %), progress bar |
| 4.11 | My Evaluations page | Pending vs Completed tabs, submit button for each pending evaluation |
| 4.12 | Evaluation form | 5 training evaluation questions with LEMAH/SEDERHANA/BAGUS rating, optional comments, color-coded selection |

### 4C. Annual Performance Evaluations (5 Pages)
| # | Scope Item | Description |
|---|-----------|-------------|
| 4.13 | My Annual Evaluation page | Year filter (2025+), status display, score/rating if completed, supervisor info, radar chart |
| 4.14 | Self-evaluation form | 10 competency questions across 4 categories, 5-level rating (Tahap 1-5), radio buttons, validation |
| 4.15 | Evaluation history view | Previous results with radar chart (staff vs supervisor comparison), question breakdown |
| 4.16 | Supervisee evaluations page | List of supervised staff, year filter, status badges, colour-coded score badges (e.g. "85% - Bagus") |
| 4.17 | Supervisee evaluation detail | Read-only view of staff's submitted evaluation |
| 4.18 | Supervisor evaluation form | Supervisor rates their staff on the same 10 competency questions |

### 4D. Proposed Training
| # | Scope Item | Description |
|---|-----------|-------------|
| 4.19 | Proposed training dialog | Modal with 2 proposal input fields, existing proposal detection, update capability, submit button ("Hantar") |
| 4.20 | Dynamic proposal period | Uses `useProposalPeriod()` hook — shows actual due date from system settings instead of hardcoded Feb 28 |

---

## 5. ANNUAL EVALUATION COMPETENCY FRAMEWORK

| # | Scope Item | Description |
|---|-----------|-------------|
| 5.1 | 10 competency questions | Across 4 categories (Kepimpinan, Konsep & Analisa, Pengurusan Kerja, Komunikasi) |
| 5.2 | 5-level scoring system | Tahap 1=2pts, Tahap 2=4pts, Tahap 3=6pts, Tahap 4=8pts, Tahap 5=10pts (max 100) |
| 5.3 | Rating tiers | Cemerlang (80-100%), Bagus (60-79%), Sederhana (40-59%), Lemah (20-39%), Sangat Lemah (0-19%) |
| 5.4 | Two-stage evaluation | Staff self-assessment then supervisor assessment |
| 5.5 | Radar chart comparison | Spider web chart comparing staff vs supervisor scores |
| 5.6 | Score calculation utilities | `calculateTotalScore()`, `calculatePercentage()`, `getRatingLabel()` |

---

## 6. PDF GENERATION & EXPORTS

| # | Scope Item | Description |
|---|-----------|-------------|
| 6.1 | Training certificate PDF | Landscape A4, custom Georgia Pro font, dynamic text positioning, MPC logo, employee name, program title, dates |
| 6.2 | My Trainings PDF | Employee training history with logo header, year filter, program table |
| 6.3 | Training Evaluations PDF | Summary with filters, program table, response counts, average ratings |
| 6.4 | Reports PDF | Multiple report types (hours by user, program list, international) |
| 6.5 | CSV exports | Training hours, program list, error reports |
| 6.6 | Error report CSV | Downloadable CSV for bulk import failures |

---

## 7. DATA VISUALIZATION (Charts)

| # | Scope Item | Description |
|---|-----------|-------------|
| 7.1 | Radar/Spider chart | Annual evaluation staff vs supervisor score comparison (Recharts) |
| 7.2 | Line chart | Monthly training trends on admin dashboard |
| 7.3 | Stacked bar chart | Evaluation breakdown by question (BAGUS/SEDERHANA/LEMAH) |
| 7.4 | Circular progress ring | Compliance percentage on leaderboard and dashboard |
| 7.5 | Animated progress bar | Gradient color bar for training hours progress |

---

## 8. UI COMPONENT LIBRARY (48 Shadcn/ui + 13 Custom)

| # | Scope Item | Description |
|---|-----------|-------------|
| 8.1 | 48 Shadcn/ui components | Accordion, Alert, AlertDialog, Avatar, Badge, Breadcrumb, Button, Calendar, Card, Chart, Checkbox, Collapsible, Command, ContextMenu, Dialog, Drawer, DropdownMenu, Form, HoverCard, Input, Label, Menubar, NavigationMenu, Pagination, Popover, Progress, RadioGroup, ScrollArea, Select, Separator, Sheet, Sidebar, Skeleton, Slider, Sonner, Switch, Table, Tabs, Textarea, Toast, Toggle, ToggleGroup, Tooltip |
| 8.2 | AdminLayout | PIN-protected sidebar, responsive navigation, mobile menu |
| 8.3 | EmployeeLayout | Dynamic menu (shows supervisor items conditionally), mobile sidebar |
| 8.4 | AdminDashboard component | Full analytics with charts and KPIs |
| 8.5 | EmployeeDashboard component | Training progress, alerts, leaderboard |
| 8.6 | UserForm component | Reusable user create/edit form with Zod |
| 8.7 | ProgramForm component | Reusable program create/edit form with conditional fields |
| 8.8 | EvaluationTemplateBuilder | Dynamic question builder interface |
| 8.9 | EvaluationQuestionRenderer | Renders evaluation questions with rating options |
| 8.10 | ProposedTrainingDialog | Modal form for training proposals |
| 8.11 | CertificateUpload component | File upload with validation |
| 8.12 | CircularProgress component | Custom SVG progress ring |
| 8.13 | ProtectedRoute component | Role-based route guard |

---

## 9. CUSTOM HOOKS (80+ Functions across 14 Files)

| # | Hook File | Functions | Description |
|---|-----------|-----------|-------------|
| 9.1 | `usePrograms.ts` | 6 hooks | CRUD for programs + stats queries |
| 9.2 | `useAssignments.ts` | 5 hooks | Assignment CRUD + attendance marking |
| 9.3 | `useEvaluations.ts` | 10 hooks | Templates, submissions, stats, radar data |
| 9.4 | `useAnnualEvaluations.ts` | 16 hooks | Cycles, evaluations, submissions, resets, stats, date updates |
| 9.5 | `useUsers.ts` | 6 hooks | User CRUD + training hours queries |
| 9.6 | `useSupervisors.ts` | 4 hooks | Supervisor queries and assignment |
| 9.7 | `useCertificates.ts` | 4 hooks | Certificate CRUD + download |
| 9.8 | `useProposedTrainings.ts` | 7 hooks | Proposals CRUD + period logic |
| 9.9 | `useDashboardStats.ts` | 3 hooks | Employee + admin dashboard KPIs |
| 9.10 | `useLeaderboard.ts` | 1 hook | Top performers ranking |
| 9.11 | `useBulkImport.ts` | 1 hook | CSV import mutation |
| 9.12 | `useSystemSettings.ts` | 3 hooks | System settings + proposal period |
| 9.13 | `useAdminDashboard.ts` | 1 hook | Enhanced admin stats |
| 9.14 | `use-toast.ts` | 1 hook | Toast notification integration |

---

## 10. UTILITY LIBRARIES (9 Files)

| # | Scope Item | Description |
|---|-----------|-------------|
| 10.1 | `dateUtils.ts` | Malaysian date formatting, range formatting, timezone-safe parsing, date comparisons |
| 10.2 | `certificateGenerator.ts` | PDF certificate generation with custom fonts, dynamic positioning, logo embedding |
| 10.3 | `annualEvaluationQuestions.ts` | 10 competency questions, scoring system, rating labels, category grouping |
| 10.4 | `calculations.ts` | Compliance percentage, hours by category, monthly trends |
| 10.5 | `csvUtils.ts` | CSV export/download functionality |
| 10.6 | `csvParser.ts` | CSV parsing for bulk import with error reporting |
| 10.7 | `pdfUtils.ts` | MPC logo embedding utility for all PDFs |
| 10.8 | `emailOnlyAuth.ts` | Custom hybrid authentication (email-only + admin password) |
| 10.9 | `utils.ts` | Tailwind CSS class merging utility |

---

## 11. RESPONSIVE DESIGN & UX

| # | Scope Item | Description |
|---|-----------|-------------|
| 11.1 | Mobile-first responsive layout | All pages responsive from mobile to desktop |
| 11.2 | Collapsible sidebar | Desktop sidebar collapses to mobile sheet menu |
| 11.3 | Responsive tables | Horizontal scroll on mobile |
| 11.4 | Adaptive grid layouts | 1-column (mobile) to 4-column (desktop) |
| 11.5 | Skeleton loading states | Every page has skeleton placeholders during data load |
| 11.6 | Toast notifications | Success/error feedback on every mutation |
| 11.7 | Confirmation dialogs | Delete confirmations, reset confirmations |
| 11.8 | Color-coded status badges | Consistent badge styling across all status types |
| 11.9 | Flashing reminder badges | Animated alerts for pending items on employee dashboard |
| 11.10 | Dark mode support | Theme toggle via next-themes (currently disabled in UI) |

---

## 12. LOCALIZATION (Malay / Bahasa Malaysia)

| # | Scope Item | Description |
|---|-----------|-------------|
| 12.1 | Malaysian date formatting | "12 Oktober 2025" format throughout |
| 12.2 | Malay UI labels | Status messages, button text, form labels in Malay |
| 12.3 | Bilingual interface | English headers with Malay descriptions |
| 12.4 | Malaysian business terms | Department names, position titles, evaluation terms |

---

## 13. CONFIGURABLE SYSTEM SETTINGS

| # | Scope Item | Description |
|---|-----------|-------------|
| 13.1 | `system_settings` table | Generic key-value JSONB store for system configuration |
| 13.2 | Proposal period settings | Admin-configurable start/end dates for training proposal window |
| 13.3 | Annual evaluation cycle dates | Admin-configurable start/end dates per evaluation cycle |
| 13.4 | `useProposalPeriod()` hook | Dynamic period checking replacing hardcoded Dec 1 - Feb 28 |
| 13.5 | `useUpdateCycleDates()` hook | Update evaluation cycle dates on existing cycles |

---

## 14. BUSINESS RULES IMPLEMENTED

| # | Rule | Description |
|---|------|-------------|
| 14.1 | 40-hour compliance target | Every employee must complete 40 training hours per year |
| 14.2 | Evaluation window | Programs should be evaluated within 3 days of completion |
| 14.3 | Supervisor requirement | All staff must have supervisors before annual evaluation cycle can be created |
| 14.4 | Proposal period | Configurable open period for training proposals (default Dec 1 - Feb 28) |
| 14.5 | 2-proposal limit | Employees can propose maximum 2 trainings per year |
| 14.6 | Two-stage evaluation | Staff self-eval must be completed before supervisor can evaluate |
| 14.7 | Unique constraints | One assignment per user per program, one proposal per user per year |
| 14.8 | Supervisor hierarchy | Self-referencing FK for organizational structure |
| 14.9 | Admin PIN security | Secondary authentication layer for admin pages |
| 14.10 | Year-based data isolation | Filters hide demo/test data (2024 annual evaluations hidden) |

---

## 15. SCOPE VARIATIONS & ADDITIONAL WORK

The following items represent **significant scope creep** beyond the original training management requirement:

| # | Additional Scope | Complexity |
|---|-----------------|------------|
| 1 | Full annual performance evaluation system (10 competency questions, 2-stage flow, radar charts) | **High** |
| 2 | Supervisor hierarchy management with cascading updates | **Medium** |
| 3 | Proposed training system with configurable periods | **Medium** |
| 4 | Custom hybrid authentication (email-only + admin PIN) | **High** |
| 5 | PDF certificate generation with custom fonts | **Medium** |
| 6 | Bulk user import with CSV parsing and error reporting | **Medium** |
| 7 | Admin dashboard with charts and analytics | **Medium** |
| 8 | Employee leaderboard with ranking system | **Low** |
| 9 | Multiple PDF report exports (4 types) | **Medium** |
| 10 | Configurable system settings | **Low** |
| 11 | RLS disable + hybrid auth architecture | **Medium** |
| 12 | 48 Shadcn/ui components customized and integrated | **High** |
| 13 | Full responsive design (mobile + desktop) | **Medium** |
| 14 | Malay localization (date formatting, labels) | **Low** |
| 15 | Evaluation template builder (drag/drop question management) | **Medium** |
| 16 | 9 database migrations with indexes and constraints | **Medium** |
| 17 | Real-time compliance tracking and KPIs | **Low** |
| 18 | Supervisor evaluation workflow (evaluate subordinates) | **Medium** |
| 19 | Reset evaluation functionality (staff/supervisor/full) | **Low** |
| 20 | Training attendance tracking system | **Low** |

---

## Total Scope Summary

| Metric | Value |
|--------|-------|
| **Pages developed** | 39 |
| **Components built** | 61 |
| **Custom hooks** | 80+ |
| **Database tables** | 11 |
| **SQL migrations** | 9 |
| **Routes configured** | 32 |
| **PDF exports** | 4 types |
| **Chart visualizations** | 5 types |
| **npm dependencies managed** | 63 |
| **Utility libraries** | 9 |
| **Business rules implemented** | 10+ |
| **Form validations** | Every form uses Zod |
| **Authentication methods** | 3 (email-only, email+password, PIN) |

This is a **full-scale enterprise Training & Performance Management System**, not a simple training tracker.

---

*Document generated: 9 February 2026*
