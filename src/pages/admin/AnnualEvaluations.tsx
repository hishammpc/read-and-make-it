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
import { Label } from '@/components/ui/label';
import {
  ChevronLeft,
  Plus,
  Calendar,
  Users,
  AlertCircle,
  Eye,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import {
  useAnnualEvaluationCycles,
  useCreateAnnualEvaluationCycle,
  useStaffWithoutSupervisors,
  useAnnualEvaluationStatsByYear,
} from '@/hooks/useAnnualEvaluations';
import { useAuth } from '@/contexts/AuthContext';
import { formatMalaysianDate } from '@/lib/dateUtils';

// Generate available years (current year back to 2023)
const currentYear = new Date().getFullYear();
const AVAILABLE_YEARS = Array.from({ length: currentYear - 2022 }, (_, i) => currentYear - i);

export default function AnnualEvaluations() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: cycles, isLoading, error } = useAnnualEvaluationCycles();
  const { data: staffWithoutSupervisors } = useStaffWithoutSupervisors();
  const createCycle = useCreateAnnualEvaluationCycle();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);

  // Default stats year to latest cycle year, or current year if no cycles
  const latestCycleYear = cycles?.[0]?.year || currentYear;
  const [statsYear, setStatsYear] = useState<number | null>(null);
  const effectiveStatsYear = statsYear ?? latestCycleYear;
  const { data: evalStats } = useAnnualEvaluationStatsByYear(effectiveStatsYear);

  const handleCreateCycle = async () => {
    if (!user?.userId) return;

    await createCycle.mutateAsync({
      year: selectedYear,
      createdBy: user.userId,
    });

    setShowCreateDialog(false);
  };

  const hasStaffWithoutSupervisors = (staffWithoutSupervisors?.length || 0) > 0;

  // Get years that don't have cycles yet
  const existingYears = new Set(cycles?.map((c) => c.year) || []);
  const availableYearsToCreate = AVAILABLE_YEARS.filter((y) => !existingYears.has(y));

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
              <h1 className="text-3xl font-bold tracking-tight">Penilaian Tahunan</h1>
              <p className="text-muted-foreground">
                Urus kitaran penilaian kompetensi tahunan kakitangan
              </p>
            </div>
          </div>
          <Button
            onClick={() => setShowCreateDialog(true)}
            disabled={availableYearsToCreate.length === 0 || hasStaffWithoutSupervisors}
          >
            <Plus className="h-4 w-4 mr-2" />
            Hantar Penilaian Baru
          </Button>
        </div>

        {/* Warning if staff without supervisors */}
        {hasStaffWithoutSupervisors && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{staffWithoutSupervisors?.length} kakitangan</strong> belum ada penyelia.
              Sila tetapkan penyelia untuk semua kakitangan sebelum menghantar penilaian tahunan.
              <Button
                variant="link"
                className="ml-2 p-0 h-auto"
                onClick={() => navigate('/admin/users')}
              >
                Lihat senarai kakitangan →
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Stats Cards */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-muted-foreground">Statistik Tahun:</span>
            <Select
              value={effectiveStatsYear.toString()}
              onValueChange={(value) => setStatsYear(parseInt(value))}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Tahun" />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_YEARS.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bil. Dijawab (Pekerja)</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {evalStats?.staffSubmitted || 0}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    / {evalStats?.total || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Bil. Disemak (Penyelia)</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {evalStats?.supervisorSubmitted || 0}
                  <span className="text-sm font-normal text-muted-foreground ml-1">
                    / {evalStats?.total || 0}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Kakitangan Tanpa Penyelia</CardTitle>
                <Users className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {staffWithoutSupervisors?.length || 0}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Cycles Table */}
        <Card>
          <CardHeader>
            <CardTitle>Senarai Kitaran Penilaian</CardTitle>
            <CardDescription>
              Klik pada kitaran untuk melihat kemajuan penilaian kakitangan
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : cycles?.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Tiada kitaran penilaian. Klik butang "Hantar Penilaian" untuk memulakan.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tahun</TableHead>
                    <TableHead>Tempoh</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tarikh Dicipta</TableHead>
                    <TableHead className="text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cycles?.map((cycle) => (
                    <TableRow
                      key={cycle.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => navigate(`/dashboard/annual-evaluations/${cycle.id}`)}
                    >
                      <TableCell className="font-medium">{cycle.year}</TableCell>
                      <TableCell>
                        {formatMalaysianDate(cycle.start_date)} - {formatMalaysianDate(cycle.end_date)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={cycle.status === 'active' ? 'default' : 'secondary'}
                          className={cycle.status === 'active' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {cycle.status === 'active' ? (
                            <>
                              <Clock className="h-3 w-3 mr-1" />
                              Aktif
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Ditutup
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatMalaysianDate(cycle.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/dashboard/annual-evaluations/${cycle.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Lihat
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Cycle Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hantar Penilaian Tahunan</DialogTitle>
            <DialogDescription>
              Pilih tahun penilaian dan hantar kepada semua kakitangan aktif.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="year">Tahun Penilaian</Label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger id="year">
                  <SelectValue placeholder="Pilih tahun" />
                </SelectTrigger>
                <SelectContent>
                  {availableYearsToCreate.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Tempoh: 1 Disember {selectedYear} - 28 Februari {selectedYear + 1}
              </p>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Pastikan semua kakitangan telah ditetapkan penyelia sebelum menghantar penilaian.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Batal
            </Button>
            <Button onClick={handleCreateCycle} disabled={createCycle.isPending || availableYearsToCreate.length === 0}>
              {createCycle.isPending ? 'Menghantar...' : `Hantar Penilaian ${selectedYear}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
