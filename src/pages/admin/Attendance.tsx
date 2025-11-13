import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrograms } from '@/hooks/usePrograms';
import { useProgramAssignments, useUpdateAssignmentStatus } from '@/hooks/useAssignments';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AttendanceState {
  [assignmentId: string]: 'Attended' | 'No-Show';
}

export default function Attendance() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [attendanceState, setAttendanceState] = useState<AttendanceState>({});
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());

  const { data: programs, isLoading: programsLoading } = usePrograms();
  const { data: assignments, isLoading: assignmentsLoading } = useProgramAssignments(selectedProgramId);
  const updateStatus = useUpdateAssignmentStatus();

  const handleProgramChange = (programId: string) => {
    setSelectedProgramId(programId);
    setAttendanceState({});
  };

  const handleAttendanceToggle = (assignmentId: string, currentStatus: string) => {
    // Toggle between Attended and No-Show
    const newStatus = attendanceState[assignmentId] === 'Attended' || currentStatus === 'Attended'
      ? 'No-Show'
      : 'Attended';

    setAttendanceState(prev => ({
      ...prev,
      [assignmentId]: newStatus
    }));
  };

  const handleSaveAttendance = async (assignmentId: string) => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'User not authenticated',
        variant: 'destructive',
      });
      return;
    }

    const status = attendanceState[assignmentId];
    if (!status) return;

    setUpdatingIds(prev => new Set(prev).add(assignmentId));

    try {
      await updateStatus.mutateAsync({
        assignmentId,
        status,
        markedBy: user.id,
      });

      // Remove from local state after successful save
      setAttendanceState(prev => {
        const newState = { ...prev };
        delete newState[assignmentId];
        return newState;
      });
    } catch (error) {
      console.error('Error updating attendance:', error);
    } finally {
      setUpdatingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(assignmentId);
        return newSet;
      });
    }
  };

  const handleMarkAllAsAttended = async () => {
    if (!user?.id || !assignments || assignments.length === 0) return;

    const unprocessedAssignments = assignments.filter(
      (assignment: any) => assignment.status !== 'Attended'
    );

    if (unprocessedAssignments.length === 0) {
      toast({
        title: 'Info',
        description: 'All employees are already marked as attended',
      });
      return;
    }

    // Set all to updating state
    const allIds = new Set(unprocessedAssignments.map((a: any) => a.id));
    setUpdatingIds(allIds);

    try {
      // Update all assignments in parallel
      await Promise.all(
        unprocessedAssignments.map((assignment: any) =>
          updateStatus.mutateAsync({
            assignmentId: assignment.id,
            status: 'Attended',
            markedBy: user.id,
          })
        )
      );

      // Clear attendance state after successful bulk update
      setAttendanceState({});

      toast({
        title: 'Success',
        description: `Marked ${unprocessedAssignments.length} employee(s) as attended`,
      });
    } catch (error) {
      console.error('Error during bulk update:', error);
      toast({
        title: 'Error',
        description: 'Some updates failed. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingIds(new Set());
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Attended':
        return 'default';
      case 'Assigned':
        return 'secondary';
      case 'No-Show':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getDisplayStatus = (assignmentId: string, currentStatus: string) => {
    return attendanceState[assignmentId] || currentStatus;
  };

  const hasUnsavedChanges = Object.keys(attendanceState).length > 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Attendance Management</h1>
              <p className="text-muted-foreground">Mark attendance for assigned employees</p>
            </div>
          </div>
        </div>

        {/* Program Selection Card */}
        <Card>
          <CardHeader>
            <CardTitle>Select Program</CardTitle>
            <CardDescription>Choose a program to view and mark attendance</CardDescription>
          </CardHeader>
          <CardContent>
            {programsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={selectedProgramId} onValueChange={handleProgramChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a program..." />
                </SelectTrigger>
                <SelectContent>
                  {programs && programs.length > 0 ? (
                    programs.map((program) => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.title} - {program.category}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="no-programs" disabled>
                      No programs available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        {/* Assigned Employees Table */}
        {selectedProgramId && (
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
                <Button
                  onClick={handleMarkAllAsAttended}
                  disabled={!assignments || assignments.length === 0 || updatingIds.size > 0}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark All as Attended
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
                <div className="text-center py-8">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No employees assigned to this program yet.
                  </p>
                </div>
              ) : (
                <>
                  {hasUnsavedChanges && (
                    <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        You have unsaved changes. Click "Save" to update attendance.
                      </p>
                    </div>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Current Status</TableHead>
                        <TableHead>Mark Attendance</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.map((assignment: any) => {
                        const displayStatus = getDisplayStatus(assignment.id, assignment.status);
                        const isUpdating = updatingIds.has(assignment.id);
                        const hasLocalChange = assignment.id in attendanceState;

                        return (
                          <TableRow key={assignment.id}>
                            <TableCell className="font-medium">
                              {assignment.profiles?.name || 'Unknown'}
                            </TableCell>
                            <TableCell>{assignment.profiles?.email || '-'}</TableCell>
                            <TableCell>{assignment.profiles?.department || '-'}</TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(displayStatus)}>
                                {displayStatus}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`attendance-${assignment.id}`}
                                  checked={displayStatus === 'Attended'}
                                  onCheckedChange={() => handleAttendanceToggle(assignment.id, assignment.status)}
                                  disabled={isUpdating}
                                />
                                <label
                                  htmlFor={`attendance-${assignment.id}`}
                                  className="text-sm font-medium cursor-pointer select-none"
                                >
                                  {displayStatus === 'Attended' ? 'Attended' : 'No-Show'}
                                </label>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {hasLocalChange && (
                                <Button
                                  size="sm"
                                  onClick={() => handleSaveAttendance(assignment.id)}
                                  disabled={isUpdating}
                                >
                                  {isUpdating ? 'Saving...' : 'Save'}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
