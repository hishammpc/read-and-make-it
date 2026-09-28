import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePrograms } from '@/hooks/usePrograms';
import { useUsers } from '@/hooks/useUsers';
import { useUploadCertificate } from '@/hooks/useCertificates';
import { useToast } from '@/hooks/use-toast';
import { toneClasses } from '@/lib/status';
import { cn } from '@/lib/utils';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { Notice } from '@/components/common/Callout';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Upload, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

function RequiredMark() {
  return <span className="text-destructive" aria-hidden="true"> *</span>;
}

export default function CertificateUpload() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const tu = t.adminTraining.certificateUpload;
  const ts = t.adminTraining.shared;
  const { toast } = useToast();
  const { data: programs, isLoading: programsLoading } = usePrograms();
  const { data: users, isLoading: usersLoading } = useUsers();
  const { mutateAsync: uploadCertificate } = useUploadCertificate();

  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  // Bumped on reset so the file input remounts and forgets the previous file name
  const [fileInputKey, setFileInputKey] = useState(0);
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
        toast({ title: tu.pdfOnly, variant: 'destructive' });
        e.target.value = '';
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedProgram || selectedEmployees.length === 0 || !file || !user?.userId) {
      toast({ title: tu.missingFields, variant: 'destructive' });
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
          uploadedBy: user.userId,
        });

        results.push({
          userId: employeeId,
          userName: employee?.name || ts.unknown,
          success: true,
        });
      } catch (error) {
        results.push({
          userId: employeeId,
          userName: employee?.name || ts.unknown,
          success: false,
          error: error instanceof Error ? error.message : tu.uploadFailed,
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

  const resultTone = failureCount === 0 ? 'success' : 'danger';

  return (
    <AdminLayout>
      <PageHeader title={tu.title} description={tu.description} backTo="/dashboard/certificates" />

      <div className="max-w-3xl space-y-6">
        {isComplete && (
          <Notice tone={resultTone} icon={failureCount === 0 ? CheckCircle2 : AlertCircle}>
            {tu.complete(successCount, failureCount)}
          </Notice>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{tu.cardTitle}</CardTitle>
            <CardDescription>
              {tu.cardDescription} {ts.requiredFieldsHint}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="program">
                {tu.program}
                <RequiredMark />
              </Label>
              <Select
                value={selectedProgram}
                onValueChange={setSelectedProgram}
                disabled={uploading || isComplete}
              >
                <SelectTrigger id="program">
                  <SelectValue placeholder={tu.programPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {programsLoading ? (
                    <SelectItem value="loading" disabled>
                      {t.common.loading}
                    </SelectItem>
                  ) : programs && programs.length > 0 ? (
                    programs.map((program) => (
                      <SelectItem key={program.id} value={program.id}>
                        {tu.programOption(program.title, program.hours)}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="none" disabled>
                      {tu.noPrograms}
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2" role="group" aria-labelledby="staff-label">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <Label id="staff-label">
                  {tu.staff}
                  <RequiredMark />
                  <span className="ml-2 font-normal text-muted-foreground">
                    {tu.selectedCount(selectedEmployees.length)}
                  </span>
                </Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all"
                    checked={selectedEmployees.length === activeUsers.length && activeUsers.length > 0}
                    onCheckedChange={handleSelectAll}
                    disabled={uploading || isComplete}
                  />
                  <Label htmlFor="select-all" className="cursor-pointer text-sm font-normal">
                    {tu.selectAll}
                  </Label>
                </div>
              </div>
              <div className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-4">
                {usersLoading ? (
                  <div className="space-y-2" aria-busy="true">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-5 w-3/4" />
                  </div>
                ) : activeUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{tu.noActiveStaff}</p>
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
                        className="flex-1 cursor-pointer text-sm font-normal"
                      >
                        {employee.name}
                        <span className="text-muted-foreground">
                          {' '}· {employee.email}
                          {employee.department && ` · ${employee.department}`}
                        </span>
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">
                {tu.file}
                <RequiredMark />
              </Label>
              <Input
                key={fileInputKey}
                id="file"
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                disabled={uploading || isComplete}
              />
              {file && (
                <p className="text-sm text-muted-foreground">
                  {tu.selectedFile(file.name, (file.size / 1024 / 1024).toFixed(2))}
                </p>
              )}
            </div>

            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{tu.uploading}</span>
                  <span className="tabular-nums">{Math.round(uploadProgress)}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            {uploadResults.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">{tu.results}</p>
                <ul className="max-h-64 space-y-2 overflow-y-auto rounded-md border p-4">
                  {uploadResults.map((result) => (
                    <li key={result.userId} className="flex items-center gap-2 text-sm">
                      {result.success ? (
                        <CheckCircle2 className={cn('h-4 w-4 shrink-0', toneClasses.success.text)} aria-hidden="true" />
                      ) : (
                        <XCircle className={cn('h-4 w-4 shrink-0', toneClasses.danger.text)} aria-hidden="true" />
                      )}
                      <span className={result.success ? toneClasses.success.text : toneClasses.danger.text}>
                        {result.userName}
                      </span>
                      {result.error && (
                        <span className="text-muted-foreground">- {result.error}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              {isComplete ? (
                <>
                  <Button
                    onClick={() => navigate('/dashboard/certificates')}
                    className="flex-1"
                  >
                    {tu.backToList}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSelectedProgram('');
                      setSelectedEmployees([]);
                      setFile(null);
                      setFileInputKey((k) => k + 1);
                      setUploadResults([]);
                      setUploadProgress(0);
                    }}
                    className="flex-1"
                  >
                    {tu.uploadAnother}
                  </Button>
                </>
              ) : (
                <Button
                  onClick={handleUpload}
                  disabled={!canUpload}
                  className="flex-1"
                >
                  <Upload className="h-4 w-4" />
                  {tu.submit(selectedEmployees.length)}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
