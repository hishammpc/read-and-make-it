import { useNavigate } from 'react-router-dom';
import { useCreateUser } from '@/hooks/useUsers';
import { UserForm, UserFormValues } from '@/components/users/UserForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function UserCreate() {
  const navigate = useNavigate();
  const createUser = useCreateUser();

  const handleSubmit = async (values: UserFormValues) => {
    try {
      await createUser.mutateAsync({
        name: values.name,
        email: values.email,
        department: values.department,
        grade: values.grade,
        position: values.position,
        role: values.role,
      });
      navigate('/admin/users');
    } catch (error) {
      // Error is handled by the mutation's onError callback
      console.error('Failed to create user:', error);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/admin/users')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create User</h1>
          <p className="text-muted-foreground">
            Add a new user to the system
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Information</CardTitle>
        </CardHeader>
        <CardContent>
          <UserForm
            onSubmit={handleSubmit}
            isLoading={createUser.isPending}
            submitLabel="Create User"
          />
        </CardContent>
      </Card>
    </div>
  );
}
