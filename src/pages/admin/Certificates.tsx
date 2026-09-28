import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCertificates, useDeleteCertificate } from '@/hooks/useCertificates';
import { usePrograms } from '@/hooks/usePrograms';
import { useUsers } from '@/hooks/useUsers';
import { formatMalaysianDate } from '@/lib/dateUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
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
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Upload, Search, Trash2, ExternalLink, Award } from 'lucide-react';

export default function Certificates() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const tc = t.adminTraining.certificates;
  const ts = t.adminTraining.shared;
  const { data: certificates, isLoading, error } = useCertificates();
  const { data: programs } = usePrograms();
  const { data: users } = useUsers();
  const { mutate: deleteCertificate } = useDeleteCertificate();

  const [searchQuery, setSearchQuery] = useState('');
  const [programFilter, setProgramFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [certificateToDelete, setCertificateToDelete] = useState<string | null>(null);

  // Filter certificates
  const filteredCertificates = useMemo(() => {
    if (!certificates) return [];

    return certificates.filter((cert: any) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        cert.profiles?.name?.toLowerCase().includes(searchLower) ||
        cert.programs?.title?.toLowerCase().includes(searchLower) ||
        cert.profiles?.email?.toLowerCase().includes(searchLower);

      // Program filter
      const matchesProgram =
        programFilter === 'all' || cert.program_id === programFilter;

      // User filter
      const matchesUser = userFilter === 'all' || cert.user_id === userFilter;

      return matchesSearch && matchesProgram && matchesUser;
    });
  }, [certificates, searchQuery, programFilter, userFilter]);

  const handleDelete = (id: string) => {
    setCertificateToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (certificateToDelete) {
      deleteCertificate(certificateToDelete);
      setDeleteDialogOpen(false);
      setCertificateToDelete(null);
    }
  };

  const handleViewCertificate = (fileUrl: string) => {
    window.open(fileUrl, '_blank');
  };

  const hasActiveFilters = !!searchQuery || programFilter !== 'all' || userFilter !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setProgramFilter('all');
    setUserFilter('all');
  };

  const header = (
    <PageHeader
      title={tc.title}
      description={tc.description}
      actions={
        <Button onClick={() => navigate('/dashboard/certificates/upload')}>
          <Upload className="h-4 w-4" />
          {tc.upload}
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
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={tc.searchPlaceholder}
              aria-label={t.common.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger className="w-full sm:w-56" aria-label={tc.filterProgram}>
              <SelectValue placeholder={tc.allPrograms} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tc.allPrograms}</SelectItem>
              {programs?.map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={userFilter} onValueChange={setUserFilter}>
            <SelectTrigger className="w-full sm:w-56" aria-label={tc.filterStaff}>
              <SelectValue placeholder={tc.allStaff} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tc.allStaff}</SelectItem>
              {users?.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground sm:ml-auto">
              {t.common.clearFilters}
            </Button>
          )}
        </div>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{tc.colEmployee}</TableHead>
                <TableHead>{t.common.email}</TableHead>
                <TableHead>{tc.colProgram}</TableHead>
                <TableHead className="text-right">{tc.colHours}</TableHead>
                <TableHead>{tc.colIssued}</TableHead>
                <TableHead>{tc.colUploadedBy}</TableHead>
                <TableHead className="text-right">
                  <span className="sr-only">{t.common.actions}</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[180px]" /></TableCell>
                    <TableCell><Skeleton className="ml-auto h-4 w-[60px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="ml-auto h-4 w-[80px]" /></TableCell>
                  </TableRow>
                ))
              ) : filteredCertificates.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={7} className="p-0">
                    {hasActiveFilters ? (
                      <EmptyState
                        compact
                        icon={Search}
                        title={t.common.noResults}
                        description={t.common.noResultsHint}
                        action={
                          <Button variant="outline" size="sm" onClick={clearFilters}>
                            {t.common.clearFilters}
                          </Button>
                        }
                      />
                    ) : (
                      <EmptyState
                        compact
                        icon={Award}
                        title={tc.emptyTitle}
                        description={tc.emptyDescription}
                        action={
                          <Button size="sm" onClick={() => navigate('/dashboard/certificates/upload')}>
                            <Upload className="h-4 w-4" />
                            {tc.upload}
                          </Button>
                        }
                      />
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCertificates.map((certificate: any) => (
                  <TableRow key={certificate.id}>
                    <TableCell className="font-medium">
                      {certificate.profiles?.name || ts.unknown}
                    </TableCell>
                    <TableCell>{certificate.profiles?.email || '-'}</TableCell>
                    <TableCell>{certificate.programs?.title || ts.unknown}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {certificate.programs?.hours || 0} {t.common.hoursShort}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatMalaysianDate(certificate.issued_at)}
                    </TableCell>
                    <TableCell>{certificate.uploader?.name || '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewCertificate(certificate.file_url)}
                          aria-label={tc.viewCertificate}
                          title={tc.viewCertificate}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive-soft hover:text-destructive"
                          onClick={() => handleDelete(certificate.id)}
                          aria-label={tc.deleteCertificate}
                          title={tc.deleteCertificate}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {!isLoading && filteredCertificates.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {tc.showing(filteredCertificates.length, certificates?.length || 0)}
          </p>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tc.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{tc.deleteDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCertificateToDelete(null)}>
              {t.common.cancel}
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
