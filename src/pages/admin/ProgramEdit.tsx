import { useNavigate, useParams } from 'react-router-dom';
import { useProgram, useUpdateProgram } from '@/hooks/usePrograms';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminLayout from '@/components/layout/AdminLayout';
import ProgramForm from '@/components/programs/ProgramForm';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SearchX } from 'lucide-react';

export default function ProgramEdit() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const tf = t.adminTraining.programForm;
  const ts = t.adminTraining.shared;
  const { id } = useParams<{ id: string }>();
  const { data: program, isLoading, error } = useProgram(id!);
  const updateProgram = useUpdateProgram();

  const handleSubmit = (data: any) => {
    if (!id) return;

    updateProgram.mutate(
      { id, updates: data },
      {
        onSuccess: () => {
          navigate(`/dashboard/programs/${id}`);
        },
      }
    );
  };

  if (error) {
    return (
      <AdminLayout>
        <PageHeader title={tf.editTitle} backTo="/dashboard/programs" />
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

  if (!program) {
    return (
      <AdminLayout>
        <PageHeader title={tf.editTitle} backTo="/dashboard/programs" />
        <EmptyState
          icon={SearchX}
          title={ts.programNotFoundTitle}
          description={ts.programNotFoundDescription}
          action={
            <Button variant="outline" size="sm" onClick={() => navigate('/dashboard/programs')}>
              {ts.backToPrograms}
            </Button>
          }
        />
      </AdminLayout>
    );
  }

  // Format datetime-local values from ISO strings using local time (not UTC)
  const formatDateTimeLocal = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const initialData = {
    ...program,
    start_date_time: formatDateTimeLocal(program.start_date_time),
    end_date_time: formatDateTimeLocal(program.end_date_time),
  };

  return (
    <AdminLayout>
      <PageHeader title={tf.editTitle} description={tf.editDescription} backTo={`/dashboard/programs/${id}`} />

      <Card>
        <CardHeader>
          <CardTitle>{tf.cardTitle}</CardTitle>
          <CardDescription>{ts.requiredFieldsHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <ProgramForm
            initialData={initialData}
            onSubmit={handleSubmit}
            isLoading={updateProgram.isPending}
          />
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
