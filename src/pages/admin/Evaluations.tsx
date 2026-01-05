import { useState } from 'react';
import { useEvaluationsByProgram, ProgramEvaluationSummary } from '@/hooks/useEvaluations';
import { formatMalaysianDate } from '@/lib/dateUtils';
import AdminLayout from '@/components/layout/AdminLayout';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eye, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import { addLogoToPDF } from '@/lib/pdfUtils';

const MONTHS = [
  { value: '1', label: 'Januari' },
  { value: '2', label: 'Februari' },
  { value: '3', label: 'Mac' },
  { value: '4', label: 'April' },
  { value: '5', label: 'Mei' },
  { value: '6', label: 'Jun' },
  { value: '7', label: 'Julai' },
  { value: '8', label: 'Ogos' },
  { value: '9', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Disember' },
];

// Extended years from 2023 to 2035
const YEARS = Array.from({ length: 13 }, (_, i) => (2023 + i).toString());

const getRatingBadgeVariant = (rating: string) => {
  switch (rating) {
    case 'BAGUS':
      return 'default';
    case 'SEDERHANA':
      return 'secondary';
    case 'LEMAH':
      return 'destructive';
    default:
      return 'outline';
  }
};

const getRatingBadgeClass = (rating: string) => {
  switch (rating) {
    case 'BAGUS':
      return 'bg-green-500 hover:bg-green-600 text-white';
    case 'SEDERHANA':
      return 'bg-yellow-500 hover:bg-yellow-600 text-white';
    case 'LEMAH':
      return 'bg-red-500 hover:bg-red-600 text-white';
    default:
      return '';
  }
};

const getMonthLabel = (value: string) => {
  const month = MONTHS.find(m => m.value === value);
  return month?.label || '';
};

export default function Evaluations() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [fromMonth, setFromMonth] = useState('');
  const [toMonth, setToMonth] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<ProgramEvaluationSummary | null>(null);

  const { data: evaluations, isLoading, error } = useEvaluationsByProgram(
    parseInt(selectedYear),
    fromMonth,
    toMonth
  );

  const handleDownloadPDF = async () => {
    if (!evaluations || evaluations.length === 0) return;

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let yPosition = margin;

    // Add MPC logo
    await addLogoToPDF(doc, margin, yPosition, 20, 20);
    yPosition += 5;

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Laporan Penilaian Program', margin + 25, yPosition + 5);

    // Filter info
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let filterText = `Tahun: ${selectedYear}`;
    if (fromMonth && fromMonth !== 'all') {
      filterText += ` | Dari: ${getMonthLabel(fromMonth)}`;
    }
    if (toMonth && toMonth !== 'all') {
      filterText += ` | Hingga: ${getMonthLabel(toMonth)}`;
    }
    doc.text(filterText, margin + 25, yPosition + 12);
    yPosition += 30;

    // Table headers
    const headers = ['#', 'Program', 'Tarikh', 'Responses', 'Rating', 'Score'];
    const colWidths = [10, 100, 60, 30, 30, 25];
    const rowHeight = 8;

    // Draw header background
    doc.setFillColor(59, 130, 246);
    doc.rect(margin, yPosition, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');

    // Draw header text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    let xPos = margin + 2;
    headers.forEach((header, i) => {
      doc.text(header, xPos, yPosition + 5.5);
      xPos += colWidths[i];
    });
    yPosition += rowHeight;

    // Draw rows
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    evaluations.forEach((evaluation, index) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 25) {
        doc.addPage();
        yPosition = margin;
      }

      // Alternate row background
      if (index % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, yPosition, colWidths.reduce((a, b) => a + b, 0), rowHeight, 'F');
      }

      // Row data
      const rowData = [
        (index + 1).toString(),
        evaluation.programTitle.length > 50 ? evaluation.programTitle.substring(0, 47) + '...' : evaluation.programTitle,
        `${formatMalaysianDate(evaluation.startDate)} - ${formatMalaysianDate(evaluation.endDate)}`,
        `${evaluation.totalResponses}/${evaluation.totalAssigned}`,
        evaluation.totalResponses > 0 ? evaluation.averageRating : '-',
        evaluation.totalResponses > 0 ? evaluation.averageScore.toFixed(2) : '-',
      ];

      xPos = margin + 2;
      rowData.forEach((cell, i) => {
        doc.text(cell, xPos, yPosition + 5.5);
        xPos += colWidths[i];
      });
      yPosition += rowHeight;
    });

    // Summary
    yPosition += 5;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Jumlah Program: ${evaluations.length}`, margin, yPosition);

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(
      `Dijana pada: ${new Date().toLocaleString('ms-MY')}`,
      margin,
      pageHeight - 10
    );

    // Save
    const filename = `Laporan_Penilaian_${selectedYear}${fromMonth && fromMonth !== 'all' ? '_' + getMonthLabel(fromMonth) : ''}${toMonth && toMonth !== 'all' ? '_' + getMonthLabel(toMonth) : ''}.pdf`;
    doc.save(filename);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Evaluations</h1>
          <p className="text-muted-foreground">
            View program evaluation summaries
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={fromMonth} onValueChange={setFromMonth}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Dari bulan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Bulan</SelectItem>
              {MONTHS.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <span className="text-muted-foreground">sehingga</span>

          <Select value={toMonth} onValueChange={setToMonth}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Hingga bulan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Bulan</SelectItem>
              {MONTHS.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={handleDownloadPDF}
            disabled={!evaluations || evaluations.length === 0 || isLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            Muat Turun PDF
          </Button>
        </div>

        {/* Evaluations Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : error ? (
              <div className="p-6 text-center text-destructive">
                Error loading evaluations: {error.message}
              </div>
            ) : !evaluations || evaluations.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No programs found for the selected period.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-bold">Program</TableHead>
                    <TableHead className="font-bold text-center">Responses</TableHead>
                    <TableHead className="font-bold text-center">Overall Rating</TableHead>
                    <TableHead className="font-bold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluations.map((evaluation) => (
                    <TableRow key={evaluation.programId}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{evaluation.programTitle}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatMalaysianDate(evaluation.startDate)} - {formatMalaysianDate(evaluation.endDate)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-semibold">
                          {evaluation.totalResponses}/{evaluation.totalAssigned}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {evaluation.totalResponses > 0 ? (
                          <Badge className={getRatingBadgeClass(evaluation.averageRating)}>
                            {evaluation.averageRating}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setSelectedProgram(evaluation)}
                          title="View feedback"
                          disabled={evaluation.comments.length === 0}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {!isLoading && evaluations && evaluations.length > 0 && (
          <div className="text-sm text-muted-foreground text-center">
            Showing {evaluations.length} programs
          </div>
        )}

        {/* Feedback Dialog */}
        <Dialog open={!!selectedProgram} onOpenChange={() => setSelectedProgram(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Feedback - {selectedProgram?.programTitle}</DialogTitle>
            </DialogHeader>
            {selectedProgram && (
              <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground">Responses</div>
                    <div className="font-semibold">
                      {selectedProgram.totalResponses}/{selectedProgram.totalAssigned}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Average Rating</div>
                    <Badge className={getRatingBadgeClass(selectedProgram.averageRating)}>
                      {selectedProgram.averageRating}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Score</div>
                    <div className="font-semibold">{selectedProgram.averageScore.toFixed(2)} / 3.00</div>
                  </div>
                </div>

                {/* Comments */}
                <div>
                  <h3 className="font-semibold mb-3">Feedback & Suggestions ({selectedProgram.comments.length})</h3>
                  {selectedProgram.comments.length > 0 ? (
                    <div className="space-y-3">
                      {selectedProgram.comments.map((comment, index) => (
                        <div key={index} className="p-3 bg-muted/50 rounded-lg text-sm">
                          {comment}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-muted-foreground text-sm italic">
                      No comments or suggestions provided.
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
