import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUser, useUpdateUser } from '@/hooks/useUsers';
import { usePotentialSupervisors, useUpdateSupervisor } from '@/hooks/useSupervisors';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { UserForm, UserFormValues } from '@/components/users/UserForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, UserX, Users } from 'lucide-react';

export default function UserEdit() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const tf = t.adminStaff.userForm;
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
          email: values.email.toLowerCase().trim(),
          position: values.position,
        },
      });

      navigate('/admin/users');
    } catch (error) {
      // Error is handled by the mutation's onError callback
      console.error('Failed to update user:', error);
    }
  };

  const header = (
    <PageHeader
      title={tf.editTitle}
      description={tf.editDescription}
      backTo="/admin/users"
      backLabel={tf.backToUsers}
    />
  );

  if (error) {
    return (
      <AdminLayout>
        {header}
        <ErrorState message={error.message} />
      </AdminLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <PageSkeleton variant="form" />
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        {header}
        <EmptyState icon={UserX} title={tf.notFoundTitle} description={tf.notFoundDescription} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {header}

      <div className="max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{tf.infoTitle}</CardTitle>
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
              submitLabel={tf.updateSubmit}
            />
          </CardContent>
        </Card>

        {/* Supervisor Assignment Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-muted-foreground" />
              <CardTitle>{tf.supervisorTitle}</CardTitle>
            </div>
            <CardDescription>{tf.supervisorDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="supervisor">{tf.supervisorLabel}</Label>
              <Select
                value={selectedSupervisor}
                onValueChange={handleSupervisorChange}
                disabled={updateSupervisor.isPending}
              >
                <SelectTrigger id="supervisor" className="w-full sm:w-80">
                  <SelectValue placeholder={tf.supervisorPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{tf.noSupervisor}</SelectItem>
                  {potentialSupervisors?.map((sup) => (
                    <SelectItem key={sup.id} value={sup.id}>
                      {sup.name} ({sup.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground" aria-live="polite">
                {updateSupervisor.isPending ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {t.common.saving}
                  </>
                ) : (
                  tf.supervisorAutoSave
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
