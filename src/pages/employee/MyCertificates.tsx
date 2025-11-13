import { useAuth } from '@/contexts/AuthContext';
import { useUserCertificates } from '@/hooks/useCertificates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Download, FileText, Calendar, Clock, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function MyCertificates() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: certificates, isLoading, error } = useUserCertificates(user?.id || '');

  const handleDownload = (fileUrl: string, programTitle: string) => {
    window.open(fileUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="flex items-center h-16 px-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-semibold ml-4">My Certificates</h1>
          </div>
        </header>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading certificates...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="flex items-center h-16 px-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-xl font-semibold ml-4">My Certificates</h1>
          </div>
        </header>
        <div className="p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load certificates: {error instanceof Error ? error.message : 'Unknown error'}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="flex items-center h-16 px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-xl font-semibold ml-4">My Certificates</h1>
        </div>
      </header>

      <main className="p-6">
        <div className="max-w-6xl mx-auto">
          {!certificates || certificates.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="rounded-full bg-muted p-6">
                      <FileText className="h-12 w-12 text-muted-foreground" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">No Certificates Yet</h3>
                    <p className="text-muted-foreground max-w-md mx-auto">
                      You don't have any training certificates yet. Complete training programs
                      to receive certificates that will appear here.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-muted-foreground">
                  {certificates.length} certificate{certificates.length !== 1 ? 's' : ''} earned
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {certificates.map((certificate: any) => (
                  <Card key={certificate.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg line-clamp-2">
                            {certificate.programs?.title || 'Unknown Program'}
                          </CardTitle>
                        </div>
                        <Badge variant="outline" className="ml-2">
                          {certificate.programs?.category || 'General'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Issued: {format(new Date(certificate.issued_at), 'MMM dd, yyyy')}</span>
                        </div>
                        {certificate.programs?.hours && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            <span>{certificate.programs.hours} training hours</span>
                          </div>
                        )}
                      </div>

                      <Button
                        onClick={() => handleDownload(certificate.file_url, certificate.programs?.title)}
                        className="w-full"
                        variant="outline"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        View Certificate
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
