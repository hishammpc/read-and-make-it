import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronLeft,
  Send,
  AlertCircle,
  CheckCircle2,
  Calendar,
  CalendarIcon,
  Trash2,
  Save,
  Download,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
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

// Generate years for filter
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear + 1 - i);

export default function ProposedTrainings() {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  if (error) {
    return (
      <AdminLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Error loading data: {error.message}</AlertDescription>
        </Alert>
      </AdminLayout>
    );
  }

  const totalProposals = proposals?.length || 0;
  const entertainedCount = proposals?.filter((p) => p.is_entertained).length || 0;

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
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Cadangan_Latihan_${selectedYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/dashboard')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Proposed Trainings</h1>
              <p className="text-muted-foreground">
                Training proposals submitted by employees
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownloadCSV}
              disabled={!proposals || proposals.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Muat Turun CSV
            </Button>
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-32">
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
          </div>
        </div>

        {/* Proposal Period Settings */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-end gap-4">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CalendarIcon className="h-4 w-4" />
                Tempoh Cadangan Latihan:
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Mula</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-[140px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {editPeriodStart ? format(editPeriodStart, 'dd/MM/yyyy') : 'Tarikh'}
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
                <span className="hidden sm:inline text-muted-foreground pb-1">—</span>
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Akhir</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className="w-[140px] justify-start text-left font-normal">
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {editPeriodEnd ? format(editPeriodEnd, 'dd/MM/yyyy') : 'Tarikh'}
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
                    <Save className="h-3 w-3 mr-1" />
                    {updateSetting.isPending ? 'Menyimpan...' : 'Simpan'}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
              <Send className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalProposals}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entertained</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{entertainedCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Year</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedYear}</div>
            </CardContent>
          </Card>
        </div>

        {/* Proposals Table */}
        <Card>
          <CardHeader>
            <CardTitle>Submitted Proposals</CardTitle>
            <CardDescription>
              Check the box to mark a proposal as entertained
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : proposals?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Send className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No proposals submitted for {selectedYear}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Proposal 1</TableHead>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Proposal 2</TableHead>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {proposals?.map((proposal) => (
                    <TableRow key={proposal.id}>
                      <TableCell className="font-medium">
                        {(proposal.profiles as any)?.name || '-'}
                      </TableCell>
                      <TableCell>
                        {proposal.proposal_1 || (
                          <span className="text-muted-foreground italic">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {proposal.proposal_1 && (
                          <Checkbox
                            checked={proposal.proposal_1_entertained || false}
                            onCheckedChange={() =>
                              handleToggleEntertained(proposal.id, 1, proposal.proposal_1_entertained || false)
                            }
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {proposal.proposal_2 || (
                          <span className="text-muted-foreground italic">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {proposal.proposal_2 && (
                          <Checkbox
                            checked={proposal.proposal_2_entertained || false}
                            onCheckedChange={() =>
                              handleToggleEntertained(proposal.id, 2, proposal.proposal_2_entertained || false)
                            }
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {formatMalaysianDate(proposal.created_at)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Proposal</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this proposal from {(proposal.profiles as any)?.name}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteProposal.mutate(proposal.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
