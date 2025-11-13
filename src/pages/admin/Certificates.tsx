import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCertificates, useDeleteCertificate } from '@/hooks/useCertificates';
import { usePrograms } from '@/hooks/usePrograms';
import { useUsers } from '@/hooks/useUsers';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Download, Trash2, AlertCircle, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';

export default function Certificates() {
  const navigate = useNavigate();
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

  if (error) {
    return (
      <AdminLayout>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load certificates: {error.message}
          </AlertDescription>
        </Alert>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Certificates Management</h1>
          <p className="text-muted-foreground">
            Manage and track training certificates
          </p>
        </div>
        <Button onClick={() => navigate('/dashboard/certificates/upload')}>
          <Plus className="mr-2 h-4 w-4" />
          Upload Certificate
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search certificates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={programFilter} onValueChange={setProgramFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Programs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {programs?.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={userFilter} onValueChange={setUserFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Users" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                {users?.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Issue Date</TableHead>
                  <TableHead>Uploaded By</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell><Skeleton className="h-4 w-[150px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[180px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[60px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredCertificates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <p className="text-muted-foreground">
                        {searchQuery || programFilter !== 'all' || userFilter !== 'all'
                          ? 'No certificates found matching your filters'
                          : 'No certificates uploaded yet'}
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCertificates.map((certificate: any) => (
                    <TableRow key={certificate.id}>
                      <TableCell className="font-medium">
                        {certificate.profiles?.name || 'Unknown'}
                      </TableCell>
                      <TableCell>{certificate.profiles?.email || '-'}</TableCell>
                      <TableCell>{certificate.programs?.title || 'Unknown'}</TableCell>
                      <TableCell>{certificate.programs?.hours || 0} hrs</TableCell>
                      <TableCell>
                        {format(new Date(certificate.issued_at), 'MMM dd, yyyy')}
                      </TableCell>
                      <TableCell>{certificate.uploader?.name || '-'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewCertificate(certificate.file_url)}
                            title="View/Download Certificate"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(certificate.id)}
                            title="Delete Certificate"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {!isLoading && filteredCertificates.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          Showing {filteredCertificates.length} of {certificates?.length || 0} certificates
        </p>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Certificate</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this certificate? This action cannot be undone
              and will permanently remove the certificate file from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCertificateToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </AdminLayout>
  );
}
