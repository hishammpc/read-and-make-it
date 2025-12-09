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
import { Eye } from 'lucide-react';

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

export default function Evaluations() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [toMonth, setToMonth] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<ProgramEvaluationSummary | null>(null);

  const { data: evaluations, isLoading, error } = useEvaluationsByProgram(
    parseInt(selectedYear),
    undefined,
    toMonth
  );

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

          <span className="text-muted-foreground">sehingga</span>

          <Select value={toMonth} onValueChange={setToMonth}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {MONTHS.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
