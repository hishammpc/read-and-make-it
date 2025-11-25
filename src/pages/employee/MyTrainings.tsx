import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserAssignments } from '@/hooks/useAssignments';
import { useUserEvaluations } from '@/hooks/useEvaluations';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Search, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function MyTrainings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: assignments, isLoading: assignmentsLoading } = useUserAssignments(user?.userId || '');
  const { data: evaluations, isLoading: evaluationsLoading } = useUserEvaluations(user?.userId || '');
  const [searchQuery, setSearchQuery] = useState('');

  const isLoading = assignmentsLoading || evaluationsLoading;

  // Get set of program IDs that have been evaluated
  const evaluatedProgramIds = new Set(evaluations?.map((e: any) => e.program_id) || []);

  const filteredAssignments = () => {
    if (!assignments) return [];

    let filtered = assignments;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((a: any) =>
        a.programs?.title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

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
            <h1 className="text-xl font-semibold ml-4">My Trainings</h1>
          </div>
        </header>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading trainings...</p>
          </div>
        </div>
      </div>
    );
  }

  const assignmentsList = filteredAssignments();

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
          <h1 className="text-xl font-semibold ml-4">My Trainings</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Search Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <span className="text-sm text-muted-foreground">
              {assignmentsList.length} program{assignmentsList.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Trainings Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Program Title</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Evaluation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignmentsList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No trainings assigned
                    </TableCell>
                  </TableRow>
                ) : (
                  assignmentsList.map((assignment: any) => {
                    const isEvaluated = evaluatedProgramIds.has(assignment.program_id);

                    return (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">
                          {assignment.programs?.title}
                        </TableCell>
                        <TableCell>
                          {format(new Date(assignment.programs?.start_date_time), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {assignment.programs?.hours} hrs
                          </div>
                        </TableCell>
                        <TableCell>
                          {isEvaluated ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-sm font-medium">Done</span>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-orange-600 border-orange-300 hover:bg-orange-50"
                              onClick={() => navigate(`/dashboard/my-evaluations/${assignment.program_id}/submit`)}
                            >
                              <AlertCircle className="h-4 w-4 mr-1" />
                              Submit
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </main>
    </div>
  );
}
