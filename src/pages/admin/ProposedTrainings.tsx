import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { EmptyState } from '@/components/common/EmptyState';
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
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  useProposedTrainingsList,
  useMarkAsEntertained,
  useDeleteProposedTraining,
  getProposalYear,
} from '@/hooks/useProposedTrainings';
import { useProposalPeriod, useUpdateSystemSetting } from '@/hooks/useSystemSettings';
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
  const { startDate: periodStart, endDate: periodEnd, isLoading: periodLoading } = useProposalPeriod();
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
      },
      updatedBy: user?.userId,
    });
  };

  const periodChanged =
    editPeriodStart && editPeriodEnd && periodStart && periodEnd
      ? format(editPeriodStart, 'yyyy-MM-dd') !== periodStart ||
        format(editPeriodEnd, 'yyyy-MM-dd') !== periodEnd
      : false;

  const handleToggleEntertained = (proposalId: string, proposalNumber: 1 | 2, currentStatus: boolean) => {
    if (!user?.userId) return;
    markAsEntertained.mutate({
      proposalId,
      proposalNumber,
      isEntertained: !currentStatus,
      adminId: user.userId,
    });
  };

  const totalProposals = proposals?.length || 0;
  const entertainedCount =
    proposals?.filter((p) => p.proposal_1_entertained || p.proposal_2_entertained).length || 0;

  // CSV export is official output: headers and values stay in BM regardless of UI language.
  const handleDownloadCSV = () => {
    if (!proposals || proposals.length === 0) return;

    const headers = ['Nama', 'Emel', 'Jawatan', 'Jabatan', 'Cadangan 1', 'Cadangan 1 Dilayan', 'Cadangan 2', 'Cadangan 2 Dilayan', 'Tarikh Hantar'];
    const rows = proposals.map((p) => {
      const profile = p.profiles as any;
      return [
        profile?.name || '',
        profile?.email || '',
        profile?.position || '',
        profile?.department || '',
        p.proposal_1 || '',
        p.proposal_1_entertained ? 'Ya' : 'Tidak',
        p.proposal_2 || '',
        p.proposal_2_entertained ? 'Ya' : 'Tidak',
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
                {tp.periodLabel}
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
            hint={tp.statConsideredHint}
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
                  <TableHead>{tp.colProposal1}</TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">{tp.colConsidered}</span>
                  </TableHead>
                  <TableHead>{tp.colProposal2}</TableHead>
                  <TableHead className="w-10">
                    <span className="sr-only">{tp.colConsidered}</span>
                  </TableHead>
                  <TableHead>{tp.colSubmitted}</TableHead>
                  <TableHead className="w-10 text-right">
                    <span className="sr-only">{t.common.actions}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proposals?.map((proposal) => {
                  const staffName: string = (proposal.profiles as any)?.name || '—';

                  return (
                    <TableRow key={proposal.id}>
                      <TableCell className="font-medium">{staffName}</TableCell>
                      <TableCell>
                        {proposal.proposal_1 || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {proposal.proposal_1 && (
                          <Checkbox
                            checked={proposal.proposal_1_entertained || false}
                            onCheckedChange={() =>
                              handleToggleEntertained(proposal.id, 1, proposal.proposal_1_entertained || false)
                            }
                            aria-label={tp.markConsidered(1, staffName)}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {proposal.proposal_2 || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        {proposal.proposal_2 && (
                          <Checkbox
                            checked={proposal.proposal_2_entertained || false}
                            onCheckedChange={() =>
                              handleToggleEntertained(proposal.id, 2, proposal.proposal_2_entertained || false)
                            }
                            aria-label={tp.markConsidered(2, staffName)}
                          />
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {formatMalaysianDate(proposal.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
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
                                onClick={() => deleteProposal.mutate(proposal.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                {t.common.delete}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
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
