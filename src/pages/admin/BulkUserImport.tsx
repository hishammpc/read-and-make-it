import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useBulkImportUsers, BulkImportResult } from '@/hooks/useBulkImport';
import { downloadErrorReport } from '@/lib/csvParser';
import { toneClasses } from '@/lib/status';
import { cn } from '@/lib/utils';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  XCircle,
  AlertCircle,
  Info,
  Loader2,
  Download,
} from 'lucide-react';

export default function BulkUserImport() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const tb = t.adminStaff.bulkImport;
  const bulkImport = useBulkImportUsers();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.csv')) {
        setSelectedFile(file);
        setImportResult(null);
      } else {
        toast.error(tb.invalidFile);
        e.target.value = '';
      }
    }
  };

  const handleImport = async () => {
    if (!selectedFile || !user) return;

    try {
      const result = await bulkImport.mutateAsync({
        file: selectedFile,
        uploadedBy: user.userId,
      });
      setImportResult(result);
    } catch (error) {
      console.error('Import error:', error);
    }
  };

  const handleDownloadErrors = () => {
    if (importResult && importResult.errors.length > 0) {
      downloadErrorReport(importResult.errors, `import-errors-${Date.now()}.csv`);
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setImportResult(null);
  };

  // CSV column names are part of the file format — they stay as-is in every language.
  const csvColumns = [
    { name: 'NAMA', hint: tb.colNameHint },
    { name: 'EMEL', hint: tb.colEmailHint },
    { name: 'JAWATAN', hint: tb.colPositionHint },
  ];

  return (
    <AdminLayout>
      <PageHeader
        title={tb.title}
        description={tb.description}
        backTo="/admin/users"
        backLabel={t.adminStaff.userForm.backToUsers}
      />

      <div className="max-w-4xl space-y-6">
        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-muted-foreground" />
              {tb.formatTitle}
            </CardTitle>
            <CardDescription>{tb.formatDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              {csvColumns.map((column) => (
                <div key={column.name} className="rounded-lg border p-4">
                  <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm font-semibold">
                    {column.name}
                  </code>
                  <p className="mt-2 text-sm text-muted-foreground">{column.hint}</p>
                </div>
              ))}
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>{tb.noteTitle}</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-1 pl-4">
                  <li>{tb.noteSkipRows}</li>
                  <li>{tb.noteRole}</li>
                  <li>{tb.noteDuplicates}</li>
                </ul>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Upload Section */}
        {!importResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-muted-foreground" />
                {tb.uploadTitle}
              </CardTitle>
              <CardDescription>{tb.uploadDescription}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bulk-import-file">{tb.fileLabel}</Label>
                <Input
                  id="bulk-import-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={bulkImport.isPending}
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    {tb.selectedFile(selectedFile.name, (selectedFile.size / 1024).toFixed(2))}
                  </p>
                )}
              </div>

              <Button
                onClick={handleImport}
                disabled={!selectedFile || bulkImport.isPending}
                className="w-full"
                size="lg"
              >
                {bulkImport.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {tb.importing}
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    {tb.import}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {importResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {importResult.failed === 0 ? (
                  <CheckCircle2 className={cn('h-5 w-5', toneClasses.success.text)} />
                ) : (
                  <AlertCircle className={cn('h-5 w-5', toneClasses.warning.text)} />
                )}
                {tb.resultsTitle}
              </CardTitle>
              <CardDescription>{tb.resultsDescription(selectedFile?.name ?? '')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary Stats */}
              <div className="grid gap-4 sm:grid-cols-3">
                <StatCard
                  label={tb.created}
                  value={importResult.created}
                  icon={CheckCircle2}
                  tone="success"
                  hint={tb.createdHint}
                />
                <StatCard
                  label={tb.updated}
                  value={importResult.updated}
                  icon={RefreshCw}
                  tone="info"
                  hint={tb.updatedHint}
                />
                {importResult.failed > 0 && (
                  <StatCard
                    label={tb.failed}
                    value={importResult.failed}
                    icon={XCircle}
                    tone="danger"
                    hint={tb.failedHint}
                  />
                )}
              </div>

              {/* Error Details */}
              {importResult.errors.length > 0 && (
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-semibold">{tb.errorDetails}</h3>
                    <Button variant="outline" size="sm" onClick={handleDownloadErrors}>
                      <Download className="h-4 w-4" />
                      {tb.downloadErrors}
                    </Button>
                  </div>
                  <div className="max-h-64 overflow-y-auto rounded-lg border">
                    <Table>
                      <TableHeader className="sticky top-0 bg-muted">
                        <TableRow>
                          <TableHead className="w-20 text-right">{tb.colRow}</TableHead>
                          <TableHead>{t.common.email}</TableHead>
                          <TableHead>{tb.colError}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {importResult.errors.map((error, index) => (
                          <TableRow key={index}>
                            <TableCell className="text-right tabular-nums">{error.row}</TableCell>
                            <TableCell>{error.email}</TableCell>
                            <TableCell className={toneClasses.danger.text}>{error.error}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button onClick={handleReset} variant="outline" className="flex-1">
                  {tb.importAnother}
                </Button>
                <Button onClick={() => navigate('/admin/users')} className="flex-1">
                  {tb.viewUsers}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
