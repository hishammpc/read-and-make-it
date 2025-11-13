import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useBulkImportUsers, BulkImportResult } from '@/hooks/useBulkImport';
import { downloadErrorReport } from '@/lib/csvParser';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  ArrowLeft,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Download,
} from 'lucide-react';

export default function BulkUserImport() {
  const navigate = useNavigate();
  const { user } = useAuth();
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
        alert('Please select a CSV file');
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin/users')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Bulk User Import</h1>
            <p className="text-muted-foreground">
              Import multiple users from CSV file
            </p>
          </div>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5" />
              CSV Format Requirements
            </CardTitle>
            <CardDescription>
              Your CSV file should have the following columns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="font-semibold text-sm mb-1">NAMA</div>
                  <div className="text-sm text-muted-foreground">Full name (required)</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="font-semibold text-sm mb-1">EMEL</div>
                  <div className="text-sm text-muted-foreground">Email address (required)</div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="font-semibold text-sm mb-1">JAWATAN</div>
                  <div className="text-sm text-muted-foreground">Position (optional)</div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Note:</strong> The first 2 rows will be skipped (headers).
                  All imported users will be assigned the "employee" role.
                  Duplicate emails will update existing user records.
                </AlertDescription>
              </Alert>
            </div>
          </CardContent>
        </Card>

        {/* Upload Section */}
        {!importResult && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload CSV File
              </CardTitle>
              <CardDescription>
                Select your CSV file to import users
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  disabled={bulkImport.isPending}
                />
                {selectedFile && (
                  <div className="text-sm text-muted-foreground">
                    Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                  </div>
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
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Importing Users...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Import Users
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
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                )}
                Import Results
              </CardTitle>
              <CardDescription>
                Import completed for {selectedFile?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div className="font-semibold text-green-900 dark:text-green-100">Created</div>
                  </div>
                  <div className="text-3xl font-bold text-green-700 dark:text-green-300">
                    {importResult.created}
                  </div>
                  <div className="text-sm text-green-600 dark:text-green-400">New users</div>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <div className="font-semibold text-blue-900 dark:text-blue-100">Updated</div>
                  </div>
                  <div className="text-3xl font-bold text-blue-700 dark:text-blue-300">
                    {importResult.updated}
                  </div>
                  <div className="text-sm text-blue-600 dark:text-blue-400">Existing users</div>
                </div>

                {importResult.failed > 0 && (
                  <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                      <div className="font-semibold text-red-900 dark:text-red-100">Failed</div>
                    </div>
                    <div className="text-3xl font-bold text-red-700 dark:text-red-300">
                      {importResult.failed}
                    </div>
                    <div className="text-sm text-red-600 dark:text-red-400">Errors</div>
                  </div>
                )}
              </div>

              {/* Error Details */}
              {importResult.errors.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold">Error Details</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadErrors}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Download Error Report
                    </Button>
                  </div>
                  <div className="border rounded-lg overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left">Row</th>
                            <th className="px-4 py-2 text-left">Email</th>
                            <th className="px-4 py-2 text-left">Error</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importResult.errors.map((error, index) => (
                            <tr key={index} className="border-t">
                              <td className="px-4 py-2">{error.row}</td>
                              <td className="px-4 py-2">{error.email}</td>
                              <td className="px-4 py-2 text-red-600">{error.error}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="flex-1"
                >
                  Import Another File
                </Button>
                <Button
                  onClick={() => navigate('/admin/users')}
                  className="flex-1"
                >
                  View All Users
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
