import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUsersWithTrainingHours } from '@/hooks/useUsers';
import { useTableSort } from '@/hooks/useTableSort';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { SortableTableHead } from '@/components/common/SortableTableHead';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
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
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Pencil, Clock, Users } from 'lucide-react';
import type { SortAccessors } from '@/lib/sort';

// Extended years from 2023 to 2035
const YEARS = Array.from({ length: 13 }, (_, i) => (2023 + i).toString());

type UserRow = {
  name: string;
  email: string;
  supervisor_name: string | null;
  status: string | null;
  training_hours: number;
};

const USER_SORT: SortAccessors<UserRow, 'name' | 'email' | 'supervisor' | 'status' | 'hours'> = {
  name: (user) => user.name,
  email: (user) => user.email,
  supervisor: (user) => user.supervisor_name,
  status: (user) => user.status,
  hours: (user) => user.training_hours,
};

export default function UsersList() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const tu = t.adminStaff.users;
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');
  const { data: users, isLoading, error } = useUsersWithTrainingHours(parseInt(selectedYear), fromMonth, toMonth);
  const [searchQuery, setSearchQuery] = useState('');

  const searchedUsers = useMemo(() => {
    if (!users || !searchQuery) return users;
    const searchLower = searchQuery.toLowerCase();
    return users.filter((user) =>
      user.name.toLowerCase().includes(searchLower) ||
      user.email.toLowerCase().includes(searchLower)
    );
  }, [users, searchQuery]);
  const { sorted: filteredUsers, sort, toggleSort } = useTableSort(searchedUsers, USER_SORT, {
    key: 'name',
    direction: 'asc',
  });

  // Calculate total training hours
  const totalTrainingHours = useMemo(() => {
    if (!users) return 0;
    return users.reduce((sum, user) => sum + (user.training_hours || 0), 0);
  }, [users]);

  const hasFromMonth = !!fromMonth && fromMonth !== 'all';
  const hasToMonth = !!toMonth && toMonth !== 'all';
  const monthOptions = t.common.months.map((label, index) => ({ value: String(index + 1), label }));
  const hoursPeriod =
    hasFromMonth || hasToMonth
      ? tu.monthRange(
          hasFromMonth ? t.common.months[parseInt(fromMonth) - 1] : t.common.months[0],
          hasToMonth ? t.common.months[parseInt(toMonth) - 1] : t.common.months[11],
          selectedYear
        )
      : tu.fullYear(selectedYear);

  const header = (
    <PageHeader
      title={tu.title}
      description={tu.description}
      actions={
        <Button onClick={() => navigate('/admin/users/create')}>
          <Plus className="h-4 w-4" />
          {tu.create}
        </Button>
      }
    />
  );

  if (error) {
    return (
      <AdminLayout>
        {header}
        <ErrorState message={error.message} />
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      {header}

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={tu.statUsers}
            value={isLoading ? <Skeleton className="h-8 w-16" /> : users?.length ?? 0}
            icon={Users}
            tone="primary"
          />
          <StatCard
            label={tu.statHours}
            value={isLoading ? <Skeleton className="h-8 w-20" /> : `${totalTrainingHours} ${t.common.hoursShort}`}
            icon={Clock}
            tone="info"
            hint={hoursPeriod}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={tu.searchPlaceholder}
              aria-label={t.common.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-full sm:w-28" aria-label={t.common.year}>
              <SelectValue placeholder={t.common.year} />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Select value={fromMonth} onValueChange={setFromMonth}>
              <SelectTrigger className="w-full sm:w-40" aria-label={tu.fromMonth}>
                <SelectValue placeholder={tu.fromMonth} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tu.allMonths}</SelectItem>
                {monthOptions.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-sm text-muted-foreground">{t.common.to.toLowerCase()}</span>

            <Select value={toMonth} onValueChange={setToMonth}>
              <SelectTrigger className="w-full sm:w-40" aria-label={tu.toMonth}>
                <SelectValue placeholder={tu.toMonth} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{tu.allMonths}</SelectItem>
                {monthOptions.map((month) => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead sortKey="name" sort={sort} onSort={toggleSort}>
                  {t.common.name}
                </SortableTableHead>
                <SortableTableHead sortKey="email" sort={sort} onSort={toggleSort}>
                  {t.common.email}
                </SortableTableHead>
                <SortableTableHead sortKey="supervisor" sort={sort} onSort={toggleSort}>
                  {t.common.supervisor}
                </SortableTableHead>
                <SortableTableHead sortKey="status" sort={sort} onSort={toggleSort}>
                  {t.common.status}
                </SortableTableHead>
                <SortableTableHead sortKey="hours" sort={sort} onSort={toggleSort} align="right">
                  {tu.colHours(selectedYear)}
                </SortableTableHead>
                <TableHead className="text-right">
                  <span className="sr-only">{t.common.actions}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={6} className="p-0">
                    {searchQuery ? (
                      <EmptyState
                        compact
                        icon={Search}
                        title={t.common.noResults}
                        description={t.common.noResultsHint}
                        action={
                          <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                            {t.common.clearFilters}
                          </Button>
                        }
                      />
                    ) : (
                      <EmptyState
                        compact
                        icon={Users}
                        title={tu.emptyTitle}
                        description={tu.emptyDescription}
                        action={
                          <Button size="sm" onClick={() => navigate('/admin/users/create')}>
                            <Plus className="h-4 w-4" />
                            {tu.create}
                          </Button>
                        }
                      />
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Link
                        to={`/admin/users/${user.id}/edit`}
                        className="font-medium hover:text-primary hover:underline underline-offset-4"
                      >
                        {user.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>{user.supervisor_name || '—'}</TableCell>
                    <TableCell>
                      <StatusBadge kind="user" status={user.status} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {user.training_hours} {t.common.hoursShort}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => navigate(`/admin/users/${user.id}/edit`)}
                        aria-label={tu.editUser(user.name)}
                        title={tu.editUser(user.name)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {!isLoading && filteredUsers.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {tu.showing(filteredUsers.length, users?.length || 0)}
          </p>
        )}
      </div>
    </AdminLayout>
  );
}
