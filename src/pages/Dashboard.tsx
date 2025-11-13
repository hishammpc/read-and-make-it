import { useAuth } from '@/contexts/AuthContext';
import AdminDashboard from '@/components/dashboard/AdminDashboard';
import EmployeeDashboard from '@/components/dashboard/EmployeeDashboard';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { role, loading } = useAuth();

  if (loading || !role) {
    return (
      <div className="min-h-screen p-8">
        <div className="space-y-4">
          <Skeleton className="h-12 w-full max-w-md" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return role === 'admin' ? <AdminDashboard /> : <EmployeeDashboard />;
}
