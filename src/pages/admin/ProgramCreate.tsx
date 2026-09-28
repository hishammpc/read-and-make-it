import { useNavigate } from 'react-router-dom';
import { useCreateProgram } from '@/hooks/usePrograms';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminLayout from '@/components/layout/AdminLayout';
import ProgramForm from '@/components/programs/ProgramForm';
import { PageHeader } from '@/components/common/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

export default function ProgramCreate() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const tf = t.adminTraining.programForm;
  const createProgram = useCreateProgram();

  const handleSubmit = (data: any) => {
    createProgram.mutate(data, {
      onSuccess: (newProgram) => {
        toast.success(tf.created);
        // Redirect to assignment page for the newly created program
        navigate(`/dashboard/programs/${newProgram.id}/assign`);
      },
    });
  };

  return (
    <AdminLayout>
      <PageHeader title={tf.createTitle} description={tf.createDescription} backTo="/dashboard/programs" />

      <Card>
        <CardHeader>
          <CardTitle>{tf.cardTitle}</CardTitle>
          <CardDescription>{t.adminTraining.shared.requiredFieldsHint}</CardDescription>
        </CardHeader>
        <CardContent>
          <ProgramForm onSubmit={handleSubmit} isLoading={createProgram.isPending} />
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
