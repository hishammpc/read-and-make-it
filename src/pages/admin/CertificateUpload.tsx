import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePrograms } from '@/hooks/usePrograms';
import { useUsers } from '@/hooks/useUsers';
import { useUploadCertificate } from '@/hooks/useCertificates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Upload, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function CertificateUpload() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: programs, isLoading: programsLoading } = usePrograms();
  const { data: users, isLoading: usersLoading } = useUsers();
  const { mutateAsync: uploadCertificate } = useUploadCertificate();

  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState<{
    userId: string;
    userName: string;
    success: boolean;
    error?: string;
  }[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);

  const activeUsers = users?.filter((u) => u.status === 'active') || [];

  const handleEmployeeToggle = (userId: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedEmployees.length === activeUsers.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(activeUsers.map((u) => u.id));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
      } else {
        alert('Please select a PDF file');
        e.target.value = '';
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedProgram || selectedEmployees.length === 0 || !file || !user?.id) {
      alert('Please fill in all required fields');
      return;
    }

    setUploading(true);
    setUploadResults([]);
    setUploadProgress(0);

    const results: typeof uploadResults = [];
    const total = selectedEmployees.length;

    for (let i = 0; i < selectedEmployees.length; i++) {
      const employeeId = selectedEmployees[i];
      const employee = activeUsers.find((u) => u.id === employeeId);

      try {
        await uploadCertificate({
          file,
          userId: employeeId,
          programId: selectedProgram,
          uploadedBy: user.id,
        });

        results.push({
          userId: employeeId,
          userName: employee?.name || 'Unknown',
          success: true,
        });
      } catch (error) {
        results.push({
          userId: employeeId,
          userName: employee?.name || 'Unknown',
          success: false,
          error: error instanceof Error ? error.message : 'Upload failed',
        });
      }

      setUploadProgress(((i + 1) / total) * 100);
      setUploadResults([...results]);
    }

    setUploading(false);
  };

  const canUpload = selectedProgram && selectedEmployees.length > 0 && file && !uploading;
  const isComplete = uploadResults.length > 0 && !uploading;
  const successCount = uploadResults.filter((r) => r.success).length;
  const failureCount = uploadResults.filter((r) => !r.success).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="flex items-center h-16 px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard/certificates')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Certificates
          </Button>
          <h1 className="text-xl font-semibold ml-4">Upload Certificate</h1>
        </div>
      </header>

      <main className="p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {isComplete && (
            <Alert variant={failureCount === 0 ? 'default' : 'destructive'}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Upload complete: {successCount} successful, {failureCount} failed
              </AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Certificate Details</CardTitle>
              <CardDescription>
                Select a program, choose employees, and upload the certificate file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="program">Training Program *</Label>
                <Select
                  value={selectedProgram}
                  onValueChange={setSelectedProgram}
                  disabled={uploading || isComplete}
                >
                  <SelectTrigger id="program">
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programsLoading ? (
                      <SelectItem value="loading" disabled>
                        Loading programs...
                      </SelectItem>
                    ) : programs && programs.length > 0 ? (
                      programs.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.title} ({program.hours} hours)
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        No programs available
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Select Employees * ({selectedEmployees.length} selected)</Label>
                <div className="flex items-center gap-2 mb-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedEmployees.length === activeUsers.length && activeUsers.length > 0}
                    onCheckedChange={handleSelectAll}
                    disabled={uploading || isComplete}
                  />
                  <Label htmlFor="select-all" className="text-sm font-normal cursor-pointer">
                    Select All
                  </Label>
                </div>
                <div className="border rounded-md p-4 max-h-64 overflow-y-auto space-y-2">
                  {usersLoading ? (
                    <p className="text-sm text-muted-foreground">Loading employees...</p>
                  ) : activeUsers.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No active employees found</p>
                  ) : (
                    activeUsers.map((employee) => (
                      <div key={employee.id} className="flex items-center gap-2">
                        <Checkbox
                          id={employee.id}
                          checked={selectedEmployees.includes(employee.id)}
                          onCheckedChange={() => handleEmployeeToggle(employee.id)}
                          disabled={uploading || isComplete}
                        />
                        <Label
                          htmlFor={employee.id}
                          className="text-sm font-normal cursor-pointer flex-1"
                        >
                          {employee.name} - {employee.email}
                          {employee.department && ` (${employee.department})`}
                        </Label>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Certificate File (PDF only) *</Label>
                <Input
                  id="file"
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  disabled={uploading || isComplete}
                />
                {file && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Uploading certificates...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}

              {uploadResults.length > 0 && (
                <div className="space-y-2">
                  <Label>Upload Results</Label>
                  <div className="border rounded-md p-4 max-h-64 overflow-y-auto space-y-2">
                    {uploadResults.map((result) => (
                      <div
                        key={result.userId}
                        className="flex items-center gap-2 text-sm"
                      >
                        {result.success ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-600" />
                        )}
                        <span className={result.success ? 'text-green-600' : 'text-red-600'}>
                          {result.userName}
                        </span>
                        {result.error && (
                          <span className="text-muted-foreground">- {result.error}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                {isComplete ? (
                  <>
                    <Button
                      onClick={() => navigate('/dashboard/certificates')}
                      className="flex-1"
                    >
                      Back to Certificates
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedProgram('');
                        setSelectedEmployees([]);
                        setFile(null);
                        setUploadResults([]);
                        setUploadProgress(0);
                      }}
                      className="flex-1"
                    >
                      Upload Another
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={handleUpload}
                    disabled={!canUpload}
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Certificate{selectedEmployees.length > 1 ? 's' : ''}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
