import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  ChevronLeft,
  AlertCircle,
  Eye,
  CheckCircle2,
  Clock,
  UserCheck,
  Users,
  Lock,
  RotateCcw,
  Search,
  CalendarIcon,
} from 'lucide-react';
import { useAnnualEvaluationCycle, useCloseEvaluationCycle, useResetAnnualEvaluation, useUpdateCycleDates, AnnualEvaluation } from '@/hooks/useAnnualEvaluations';
import { formatMalaysianDate } from '@/lib/dateUtils';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { format, parseISO } from 'date-fns';
import { calculateTotalScore, calculatePercentage, SCORE_MAP } from '@/lib/annualEvaluationQuestions';

export default function AnnualEvaluationCycle() {
  const navigate = useNavigate();
  const { cycleId } = useParams<{ cycleId: string }>();
  const { data, isLoading, error } = useAnnualEvaluationCycle(cycleId || '');
  const closeCycle = useCloseEvaluationCycle();
  const resetEvaluation = useResetAnnualEvaluation();
  const updateCycleDates = useUpdateCycleDates();

  // Date dialog state
  const [dateDialogOpen, setDateDialogOpen] = useState(false);
  const [editStartDate, setEditStartDate] = useState<Date | undefined>();
  const [editEndDate, setEditEndDate] = useState<Date | undefined>();

  // Reset dialog state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<AnnualEvaluation | null>(null);
  const [resetType, setResetType] = useState<'staff' | 'supervisor' | 'full'>('full');

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Filter evaluations by search query and status - must be before early returns
  const filteredEvaluations = useMemo(() => {
    const evaluations = data?.evaluations || [];
    return evaluations.filter((e) => {
      const matchesSearch = !searchQuery.trim() ||
        ((e.profiles as any)?.name?.toLowerCase() || '').includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || e.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data?.evaluations, searchQuery, statusFilter]);

  const handleResetClick = (evaluation: AnnualEvaluation, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvaluation(evaluation);
    setResetType('full');
    setResetDialogOpen(true);
  };

  const handleResetConfirm = () => {
    if (!selectedEvaluation) return;
    resetEvaluation.mutate(
      { evaluationId: selectedEvaluation.id, resetType },
      {
        onSuccess: () => {
          setResetDialogOpen(false);
          setSelectedEvaluation(null);
        },
      }
    );
  };

  const getResetDescription = () => {
    switch (resetType) {
      case 'staff':
        return 'Ini akan memadamkan jawapan kakitangan dan mengembalikan status kepada "Menunggu Kakitangan".';
      case 'supervisor':
        return 'Ini akan memadamkan jawapan penyelia dan mengembalikan status kepada "Menunggu Penyelia".';
      case 'full':
        return 'Ini akan memadamkan semua jawapan (kakitangan & penyelia) dan mengembalikan status kepada "Menunggu Kakitangan".';
      default:
        return '';
    }
  };

  if (error) {
    return (
      <AdminLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Ralat memuatkan data: {error.message}</AlertDescription>
        </Alert>
      </AdminLayout>
    );
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-1/3" />
          <div className="grid gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-96" />
        </div>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Kitaran penilaian tidak dijumpai.</AlertDescription>
        </Alert>
      </AdminLayout>
    );
  }

  const { cycle, evaluations } = data;

  // Calculate stats
  const totalStaff = evaluations.length;
  const pendingStaff = evaluations.filter((e) => e.status === 'pending_staff').length;
  const pendingSupervisor = evaluations.filter((e) => e.status === 'pending_supervisor').length;
  const completed = evaluations.filter((e) => e.status === 'completed').length;
  const staffSubmitted = pendingSupervisor + completed;
  const progressPercentage = totalStaff > 0 ? Math.round((completed / totalStaff) * 100) : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_staff':
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
            <Clock className="h-3 w-3 mr-1" />
            Menunggu Kakitangan
          </Badge>
        );
      case 'pending_supervisor':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
            <UserCheck className="h-3 w-3 mr-1" />
            Menunggu Penyelia
          </Badge>
        );
      case 'completed':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Selesai
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
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
              onClick={() => navigate('/dashboard/annual-evaluations')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Penilaian Tahunan {cycle.year}
              </h1>
              <p className="text-muted-foreground">
                {formatMalaysianDate(cycle.start_date)} - {formatMalaysianDate(cycle.end_date)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {cycle.status === 'active' && (
              <Button
                variant="outline"
                onClick={() => {
                  setEditStartDate(parseISO(cycle.start_date));
                  setEditEndDate(parseISO(cycle.end_date));
                  setDateDialogOpen(true);
                }}
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                Tetapkan Tarikh
              </Button>
            )}
            {cycle.status === 'active' && (
              <Button
                variant="outline"
                onClick={() => closeCycle.mutate(cycle.id)}
                disabled={closeCycle.isPending}
              >
                <Lock className="h-4 w-4 mr-2" />
                Tutup Kitaran
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'all' ? 'ring-2 ring-primary' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'all' ? 'all' : 'all')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Jumlah Kakitangan</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStaff}</div>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'pending_staff' ? 'ring-2 ring-yellow-500' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'pending_staff' ? 'all' : 'pending_staff')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Menunggu Kakitangan</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{pendingStaff}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {staffSubmitted} / {totalStaff} dijawab
              </p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'pending_supervisor' ? 'ring-2 ring-blue-500' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'pending_supervisor' ? 'all' : 'pending_supervisor')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Menunggu Penyelia</CardTitle>
              <UserCheck className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{pendingSupervisor}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {completed} / {staffSubmitted} disemak
              </p>
            </CardContent>
          </Card>
          <Card
            className={`cursor-pointer transition-all hover:shadow-md ${statusFilter === 'completed' ? 'ring-2 ring-green-500' : ''}`}
            onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Selesai</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {completed}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  ({progressPercentage}%)
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Kemajuan Keseluruhan</span>
                <span className="font-medium">{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {completed} daripada {totalStaff} penilaian telah selesai
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Evaluations Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Senarai Kakitangan</CardTitle>
                <CardDescription>
                  Klik pada kakitangan yang telah selesai untuk melihat keputusan penilaian
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Semua Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="pending_staff">Menunggu Kakitangan</SelectItem>
                    <SelectItem value="pending_supervisor">Menunggu Penyelia</SelectItem>
                    <SelectItem value="completed">Selesai</SelectItem>
                  </SelectContent>
                </Select>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Cari nama..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Jawatan</TableHead>
                  <TableHead>Penyelia</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Markah Penyelia</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvaluations.map((evaluation) => {
                  const supervisorScore = evaluation.supervisor_answers
                    ? calculateTotalScore(evaluation.supervisor_answers as Record<string, number>)
                    : null;
                  const supervisorPercentage = evaluation.supervisor_answers
                    ? calculatePercentage(evaluation.supervisor_answers as Record<string, number>)
                    : null;

                  return (
                    <TableRow
                      key={evaluation.id}
                      className={evaluation.status === 'completed' ? 'cursor-pointer hover:bg-muted/50' : ''}
                      onClick={() => {
                        if (evaluation.status === 'completed') {
                          navigate(`/dashboard/annual-evaluations/${cycleId}/staff/${evaluation.user_id}`);
                        }
                      }}
                    >
                      <TableCell className="font-medium">
                        {(evaluation.profiles as any)?.name || '-'}
                      </TableCell>
                      <TableCell>
                        {(evaluation.profiles as any)?.position || '-'}
                      </TableCell>
                      <TableCell>
                        {(evaluation.supervisor as any)?.name || '-'}
                      </TableCell>
                      <TableCell>{getStatusBadge(evaluation.status)}</TableCell>
                      <TableCell>
                        {supervisorScore !== null ? (
                          <span className="font-medium">
                            {supervisorScore}/100 ({supervisorPercentage}%)
                          </span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {evaluation.status === 'completed' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/dashboard/annual-evaluations/${cycleId}/staff/${evaluation.user_id}`);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Lihat
                            </Button>
                          )}
                          {evaluation.status !== 'pending_staff' && cycle.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleResetClick(evaluation, e)}
                              className="text-orange-600 hover:text-orange-700 hover:bg-orange-50"
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Reset
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {/* Reset Confirmation Dialog */}
        <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset Penilaian</DialogTitle>
              <DialogDescription>
                Reset penilaian untuk <strong>{(selectedEvaluation?.profiles as any)?.name}</strong>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Jenis Reset</label>
                <Select value={resetType} onValueChange={(value) => setResetType(value as 'staff' | 'supervisor' | 'full')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Reset Penuh (Kakitangan & Penyelia)</SelectItem>
                    <SelectItem value="staff">Reset Kakitangan Sahaja</SelectItem>
                    <SelectItem value="supervisor">Reset Penyelia Sahaja</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{getResetDescription()}</AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setResetDialogOpen(false)}>
                Batal
              </Button>
              <Button
                variant="destructive"
                onClick={handleResetConfirm}
                disabled={resetEvaluation.isPending}
              >
                {resetEvaluation.isPending ? 'Mereset...' : 'Sahkan Reset'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Set Dates Dialog */}
        <Dialog open={dateDialogOpen} onOpenChange={setDateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tetapkan Tarikh Kitaran</DialogTitle>
              <DialogDescription>
                Tetapkan tarikh mula dan akhir untuk kitaran penilaian {cycle.year}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Tarikh Mula</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editStartDate ? format(editStartDate, 'dd/MM/yyyy') : 'Pilih tarikh'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editStartDate}
                      onSelect={setEditStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Tarikh Akhir</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editEndDate ? format(editEndDate, 'dd/MM/yyyy') : 'Pilih tarikh'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editEndDate}
                      onSelect={setEditEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDateDialogOpen(false)}>
                Batal
              </Button>
              <Button
                onClick={() => {
                  if (!editStartDate || !editEndDate) return;
                  updateCycleDates.mutate(
                    {
                      cycleId: cycle.id,
                      startDate: format(editStartDate, 'yyyy-MM-dd'),
                      endDate: format(editEndDate, 'yyyy-MM-dd'),
                    },
                    { onSuccess: () => setDateDialogOpen(false) }
                  );
                }}
                disabled={!editStartDate || !editEndDate || updateCycleDates.isPending}
              >
                {updateCycleDates.isPending ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
