import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUser, useUpdateUser, useSetUserStatus } from '@/hooks/useUsers';
import { usePotentialSupervisors, useUpdateSupervisor, useStaffBySupervisor } from '@/hooks/useSupervisors';
import { useLanguage } from '@/contexts/LanguageContext';
import { useReturnTo } from '@/hooks/useReturnTo';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { SearchableSelect } from '@/components/common/SearchableSelect';
import { Notice } from '@/components/common/Callout';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { UserForm, UserFormValues } from '@/components/users/UserForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2, UserCog, UserX, Users } from 'lucide-react';

export default function UserEdit() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const tf = t.adminStaff.userForm;
  const { id } = useParams<{ id: string }>();
  // Back to the Users list as the admin left it (filters, sort)
  const usersListPath = useReturnTo('/admin/users');
  const { data: user, isLoading, error } = useUser(id || '');
  const { data: potentialSupervisors } = usePotentialSupervisors(id);
  const updateUser = useUpdateUser();
  const updateSupervisor = useUpdateSupervisor();
  const setUserStatus = useSetUserStatus();
  const { data: directReports } = useStaffBySupervisor(id || '');
  const [selectedSupervisor, setSelectedSupervisor] = useState<string>('none');
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);

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

      navigate(usersListPath);
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
              <Label>{tf.supervisorLabel}</Label>
              {/* ~300 names: searchable */}
              <SearchableSelect
                value={selectedSupervisor}
                onChange={handleSupervisorChange}
                options={(potentialSupervisors || []).map((sup) => ({ value: sup.id, label: `${sup.name} (${sup.email})` }))}
                pinned={[{ value: 'none', label: tf.noSupervisor }]}
                placeholder={tf.supervisorPlaceholder}
                searchPlaceholder={tf.searchSupervisor}
                ariaLabel={tf.supervisorLabel}
                disabled={updateSupervisor.isPending}
                className="sm:w-96"
              />
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

        {/* Account status: leavers are made inactive, not deleted */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-muted-foreground" />
              <CardTitle>{tf.statusTitle}</CardTitle>
              <StatusBadge kind="user" status={user.status} />
            </div>
            <CardDescription>{tf.statusDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Switch
                id="user-active"
                checked={user.status === 'active'}
                disabled={setUserStatus.isPending}
                onCheckedChange={(checked) => {
                  if (checked) setUserStatus.mutate({ id: user.id, status: 'active' });
                  else setConfirmDeactivate(true);
                }}
              />
              <Label htmlFor="user-active">{tf.activeLabel}</Label>
              {setUserStatus.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirmDeactivate} onOpenChange={setConfirmDeactivate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tf.deactivateTitle}</AlertDialogTitle>
            <AlertDialogDescription>{tf.deactivateDescription(user.name)}</AlertDialogDescription>
          </AlertDialogHeader>
          {directReports && directReports.length > 0 && (
            <Notice tone="warning" icon={AlertTriangle}>
              {tf.deactivateTeamWarning(directReports.length)}
            </Notice>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => setUserStatus.mutate({ id: user.id, status: 'inactive' })}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tf.deactivateConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
