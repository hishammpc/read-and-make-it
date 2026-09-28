import { useAuth } from '@/contexts/AuthContext';
import { useUserAssignments } from '@/hooks/useAssignments';
import { useUserEvaluations } from '@/hooks/useEvaluations';
import { useLanguage } from '@/contexts/LanguageContext';
import EmployeeLayout from '@/components/layout/EmployeeLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { EmptyState } from '@/components/common/EmptyState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { FileCheck, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { formatMalaysianDate } from '@/lib/dateUtils';

export default function MyEvaluations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const te = t.employee.myEvaluations;
  const { data: assignments, isLoading: assignmentsLoading } = useUserAssignments(user?.userId || '');
  const { data: evaluations, isLoading: evaluationsLoading } = useUserEvaluations(user?.userId || '');

  const isLoading = assignmentsLoading || evaluationsLoading;

  // Get pending evaluations (only programs that require evaluation and haven't been submitted)
  const getPendingEvaluations = () => {
    if (!assignments || !evaluations) return [];

    const evaluatedProgramIds = new Set(evaluations.map((e: any) => e.program_id));

    // Only include programs that require evaluation (notify_for_evaluation = true)
    return assignments.filter(
      (a: any) => a.programs?.notify_for_evaluation === true && !evaluatedProgramIds.has(a.program_id)
    );
  };

  const pendingEvaluations = getPendingEvaluations();

  if (isLoading) {
    return (
      <EmployeeLayout>
        <PageSkeleton variant="table" />
      </EmployeeLayout>
    );
  }

  const completedCount = evaluations?.length || 0;

  return (
    <EmployeeLayout>
      <PageHeader title={te.title} description={te.description} />

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            label={te.pending}
            value={pendingEvaluations.length}
            icon={Clock}
            tone={pendingEvaluations.length > 0 ? 'warning' : 'muted'}
            hint={te.pendingHint}
          />
          <StatCard
            label={te.completed}
            value={completedCount}
            icon={FileCheck}
            tone="success"
            hint={te.completedHint}
          />
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">{te.tabPending(pendingEvaluations.length)}</TabsTrigger>
            <TabsTrigger value="completed">{te.tabCompleted(completedCount)}</TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {pendingEvaluations.length === 0 ? (
              <EmptyState icon={FileCheck} title={te.pendingEmptyTitle} description={te.pendingEmptyDescription} />
            ) : (
              <div className="space-y-3">
                {pendingEvaluations.map((assignment: any) => (
                  <Card key={assignment.id}>
                    <CardContent className="p-5">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-semibold">{assignment.programs?.title}</h3>
                            {assignment.programs?.category && (
                              <Badge variant="outline">{assignment.programs.category}</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {t.employee.shared.hours(assignment.programs?.hours || 0)}
                            </span>
                            <span>{formatMalaysianDate(assignment.programs?.start_date_time)}</span>
                          </div>
                        </div>
                        <Button
                          className="w-full sm:w-auto"
                          onClick={() => navigate(`/dashboard/my-evaluations/${assignment.program_id}/submit`)}
                        >
                          {te.start}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed">
            <Card className="overflow-hidden">
              {!evaluations || evaluations.length === 0 ? (
                <EmptyState
                  compact
                  icon={FileCheck}
                  title={te.completedEmptyTitle}
                  description={te.completedEmptyDescription}
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{te.colProgram}</TableHead>
                      <TableHead>{te.colCategory}</TableHead>
                      <TableHead>{te.colSubmitted}</TableHead>
                      <TableHead>{te.colProgramDate}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluations.map((evaluation: any) => (
                      <TableRow key={evaluation.id}>
                        <TableCell className="max-w-sm font-medium">{evaluation.programs?.title}</TableCell>
                        <TableCell>
                          {evaluation.programs?.category ? (
                            <Badge variant="outline">{evaluation.programs.category}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatMalaysianDate(evaluation.submitted_at)}
                          <span className="text-muted-foreground">
                            {', '}
                            {format(new Date(evaluation.submitted_at), 'h:mm a')}
                          </span>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {evaluation.programs?.start_date_time ? (
                            formatMalaysianDate(evaluation.programs.start_date_time)
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </EmployeeLayout>
  );
}
