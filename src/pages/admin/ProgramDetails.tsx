import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProgram, useDeleteProgram } from '@/hooks/usePrograms';
import { useProgramAssignments, useRemoveAssignment } from '@/hooks/useAssignments';
import { formatDate, formatDateTime } from '@/lib/dateUtils';
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
  User,
  Calendar,
  AlertCircle,
  Users,
  X,
} from 'lucide-react';

export default function ProgramDetails() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: program, isLoading, error } = useProgram(id!);
  const { data: assignments, isLoading: assignmentsLoading } = useProgramAssignments(id!);
  const deleteProgram = useDeleteProgram();
  const removeAssignment = useRemoveAssignment();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [removeAssignmentDialogOpen, setRemoveAssignmentDialogOpen] = useState(false);
  const [assignmentToRemove, setAssignmentToRemove] = useState<string | null>(null);

  const handleDelete = () => {
    if (!id) return;
    deleteProgram.mutate(id, {
      onSuccess: () => {
        navigate('/admin/programs');
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

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Completed':
        return 'default';
      case 'Ongoing':
        return 'secondary';
      case 'Cancelled':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getAssignmentStatusBadgeVariant = (status: string) => {
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

  if (error) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/admin/programs')}
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
              onClick={() => navigate('/admin/programs')}
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
              onClick={() => navigate('/admin/programs')}
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
              onClick={() => navigate(`/admin/programs/${id}/edit`)}
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
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Category</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{program.category}</Badge>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Status</div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(program.status)}>
                    {program.status}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground">Description</div>
                <div className="text-sm">
                  {program.description || <span className="text-muted-foreground italic">No description provided</span>}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Duration
                </div>
                <div className="text-sm">{program.hours} hours</div>
              </div>
            </CardContent>
          </Card>

          {/* Schedule & Location */}
          <Card>
            <CardHeader>
              <CardTitle>Schedule & Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                  <MapPin className="w-4 h-4" />
                  Location
                </div>
                <div className="text-sm">
                  {program.location || <span className="text-muted-foreground italic">Not specified</span>}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Personnel */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Personnel</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Organizer
                  </div>
                  <div className="text-sm">
                    {program.organizer || <span className="text-muted-foreground italic">Not specified</span>}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Trainer
                  </div>
                  <div className="text-sm">
                    {program.trainer || <span className="text-muted-foreground italic">Not specified</span>}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

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
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Assigned Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((assignment: any) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {assignment.profiles?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>{assignment.profiles?.email || '-'}</TableCell>
                      <TableCell>{assignment.profiles?.department || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={getAssignmentStatusBadgeVariant(assignment.status)}>
                          {assignment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(assignment.created_at)}</TableCell>
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

        {/* Metadata */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between">
              <span>Created:</span>
              <span>{formatDateTime(program.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Updated:</span>
              <span>{formatDateTime(program.updated_at)}</span>
            </div>
            <div className="flex justify-between">
              <span>Program ID:</span>
              <span className="font-mono text-xs">{program.id}</span>
            </div>
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
