import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePrograms, useDeleteProgram } from '@/hooks/usePrograms';
import { formatDate } from '@/lib/dateUtils';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Plus, Eye, Edit, Trash2, Calendar } from 'lucide-react';

const CATEGORIES = ['All', 'Technical', 'Leadership', 'Soft Skill', 'Mandatory', 'Others'];
const STATUSES = ['All', 'Planned', 'Ongoing', 'Completed', 'Cancelled'];

export default function ProgramsList() {
  const navigate = useNavigate();
  const { data: programs, isLoading, error } = usePrograms();
  const deleteProgram = useDeleteProgram();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [programToDelete, setProgramToDelete] = useState<string | null>(null);

  const filteredPrograms = useMemo(() => {
    if (!programs) return [];

    return programs.filter((program) => {
      const matchesSearch = program.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        program.description?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'All' || program.category === categoryFilter;
      const matchesStatus = statusFilter === 'All' || program.status === statusFilter;

      let matchesDateRange = true;
      if (startDate) {
        matchesDateRange = matchesDateRange && new Date(program.start_date_time) >= new Date(startDate);
      }
      if (endDate) {
        matchesDateRange = matchesDateRange && new Date(program.start_date_time) <= new Date(endDate);
      }

      return matchesSearch && matchesCategory && matchesStatus && matchesDateRange;
    });
  }, [programs, searchQuery, categoryFilter, statusFilter, startDate, endDate]);

  const handleDelete = (id: string) => {
    setProgramToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (programToDelete) {
      deleteProgram.mutate(programToDelete);
      setDeleteDialogOpen(false);
      setProgramToDelete(null);
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

  if (error) {
    return (
      <AdminLayout>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-destructive mb-2">Error Loading Programs</h3>
              <p className="text-muted-foreground">{error.message}</p>
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Programs</h1>
            <p className="text-muted-foreground">Manage training programs and workshops</p>
          </div>
          <Button onClick={() => navigate('/dashboard/programs/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Create Program
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search programs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="Start date"
                  className="pl-9"
                />
              </div>

              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="End date"
                  className="pl-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Programs Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : filteredPrograms.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No programs found. Try adjusting your filters or create a new program.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPrograms.map((program) => (
                    <TableRow key={program.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{program.title}</div>
                          {program.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {program.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{program.category}</TableCell>
                      <TableCell>{formatDate(program.start_date_time)}</TableCell>
                      <TableCell>{program.hours}h</TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(program.status)}>
                          {program.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/admin/programs/${program.id}`)}
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/admin/programs/${program.id}/edit`)}
                            title="Edit program"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(program.id)}
                            title="Delete program"
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Results Count */}
        {!isLoading && filteredPrograms.length > 0 && (
          <div className="text-sm text-muted-foreground text-center">
            Showing {filteredPrograms.length} of {programs?.length || 0} programs
          </div>
        )}

        {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the program
              and remove all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </AdminLayout>
  );
}
