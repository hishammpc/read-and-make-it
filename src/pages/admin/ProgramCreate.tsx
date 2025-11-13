import { useNavigate } from 'react-router-dom';
import { useCreateProgram } from '@/hooks/usePrograms';
import AdminLayout from '@/components/layout/AdminLayout';
import ProgramForm from '@/components/programs/ProgramForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function ProgramCreate() {
  const navigate = useNavigate();
  const createProgram = useCreateProgram();

  const handleSubmit = (data: any) => {
    createProgram.mutate(data, {
      onSuccess: () => {
        navigate('/admin/programs');
      },
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin/programs')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Create Program</h1>
            <p className="text-muted-foreground">
              Add a new training program or workshop
            </p>
          </div>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Program Details</CardTitle>
            <CardDescription>
              Enter the information for the new training program. Fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProgramForm
              onSubmit={handleSubmit}
              isLoading={createProgram.isPending}
            />
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
