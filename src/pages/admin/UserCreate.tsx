import { useNavigate } from 'react-router-dom';
import { useCreateUser } from '@/hooks/useUsers';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { UserForm, UserFormValues } from '@/components/users/UserForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function UserCreate() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const tf = t.adminStaff.userForm;
  const createUser = useCreateUser();

  const handleSubmit = async (values: UserFormValues) => {
    try {
      await createUser.mutateAsync({
        name: values.name,
        email: values.email,
        position: values.position,
      });
      navigate('/admin/users');
    } catch (error) {
      // Error is handled by the mutation's onError callback
      console.error('Failed to create user:', error);
    }
  };

  return (
    <AdminLayout>
      <PageHeader
        title={tf.createTitle}
        description={tf.createDescription}
        backTo="/admin/users"
        backLabel={tf.backToUsers}
      />

      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle>{tf.infoTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <UserForm
            onSubmit={handleSubmit}
            isLoading={createUser.isPending}
            submitLabel={tf.createSubmit}
          />
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
