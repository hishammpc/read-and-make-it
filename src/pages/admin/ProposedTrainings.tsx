import { useState } from 'react';
import { cn } from '@/lib/utils';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { EmptyState } from '@/components/common/EmptyState';
import { Notice } from '@/components/common/Callout';
import { ToneBadge } from '@/components/common/StatusBadge';
import { ErrorState } from '@/components/common/ErrorState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Send,
  CheckCircle2,
  Calendar,
  CalendarIcon,
  Trash2,
  Save,
  Download,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  useProposedTrainingsList,
  useMarkAsEntertained,
  useDeleteProposedTraining,
  getProposalYear,
  isLegacyProposal,
} from '@/hooks/useProposedTrainings';
import {
  useProposalPeriod,
  useUpdateSystemSetting,
  type ProposalPeriodValue,
  type ProposalWindowMode,
  getProposalWindowState,
  localTodayStr,
} from '@/hooks/useSystemSettings';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format, parseISO } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { formatMalaysianDate } from '@/lib/dateUtils';
import { escapeCSVValue } from '@/lib/csvUtils';

// Generate years for filter
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear + 1 - i);

export default function ProposedTrainings() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const tp = t.adminStaff.proposals;
  const [selectedYear, setSelectedYear] = useState(getProposalYear());
  const { data: proposals, isLoading, error } = useProposedTrainingsList(selectedYear);
  const markAsEntertained = useMarkAsEntertained();
  const deleteProposal = useDeleteProposedTraining();
  const {
    startDate: periodStart,
    endDate: periodEnd,
    mode: periodMode,
    isOpen: windowOpen,
    withinDates,
    isPastEnd,
    proposalYear: windowYear,
    isLoading: periodLoading,
  } = useProposalPeriod();
  const updateSetting = useUpdateSystemSetting();
  const [editPeriodStart, setEditPeriodStart] = useState<Date | undefined>();
  const [editPeriodEnd, setEditPeriodEnd] = useState<Date | undefined>();
  const [periodInitialized, setPeriodInitialized] = useState(false);

  // Initialize edit dates from fetched period
  if (!periodInitialized && !periodLoading && periodStart && periodEnd) {
    setEditPeriodStart(parseISO(periodStart));
    setEditPeriodEnd(parseISO(periodEnd));
    setPeriodInitialized(true);
  }

  const handleSavePeriod = () => {
    if (!editPeriodStart || !editPeriodEnd) return;
    updateSetting.mutate({
      key: 'proposal_period',
      value: {
        start_date: format(editPeriodStart, 'yyyy-MM-dd'),
        end_date: format(editPeriodEnd, 'yyyy-MM-dd'),
        mode: periodMode, // keep the manual override as it is
      } satisfies ProposalPeriodValue,
      updatedBy: user?.userId,
    });
  };

  // Manual override: saves straight away and keeps the saved dates
  const handleSetMode = (next: ProposalWindowMode) => {
    if (next === periodMode || !periodStart || !periodEnd) return;
    updateSetting.mutate({
      key: 'proposal_period',
      value: { start_date: periodStart, end_date: periodEnd, mode: next } satisfies ProposalPeriodValue,
      updatedBy: user?.userId,
    });
  };

  const modeOptions: { value: ProposalWindowMode; label: string }[] = [
    { value: 'auto', label: tp.modeAuto },
    { value: 'open', label: tp.modeOpen },
    { value: 'closed', label: tp.modeClosed },
  ];
  const periodChanged =
    editPeriodStart && editPeriodEnd && periodStart && periodEnd
      ? format(editPeriodStart, 'yyyy-MM-dd') !== periodStart ||
        format(editPeriodEnd, 'yyyy-MM-dd') !== periodEnd
      : false;

  // Unsaved dates in the pickers are previewed with the same rules staff get once saved;
  // the status badge itself always shows the saved (live) state.
  const previewState =
    periodChanged && editPeriodStart && editPeriodEnd
      ? getProposalWindowState(
          {
            start_date: format(editPeriodStart, 'yyyy-MM-dd'),
            end_date: format(editPeriodEnd, 'yyyy-MM-dd'),
            mode: periodMode,
          },
          localTodayStr()
        )
      : null;
  const shown = previewState ?? {
    startDate: periodStart,
    endDate: periodEnd,
    withinDates,
    isPastEnd,
    proposalYear: windowYear,
  };

  // Plain-language schedule: when it opens/closes automatically, or that a manual override is on
  const startLabel = shown.startDate ? formatMalaysianDate(shown.startDate) : '';
  const endLabel = shown.endDate ? formatMalaysianDate(shown.endDate) : '';
  const modeReason = !shown.startDate || !shown.endDate
    ? ''
    : periodMode === 'open'
      ? tp.manualOpen(startLabel, endLabel)
      : periodMode === 'closed'
        ? tp.manualClosed(startLabel, endLabel)
        : shown.withinDates
          ? tp.scheduleDuring(endLabel)
          : shown.isPastEnd
            ? tp.scheduleAfter(endLabel)
            : tp.scheduleBefore(startLabel, endLabel);

  // proposalNumber: 1 or 2 for an old two-proposal row; undefined for a current-form proposal
  const handleToggleEntertained = (proposalId: string, proposalNumber: 1 | 2 | undefined, currentStatus: boolean) => {
    if (!user?.userId) return;
    markAsEntertained.mutate({
      proposalId,
      proposalNumber,
      isEntertained: !currentStatus,
      adminId: user.userId,
    });
  };

  const totalProposals = proposals?.length || 0;
  // Old-format rows (up to 2026) are shown by their first proposal, so they count by its tick.
  const isConsidered = (p: NonNullable<typeof proposals>[number]) =>
    isLegacyProposal(p) ? !!p.proposal_1_entertained : !!p.is_entertained;
  const entertainedCount = proposals?.filter(isConsidered).length || 0;

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const toggleExpanded = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderDeleteAction = (proposalId: string, staffName: string) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:bg-destructive-soft hover:text-destructive"
          aria-label={tp.deleteProposal(staffName)}
          title={tp.deleteProposal(staffName)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{tp.deleteTitle}</AlertDialogTitle>
          <AlertDialogDescription>{tp.deleteDescription(staffName)}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteProposal.mutate(proposalId)}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t.common.delete}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  // CSV export is official output: headers and values stay in BM regardless of UI language.
  const handleDownloadCSV = () => {
    if (!proposals || proposals.length === 0) return;

    const headers = ['Nama', 'Emel', 'Jawatan', 'Jabatan', 'Cadangan Latihan', 'Butiran', 'Catatan', 'Dipertimbangkan', 'Tarikh Hantar'];
    const rows = proposals.map((p) => {
      const profile = p.profiles as any;
      return [
        profile?.name || '',
        profile?.email || '',
        profile?.position || '',
        profile?.department || '',
        (isLegacyProposal(p) ? p.proposal_1 : p.training_title) || '',
        p.training_details || '',
        p.notes || '',
        isConsidered(p) ? 'Ya' : 'Tidak',
        p.created_at ? format(new Date(p.created_at), 'dd/MM/yyyy') : '',
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCSVValue).join(','))
      .join('\n');

    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Cadangan_Latihan_${selectedYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const header = (
    <PageHeader
      title={tp.title}
      description={tp.description}
      actions={
        <>
          <Button
            variant="outline"
            onClick={handleDownloadCSV}
            disabled={!proposals || proposals.length === 0}
          >
            <Download className="h-4 w-4" />
            {t.common.downloadCsv}
          </Button>
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-28" aria-label={t.common.year}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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

  return (
    <AdminLayout>
      {header}

      <div className="space-y-6">
        {/* Proposal Period Settings */}
        <Card>
          <CardContent className="pt-6">
            <div
              role="group"
              aria-labelledby="proposal-period-label"
              className="flex flex-col gap-4 sm:flex-row sm:items-end"
            >
              <p
                id="proposal-period-label"
                className="flex items-center gap-2 text-sm font-medium text-muted-foreground sm:pb-2"
              >
                <CalendarIcon className="h-4 w-4" />
                {shown.endDate ? tp.periodLabelYear(shown.proposalYear) : tp.periodLabel}
              </p>
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end">
                <div className="space-y-1">
                  <Label htmlFor="proposal-period-start" className="text-xs font-normal text-muted-foreground">
                    {tp.periodStart}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="proposal-period-start"
                        variant="outline"
                        size="sm"
                        className="w-36 justify-start text-left font-normal"
                      >
                        <CalendarIcon className="h-3 w-3" />
                        {editPeriodStart ? format(editPeriodStart, 'dd/MM/yyyy') : tp.pickDate}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={editPeriodStart}
                        onSelect={setEditPeriodStart}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <span aria-hidden="true" className="hidden pb-1 text-muted-foreground sm:inline">—</span>
                <div className="space-y-1">
                  <Label htmlFor="proposal-period-end" className="text-xs font-normal text-muted-foreground">
                    {tp.periodEnd}
                  </Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="proposal-period-end"
                        variant="outline"
                        size="sm"
                        className="w-36 justify-start text-left font-normal"
                      >
                        <CalendarIcon className="h-3 w-3" />
                        {editPeriodEnd ? format(editPeriodEnd, 'dd/MM/yyyy') : tp.pickDate}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={editPeriodEnd}
                        onSelect={setEditPeriodEnd}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                {periodChanged && (
                  <Button
                    size="sm"
                    onClick={handleSavePeriod}
                    disabled={updateSetting.isPending}
                  >
                    <Save className="h-3 w-3" />
                    {updateSetting.isPending ? t.common.saving : t.common.save}
                  </Button>
                )}
              </div>
            </div>

            {/* Viewing a later year than the saved window: offer to set it up (Dec 1 – end of Feb) */}
            {!previewState && periodEnd && selectedYear > windowYear && (
              <Notice tone="info" icon={Info} className="mt-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>{tp.nextYearHint(windowYear, selectedYear)}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => {
                      setEditPeriodStart(new Date(selectedYear - 1, 11, 1));
                      setEditPeriodEnd(new Date(selectedYear, 2, 0)); // last day of February
                    }}
                  >
                    {tp.fillForYear(selectedYear)}
                  </Button>
                </div>
              </Notice>
            )}
            {/* Manual override */}
            <div className="mt-5 flex flex-col gap-3 border-t pt-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="text-muted-foreground">{t.common.status}</span>
                  <ToneBadge tone={windowOpen ? 'success' : 'muted'} dot>
                    {windowOpen ? tp.statusOpen : tp.statusClosed}
                  </ToneBadge>
                  {modeReason && (
                    <span className="text-muted-foreground">
                      — {previewState && <span className="font-medium text-foreground">{tp.afterSaving} </span>}
                      {modeReason}
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {shown.startDate && shown.endDate ? tp.proposalYearNote(shown.proposalYear) : tp.needDates}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span id="proposal-window-control" className="text-sm font-medium text-muted-foreground">
                  {tp.windowControl}
                </span>
                <div
                  role="radiogroup"
                  aria-labelledby="proposal-window-control"
                  className="inline-flex h-9 items-center rounded-md border bg-muted/60 p-0.5 text-xs font-medium"
                >
                  {modeOptions.map((option) => {
                    const active = periodMode === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => handleSetMode(option.value)}
                        disabled={!periodStart || !periodEnd || updateSetting.isPending}
                        className={cn(
                          'h-full rounded-[5px] px-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                          active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            {periodMode === 'open' && shown.isPastEnd && shown.endDate && (
              <Notice tone="warning" icon={AlertTriangle} className="mt-4">
                {tp.pastEndWarning(formatMalaysianDate(shown.endDate), shown.proposalYear)}
              </Notice>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label={tp.statTotal}
            value={isLoading ? <Skeleton className="h-8 w-12" /> : totalProposals}
            icon={Send}
            tone="primary"
          />
          <StatCard
            label={tp.statConsidered}
            value={isLoading ? <Skeleton className="h-8 w-12" /> : entertainedCount}
            icon={CheckCircle2}
            tone="success"
          />
          <StatCard label={t.common.year} value={selectedYear} icon={Calendar} tone="muted" />
        </div>

        {/* Proposals Table */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>{tp.listTitle}</CardTitle>
            <CardDescription>{tp.listDescription}</CardDescription>
          </CardHeader>
          {isLoading ? (
            <div className="space-y-2 px-6 pb-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-11 w-full" />
              ))}
            </div>
          ) : proposals?.length === 0 ? (
            <EmptyState
              compact
              icon={Send}
              title={tp.emptyTitle(selectedYear)}
              description={tp.emptyDescription}
              className="border-t"
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tp.colEmployee}</TableHead>
                  <TableHead className="w-[42%]">{tp.colProposal}</TableHead>
                  <TableHead>{tp.colNotes}</TableHead>
                  <TableHead className="w-28 text-center">{tp.colConsidered}</TableHead>
                  <TableHead>{tp.colSubmitted}</TableHead>
                  <TableHead className="w-10 text-right">
                    <span className="sr-only">{t.common.actions}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposals?.map((proposal) => {
                  const profile = proposal.profiles as any;
                  const staffName: string = profile?.name || '—';
                  const legacy = isLegacyProposal(proposal);
                  // Old-format rows (up to 2026) show their first proposal; the second is kept in the DB only.
                  const title = legacy ? proposal.proposal_1 : proposal.training_title;
                  const considered = legacy ? !!proposal.proposal_1_entertained : !!proposal.is_entertained;
                  const details = proposal.training_details || '';
                  const expanded = expandedIds.has(proposal.id);

                  return (
                    <TableRow key={proposal.id} className="align-top">
                      <TableCell>
                        <div className="font-medium">{staffName}</div>
                        {profile?.department && <div className="text-xs text-muted-foreground">{profile.department}</div>}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{title || '—'}</div>
                        {details && (
                          <>
                            <p className={cn('mt-1 whitespace-pre-line text-sm text-muted-foreground', !expanded && 'line-clamp-2')}>
                              {details}
                            </p>
                            {details.length > 140 && (
                              <button
                                type="button"
                                onClick={() => toggleExpanded(proposal.id)}
                                className="mt-1 rounded text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                aria-expanded={expanded}
                              >
                                {expanded ? tp.showLess : tp.showMore}
                              </button>
                            )}
                          </>
                        )}
                      </TableCell>
                      <TableCell className="max-w-xs whitespace-pre-line text-sm text-muted-foreground">
                        {proposal.notes || '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={considered}
                          onCheckedChange={() => handleToggleEntertained(proposal.id, legacy ? 1 : undefined, considered)}
                          aria-label={tp.markConsideredOne(staffName)}
                        />
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{formatMalaysianDate(proposal.created_at)}</TableCell>
                      <TableCell className="text-right">{renderDeleteAction(proposal.id, staffName)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
