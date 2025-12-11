import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProgram, useDeleteProgram } from '@/hooks/usePrograms';
import { useProgramAssignments, useRemoveAssignment } from '@/hooks/useAssignments';
import { useProgramEvaluationDetails } from '@/hooks/useEvaluations';
import { formatDateTime } from '@/lib/dateUtils';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  ArrowLeft,
  Edit,
  Trash2,
  UserPlus,
  Clock,
  MapPin,
  Calendar,
  AlertCircle,
  Users,
  X,
  ClipboardCheck,
  MessageSquare,
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

export default function ProgramDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: program, isLoading, error } = useProgram(id!);
  const { data: assignments, isLoading: assignmentsLoading } = useProgramAssignments(id!);
  const { data: evaluationDetails, isLoading: evaluationLoading } = useProgramEvaluationDetails(id!);
  const deleteProgram = useDeleteProgram();
  const removeAssignment = useRemoveAssignment();

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
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard/programs')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Program Details</h1>
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
      </AdminLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <Skeleton className="h-9 w-64 mb-2" />
                <Skeleton className="h-5 w-48" />
              </div>
            </div>
            <Skeleton className="h-10 w-32" />
          </div>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  if (!program) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard/programs')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Program Details</h1>
          </div>

          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">Program not found.</p>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard/programs')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{program.title}</h1>
              <p className="text-muted-foreground">Program Details</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/dashboard/programs/${id}/edit`)}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              variant="destructive"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {/* Program Information */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Program Information</CardTitle>
              <div className="text-right">
                <div className="text-3xl font-bold">{assignments?.length || 0}</div>
                <div className="text-sm text-muted-foreground">Assigned Employees</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Training Type</div>
                <div className="flex items-center gap-2">
                  <Badge variant={program.training_type === 'International' ? 'default' : 'outline'}>
                    {program.training_type || 'Local'}
                  </Badge>
                </div>
              </div>

              {program.training_type === 'International' && program.location && (
                <div className="space-y-2 md:col-span-3">
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Location
                  </div>
                  <div className="text-sm">{program.location}</div>
                </div>
              )}

              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Start Date & Time
                </div>
                <div className="text-sm">{formatDateTime(program.start_date_time)}</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  End Date & Time
                </div>
                <div className="text-sm">{formatDateTime(program.end_date_time)}</div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Duration
                </div>
                <div className="text-sm">{program.hours} hours</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Evaluation Summary with Radar Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="w-5 h-5" />
                  Evaluation Summary
                </CardTitle>
                <CardDescription>
                  {evaluationDetails?.totalResponses || 0} of {evaluationDetails?.totalAssigned || 0} responses received
                </CardDescription>
              </div>
              {evaluationDetails && evaluationDetails.totalResponses > 0 && (
                <Badge
                  className={
                    evaluationDetails.averageRating === 'BAGUS'
                      ? 'bg-green-500 hover:bg-green-600'
                      : evaluationDetails.averageRating === 'SEDERHANA'
                        ? 'bg-yellow-500 hover:bg-yellow-600'
                        : evaluationDetails.averageRating === 'LEMAH'
                          ? 'bg-red-500 hover:bg-red-600'
                          : ''
                  }
                >
                  {evaluationDetails.averageRating} ({evaluationDetails.averageScore.toFixed(2)}/3.00)
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {evaluationLoading ? (
              <div className="flex justify-center py-8">
                <Skeleton className="h-64 w-64 rounded-full" />
              </div>
            ) : !evaluationDetails || evaluationDetails.totalResponses === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No evaluations submitted yet.
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {/* Radar Chart */}
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart
                      data={evaluationDetails.questionScores.map(q => ({
                        subject: q.shortLabel,
                        score: q.avgScore,
                        fullMark: 3,
                      }))}
                    >
                      <PolarGrid />
                      <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                      <PolarRadiusAxis angle={90} domain={[0, 3]} tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(value: number) => [value.toFixed(2), 'Score']}
                      />
                      <Radar
                        name="Score"
                        dataKey="score"
                        stroke="#22c55e"
                        fill="#22c55e"
                        fillOpacity={0.5}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Question Breakdown */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm text-muted-foreground">Question Breakdown</h4>
                  {evaluationDetails.questionScores.map((q, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="truncate pr-4">{q.question}</span>
                        <span className="font-semibold shrink-0">{q.avgScore.toFixed(2)}</span>
                      </div>
                      <div className="flex gap-1 h-2">
                        <div
                          className="bg-green-500 rounded-l"
                          style={{ width: `${(q.bagusCount / (q.bagusCount + q.sederhanaCount + q.lemahCount || 1)) * 100}%` }}
                          title={`BAGUS: ${q.bagusCount}`}
                        />
                        <div
                          className="bg-yellow-500"
                          style={{ width: `${(q.sederhanaCount / (q.bagusCount + q.sederhanaCount + q.lemahCount || 1)) * 100}%` }}
                          title={`SEDERHANA: ${q.sederhanaCount}`}
                        />
                        <div
                          className="bg-red-500 rounded-r"
                          style={{ width: `${(q.lemahCount / (q.bagusCount + q.sederhanaCount + q.lemahCount || 1)) * 100}%` }}
                          title={`LEMAH: ${q.lemahCount}`}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span className="text-green-600">BAGUS: {q.bagusCount}</span>
                        <span className="text-yellow-600">SEDERHANA: {q.sederhanaCount}</span>
                        <span className="text-red-600">LEMAH: {q.lemahCount}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Comments Section */}
                {evaluationDetails.comments.length > 0 && (
                  <div className="md:col-span-2 border-t pt-4">
                    <h4 className="font-semibold text-sm text-muted-foreground flex items-center gap-2 mb-3">
                      <MessageSquare className="w-4 h-4" />
                      Comments & Suggestions ({evaluationDetails.comments.length})
                    </h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {evaluationDetails.comments.map((comment, idx) => (
                        <div key={idx} className="p-3 bg-muted/50 rounded-lg text-sm">
                          {comment}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assigned Employees */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Assigned Employees
                </CardTitle>
                <CardDescription>
                  {assignments?.length || 0} employee(s) assigned to this program
                </CardDescription>
              </div>
              <Button onClick={() => navigate(`/dashboard/programs/${id}/assign`)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Assign Users
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {assignmentsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : !assignments || assignments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No employees assigned to this program yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment: any) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {assignment.profiles?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>{assignment.profiles?.position || '-'}</TableCell>
                      <TableCell>{assignment.profiles?.email || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveAssignment(assignment.id)}
                          title="Remove assignment"
                        >
                          <X className="w-4 h-4 text-destructive" />
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
            <AlertDialogTitle>Delete Program</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this program? This action cannot be undone.
              All associated assignments and data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Program
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove Assignment Dialog */}
      <AlertDialog open={removeAssignmentDialogOpen} onOpenChange={setRemoveAssignmentDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Assignment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this employee from the program?
              This will delete their assignment record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmRemoveAssignment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Assignment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
