import { ReactNode, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useProgram, useDeleteProgram } from '@/hooks/usePrograms';
import { useProgramAssignments, useRemoveAssignment } from '@/hooks/useAssignments';
import { useProgramEvaluationDetails } from '@/hooks/useEvaluations';
import { supabase } from '@/integrations/supabase/client';
import { formatDateTime } from '@/lib/dateUtils';
import { getTrainingRatingTone, toneClasses } from '@/lib/status';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { ToneBadge } from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import {
  Pencil,
  Trash2,
  UserPlus,
  Clock,
  MapPin,
  Calendar,
  Users,
  X,
  ClipboardCheck,
  MessageSquare,
  CheckCircle2,
  MinusCircle,
  SearchX,
  Tag,
} from 'lucide-react';
import { RadarScoreChart } from '@/components/charts/RadarScoreChart';
import { ProgramImprovementDetails } from '@/components/evaluations/ProgramImprovementDetails';
import { formatChange, getChangeTone, getEvaluationFormVersion } from '@/lib/evaluationForms';

/** One label/value pair in the program information grid. */
function InfoItem({
  icon: Icon,
  label,
  children,
  className,
}: {
  icon: typeof Clock;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <dt className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" aria-hidden="true" />
        {label}
      </dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}

export default function ProgramDetails() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const td = t.adminTraining.programDetails;
  const ts = t.adminTraining.shared;
  const tp = t.adminTraining.programs;
  const { id } = useParams<{ id: string }>();
  const { data: program, isLoading, error } = useProgram(id!);
  const { data: assignments, isLoading: assignmentsLoading } = useProgramAssignments(id!);
  const { data: evaluationDetails, isLoading: evaluationLoading } = useProgramEvaluationDetails(id!);
  const deleteProgram = useDeleteProgram();
  const removeAssignment = useRemoveAssignment();

  const { data: programEvaluations } = useQuery({
    queryKey: ['program-evaluations-users', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluations')
        .select('user_id')
        .eq('program_id', id!);
      if (error) throw error;
      return new Set(data.map((e: any) => e.user_id));
    },
    enabled: !!id && !!program?.notify_for_evaluation,
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [removeAssignmentDialogOpen, setRemoveAssignmentDialogOpen] = useState(false);
  const [assignmentToRemove, setAssignmentToRemove] = useState<string | null>(null);

  const handleDelete = () => {
    if (!id) return;
    deleteProgram.mutate(id, {
      onSuccess: () => {
        navigate('/dashboard/programs');
      },
    });
  };

  const handleRemoveAssignment = (assignmentId: string) => {
    setAssignmentToRemove(assignmentId);
    setRemoveAssignmentDialogOpen(true);
  };

  const confirmRemoveAssignment = () => {
    if (assignmentToRemove) {
      removeAssignment.mutate(assignmentToRemove);
      setRemoveAssignmentDialogOpen(false);
      setAssignmentToRemove(null);
    }
  };

  if (error) {
    return (
      <AdminLayout>
        <PageHeader title={td.title} backTo="/dashboard/programs" />
        <ErrorState message={error.message} />
      </AdminLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <PageSkeleton variant="detail" />
      </AdminLayout>
    );
  }

  if (!program) {
    return (
      <AdminLayout>
        <PageHeader title={td.title} backTo="/dashboard/programs" />
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

  const trainingType = program.training_type || 'Local';


  // Programs starting from 2027 use the before/after improvement form
  const formVersion = getEvaluationFormVersion(program.start_date_time);
  const staffNames: Record<string, string> = Object.fromEntries(
    (assignments || []).map((a: any) => [a.user_id, a.profiles?.name || a.profiles?.email || ''])
  );

  // Comments list, shared by both evaluation forms
  const renderComments = (className?: string) =>
    evaluationDetails && evaluationDetails.comments.length > 0 ? (
      <div className={cn('border-t pt-4', className)}>
        <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <MessageSquare className="h-4 w-4" aria-hidden="true" />
          {td.comments(evaluationDetails.comments.length)}
        </h4>
        <div className="max-h-40 space-y-2 overflow-y-auto">
          {evaluationDetails.comments.map((comment, idx) => (
            <div key={idx} className="rounded-lg bg-muted/50 p-3 text-sm">
              {comment}
            </div>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <AdminLayout>
      <PageHeader
        title={program.title}
        description={td.title}
        backTo="/dashboard/programs"
        actions={
          <>
            <Button variant="outline" onClick={() => navigate(`/dashboard/programs/${id}/edit`)}>
              <Pencil className="h-4 w-4" />
              {t.common.edit}
            </Button>
            <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4" />
              {t.common.delete}
            </Button>
          </>
        }
      />

      <div className="space-y-6">
        {/* Program Information */}
        <Card>
          <CardHeader>
            <CardTitle>{td.infoTitle}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              <InfoItem icon={Tag} label={td.trainingType}>
                <ToneBadge tone={trainingType === 'International' ? 'info' : 'muted'}>
                  {t.adminTraining.programForm.trainingTypes[trainingType] ?? trainingType}
                </ToneBadge>
              </InfoItem>

              {program.training_type === 'International' && program.location && (
                <InfoItem icon={MapPin} label={td.location} className="sm:col-span-2 lg:col-span-3">
                  {program.location}
                </InfoItem>
              )}

              <InfoItem icon={Calendar} label={td.start}>
                {formatDateTime(program.start_date_time)}
              </InfoItem>

              <InfoItem icon={Calendar} label={td.end}>
                {formatDateTime(program.end_date_time)}
              </InfoItem>

              <InfoItem icon={Clock} label={td.duration}>
                <span className="tabular-nums">{program.hours}</span> {t.common.hours}
              </InfoItem>

              <InfoItem icon={Users} label={td.participants}>
                <span className="tabular-nums">{assignments?.length || 0}</span>
              </InfoItem>
            </dl>
          </CardContent>
        </Card>

        {/* Evaluation Summary with Radar Chart */}
        {program.notify_for_evaluation && (
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1.5">
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    {td.evaluationSummary}
                  </CardTitle>
                  <CardDescription>
                    {td.responsesReceived(evaluationDetails?.totalResponses || 0, evaluationDetails?.totalAssigned || 0)}
                  </CardDescription>
                </div>
                {evaluationDetails && evaluationDetails.totalResponses > 0 && (
                  formVersion === 2 ? (
                    evaluationDetails.improvement && (
                      <ToneBadge tone={getChangeTone(evaluationDetails.improvement.avgChange)} className="self-start">
                        {td.improvementBadge(formatChange(evaluationDetails.improvement.avgChange))}
                      </ToneBadge>
                    )
                  ) : (
                    <ToneBadge tone={getTrainingRatingTone(evaluationDetails.averageRating)} className="self-start">
                      {evaluationDetails.averageRating} ({evaluationDetails.averageScore.toFixed(2)}/3.00)
                    </ToneBadge>
                  )
                )}
              </div>
            </CardHeader>
            <CardContent>
              {evaluationLoading ? (
                <div className="flex justify-center py-8">
                  <Skeleton className="h-64 w-64 rounded-full" />
                </div>
              ) : !evaluationDetails || evaluationDetails.totalResponses === 0 ? (
                <EmptyState
                  compact
                  icon={ClipboardCheck}
                  title={td.noEvaluationsTitle}
                  description={td.noEvaluationsDescription}
                />
              ) : formVersion === 2 ? (
                evaluationDetails.improvement ? (
                  <div className="space-y-6">
                    <ProgramImprovementDetails improvement={evaluationDetails.improvement} staffNames={staffNames} />
                    {renderComments()}
                  </div>
                ) : (
                  <EmptyState
                    compact
                    icon={ClipboardCheck}
                    title={td.noEvaluationsTitle}
                    description={td.noEvaluationsDescription}
                  />
                )
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Radar Chart */}
                  <div className="h-80">
                    <RadarScoreChart
                      data={evaluationDetails.questionScores.map((q) => ({ subject: q.shortLabel, score: q.avgScore }))}
                      series={[{ dataKey: 'score', label: td.score }]}
                      max={3}
                      formatValue={(value) => value.toFixed(2)}
                    />
                  </div>

                  {/* Question Breakdown */}
                  <div className="space-y-4">
                    <h4 className="text-sm font-medium text-muted-foreground">{td.questionBreakdown}</h4>
                    {evaluationDetails.questionScores.map((q, idx) => {
                      const total = q.bagusCount + q.sederhanaCount + q.lemahCount || 1;
                      const segments = [
                        { rating: 'BAGUS', count: q.bagusCount, className: 'rounded-l' },
                        { rating: 'SEDERHANA', count: q.sederhanaCount, className: '' },
                        { rating: 'LEMAH', count: q.lemahCount, className: 'rounded-r' },
                      ];
                      return (
                        <div key={idx} className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className="truncate pr-4">{q.question}</span>
                            <span className="shrink-0 font-semibold tabular-nums">{q.avgScore.toFixed(2)}</span>
                          </div>
                          <div className="flex h-2 gap-1">
                            {segments.map((s) => (
                              <div
                                key={s.rating}
                                className={cn(toneClasses[getTrainingRatingTone(s.rating)].solid, s.className)}
                                style={{ width: `${(s.count / total) * 100}%` }}
                                title={`${s.rating}: ${s.count}`}
                              />
                            ))}
                          </div>
                          <div className="flex justify-between text-xs">
                            {segments.map((s) => (
                              <span key={s.rating} className={toneClasses[getTrainingRatingTone(s.rating)].text}>
                                {s.rating}: {s.count}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {renderComments('md:col-span-2')}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Assigned Employees */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1.5">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  {ts.assignedStaff}
                </CardTitle>
                <CardDescription>{ts.assignedCount(assignments?.length || 0)}</CardDescription>
              </div>
              <Button onClick={() => navigate(`/dashboard/programs/${id}/assign`)}>
                <UserPlus className="h-4 w-4" />
                {td.assignStaff}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {assignmentsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </div>
            ) : !assignments || assignments.length === 0 ? (
              <EmptyState
                compact
                icon={Users}
                title={ts.noAssignedTitle}
                description={ts.noAssignedDescription}
                action={
                  <Button size="sm" onClick={() => navigate(`/dashboard/programs/${id}/assign`)}>
                    <UserPlus className="h-4 w-4" />
                    {td.assignStaff}
                  </Button>
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.common.name}</TableHead>
                    <TableHead>{t.common.position}</TableHead>
                    <TableHead>{t.common.email}</TableHead>
                    {program.notify_for_evaluation && <TableHead>{td.colEvaluation}</TableHead>}
                    <TableHead className="text-right">
                      <span className="sr-only">{t.common.actions}</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment: any) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {assignment.profiles?.name || ts.unknown}
                      </TableCell>
                      <TableCell>{assignment.profiles?.position || '-'}</TableCell>
                      <TableCell>{assignment.profiles?.email || '-'}</TableCell>
                      {program.notify_for_evaluation && (
                        <TableCell>
                          {programEvaluations?.has(assignment.profiles?.id) ? (
                            <ToneBadge tone="success">
                              <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                              {td.evaluationSubmitted}
                            </ToneBadge>
                          ) : (
                            <ToneBadge tone="muted">
                              <MinusCircle className="h-3 w-3" aria-hidden="true" />
                              {td.evaluationPending}
                            </ToneBadge>
                          )}
                        </TableCell>
                      )}
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive-soft hover:text-destructive"
                          onClick={() => handleRemoveAssignment(assignment.id)}
                          aria-label={ts.removeAssignment}
                          title={ts.removeAssignment}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Program Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tp.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{tp.deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {tp.deleteProgram}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Assignment Dialog */}
      <AlertDialog open={removeAssignmentDialogOpen} onOpenChange={setRemoveAssignmentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{ts.removeTitle}</AlertDialogTitle>
            <AlertDialogDescription>{ts.removeDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveAssignment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {ts.removeConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
