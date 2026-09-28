import { useState } from 'react';
import { usePrograms } from '@/hooks/usePrograms';
import { useProgramAssignments, useUpdateAssignmentStatus } from '@/hooks/useAssignments';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Notice } from '@/components/common/Callout';
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
import { CheckCircle, AlertTriangle, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AttendanceState {
  [assignmentId: string]: 'Attended' | 'No-Show';
}

export default function Attendance() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const ta = t.adminTraining.attendance;
  const ts = t.adminTraining.shared;
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
    if (!user?.userId) {
      toast({
        title: t.common.errorTitle,
        description: ta.notAuthenticated,
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
        markedBy: user.userId,
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
    if (!user?.userId || !assignments || assignments.length === 0) return;

    const unprocessedAssignments = assignments.filter(
      (assignment: any) => assignment.status !== 'Attended'
    );

    if (unprocessedAssignments.length === 0) {
      toast({
        title: ta.infoTitle,
        description: ta.allAlreadyAttended,
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
            markedBy: user.userId,
          })
        )
      );

      // Clear attendance state after successful bulk update
      setAttendanceState({});

      toast({
        title: t.common.success,
        description: ta.markedAttended(unprocessedAssignments.length),
      });
    } catch (error) {
      console.error('Error during bulk update:', error);
      toast({
        title: t.common.errorTitle,
        description: ta.bulkFailed,
        variant: 'destructive',
      });
    } finally {
      setUpdatingIds(new Set());
    }
  };

  const getDisplayStatus = (assignmentId: string, currentStatus: string) => {
    return attendanceState[assignmentId] || currentStatus;
  };

  const hasUnsavedChanges = Object.keys(attendanceState).length > 0;

  return (
    <AdminLayout>
      <PageHeader title={ta.title} description={ta.description} backTo="/dashboard" />

      <div className="space-y-6">
        {/* Program Selection Card */}
        <Card>
          <CardHeader>
            <CardTitle>{ta.selectProgram}</CardTitle>
            <CardDescription>{ta.selectProgramDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            {programsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select value={selectedProgramId} onValueChange={handleProgramChange}>
                <SelectTrigger className="w-full" aria-label={ta.selectProgram}>
                  <SelectValue placeholder={ta.selectProgramPlaceholder} />
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
                      {ta.noPrograms}
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
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1.5">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                    {ts.assignedStaff}
                  </CardTitle>
                  <CardDescription>{ts.assignedCount(assignments?.length || 0)}</CardDescription>
                </div>
                <Button
                  onClick={handleMarkAllAsAttended}
                  disabled={!assignments || assignments.length === 0 || updatingIds.size > 0}
                >
                  <CheckCircle className="h-4 w-4" />
                  {ta.markAllAttended}
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
                />
              ) : (
                <>
                  {hasUnsavedChanges && (
                    <Notice tone="warning" icon={AlertTriangle} className="mb-4">
                      {ta.unsavedChanges}
                    </Notice>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t.common.name}</TableHead>
                        <TableHead>{t.common.email}</TableHead>
                        <TableHead>{t.common.department}</TableHead>
                        <TableHead>{ta.colCurrentStatus}</TableHead>
                        <TableHead>{ta.colMarkAttendance}</TableHead>
                        <TableHead className="text-right">
                          <span className="sr-only">{t.common.actions}</span>
                        </TableHead>
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
                              {assignment.profiles?.name || ts.unknown}
                            </TableCell>
                            <TableCell>{assignment.profiles?.email || '-'}</TableCell>
                            <TableCell>{assignment.profiles?.department || '-'}</TableCell>
                            <TableCell>
                              <StatusBadge kind="assignment" status={displayStatus} />
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
                                  className="cursor-pointer select-none text-sm font-medium"
                                >
                                  {displayStatus === 'Attended'
                                    ? t.status.assignment.Attended
                                    : t.status.assignment['No-Show']}
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
                                  {isUpdating ? t.common.saving : t.common.save}
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
    </AdminLayout>
  );
}
