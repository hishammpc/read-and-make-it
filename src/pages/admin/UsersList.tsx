import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUsersWithTrainingHours } from '@/hooks/useUsers';
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
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Edit, AlertCircle, Clock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const MONTHS = [
  { value: '1', label: 'Januari' },
  { value: '2', label: 'Februari' },
  { value: '3', label: 'Mac' },
  { value: '4', label: 'April' },
  { value: '5', label: 'Mei' },
  { value: '6', label: 'Jun' },
  { value: '7', label: 'Julai' },
  { value: '8', label: 'Ogos' },
  { value: '9', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Disember' },
];

// Extended years from 2023 to 2035
const YEARS = Array.from({ length: 13 }, (_, i) => (2023 + i).toString());

export default function UsersList() {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');
  const { data: users, isLoading, error } = useUsersWithTrainingHours(parseInt(selectedYear), fromMonth, toMonth);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter and sort users
  const filteredUsers = useMemo(() => {
    if (!users) return [];

    let filtered = users;
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = users.filter((user) =>
        user.name.toLowerCase().includes(searchLower) ||
        user.email.toLowerCase().includes(searchLower)
      );
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [users, searchQuery]);

  // Calculate total training hours
  const totalTrainingHours = useMemo(() => {
    if (!users) return 0;
    return users.reduce((sum, user) => sum + (user.training_hours || 0), 0);
  }, [users]);

  if (error) {
    return (
      <AdminLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load users: {error.message}
          </AlertDescription>
        </Alert>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Users Management</h1>
            <p className="text-muted-foreground">
              Manage user profiles and permissions
            </p>
          </div>
          <div className="hidden md:flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
            <div className="p-2 bg-blue-500 rounded-lg">
              <Clock className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{totalTrainingHours}h</div>
              <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                Total Hours {selectedYear}
                {(fromMonth && fromMonth !== 'all') || (toMonth && toMonth !== 'all')
                  ? ` (${fromMonth && fromMonth !== 'all' ? MONTHS.find(m => m.value === fromMonth)?.label : 'Jan'} - ${toMonth && toMonth !== 'all' ? MONTHS.find(m => m.value === toMonth)?.label : 'Dis'})`
                  : ''}
              </div>
            </div>
          </div>
        </div>
        <Button onClick={() => navigate('/admin/users/create')}>
          <Plus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
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

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Name</TableHead>
                  <TableHead className="font-bold">Email</TableHead>
                  <TableHead className="font-bold">Supervisor</TableHead>
                  <TableHead className="font-bold text-center">Training Hours ({selectedYear})</TableHead>
                  <TableHead className="font-bold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Skeleton className="h-4 w-[150px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[200px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[120px]" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[60px] mx-auto" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-[60px]" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <p className="text-muted-foreground">
                        {searchQuery ? 'No users found matching your search' : 'No users found'}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.supervisor_name || '-'}</TableCell>
                      <TableCell className="text-center">{user.training_hours}h</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/admin/users/${user.id}/edit`)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {!isLoading && filteredUsers.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredUsers.length} of {users?.length || 0} users
        </p>
      )}
      </div>
    </AdminLayout>
  );
}
