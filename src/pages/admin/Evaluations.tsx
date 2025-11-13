import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEvaluationTemplates, useEvaluations, useDeleteEvaluationTemplate } from '@/hooks/useEvaluations';
import { formatDate } from '@/lib/dateUtils';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Edit, Trash2, Calendar, FileText } from 'lucide-react';

export default function Evaluations() {
  const navigate = useNavigate();
  const { data: templates, isLoading: templatesLoading, error: templatesError } = useEvaluationTemplates();
  const { data: evaluations, isLoading: evaluationsLoading, error: evaluationsError } = useEvaluations();
  const deleteTemplate = useDeleteEvaluationTemplate();

  const [searchQuery, setSearchQuery] = useState('');
  const [programFilter, setProgramFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<string | null>(null);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    if (!templates) return [];

    return templates.filter((template) => {
      const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesProgram =
        programFilter === 'All' ||
        (programFilter === 'Reusable' && !template.program_id) ||
        template.program_id === programFilter;

      return matchesSearch && matchesProgram;
    });
  }, [templates, searchQuery, programFilter]);

  // Filter evaluations
  const filteredEvaluations = useMemo(() => {
    if (!evaluations) return [];

    return evaluations.filter((evaluation) => {
      const matchesProgram =
        programFilter === 'All' || evaluation.program_id === programFilter;

      let matchesDateRange = true;
      if (startDate) {
        matchesDateRange =
          matchesDateRange && new Date(evaluation.submitted_at) >= new Date(startDate);
      }
      if (endDate) {
        matchesDateRange =
          matchesDateRange && new Date(evaluation.submitted_at) <= new Date(endDate);
      }

      return matchesProgram && matchesDateRange;
    });
  }, [evaluations, programFilter, startDate, endDate]);

  // Get unique programs for filter
  const programs = useMemo(() => {
    if (!templates && !evaluations) return [];

    const programMap = new Map();

    templates?.forEach((template) => {
      if (template.programs && typeof template.programs === 'object' && 'id' in template.programs) {
        const program = template.programs as { id: string; title: string };
        programMap.set(program.id, program.title);
      }
    });

    evaluations?.forEach((evaluation) => {
      if (evaluation.programs && typeof evaluation.programs === 'object' && 'id' in evaluation.programs) {
        const program = evaluation.programs as { id: string; title: string };
        programMap.set(program.id, program.title);
      }
    });

    return Array.from(programMap.entries()).map(([id, title]) => ({ id, title }));
  }, [templates, evaluations]);

  const handleDeleteTemplate = (id: string) => {
    setTemplateToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      deleteTemplate.mutate(templateToDelete);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Evaluations</h1>
            <p className="text-muted-foreground">
              Manage evaluation templates and view submitted evaluations
            </p>
          </div>
          <Button onClick={() => navigate('/dashboard/evaluations/templates/new')}>
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="templates" className="space-y-6">
          <TabsList>
            <TabsTrigger value="templates">
              <FileText className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="responses">
              <Calendar className="w-4 h-4 mr-2" />
              Responses
            </TabsTrigger>
          </TabsList>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search templates..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <Select value={programFilter} onValueChange={setProgramFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by program" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Programs</SelectItem>
                      <SelectItem value="Reusable">Reusable Templates</SelectItem>
                      {programs.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Templates Table */}
            <Card>
              <CardContent className="p-0">
                {templatesLoading ? (
                  <div className="p-6 space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : templatesError ? (
                  <div className="p-6 text-center text-destructive">
                    Error loading templates: {templatesError.message}
                  </div>
                ) : filteredTemplates.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    No templates found. Create your first evaluation template.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Program</TableHead>
                        <TableHead>Questions</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTemplates.map((template) => (
                        <TableRow key={template.id}>
                          <TableCell className="font-medium">{template.title}</TableCell>
                          <TableCell>
                            {template.programs && typeof template.programs === 'object' && 'title' in template.programs ? (
                              <Badge variant="secondary">
                                {(template.programs as { title: string }).title}
                              </Badge>
                            ) : (
                              <Badge variant="outline">Reusable</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {Array.isArray(template.questions)
                              ? template.questions.length
                              : 0}{' '}
                            questions
                          </TableCell>
                          <TableCell>{formatDate(template.created_at)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() =>
                                  navigate(`/dashboard/evaluations/templates/${template.id}/edit`)
                                }
                                title="Edit template"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteTemplate(template.id)}
                                title="Delete template"
                              >
                                <Trash2 className="w-4 h-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {!templatesLoading && filteredTemplates.length > 0 && (
              <div className="text-sm text-muted-foreground text-center">
                Showing {filteredTemplates.length} of {templates?.length || 0} templates
              </div>
            )}
          </TabsContent>

          {/* Responses Tab */}
          <TabsContent value="responses" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Filters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <Select value={programFilter} onValueChange={setProgramFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by program" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Programs</SelectItem>
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
                      placeholder="Start date"
                      className="pl-9"
                    />
                  </div>

                  <div className="relative">
                    <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      placeholder="End date"
                      className="pl-9"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Evaluations Table */}
            <Card>
              <CardContent className="p-0">
                {evaluationsLoading ? (
                  <div className="p-6 space-y-4">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : evaluationsError ? (
                  <div className="p-6 text-center text-destructive">
                    Error loading evaluations: {evaluationsError.message}
                  </div>
                ) : filteredEvaluations.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground">
                    No evaluations submitted yet.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Program</TableHead>
                        <TableHead>Submitted</TableHead>
                        <TableHead>Responses</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEvaluations.map((evaluation) => (
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
                              'Unknown User'
                            )}
                          </TableCell>
                          <TableCell>
                            {evaluation.programs && typeof evaluation.programs === 'object' && 'title' in evaluation.programs
                              ? (evaluation.programs as { title: string }).title
                              : 'Unknown Program'}
                          </TableCell>
                          <TableCell>{formatDate(evaluation.submitted_at)}</TableCell>
                          <TableCell>
                            {typeof evaluation.answers === 'object' && evaluation.answers !== null
                              ? Object.keys(evaluation.answers).length
                              : 0}{' '}
                            answers
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {!evaluationsLoading && filteredEvaluations.length > 0 && (
              <div className="text-sm text-muted-foreground text-center">
                Showing {filteredEvaluations.length} of {evaluations?.length || 0} evaluations
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the evaluation
              template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </AdminLayout>
  );
}
