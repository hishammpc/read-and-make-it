import { useAuth } from '@/contexts/AuthContext';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard';
import { PageSkeleton } from '@/components/common/PageSkeleton';

export default function Dashboard() {
  const { role, loading } = useAuth();

  if (loading || !role) {
    // Role (and so the layout) isn't known yet: mirror the shell's content padding.
    return (
      <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <PageSkeleton variant="dashboard" />
        </div>
      </div>
    );
  }

  return role === 'admin' ? <AdminDashboard /> : <EmployeeDashboard />;
}
