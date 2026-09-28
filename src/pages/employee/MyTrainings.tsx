import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserAssignments } from '@/hooks/useAssignments';
import { useUserEvaluations } from '@/hooks/useEvaluations';
import { generateCertificate } from '@/lib/certificateGenerator';
import { formatMalaysianDate } from '@/lib/dateUtils';
import { useLanguage } from '@/contexts/LanguageContext';
import EmployeeLayout from '@/components/layout/EmployeeLayout';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyState } from '@/components/common/EmptyState';
import { PageSkeleton } from '@/components/common/PageSkeleton';
import { ToneBadge } from '@/components/common/StatusBadge';
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
import { Search, AlertCircle, Download, FileText, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import { addLogoToPDF } from '@/lib/pdfUtils';

// Extended years from 2023 to 2035
const YEARS = Array.from({ length: 13 }, (_, i) => (2023 + i).toString());

export default function MyTrainings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const tm = t.employee.myTrainings;
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

  const assignmentsList = filteredAssignments();
  const hasSearch = !!searchQuery;

  if (isLoading) {
    return (
      <EmployeeLayout>
        <PageSkeleton variant="table" />
      </EmployeeLayout>
    );
  }

  return (
    <EmployeeLayout>
      <PageHeader
        title={tm.title}
        description={tm.description}
        actions={
          <Button variant="outline" onClick={handleDownloadPDF} disabled={assignmentsList.length === 0}>
            <FileText className="h-4 w-4" />
            {t.common.downloadPdf}
          </Button>
        }
      />

      <div className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={tm.searchPlaceholder}
              aria-label={t.common.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-full sm:w-28" aria-label={t.common.year}>
              <SelectValue placeholder={t.common.year} />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year} value={year}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {hasSearch && (
            <Button variant="ghost" size="sm" onClick={() => setSearchQuery('')} className="text-muted-foreground sm:ml-auto">
              {t.common.clearFilters}
            </Button>
          )}
        </div>

        {/* Trainings table */}
        <Card className="overflow-hidden">
          {assignmentsList.length === 0 ? (
            hasSearch ? (
              <EmptyState
                compact
                icon={Search}
                title={t.common.noResults}
                description={t.common.noResultsHint}
                action={
                  <Button variant="outline" size="sm" onClick={() => setSearchQuery('')}>
                    {t.common.clearFilters}
                  </Button>
                }
              />
            ) : (
              <EmptyState
                compact
                icon={BookOpen}
                title={tm.emptyTitle}
                description={tm.emptyDescription(selectedYear)}
              />
            )
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{tm.colProgram}</TableHead>
                  <TableHead>{tm.colStart}</TableHead>
                  <TableHead>{tm.colEnd}</TableHead>
                  <TableHead className="text-right">{tm.colHours}</TableHead>
                  <TableHead>{tm.colEvaluation}</TableHead>
                  <TableHead>{tm.colCertificate}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assignmentsList.map((assignment: any) => {
                  const isEvaluated = evaluatedProgramIds.has(assignment.program_id);
                  const requiresEvaluation = !!assignment.programs?.notify_for_evaluation;
                  const title = assignment.programs?.title || '';

                  return (
                    <TableRow key={assignment.id}>
                      <TableCell className="max-w-sm font-medium">{title}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatMalaysianDate(assignment.programs?.start_date_time)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {formatMalaysianDate(assignment.programs?.end_date_time)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right tabular-nums">
                        {assignment.programs?.hours} {t.common.hoursShort}
                      </TableCell>
                      <TableCell>
                        {!requiresEvaluation ? (
                          <ToneBadge tone="muted">{t.common.notRequired}</ToneBadge>
                        ) : isEvaluated ? (
                          <ToneBadge tone="success" dot>
                            {tm.evaluated}
                          </ToneBadge>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/dashboard/my-evaluations/${assignment.program_id}/submit`)}
                            aria-label={tm.answerFor(title)}
                          >
                            <AlertCircle className="h-4 w-4 text-warning" />
                            {tm.answer}
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        {!requiresEvaluation ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!isEvaluated}
                            onClick={isEvaluated ? () => handleDownloadCertificate(assignment) : undefined}
                            aria-label={tm.downloadCertificateFor(title)}
                          >
                            <Download className="h-4 w-4" />
                            {t.common.download}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>

        {assignmentsList.length > 0 && (
          <p className="text-sm text-muted-foreground">{tm.count(assignmentsList.length)}</p>
        )}
      </div>
    </EmployeeLayout>
  );
}
