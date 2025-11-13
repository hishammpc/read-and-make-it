import { useAuth } from '@/contexts/AuthContext';
import { useUserAssignments } from '@/hooks/useAssignments';
import { useUserEvaluations } from '@/hooks/useEvaluations';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ArrowLeft, FileCheck, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function MyEvaluations() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: assignments, isLoading: assignmentsLoading } = useUserAssignments(user?.id || '');
  const { data: evaluations, isLoading: evaluationsLoading } = useUserEvaluations(user?.id || '');

  const isLoading = assignmentsLoading || evaluationsLoading;

  // Get pending evaluations (attended programs without submitted evaluation)
  const getPendingEvaluations = () => {
    if (!assignments || !evaluations) return [];

    const attendedPrograms = assignments.filter((a: any) => a.status === 'Attended');
    const evaluatedProgramIds = new Set(evaluations.map((e: any) => e.program_id));

    return attendedPrograms.filter((a: any) => !evaluatedProgramIds.has(a.program_id));
  };

  const pendingEvaluations = getPendingEvaluations();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="flex items-center h-16 px-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-semibold ml-4">My Evaluations</h1>
          </div>
        </header>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading evaluations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex items-center h-16 px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-semibold ml-4">My Evaluations</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Evaluations
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pendingEvaluations.length}</div>
                <p className="text-xs text-muted-foreground">
                  Programs awaiting your feedback
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Completed Evaluations
                </CardTitle>
                <FileCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{evaluations?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Feedback submitted
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="pending" className="space-y-4">
            <TabsList>
              <TabsTrigger value="pending">
                Pending ({pendingEvaluations.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({evaluations?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {pendingEvaluations.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      No pending evaluations. Great job keeping up with your feedback!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {pendingEvaluations.map((assignment: any) => (
                    <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold">
                                {assignment.programs?.title}
                              </h3>
                              <Badge variant="outline">{assignment.programs?.category}</Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{assignment.programs?.hours} hours</span>
                              </div>
                              <span>
                                {format(
                                  new Date(assignment.programs?.start_date_time),
                                  'MMM dd, yyyy'
                                )}
                              </span>
                            </div>
                          </div>
                          <Button
                            onClick={() =>
                              navigate(
                                `/dashboard/my-evaluations/${assignment.program_id}/submit`
                              )
                            }
                          >
                            Complete Evaluation
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed">
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Program Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Submitted Date</TableHead>
                      <TableHead>Program Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {!evaluations || evaluations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No completed evaluations yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      evaluations.map((evaluation: any) => (
                        <TableRow key={evaluation.id}>
                          <TableCell className="font-medium">
                            {evaluation.programs?.title}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{evaluation.programs?.category || 'N/A'}</Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(evaluation.submitted_at), 'MMM dd, yyyy h:mm a')}
                          </TableCell>
                          <TableCell>
                            {evaluation.programs?.start_date_time
                              ? format(
                                  new Date(evaluation.programs.start_date_time),
                                  'MMM dd, yyyy'
                                )
                              : 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
