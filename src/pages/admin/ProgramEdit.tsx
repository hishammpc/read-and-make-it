import { useNavigate, useParams } from 'react-router-dom';
import { useProgram, useUpdateProgram } from '@/hooks/usePrograms';
import ProgramForm from '@/components/programs/ProgramForm';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, AlertCircle } from 'lucide-react';

export default function ProgramEdit() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: program, isLoading, error } = useProgram(id!);
  const updateProgram = useUpdateProgram();

  const handleSubmit = (data: any) => {
    if (!id) return;

    updateProgram.mutate(
      { id, updates: data },
      {
        onSuccess: () => {
          navigate(`/admin/programs/${id}`);
        },
      }
    );
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin/programs')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Edit Program</h1>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <div>
                  <h3 className="font-semibold">Error Loading Program</h3>
                  <p className="text-sm text-muted-foreground">{error.message}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin/programs')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <Skeleton className="h-9 w-48 mb-2" />
              <Skeleton className="h-5 w-64" />
            </div>
          </div>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-96" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!program) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin/programs')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Edit Program</h1>
          </div>

          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Program not found.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Format datetime-local values from ISO strings
  const formatDateTimeLocal = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toISOString().slice(0, 16);
  };

  const initialData = {
    ...program,
    start_date_time: formatDateTimeLocal(program.start_date_time),
    end_date_time: formatDateTimeLocal(program.end_date_time),
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/admin/programs/${id}`)}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Program</h1>
            <p className="text-muted-foreground">
              Update the training program details
            </p>
          </div>
        </div>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Program Details</CardTitle>
            <CardDescription>
              Update the information for this training program. Fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProgramForm
              initialData={initialData}
              onSubmit={handleSubmit}
              isLoading={updateProgram.isPending}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
