import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUploadCertificate } from '@/hooks/useCertificates';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface CertificateUploadProps {
  programId: string;
  userId: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export default function CertificateUpload({
  programId,
  userId,
  onSuccess,
  onError,
}: CertificateUploadProps) {
  const { user } = useAuth();
  const { mutateAsync: uploadCertificate } = useUploadCertificate();

  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/pdf') {
        setFile(selectedFile);
        setUploadStatus('idle');
        setErrorMessage('');
      } else {
        alert('Please select a PDF file');
        e.target.value = '';
      }
    }
  };

  const handleUpload = async () => {
    if (!file || !user?.id || !programId || !userId) {
      setErrorMessage('Missing required information');
      return;
    }

    setUploading(true);
    setUploadStatus('idle');
    setErrorMessage('');
    setUploadProgress(0);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await uploadCertificate({
        file,
        userId,
        programId,
        uploadedBy: user.id,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadStatus('success');

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      setUploadStatus('error');
      const errorMsg = error instanceof Error ? error.message : 'Upload failed';
      setErrorMessage(errorMsg);

      if (onError && error instanceof Error) {
        onError(error);
      }
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setUploadStatus('idle');
    setErrorMessage('');
    setUploadProgress(0);
  };

  return (
    <div className="space-y-4">
      {uploadStatus === 'success' && (
        <Alert>
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-600">
            Certificate uploaded successfully!
          </AlertDescription>
        </Alert>
      )}

      {uploadStatus === 'error' && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            {errorMessage || 'Failed to upload certificate'}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="certificate-file">Certificate File (PDF only) *</Label>
        <Input
          id="certificate-file"
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileChange}
          disabled={uploading || uploadStatus === 'success'}
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
            <span>Uploading certificate...</span>
            <span>{Math.round(uploadProgress)}%</span>
          </div>
          <Progress value={uploadProgress} />
        </div>
      )}

      <div className="flex gap-3">
        {uploadStatus === 'success' ? (
          <Button onClick={resetUpload} variant="outline" className="flex-1">
            Upload Another
          </Button>
        ) : (
          <Button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex-1"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Certificate
          </Button>
        )}
      </div>
    </div>
  );
}
