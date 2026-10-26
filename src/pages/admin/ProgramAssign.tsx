import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProgram } from '@/hooks/usePrograms';
import { useUsers } from '@/hooks/useUsers';
import { useProgramAssignments, useAssignUsersToProgram, useRemoveAssignment } from '@/hooks/useAssignments';
import { formatDateTime } from '@/lib/dateUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { ErrorState } from '@/components/common/ErrorState';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
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
  Calendar,
  Tag,
  UserPlus,
  Users,
  X,
  Loader2,
  SearchX,
} from 'lucide-react';

export default function ProgramAssign() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const ta = t.adminTraining.assign;
  const ts = t.adminTraining.shared;
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

    // Sort alphabetically by name (copy first: `filtered` may be the memoized list itself)
    return [...filtered].sort((a, b) => {
      const nameA = a.name?.toLowerCase() || '';
      const nameB = b.name?.toLowerCase() || '';
      return nameA.localeCompare(nameB);
    });
  }, [availableUsers, departmentFilter, searchQuery]);

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const allShownSelected =
    filteredUsers.length > 0 && filteredUsers.every((user: any) => selectedUserIds.includes(user.id));

  // Adds everyone the current search / department filter shows (keeps earlier picks)
  const selectAllShown = () =>
    setSelectedUserIds((prev) => [...new Set([...prev, ...filteredUsers.map((user: any) => user.id as string)])]);

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
        <PageHeader title={ta.title} backTo={`/dashboard/programs/${id}`} />
        <ErrorState message={programError.message} />
      </AdminLayout>
    );
  }

  if (programLoading || usersLoading) {
    return (
      <AdminLayout>
        <PageSkeleton variant="detail" />
      </AdminLayout>
    );
  }

  if (!program) {
    return (
      <AdminLayout>
        <PageHeader title={ta.title} backTo="/dashboard/programs" />
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

  return (
    <AdminLayout>
      <PageHeader title={ta.title} description={ta.description} backTo={`/dashboard/programs/${id}`} />

      <div className="space-y-6">
        {/* Program Information */}
        <Card>
          <CardHeader>
            <CardTitle>{program.title}</CardTitle>
            {program.description && <CardDescription>{program.description}</CardDescription>}
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <span>{formatDateTime(program.start_date_time)}</span>
              </div>
              {program.category && (
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <Badge variant="outline">{program.category}</Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Select Users */}
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1.5">
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  {ta.selectTitle}
                </CardTitle>
                <CardDescription>{ta.selectDescription}</CardDescription>
              </div>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full sm:w-56" aria-label={t.common.department}>
                  <SelectValue placeholder={ta.allDepartments} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{ta.allDepartments}</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="text-muted-foreground">{ta.shownCount(filteredUsers.length)}</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={selectAllShown} disabled={allShownSelected}>
                  {ta.selectAllShown(filteredUsers.length)}
                </Button>
                {selectedUserIds.length > 0 && (
                  <Button variant="ghost" size="sm" onClick={() => setSelectedUserIds([])}>
                    {ta.clearSelection}
                  </Button>
                )}
              </div>
            </div>
            <Command className="rounded-lg border" shouldFilter={false}>
              <CommandInput
                placeholder={ta.searchPlaceholder}
                aria-label={t.common.search}
                value={searchQuery}
                onValueChange={setSearchQuery}
              />
              <CommandList>
                <CommandEmpty>
                  {availableUsers.length === 0 ? ta.allAssigned : ta.noMatch}
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
                        aria-label={user.name}
                      />
                      <div className="min-w-0 flex-1">
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
              <div className="mt-4 flex flex-col gap-3 rounded-lg bg-muted p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm font-medium">{ta.selectedCount(selectedUserIds.length)}</div>
                <Button onClick={handleAssignUsers} disabled={assignUsers.isPending}>
                  {assignUsers.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {ta.assigning}
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      {ta.assignSelected}
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Already Assigned Employees */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              {ts.assignedStaff}
            </CardTitle>
            <CardDescription>{ts.assignedCount(assignments?.length || 0)}</CardDescription>
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t.common.name}</TableHead>
                    <TableHead>{t.common.email}</TableHead>
                    <TableHead>{t.common.department}</TableHead>
                    <TableHead>{t.common.status}</TableHead>
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
                      <TableCell>{assignment.profiles?.email || '-'}</TableCell>
                      <TableCell>{assignment.profiles?.department || '-'}</TableCell>
                      <TableCell>
                        <StatusBadge kind="assignment" status={assignment.status} />
                      </TableCell>
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
