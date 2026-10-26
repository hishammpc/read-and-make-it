import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUsersWithTrainingHours, type UserWithTrainingHours } from '@/hooks/useUsers';
import { useTableSort } from '@/hooks/useTableSort';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { useReturnState } from '@/hooks/useReturnTo';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge, ToneBadge } from '@/components/common/StatusBadge';
import { SortableTableHead } from '@/components/common/SortableTableHead';
import { SearchableSelect } from '@/components/common/SearchableSelect';
import { PeriodFilter } from '@/components/common/PeriodFilter';
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
import {
  Plus,
  Search,
  Pencil,
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  CircleSlash,
  FileSpreadsheet,
  Upload,
} from 'lucide-react';
import { downloadCSV } from '@/lib/csvUtils';
import type { SortAccessors } from '@/lib/sort';
import {
  TRAINING_TARGET_HOURS,
  countsTowardTarget,
  hoursRemaining,
  isTargetMet,
  matchesTargetBand,
  type TargetBand,
} from '@/lib/trainingTarget';

// BM month names for the CSV (exports stay BM regardless of UI language)
const CSV_MONTHS = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogo', 'Sep', 'Okt', 'Nov', 'Dis'];

/** '' = every user; 'staff' = everyone the 40-hour target applies to; else a band of them */
type TargetFilter = '' | 'staff' | TargetBand;

const FILTER_DEFAULTS = {
  q: '',
  year: String(new Date().getFullYear()),
  from: '',
  to: '',
  target: '' as TargetFilter,
  status: 'all',
  sup: 'all',
};

/** Filters cleared by "Kosongkan penapis" — the period stays as chosen */
const NARROWING_FILTERS = ['q', 'target', 'status', 'sup'] as const;

const remainingFor = (user: UserWithTrainingHours) =>
  countsTowardTarget(user) ? hoursRemaining(user.training_hours) : null;

const USER_SORT: SortAccessors<
  UserWithTrainingHours,
  'name' | 'email' | 'supervisor' | 'status' | 'hours' | 'remaining'
> = {
  name: (user) => user.name,
  email: (user) => user.email,
  supervisor: (user) => user.supervisor_name,
  status: (user) => user.status,
  hours: (user) => user.training_hours,
  remaining: remainingFor,
};

const percentOf = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export default function UsersList() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useLanguage();
  const tu = t.adminStaff.users;
  const returnState = useReturnState();
  const { filters, setFilters, clearFilters } = useUrlFilters(FILTER_DEFAULTS);
  const { q: searchQuery, year: selectedYear, from: fromMonth, to: toMonth, status: statusFilter, sup: supervisorFilter } = filters;
  const targetFilter = filters.target as TargetFilter;
  const { data: users, isLoading, error } = useUsersWithTrainingHours(parseInt(selectedYear), fromMonth, toMonth);

  // Everyone the 40-hour target applies to, for the tiles
  const targetStaff = useMemo(() => (users ?? []).filter((user) => countsTowardTarget(user)), [users]);
  const targetCounts = useMemo(
    () => ({
      met: targetStaff.filter((user) => isTargetMet(user.training_hours)).length,
      below: targetStaff.filter((user) => !isTargetMet(user.training_hours)).length,
      none: targetStaff.filter((user) => user.training_hours <= 0).length,
    }),
    [targetStaff]
  );

  const supervisorOptions = useMemo(() => {
    const byId = new Map<string, string>();
    (users ?? []).forEach((user) => {
      if (user.supervisor_id && user.supervisor_name) byId.set(user.supervisor_id, user.supervisor_name);
    });
    return [...byId]
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [users]);

  const visibleUsers = useMemo(() => {
    if (!users) return users;
    const searchLower = searchQuery.trim().toLowerCase();
    return users.filter((user) => {
      if (searchLower && !user.name.toLowerCase().includes(searchLower) && !user.email.toLowerCase().includes(searchLower)) {
        return false;
      }
      if (statusFilter !== 'all' && user.status !== statusFilter) return false;
      if (supervisorFilter === 'none' && user.supervisor_id) return false;
      if (supervisorFilter !== 'all' && supervisorFilter !== 'none' && user.supervisor_id !== supervisorFilter) {
        return false;
      }
      if (targetFilter) {
        if (!countsTowardTarget(user)) return false;
        if (targetFilter !== 'staff' && !matchesTargetBand(user.training_hours, targetFilter)) return false;
      }
      return true;
    });
  }, [users, searchQuery, statusFilter, supervisorFilter, targetFilter]);

  const { sorted: filteredUsers, sort, toggleSort } = useTableSort(visibleUsers, USER_SORT, {
    key: 'name',
    direction: 'asc',
  });

  const totalTrainingHours = useMemo(
    () => (users ?? []).reduce((sum, user) => sum + (user.training_hours || 0), 0),
    [users]
  );

  const isNarrowed = NARROWING_FILTERS.some((key) => filters[key] !== FILTER_DEFAULTS[key]);
  const toggleTarget = (value: TargetFilter) => setFilters({ target: targetFilter === value ? '' : value });

  const hasFromMonth = !!fromMonth && fromMonth !== 'all';
  const hasToMonth = !!toMonth && toMonth !== 'all';
  const hoursPeriod =
    hasFromMonth || hasToMonth
      ? tu.monthRange(
          hasFromMonth ? t.common.months[parseInt(fromMonth) - 1] : t.common.months[0],
          hasToMonth ? t.common.months[parseInt(toMonth) - 1] : t.common.months[11],
          selectedYear
        )
      : tu.fullYear(selectedYear);

  const handleDownloadCSV = () => {
    const periodLabel =
      hasFromMonth || hasToMonth
        ? `${CSV_MONTHS[(hasFromMonth ? parseInt(fromMonth) : 1) - 1]}–${CSV_MONTHS[(hasToMonth ? parseInt(toMonth) : 12) - 1]} ${selectedYear}`
        : selectedYear;
    const rows = filteredUsers.map((user) => {
      const counted = countsTowardTarget(user);
      return {
        Nama: user.name,
        Emel: user.email,
        Jawatan: user.position || '',
        Penyelia: user.supervisor_name || '',
        Status: user.status === 'active' ? 'Aktif' : 'Tidak aktif',
        Peranan: user.is_admin ? 'Pentadbir' : 'Kakitangan',
        [`Jam latihan (${periodLabel})`]: user.training_hours,
        'Sasaran (jam)': counted ? TRAINING_TARGET_HOURS : '',
        'Baki (jam)': counted ? hoursRemaining(user.training_hours) : '',
        Pencapaian: counted ? (isTargetMet(user.training_hours) ? 'Capai' : 'Belum capai') : 'Tidak dikira',
      };
    });
    const period = periodLabel.replace(/[–\s]+/g, '-').toLowerCase();
    downloadCSV(rows, `jam-latihan-pengguna-${period}.csv`);
    toast({ title: t.common.success, description: tu.csvDownloaded });
  };

  const header = (
    <PageHeader
      title={tu.title}
      description={tu.description}
      actions={
        <>
          <Button variant="outline" onClick={() => navigate('/admin/users/bulk-import')}>
            <Upload className="h-4 w-4" />
            {tu.importCsv}
          </Button>
          <Button onClick={() => navigate('/admin/users/create')}>
            <Plus className="h-4 w-4" />
            {tu.create}
          </Button>
        </>
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

  const tileValue = (value: number) => (isLoading ? <Skeleton className="h-8 w-16" /> : value);

  return (
    <AdminLayout>
      {header}

      <div className="space-y-4">
        {/* The four target tiles also filter the table */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard
            label={tu.statStaff}
            value={tileValue(targetStaff.length)}
            icon={Users}
            tone="primary"
            hint={tu.statStaffHint}
            onClick={() => toggleTarget('staff')}
            active={targetFilter === 'staff'}
          />
          <StatCard
            label={tu.statMet}
            value={tileValue(targetCounts.met)}
            icon={CheckCircle2}
            tone="success"
            hint={tu.shareOfStaff(percentOf(targetCounts.met, targetStaff.length))}
            onClick={() => toggleTarget('met')}
            active={targetFilter === 'met'}
          />
          <StatCard
            label={tu.statBelow}
            value={tileValue(targetCounts.below)}
            icon={AlertTriangle}
            tone="warning"
            hint={tu.shareOfStaff(percentOf(targetCounts.below, targetStaff.length))}
            onClick={() => toggleTarget('below')}
            active={targetFilter === 'below'}
          />
          <StatCard
            label={tu.statNone}
            value={tileValue(targetCounts.none)}
            icon={CircleSlash}
            tone="danger"
            hint={tu.shareOfStaff(percentOf(targetCounts.none, targetStaff.length))}
            onClick={() => toggleTarget('none')}
            active={targetFilter === 'none'}
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
              onChange={(e) => setFilters({ q: e.target.value })}
              className="pl-9"
            />
          </div>

          <PeriodFilter value={filters} onChange={setFilters} />

          <Select value={statusFilter} onValueChange={(status) => setFilters({ status })}>
            <SelectTrigger className="w-full sm:w-40" aria-label={t.common.status}>
              <SelectValue placeholder={t.common.status} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tu.allStatuses}</SelectItem>
              <SelectItem value="active">{t.status.user.active}</SelectItem>
              <SelectItem value="inactive">{t.status.user.inactive}</SelectItem>
            </SelectContent>
          </Select>

          <SearchableSelect
            value={supervisorFilter}
            onChange={(sup) => setFilters({ sup })}
            options={supervisorOptions}
            pinned={[
              { value: 'all', label: t.common.allSupervisors },
              { value: 'none', label: t.common.noSupervisor },
            ]}
            placeholder={t.common.supervisor}
            searchPlaceholder={t.common.searchSupervisor}
            ariaLabel={t.common.supervisor}
            className="sm:w-56"
          />

          <div className="flex items-center gap-2 sm:ml-auto">
            {isNarrowed && (
              <Button variant="ghost" onClick={() => clearFilters([...NARROWING_FILTERS])}>
                {t.common.clearFilters}
              </Button>
            )}
            <Button variant="outline" onClick={handleDownloadCSV} disabled={isLoading || filteredUsers.length === 0}>
              <FileSpreadsheet className="h-4 w-4" />
              {t.common.downloadCsv}
            </Button>
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
                <SortableTableHead sortKey="remaining" sort={sort} onSort={toggleSort} align="right">
                  <span title={tu.remainingHint}>{tu.colRemaining}</span>
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
                    <TableCell colSpan={7}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredUsers.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="p-0">
                    {isNarrowed ? (
                      <EmptyState
                        compact
                        icon={Search}
                        title={t.common.noResults}
                        description={t.common.noResultsHint}
                        action={
                          <Button variant="outline" size="sm" onClick={() => clearFilters([...NARROWING_FILTERS])}>
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
                filteredUsers.map((user) => {
                  const remaining = remainingFor(user);
                  return (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/admin/users/${user.id}/edit`}
                            state={returnState}
                            className="font-medium hover:text-primary hover:underline underline-offset-4"
                          >
                            {user.name}
                          </Link>
                          {user.is_admin && <ToneBadge tone="info">{tu.roleAdmin}</ToneBadge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{user.email}</TableCell>
                      <TableCell>{user.supervisor_name || '—'}</TableCell>
                      <TableCell>
                        <StatusBadge kind="user" status={user.status} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {user.training_hours} {t.common.hoursShort}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {remaining === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : remaining === 0 ? (
                          <ToneBadge tone="success">{tu.targetMet}</ToneBadge>
                        ) : (
                          `${remaining} ${t.common.hoursShort}`
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigate(`/admin/users/${user.id}/edit`, { state: returnState })}
                          aria-label={tu.editUser(user.name)}
                          title={tu.editUser(user.name)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
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
