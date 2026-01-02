import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUser, useUpdateUser } from '@/hooks/useUsers';
import { usePotentialSupervisors, useUpdateSupervisor } from '@/hooks/useSupervisors';
import AdminLayout from '@/components/layout/AdminLayout';
import { UserForm, UserFormValues } from '@/components/users/UserForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, AlertCircle, Users } from 'lucide-react';

export default function UserEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: user, isLoading, error } = useUser(id || '');
  const { data: potentialSupervisors } = usePotentialSupervisors(id);
  const updateUser = useUpdateUser();
  const updateSupervisor = useUpdateSupervisor();
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>('none');

  // Set initial supervisor when user data loads
  useEffect(() => {
    if (user?.supervisor_id) {
      setSelectedSupervisor(user.supervisor_id);
    }
  }, [user?.supervisor_id]);

  const handleSupervisorChange = async (value: string) => {
    setSelectedSupervisor(value);
    if (id) {
      await updateSupervisor.mutateAsync({
        userId: id,
        supervisorId: value === 'none' ? null : value,
      });
    }
  };

  const handleSubmit = async (values: UserFormValues) => {
    if (!id) return;

    try {
      await updateUser.mutateAsync({
        id,
        updates: {
          name: values.name,
          position: values.position,
        },
      });

      navigate('/admin/users');
    } catch (error) {
      // Error is handled by the mutation's onError callback
      console.error('Failed to update user:', error);
    }
  };

  if (error) {
    return (
      <AdminLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load user: {error.message}
          </AlertDescription>
        </Alert>
      </AdminLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" disabled>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <Skeleton className="h-8 w-[200px]" />
            <Skeleton className="h-4 w-[300px] mt-2" />
          </div>
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-[150px]" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-[100px]" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>User not found</AlertDescription>
        </Alert>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/admin/users')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit User</h1>
          <p className="text-muted-foreground">
            Update user information
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent>
          <UserForm
            defaultValues={{
              name: user.name,
              email: user.email,
              position: user.position || '',
            }}
            onSubmit={handleSubmit}
            isLoading={updateUser.isPending}
            submitLabel="Update User"
          />
        </CardContent>
      </Card>

      {/* Supervisor Assignment Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <CardTitle>Penyelia (Supervisor)</CardTitle>
          </div>
          <CardDescription>
            Tetapkan penyelia untuk kakitangan ini bagi penilaian tahunan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="supervisor">Penyelia</Label>
            <Select
              value={selectedSupervisor}
              onValueChange={handleSupervisorChange}
              disabled={updateSupervisor.isPending}
            >
              <SelectTrigger id="supervisor" className="w-full md:w-[300px]">
                <SelectValue placeholder="Pilih penyelia..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Tiada penyelia</SelectItem>
                {potentialSupervisors?.map((sup) => (
                  <SelectItem key={sup.id} value={sup.id}>
                    {sup.name} ({sup.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {updateSupervisor.isPending && (
              <p className="text-sm text-muted-foreground">Menyimpan...</p>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    </AdminLayout>
  );
}
