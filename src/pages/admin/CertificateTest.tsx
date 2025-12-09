import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateCertificate, DEFAULT_POSITIONS, TextPosition } from '@/lib/certificateGenerator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { ArrowLeft, Download, RefreshCw, Copy, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CertificateTest() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sample data for testing
  const [formData, setFormData] = useState({
    employeeName: 'Ahmad bin Abdullah',
    programTitle: 'Kursus Kepimpinan dan Pengurusan Organisasi',
    startDate: '2025-10-12T09:00',
    endDate: '2025-10-14T17:00',
  });

  // Text positions (in percentage for visual preview, will convert to mm for PDF)
  const [positions, setPositions] = useState<TextPosition>(DEFAULT_POSITIONS);

  // Template image
  const [templateImage, setTemplateImage] = useState<string>('/certificate-template.jpg');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Check if default template exists
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setImageLoaded(true);
      setImageError(false);
    };
    img.onerror = () => {
      setImageLoaded(false);
      setImageError(true);
    };
    img.src = '/certificate-template.jpg';
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setTemplateImage(dataUrl);
        setImageLoaded(true);
        setImageError(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = async () => {
    try {
      await generateCertificate(formData, positions, false);
      toast({
        title: 'Success',
        description: 'Certificate downloaded!',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to generate certificate',
        variant: 'destructive',
      });
    }
  };

  const handleCopyPositions = () => {
    const code = `export const DEFAULT_POSITIONS: TextPosition = {
  employeeName: { x: ${positions.employeeName.x}, y: ${positions.employeeName.y}, fontSize: ${positions.employeeName.fontSize} },
  programTitle: { x: ${positions.programTitle.x}, y: ${positions.programTitle.y}, fontSize: ${positions.programTitle.fontSize} },
  dateRange: { x: ${positions.dateRange.x}, y: ${positions.dateRange.y}, fontSize: ${positions.dateRange.fontSize} },
};`;
    navigator.clipboard.writeText(code);
    toast({
      title: 'Copied!',
      description: 'Position values copied to clipboard',
    });
  };

  const resetPositions = () => {
    setPositions(DEFAULT_POSITIONS);
  };

  const updatePosition = (
    field: keyof TextPosition,
    prop: 'x' | 'y' | 'fontSize',
    value: number
  ) => {
    setPositions((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [prop]: value,
      },
    }));
  };

  // Convert mm to percentage for visual display (A4 landscape: 297mm x 210mm)
  const mmToPercent = (mm: number, isX: boolean) => {
    return isX ? (mm / 297) * 100 : (mm / 210) * 100;
  };

  // Format date range for preview
  const formatDateRange = () => {
    const MALAY_MONTHS = [
      'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
      'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember'
    ];
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);

    const startDay = start.getDate();
    const endDay = end.getDate();
    const startMonth = MALAY_MONTHS[start.getMonth()];
    const endMonth = MALAY_MONTHS[end.getMonth()];
    const year = start.getFullYear();

    if (start.getMonth() === end.getMonth()) {
      return `${startDay} - ${endDay} ${startMonth} ${year}`;
    }
    return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${year}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Certificate Position Tester</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetPositions}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button variant="outline" onClick={handleCopyPositions}>
              <Copy className="h-4 w-4 mr-2" />
              Copy Code
            </Button>
            <Button onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-6 p-6">
        {/* Controls Panel */}
        <div className="lg:w-96 space-y-4 overflow-y-auto max-h-[calc(100vh-8rem)]">
          {/* Upload Template */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Certificate Template</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/png,image/jpeg"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Template PNG
              </Button>
              {imageError && (
                <p className="text-xs text-orange-600 mt-2">
                  Default template not found. Please upload your certificate PNG.
                </p>
              )}
              {imageLoaded && !imageError && (
                <p className="text-xs text-green-600 mt-2">
                  ✓ Template loaded
                </p>
              )}
            </CardContent>
          </Card>

          {/* Sample Data */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Sample Data</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">Employee Name</Label>
                <Input
                  value={formData.employeeName}
                  onChange={(e) => setFormData({ ...formData, employeeName: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Program Title</Label>
                <Input
                  value={formData.programTitle}
                  onChange={(e) => setFormData({ ...formData, programTitle: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">Start Date</Label>
                  <Input
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">End Date</Label>
                  <Input
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Employee Name Position */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-blue-600">📍 Employee Name</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <Label>X (horizontal)</Label>
                  <span className="text-muted-foreground font-mono">{positions.employeeName.x}mm</span>
                </div>
                <Slider
                  value={[positions.employeeName.x]}
                  onValueChange={([v]) => updatePosition('employeeName', 'x', v)}
                  min={0}
                  max={297}
                  step={0.5}
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <Label>Y (vertical)</Label>
                  <span className="text-muted-foreground font-mono">{positions.employeeName.y}mm</span>
                </div>
                <Slider
                  value={[positions.employeeName.y]}
                  onValueChange={([v]) => updatePosition('employeeName', 'y', v)}
                  min={0}
                  max={210}
                  step={0.5}
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <Label>Font Size</Label>
                  <span className="text-muted-foreground font-mono">{positions.employeeName.fontSize}pt</span>
                </div>
                <Slider
                  value={[positions.employeeName.fontSize]}
                  onValueChange={([v]) => updatePosition('employeeName', 'fontSize', v)}
                  min={10}
                  max={48}
                  step={1}
                />
              </div>
            </CardContent>
          </Card>

          {/* Program Title Position */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-green-600">📍 Program Title</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <Label>X (horizontal)</Label>
                  <span className="text-muted-foreground font-mono">{positions.programTitle.x}mm</span>
                </div>
                <Slider
                  value={[positions.programTitle.x]}
                  onValueChange={([v]) => updatePosition('programTitle', 'x', v)}
                  min={0}
                  max={297}
                  step={0.5}
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <Label>Y (vertical)</Label>
                  <span className="text-muted-foreground font-mono">{positions.programTitle.y}mm</span>
                </div>
                <Slider
                  value={[positions.programTitle.y]}
                  onValueChange={([v]) => updatePosition('programTitle', 'y', v)}
                  min={0}
                  max={210}
                  step={0.5}
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <Label>Font Size</Label>
                  <span className="text-muted-foreground font-mono">{positions.programTitle.fontSize}pt</span>
                </div>
                <Slider
                  value={[positions.programTitle.fontSize]}
                  onValueChange={([v]) => updatePosition('programTitle', 'fontSize', v)}
                  min={10}
                  max={36}
                  step={1}
                />
              </div>
            </CardContent>
          </Card>

          {/* Date Range Position */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-orange-600">📍 Date Range</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <Label>X (horizontal)</Label>
                  <span className="text-muted-foreground font-mono">{positions.dateRange.x}mm</span>
                </div>
                <Slider
                  value={[positions.dateRange.x]}
                  onValueChange={([v]) => updatePosition('dateRange', 'x', v)}
                  min={0}
                  max={297}
                  step={0.5}
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <Label>Y (vertical)</Label>
                  <span className="text-muted-foreground font-mono">{positions.dateRange.y}mm</span>
                </div>
                <Slider
                  value={[positions.dateRange.y]}
                  onValueChange={([v]) => updatePosition('dateRange', 'y', v)}
                  min={0}
                  max={210}
                  step={0.5}
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <Label>Font Size</Label>
                  <span className="text-muted-foreground font-mono">{positions.dateRange.fontSize}pt</span>
                </div>
                <Slider
                  value={[positions.dateRange.fontSize]}
                  onValueChange={([v]) => updatePosition('dateRange', 'fontSize', v)}
                  min={8}
                  max={24}
                  step={1}
                />
              </div>
            </CardContent>
          </Card>

          {/* Position Values Display */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Current Values (copy to code)</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
{`employeeName: { x: ${positions.employeeName.x}, y: ${positions.employeeName.y}, fontSize: ${positions.employeeName.fontSize} }
programTitle: { x: ${positions.programTitle.x}, y: ${positions.programTitle.y}, fontSize: ${positions.programTitle.fontSize} }
dateRange: { x: ${positions.dateRange.x}, y: ${positions.dateRange.y}, fontSize: ${positions.dateRange.fontSize} }`}
              </pre>
            </CardContent>
          </Card>
        </div>

        {/* Visual Preview Panel */}
        <div className="flex-1">
          <Card className="sticky top-24">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Visual Preview (drag sliders to adjust)</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="relative w-full border rounded overflow-hidden bg-gray-100"
                style={{ aspectRatio: '297/210' }}
              >
                {/* Certificate Template Image */}
                {imageLoaded ? (
                  <img
                    src={templateImage}
                    alt="Certificate Template"
                    className="absolute inset-0 w-full h-full object-contain"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                    <div className="text-center p-4">
                      <Upload className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Upload your certificate template PNG</p>
                      <p className="text-xs mt-1">or save it to public/certificate-template.png</p>
                    </div>
                  </div>
                )}

                {/* Text Overlays */}
                {imageLoaded && (
                  <>
                    {/* Employee Name */}
                    <div
                      className="absolute text-blue-600 font-bold whitespace-nowrap pointer-events-none"
                      style={{
                        left: `${mmToPercent(positions.employeeName.x, true)}%`,
                        top: `${mmToPercent(positions.employeeName.y, false)}%`,
                        transform: 'translate(-50%, -50%)',
                        fontSize: `${positions.employeeName.fontSize * 1.2}px`,
                      }}
                    >
                      {formData.employeeName}
                    </div>

                    {/* Program Title */}
                    <div
                      className="absolute text-green-600 font-bold text-center pointer-events-none px-4"
                      style={{
                        left: `${mmToPercent(positions.programTitle.x, true)}%`,
                        top: `${mmToPercent(positions.programTitle.y, false)}%`,
                        transform: 'translate(-50%, -50%)',
                        fontSize: `${positions.programTitle.fontSize * 1.2}px`,
                        maxWidth: '80%',
                      }}
                    >
                      {formData.programTitle}
                    </div>

                    {/* Date Range */}
                    <div
                      className="absolute text-orange-600 whitespace-nowrap pointer-events-none"
                      style={{
                        left: `${mmToPercent(positions.dateRange.x, true)}%`,
                        top: `${mmToPercent(positions.dateRange.y, false)}%`,
                        transform: 'translate(-50%, -50%)',
                        fontSize: `${positions.dateRange.fontSize * 1.2}px`,
                      }}
                    >
                      {formatDateRange()}
                    </div>
                  </>
                )}
              </div>

              <div className="flex items-center justify-between mt-3">
                <p className="text-xs text-muted-foreground">
                  A4 Landscape: 297mm × 210mm
                </p>
                <div className="flex gap-2 text-xs">
                  <span className="text-blue-600">■ Name</span>
                  <span className="text-green-600">■ Title</span>
                  <span className="text-orange-600">■ Date</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
