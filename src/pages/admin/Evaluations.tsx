import { useState, useMemo } from 'react';
import { useEvaluations } from '@/hooks/useEvaluations';
import { formatDate } from '@/lib/dateUtils';
import AdminLayout from '@/components/layout/AdminLayout';
import { Input } from '@/components/ui/input';
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
import { Search, Calendar, Eye } from 'lucide-react';

// Fixed evaluation questions for display
const EVALUATION_QUESTIONS = [
  { id: 'q1', text: 'Adakah program ini mencapai objektif?' },
  { id: 'q2', text: 'Pengetahuan tentang subjek' },
  { id: 'q3', text: 'Penjelasan fakta-fakta dan contoh' },
  { id: 'q4', text: 'Kebolehan menimbulkan minat dan penglibatan' },
  { id: 'q5', text: 'Gaya/Persembahan' },
  { id: 'q6', text: 'Adakah matlamat program ini memenuhi keperluan MPC?' },
  { id: 'q7', text: 'Adakah program ini membantu membentuk kemahiran anda?' },
  { id: 'q8', text: 'Adakah program ini sesuai dicadangkan kepada warga lain?' },
  { id: 'q9', text: 'Secara keseluruhannya, program ini adalah:' },
];

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

export default function Evaluations() {
  const { data: evaluations, isLoading, error } = useEvaluations();

  const [searchQuery, setSearchQuery] = useState('');
  const [programFilter, setProgramFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEvaluation, setSelectedEvaluation] = useState<any>(null);

  // Filter evaluations
  const filteredEvaluations = useMemo(() => {
    if (!evaluations) return [];

    return evaluations.filter((evaluation) => {
      // Search filter
      const userName = evaluation.profiles && typeof evaluation.profiles === 'object' && 'name' in evaluation.profiles
        ? (evaluation.profiles as { name: string }).name.toLowerCase()
        : '';
      const matchesSearch = !searchQuery || userName.includes(searchQuery.toLowerCase());

      // Program filter
      const matchesProgram =
        programFilter === 'all' || evaluation.program_id === programFilter;

      // Date range filter
      let matchesDateRange = true;
      if (startDate) {
        matchesDateRange =
          matchesDateRange && new Date(evaluation.submitted_at) >= new Date(startDate);
      }
      if (endDate) {
        matchesDateRange =
          matchesDateRange && new Date(evaluation.submitted_at) <= new Date(endDate);
      }

      return matchesSearch && matchesProgram && matchesDateRange;
    });
  }, [evaluations, searchQuery, programFilter, startDate, endDate]);

  // Get unique programs for filter
  const programs = useMemo(() => {
    if (!evaluations) return [];

    const programMap = new Map();
    evaluations.forEach((evaluation) => {
      if (evaluation.programs && typeof evaluation.programs === 'object' && 'id' in evaluation.programs) {
        const program = evaluation.programs as { id: string; title: string };
        programMap.set(program.id, program.title);
      }
    });

    return Array.from(programMap.entries()).map(([id, title]) => ({ id, title }));
  }, [evaluations]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Evaluations</h1>
          <p className="text-muted-foreground">
            View submitted program evaluations from employees
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>

          <Select value={programFilter} onValueChange={setProgramFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All Programs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Programs</SelectItem>
              {programs.map((program) => (
                <SelectItem key={program.id} value={program.id}>
                  {program.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="pl-9 w-40"
            />
          </div>

          <span className="text-muted-foreground">to</span>

          <div className="relative">
            <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="pl-9 w-40"
            />
          </div>
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
            ) : filteredEvaluations.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No evaluations submitted yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-center">Overall Rating</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEvaluations.map((evaluation) => {
                    const answers = evaluation.answers as Record<string, string> | null;
                    const overallRating = answers?.q9 || '-';

                    return (
                      <TableRow key={evaluation.id}>
                        <TableCell>
                          {evaluation.profiles && typeof evaluation.profiles === 'object' && 'name' in evaluation.profiles ? (
                            <div>
                              <div className="font-medium">
                                {(evaluation.profiles as { name: string }).name}
                              </div>
                              {'email' in evaluation.profiles && (
                                <div className="text-sm text-muted-foreground">
                                  {(evaluation.profiles as { email: string }).email}
                                </div>
                              )}
                            </div>
                          ) : (
                            'Unknown'
                          )}
                        </TableCell>
                        <TableCell>
                          {evaluation.programs && typeof evaluation.programs === 'object' && 'title' in evaluation.programs
                            ? (evaluation.programs as { title: string }).title
                            : 'Unknown'}
                        </TableCell>
                        <TableCell>{formatDate(evaluation.submitted_at)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={getRatingBadgeVariant(overallRating)}>
                            {overallRating}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedEvaluation(evaluation)}
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {!isLoading && filteredEvaluations.length > 0 && (
          <div className="text-sm text-muted-foreground text-center">
            Showing {filteredEvaluations.length} of {evaluations?.length || 0} evaluations
          </div>
        )}

        {/* Evaluation Details Dialog */}
        <Dialog open={!!selectedEvaluation} onOpenChange={() => setSelectedEvaluation(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Evaluation Details</DialogTitle>
            </DialogHeader>
            {selectedEvaluation && (
              <div className="space-y-6">
                {/* Employee & Program Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                  <div>
                    <div className="text-sm text-muted-foreground">Employee</div>
                    <div className="font-medium">
                      {selectedEvaluation.profiles?.name || 'Unknown'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Program</div>
                    <div className="font-medium">
                      {selectedEvaluation.programs?.title || 'Unknown'}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Submitted</div>
                    <div className="font-medium">
                      {formatDate(selectedEvaluation.submitted_at)}
                    </div>
                  </div>
                </div>

                {/* Answers */}
                <div className="space-y-4">
                  {EVALUATION_QUESTIONS.map((question, index) => {
                    const answers = selectedEvaluation.answers as Record<string, string> | null;
                    const answer = answers?.[question.id] || '-';

                    return (
                      <div key={question.id} className="flex justify-between items-start gap-4 py-3 border-b last:border-0">
                        <div className="text-sm">
                          <span className="font-medium">{index + 1}.</span> {question.text}
                        </div>
                        <Badge variant={getRatingBadgeVariant(answer)} className="shrink-0">
                          {answer}
                        </Badge>
                      </div>
                    );
                  })}

                  {/* Question 10 - Comments */}
                  <div className="pt-4">
                    <div className="text-sm font-medium mb-2">
                      10. Lain-lain komen atau cadangan:
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg text-sm">
                      {(selectedEvaluation.answers as Record<string, string>)?.q10 || (
                        <span className="text-muted-foreground italic">Tiada komen</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
