import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserAssignments } from '@/hooks/useAssignments';
import { useUserEvaluations } from '@/hooks/useEvaluations';
import { generateCertificate } from '@/lib/certificateGenerator';
import { formatMalaysianDate } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Search, Clock, CheckCircle2, AlertCircle, Download, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import { addLogoToPDF } from '@/lib/pdfUtils';

// Extended years from 2023 to 2035
const YEARS = Array.from({ length: 13 }, (_, i) => (2023 + i).toString());

export default function MyTrainings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: assignments, isLoading: assignmentsLoading } = useUserAssignments(user?.userId || '');
  const { data: evaluations, isLoading: evaluationsLoading } = useUserEvaluations(user?.userId || '');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear().toString());

  const isLoading = assignmentsLoading || evaluationsLoading;

  // Get set of program IDs that have been evaluated
  const evaluatedProgramIds = new Set(evaluations?.map((e: any) => e.program_id) || []);

  const filteredAssignments = () => {
    if (!assignments) return [];

    let filtered = assignments;

    // Filter by year
    if (selectedYear) {
      filtered = filtered.filter((a: any) => {
        const startDate = new Date(a.programs?.start_date_time);
        return startDate.getFullYear().toString() === selectedYear;
      });
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((a: any) =>
        a.programs?.title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const handleDownloadCertificate = async (assignment: any) => {
    const employeeName = user?.name || 'Employee';
    const programTitle = assignment.programs?.title || 'Training Program';
    const startDate = assignment.programs?.start_date_time;
    const endDate = assignment.programs?.end_date_time;

    await generateCertificate({
      employeeName,
      programTitle,
      startDate,
      endDate,
    });
  };

  const handleDownloadPDF = async () => {
    const data = filteredAssignments();
    if (data.length === 0) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 14;

    // Add MPC logo
    await addLogoToPDF(doc, margin, 10, 20, 20);

    // Title (positioned next to logo)
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Senarai Program Latihan Saya', margin + 25, 18);

    // Employee name and year (next to logo)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nama: ${user?.name || 'Employee'}`, margin + 25, 25);
    doc.text(`Tahun: ${selectedYear}`, margin + 25, 31);

    // Calculate total hours
    const totalHours = data.reduce((sum: number, a: any) => sum + (a.programs?.hours || 0), 0);
    doc.text(`Jumlah Jam Latihan: ${totalHours} jam`, margin, 42);

    // Table headers
    const headers = ['Bil', 'Program', 'Tarikh Mula', 'Tarikh Tamat', 'Jam', 'Penilaian'];
    const colWidths = [12, 75, 30, 30, 15, 25];
    let startY = 52;

    // Draw header row
    doc.setFillColor(59, 130, 246);
    doc.rect(margin, startY, pageWidth - margin * 2, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');

    let xPos = margin + 2;
    headers.forEach((header, i) => {
      doc.text(header, xPos, startY + 5.5);
      xPos += colWidths[i];
    });

    // Draw data rows
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'normal');
    startY += 8;

    data.forEach((assignment: any, index: number) => {
      if (startY > pageHeight - 20) {
        doc.addPage();
        startY = 20;
      }

      const isEvaluated = evaluatedProgramIds.has(assignment.program_id);
      const requiresEvaluation = assignment.programs?.notify_for_evaluation;
      const rowHeight = 7;

      // Alternate row colors
      if (index % 2 === 0) {
        doc.setFillColor(249, 250, 251);
        doc.rect(margin, startY, pageWidth - margin * 2, rowHeight, 'F');
      }

      // Determine evaluation status text
      let evaluationStatus = '-';
      if (requiresEvaluation) {
        evaluationStatus = isEvaluated ? 'Selesai' : 'Belum';
      }

      xPos = margin + 2;
      const rowData = [
        (index + 1).toString(),
        assignment.programs?.title?.substring(0, 40) || '',
        formatMalaysianDate(assignment.programs?.start_date_time),
        formatMalaysianDate(assignment.programs?.end_date_time),
        (assignment.programs?.hours || 0).toString(),
        evaluationStatus,
      ];

      rowData.forEach((cell, i) => {
        doc.text(cell, xPos, startY + 5);
        xPos += colWidths[i];
      });

      startY += rowHeight;
    });

    // Footer with date generated
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Dijana pada: ${formatMalaysianDate(new Date().toISOString())}`, margin, pageHeight - 10);

    doc.save(`latihan-saya-${selectedYear}.pdf`);
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
            <h1 className="text-xl font-semibold ml-4">My Trainings</h1>
          </div>
        </header>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading trainings...</p>
          </div>
        </div>
      </div>
    );
  }

  const assignmentsList = filteredAssignments();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
          <h1 className="text-xl font-semibold ml-4">My Trainings</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Filters and Actions */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Year Filter */}
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Tahun" />
              </SelectTrigger>
              <SelectContent>
                {YEARS.map((year) => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari program..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Download PDF Button */}
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={assignmentsList.length === 0}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Muat Turun PDF
            </Button>

            <span className="text-sm text-muted-foreground">
              {assignmentsList.length} program{assignmentsList.length !== 1 ? '' : ''}
            </span>
          </div>

          {/* Trainings Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="font-bold">Program Title</TableHead>
                  <TableHead className="font-bold">Start Date</TableHead>
                  <TableHead className="font-bold">End Date</TableHead>
                  <TableHead className="font-bold">Hours</TableHead>
                  <TableHead className="font-bold">Evaluation</TableHead>
                  <TableHead className="font-bold">Certificate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignmentsList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No trainings assigned
                    </TableCell>
                  </TableRow>
                ) : (
                  assignmentsList.map((assignment: any) => {
                    const isEvaluated = evaluatedProgramIds.has(assignment.program_id);

                    return (
                      <TableRow key={assignment.id}>
                        <TableCell className="font-medium">
                          {assignment.programs?.title}
                        </TableCell>
                        <TableCell>
                          {format(new Date(assignment.programs?.start_date_time), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          {format(new Date(assignment.programs?.end_date_time), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            {assignment.programs?.hours} hrs
                          </div>
                        </TableCell>
                        <TableCell>
                          {!assignment.programs?.notify_for_evaluation ? (
                            <span className="text-sm text-muted-foreground">-</span>
                          ) : isEvaluated ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle2 className="h-4 w-4" />
                              <span className="text-sm font-medium">Selesai</span>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-orange-600 border-orange-300 hover:bg-orange-50"
                              onClick={() => navigate(`/dashboard/my-evaluations/${assignment.program_id}/submit`)}
                            >
                              <AlertCircle className="h-4 w-4 mr-1" />
                              Jawab
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          {!assignment.programs?.notify_for_evaluation ? (
                            <span className="text-sm text-muted-foreground">N/A</span>
                          ) : isEvaluated ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 border-green-300 hover:bg-green-50"
                              onClick={() => handleDownloadCertificate(assignment)}
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
                              disabled
                            >
                              <Download className="h-4 w-4 mr-1" />
                              Download
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </main>
    </div>
  );
}
