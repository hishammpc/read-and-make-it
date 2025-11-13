import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProgram } from '@/hooks/usePrograms';
import { useUsers } from '@/hooks/useUsers';
import { useProgramAssignments, useAssignUsersToProgram, useRemoveAssignment } from '@/hooks/useAssignments';
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
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
  ArrowLeft,
  Calendar,
  Tag,
  UserPlus,
  Users,
  X,
  AlertCircle,
  Loader2,
  Search,
} from 'lucide-react';

export default function ProgramAssign() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: program, isLoading: programLoading, error: programError } = useProgram(id!);
  const { data: users, isLoading: usersLoading } = useUsers();
  const { data: assignments, isLoading: assignmentsLoading } = useProgramAssignments(id!);
  const assignUsers = useAssignUsersToProgram();
  const removeAssignment = useRemoveAssignment();

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [removeAssignmentDialogOpen, setRemoveAssignmentDialogOpen] = useState(false);
  const [assignmentToRemove, setAssignmentToRemove] = useState<string | null>(null);

  // Get unique departments
  const departments = useMemo(() => {
    if (!users) return [];
    const depts = new Set(users.map((user: any) => user.department).filter(Boolean));
    return Array.from(depts).sort();
  }, [users]);

  // Get already assigned user IDs
  const assignedUserIds = useMemo(() => {
    if (!assignments) return new Set<string>();
    return new Set(assignments.map((a: any) => a.user_id));
  }, [assignments]);

  // Filter available users (not already assigned)
  const availableUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((user: any) =>
      !assignedUserIds.has(user.id) && user.status === 'active'
    );
  }, [users, assignedUserIds]);

  // Filter users by department and search
  const filteredUsers = useMemo(() => {
    let filtered = availableUsers;

    // Filter by department
    if (departmentFilter !== 'all') {
      filtered = filtered.filter((user: any) => user.department === departmentFilter);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((user: any) =>
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.department?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [availableUsers, departmentFilter, searchQuery]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleAssignUsers = () => {
    if (!id || selectedUserIds.length === 0) return;

    assignUsers.mutate(
      { programId: id, userIds: selectedUserIds },
      {
        onSuccess: () => {
          setSelectedUserIds([]);
          setSearchQuery('');
        },
      }
    );
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

  if (programError) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/dashboard/programs/${id}`)}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">Assign Users to Program</h1>
          </div>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="w-5 h-5" />
                <div>
                  <h3 className="font-semibold">Error Loading Program</h3>
                  <p className="text-sm text-muted-foreground">{programError.message}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    );
  }

  if (programLoading || usersLoading) {
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
            <h1 className="text-3xl font-bold tracking-tight">Assign Users to Program</h1>
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
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(`/dashboard/programs/${id}`)}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Assign Users to Program</h1>
            <p className="text-muted-foreground">Add employees to this training program</p>
          </div>
        </div>

        {/* Program Information */}
        <Card>
          <CardHeader>
            <CardTitle>Program Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <h3 className="text-lg font-semibold">{program.title}</h3>
                <p className="text-sm text-muted-foreground">{program.description}</p>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{formatDateTime(program.start_date_time)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <Badge variant="outline">{program.category}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Select Users */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="w-5 h-5" />
                  Select Employees
                </CardTitle>
                <CardDescription>
                  Search and select employees to assign to this program
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Command className="border rounded-lg" shouldFilter={false}>
              <CommandInput
                placeholder="Search employees by name, email, or department..."
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                <CommandEmpty>
                  {availableUsers.length === 0
                    ? 'All active employees have been assigned to this program.'
                    : 'No employees found matching your search.'}
                </CommandEmpty>
                <CommandGroup>
                  {filteredUsers.map((user: any) => (
                    <CommandItem
                      key={user.id}
                      value={user.id}
                      onSelect={() => toggleUserSelection(user.id)}
                      className="flex items-center gap-3"
                    >
                      <Checkbox
                        checked={selectedUserIds.includes(user.id)}
                        onCheckedChange={() => toggleUserSelection(user.id)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.email} {user.department && `• ${user.department}`}
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>

            {selectedUserIds.length > 0 && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    {selectedUserIds.length} employee(s) selected
                  </div>
                  <Button
                    onClick={handleAssignUsers}
                    disabled={assignUsers.isPending}
                  >
                    {assignUsers.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Assign Selected Users
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Already Assigned Employees */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Assigned Employees
                </CardTitle>
                <CardDescription>
                  {assignments?.length || 0} employee(s) currently assigned to this program
                </CardDescription>
              </div>
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
                        <Badge
                          variant={
                            assignment.status === 'Attended'
                              ? 'default'
                              : assignment.status === 'No-Show'
                              ? 'destructive'
                              : 'secondary'
                          }
                        >
                          {assignment.status}
                        </Badge>
                      </TableCell>
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
