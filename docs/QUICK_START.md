# Quick Start Guide for Implementation

## 🎯 Goal
Complete Phase 1 MVP of MyLearning Pro - a training management system ready for production deployment.

## 📚 Read These First
1. **[IMPLEMENTATION_BRIEF.md](./IMPLEMENTATION_BRIEF.md)** - Complete detailed specifications
2. **[mylearning promd.txt](./mylearning%20promd.txt)** - Original project requirements
3. **[../README.md](../README.md)** - Project overview

## 🚀 Implementation Strategy

### Step 1: Understand Current State
- ✅ Auth system works (login/signup)
- ✅ Database schema exists (check `supabase/migrations/`)
- ✅ UI shells exist (AdminDashboard, EmployeeDashboard)
- ❌ No data fetching/display
- ❌ No CRUD operations
- ❌ No forms implemented

### Step 2: Start with Core Admin Features
**Priority Order:**
1. **Program CRUD** (most important)
   - Create `/src/pages/admin/ProgramsList.tsx`
   - Create `/src/pages/admin/ProgramCreate.tsx`
   - Create `/src/pages/admin/ProgramEdit.tsx`
   - Create `/src/hooks/usePrograms.ts` (React Query hooks)
   - Update routing in `App.tsx`

2. **User Management**
   - Similar structure to Programs
   - Use Supabase Admin API for user creation

3. **Dashboard with Real Data**
   - Update `AdminDashboard.tsx` to fetch real stats
   - Use React Query for data fetching

4. **Program Assignment**
   - Multi-select user picker
   - Bulk assignment functionality

### Step 3: Attendance & Evaluations
5. Attendance Management
6. Evaluation Templates & Submission
7. Employee Evaluation Flow

### Step 4: Certificates & Reports
8. Certificate Upload/Download
9. Reports Generation (CSV/PDF)

### Step 5: Employee Features
10. My Trainings
11. My Evaluations
12. My Certificates
13. My Hours

### Step 6: Polish & Test
14. Error handling
15. Loading states
16. Responsive design
17. Testing
18. Documentation

## 🔑 Key Implementation Patterns

### Data Fetching Pattern
```tsx
// hooks/usePrograms.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function usePrograms() {
  return useQuery({
    queryKey: ['programs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateProgram() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (program: ProgramInput) => {
      const { data, error } = await supabase
        .from('programs')
        .insert(program)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['programs'] });
    },
  });
}
```

### Form Pattern
```tsx
// Use React Hook Form + Zod
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1, 'Title is required'),
  // ... more fields
});

function ProgramForm() {
  const form = useForm({
    resolver: zodResolver(schema),
  });
  
  const createProgram = useCreateProgram();
  
  const onSubmit = (data) => {
    createProgram.mutate(data);
  };
  
  return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>;
}
```

### Routing Pattern
```tsx
// Add to App.tsx Routes
<Route
  path="/dashboard/programs"
  element={
    <ProtectedRoute>
      <ProgramsList />
    </ProtectedRoute>
  }
/>
```

## 🗂️ File Structure to Create

```
src/
├── pages/
│   ├── admin/
│   │   ├── ProgramsList.tsx
│   │   ├── ProgramCreate.tsx
│   │   ├── ProgramEdit.tsx
│   │   ├── ProgramDetails.tsx
│   │   ├── UsersList.tsx
│   │   ├── UserCreate.tsx
│   │   ├── UserEdit.tsx
│   │   ├── Attendance.tsx
│   │   ├── Evaluations.tsx
│   │   ├── Certificates.tsx
│   │   └── Reports.tsx
│   └── employee/
│       ├── MyTrainings.tsx
│       ├── MyEvaluations.tsx
│       ├── MyCertificates.tsx
│       └── MyHours.tsx
├── hooks/
│   ├── usePrograms.ts
│   ├── useUsers.ts
│   ├── useAttendance.ts
│   ├── useEvaluations.ts
│   ├── useCertificates.ts
│   └── useReports.ts
├── components/
│   ├── programs/
│   │   ├── ProgramForm.tsx
│   │   ├── ProgramCard.tsx
│   │   └── ProgramTable.tsx
│   ├── users/
│   │   ├── UserForm.tsx
│   │   └── UserTable.tsx
│   └── ... (other component folders)
└── lib/
    ├── dateUtils.ts
    ├── csvUtils.ts
    └── pdfUtils.ts
```

## ✅ Checklist Before Starting

- [ ] Read IMPLEMENTATION_BRIEF.md completely
- [ ] Understand database schema (check migrations)
- [ ] Verify Supabase connection works
- [ ] Test authentication flow
- [ ] Review existing components (shadcn-ui)
- [ ] Set up environment variables

## 🎨 UI Guidelines

- Use shadcn-ui components (already installed)
- Follow Apple-style minimal design
- Use Tailwind CSS for styling
- Implement dark mode support
- Make everything responsive (mobile-first)
- Use Lucide React for icons
- Show loading states (Skeleton components)
- Use Sonner for toast notifications

## 🐛 Common Gotchas

1. **RLS Policies:** Make sure RLS policies allow admin access
2. **Service Role Key:** Never expose to client - use server-side only
3. **Date Handling:** Use date-fns for date operations
4. **File Uploads:** Use Supabase Storage API
5. **Form Validation:** Always validate with Zod
6. **Error Handling:** Show user-friendly error messages
7. **Loading States:** Always show loading during async operations

## 📊 Database Queries Reference

### Get Training Hours for User
```sql
SELECT SUM(p.hours) 
FROM program_assignments pa
JOIN programs p ON pa.program_id = p.id
WHERE pa.user_id = $1 
  AND pa.status = 'Attended'
  AND EXTRACT(YEAR FROM p.end_date_time) = EXTRACT(YEAR FROM NOW())
```

### Get Upcoming Programs
```sql
SELECT * FROM programs
WHERE start_date_time BETWEEN NOW() AND NOW() + INTERVAL '7 days'
ORDER BY start_date_time ASC
```

### Get Overdue Evaluations
```sql
SELECT p.* FROM programs p
JOIN program_assignments pa ON p.id = pa.program_id
LEFT JOIN evaluations e ON p.id = e.program_id AND pa.user_id = e.user_id
WHERE pa.status = 'Attended'
  AND p.end_date_time < NOW() - INTERVAL '3 days'
  AND e.id IS NULL
```

## 🚢 Deployment Checklist

Before deploying:
- [ ] All features implemented
- [ ] All forms validated
- [ ] Error handling in place
- [ ] Loading states everywhere
- [ ] Responsive design tested
- [ ] Dark mode works
- [ ] Build succeeds (`npm run build`)
- [ ] Environment variables set
- [ ] RLS policies verified
- [ ] First admin user created

## 💡 Pro Tips

1. **Start Small:** Implement one feature completely before moving to next
2. **Test As You Go:** Don't wait until the end to test
3. **Reuse Components:** Create reusable components early
4. **Use TypeScript:** Type everything properly
5. **Follow Patterns:** Use consistent patterns throughout
6. **Document Complex Logic:** Add comments for tricky parts
7. **Handle Edge Cases:** Empty states, errors, loading

## 🆘 Need Help?

- Check [IMPLEMENTATION_BRIEF.md](./IMPLEMENTATION_BRIEF.md) for detailed specs
- Review existing code patterns in the codebase
- Check Supabase docs: https://supabase.com/docs
- Check React Query docs: https://tanstack.com/query/latest
- Check shadcn-ui docs: https://ui.shadcn.com

---

**Ready to code? Start with Program CRUD - it's the foundation for everything else!**

