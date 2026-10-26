import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeamTrainingHours, type TeamMember } from '@/hooks/useSupervisors';
import { useTableSort } from '@/hooks/useTableSort';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import { useToast } from '@/hooks/use-toast';
import { downloadCSV } from '@/lib/csvUtils';
import { YEAR_OPTIONS } from '@/lib/period';
import type { SortAccessors } from '@/lib/sort';
import {
  TRAINING_TARGET_HOURS,
  countsTowardTarget,
  hoursRemaining,
  isTargetMet,
  matchesTargetBand,
  type TargetBand,
} from '@/lib/trainingTarget';
import EmployeeLayout from '@/components/layout/EmployeeLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { ToneBadge } from '@/components/common/StatusBadge';
import { SortableTableHead } from '@/components/common/SortableTableHead';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, CheckCircle2, CircleSlash, FileSpreadsheet, Search, Users } from 'lucide-react';

const FILTER_DEFAULTS = { year: String(new Date().getFullYear()), q: '', target: '' as '' | TargetBand };

// Team members are active by definition; only an admin account is left out of the target
const counted = (member: TeamMember) => countsTowardTarget({ status: 'active', is_admin: member.is_admin });
const remainingFor = (member: TeamMember) => (counted(member) ? hoursRemaining(member.training_hours) : null);

const TEAM_SORT: SortAccessors<TeamMember, 'name' | 'position' | 'hours' | 'remaining'> = {
  name: (member) => member.name,
  position: (member) => member.position,
  hours: (member) => member.training_hours,
  remaining: remainingFor,
};

const percentOf = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

/** For supervisors: who in their team has reached the 40-hour target this year. */
export default function MyTeam() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();
  const tt = t.employee.myTeam;
  const { filters, setFilters, clearFilters } = useUrlFilters(FILTER_DEFAULTS);
  const year = parseInt(filters.year);
  const targetFilter = filters.target as '' | TargetBand;
  const { data: team, isLoading, error } = useTeamTrainingHours(user?.userId || '', year);

  const countedTeam = useMemo(() => (team || []).filter(counted), [team]);
  const counts = {
    met: countedTeam.filter((m) => isTargetMet(m.training_hours)).length,
    below: countedTeam.filter((m) => !isTargetMet(m.training_hours)).length,
    none: countedTeam.filter((m) => m.training_hours <= 0).length,
  };

  const visibleTeam = useMemo(() => {
    const search = filters.q.trim().toLowerCase();
    return (team || []).filter((member) => {
      if (search && ![member.name, member.position].some((v) => (v || '').toLowerCase().includes(search))) return false;
      if (targetFilter && (!counted(member) || !matchesTargetBand(member.training_hours, targetFilter))) return false;
      return true;
    });
  }, [team, filters.q, targetFilter]);
  const { sorted: rows, sort, toggleSort } = useTableSort(visibleTeam, TEAM_SORT, { key: 'name', direction: 'asc' });

  const toggleTarget = (band: TargetBand) => setFilters({ target: targetFilter === band ? '' : band });
  const isNarrowed = !!filters.q || !!targetFilter;

  const handleDownloadCSV = () => {
    const csvRows = rows.map((member) => ({
      Nama: member.name,
      Emel: member.email,
      Jawatan: member.position || '',
      [`Jam Latihan (${year})`]: member.training_hours,
      'Sasaran (jam)': counted(member) ? TRAINING_TARGET_HOURS : '',
      'Baki (jam)': counted(member) ? hoursRemaining(member.training_hours) : '',
      Pencapaian: counted(member) ? (isTargetMet(member.training_hours) ? 'Capai' : 'Belum capai') : 'Tidak dikira',
    }));
    downloadCSV(csvRows, `jam-latihan-pasukan-${year}.csv`);
    toast({ title: t.common.success, description: tt.csvDownloaded });
  };

  const header = (
    <PageHeader
      title={tt.title}
      description={tt.description}
      actions={
        <>
          <Button variant="outline" onClick={handleDownloadCSV} disabled={rows.length === 0}>
            <FileSpreadsheet className="h-4 w-4" />
            {t.common.downloadCsv}
          </Button>
          <Select value={filters.year} onValueChange={(value) => setFilters({ year: value })}>
            <SelectTrigger className="w-28" aria-label={t.common.year}>
              <SelectValue placeholder={t.common.year} />
            </SelectTrigger>
            <SelectContent>
              {YEAR_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </>
      }
    />
  );

  if (isLoading) {
    return (
      <EmployeeLayout>
        <PageSkeleton variant="table" />
      </EmployeeLayout>
    );
  }

  if (error) {
    return (
      <EmployeeLayout>
        {header}
        <ErrorState message={error.message} />
      </EmployeeLayout>
    );
  }

  return (
    <EmployeeLayout>
      {header}

      <div className="space-y-4">
        {/* Tiles also filter the table */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label={tt.statTeam}
            value={countedTeam.length}
            icon={Users}
            tone="primary"
            onClick={() => setFilters({ target: '' })}
            active={!targetFilter}
          />
          <StatCard
            label={tt.statMet}
            value={counts.met}
            icon={CheckCircle2}
            tone="success"
            hint={tt.shareOfTeam(percentOf(counts.met, countedTeam.length))}
            onClick={() => toggleTarget('met')}
            active={targetFilter === 'met'}
          />
          <StatCard
            label={tt.statBelow}
            value={counts.below}
            icon={AlertTriangle}
            tone="warning"
            hint={tt.shareOfTeam(percentOf(counts.below, countedTeam.length))}
            onClick={() => toggleTarget('below')}
            active={targetFilter === 'below'}
          />
          <StatCard
            label={tt.statNone}
            value={counts.none}
            icon={CircleSlash}
            tone="danger"
            hint={tt.shareOfTeam(percentOf(counts.none, countedTeam.length))}
            onClick={() => toggleTarget('none')}
            active={targetFilter === 'none'}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={tt.searchPlaceholder}
              aria-label={t.common.search}
              value={filters.q}
              onChange={(e) => setFilters({ q: e.target.value })}
              className="pl-9"
            />
          </div>
          {isNarrowed && (
            <Button variant="ghost" onClick={() => clearFilters(['q', 'target'])} className="text-muted-foreground">
              {t.common.clearFilters}
            </Button>
          )}
          <p className="text-xs text-muted-foreground sm:ml-auto">{tt.hoursRule}</p>
        </div>

        <Card className="overflow-hidden">
          {(team || []).length === 0 ? (
            <EmptyState compact icon={Users} title={tt.emptyTitle} description={tt.emptyDescription} />
          ) : rows.length === 0 ? (
            <EmptyState
              compact
              icon={Search}
              title={t.common.noResults}
              description={t.common.noResultsHint}
              action={
                <Button variant="outline" size="sm" onClick={() => clearFilters(['q', 'target'])}>
                  {t.common.clearFilters}
                </Button>
              }
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead sortKey="name" sort={sort} onSort={toggleSort}>
                    {t.common.name}
                  </SortableTableHead>
                  <SortableTableHead sortKey="position" sort={sort} onSort={toggleSort}>
                    {t.common.position}
                  </SortableTableHead>
                  <SortableTableHead sortKey="hours" sort={sort} onSort={toggleSort} align="right">
                    {tt.colHours(year)}
                  </SortableTableHead>
                  <SortableTableHead sortKey="remaining" sort={sort} onSort={toggleSort} align="right">
                    {tt.colRemaining}
                  </SortableTableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((member) => {
                  const remaining = remainingFor(member);
                  return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.name}</TableCell>
                      <TableCell>{member.position || '—'}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {member.training_hours} {t.common.hoursShort}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {remaining === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : remaining === 0 ? (
                          <ToneBadge tone="success">{tt.targetMet}</ToneBadge>
                        ) : (
                          `${remaining} ${t.common.hoursShort}`
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>

        {rows.length > 0 && (
          <p className="text-sm text-muted-foreground">{tt.showing(rows.length, team?.length || 0)}</p>
        )}
      </div>
    </EmployeeLayout>
  );
}
