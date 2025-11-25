import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProgramsWithStats, useDeleteProgram } from '@/hooks/usePrograms';
import { formatDate } from '@/lib/dateUtils';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
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
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Eye, Edit, Trash2, Search } from 'lucide-react';

const MONTHS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => (currentYear - 2 + i).toString());

export default function ProgramsList() {
  const navigate = useNavigate();
  const { data: programs, isLoading, error } = useProgramsWithStats();
  const deleteProgram = useDeleteProgram();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [programToDelete, setProgramToDelete] = useState<string | null>(null);

  const filteredPrograms = useMemo(() => {
    if (!programs) return [];

    return programs.filter((program) => {
      // Search filter
      const matchesSearch = !searchQuery ||
        program.title.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      const programDate = new Date(program.start_date_time);
      const programYear = programDate.getFullYear().toString();
      const programMonth = programDate.getMonth() + 1;

      const matchesYear = programYear === selectedYear;

      if (!matchesYear) return false;

      // If no month range selected or "all" selected, show all for the year
      if ((!fromMonth || fromMonth === 'all') && (!toMonth || toMonth === 'all')) return true;

      const from = (fromMonth && fromMonth !== 'all') ? parseInt(fromMonth) : 1;
      const to = (toMonth && toMonth !== 'all') ? parseInt(toMonth) : 12;

      return programMonth >= from && programMonth <= to;
    });
  }, [programs, searchQuery, selectedYear, fromMonth, toMonth]);

  const totalHours = useMemo(() => {
    return filteredPrograms.reduce((sum, program) => sum + (program.hours || 0), 0);
  }, [filteredPrograms]);

  const totalAssigned = useMemo(() => {
    return filteredPrograms.reduce((sum, program) => {
      const count = (program as any).program_assignments?.[0]?.count || 0;
      return sum + count;
    }, 0);
  }, [filteredPrograms]);

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
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search program name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={fromMonth} onValueChange={setFromMonth}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="From Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {MONTHS.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-muted-foreground">to</span>

          <Select value={toMonth} onValueChange={setToMonth}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="To Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {MONTHS.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

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
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead className="text-center">Hours</TableHead>
                    <TableHead className="text-center">Assigned</TableHead>
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
                      <TableCell>{formatDate(program.start_date_time)}</TableCell>
                      <TableCell>{formatDate(program.end_date_time)}</TableCell>
                      <TableCell className="text-center">{program.hours}h</TableCell>
                      <TableCell className="text-center">{(program as any).program_assignments?.[0]?.count || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/dashboard/programs/${program.id}`)}
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/dashboard/programs/${program.id}/edit`)}
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
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="font-semibold">Total</TableCell>
                    <TableCell className="text-center font-semibold">{totalHours}h</TableCell>
                    <TableCell className="text-center font-semibold">{totalAssigned}</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableFooter>
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
