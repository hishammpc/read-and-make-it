import { useAuth } from '@/contexts/AuthContext';
import { useEmployeeDashboardStats } from '@/hooks/useDashboardStats';
import EmployeeLayout from '@/components/layout/EmployeeLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Clock, TrendingUp, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function MyHours() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: stats, isLoading, error } = useEmployeeDashboardStats(user?.userId || '');

  if (isLoading) {
    return (
      <EmployeeLayout>
        <div className="flex items-center justify-center p-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading hours data...</p>
          </div>
        </div>
      </EmployeeLayout>
    );
  }

  if (error) {
    return (
      <EmployeeLayout>
        <Card>
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Hours Data</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {error instanceof Error ? error.message : 'Failed to load hours data'}
            </p>
          </CardContent>
        </Card>
      </EmployeeLayout>
    );
  }

  const hoursCompleted = stats?.hoursThisYear || 0;
  const targetHours = stats?.targetHours || 40;
  const progressPercentage = stats?.compliancePercentage || 0;
  const hoursRemaining = Math.max(0, targetHours - hoursCompleted);

  // Get completed trainings only
  const completedTrainings = stats?.trainingHistory?.filter(
    (assignment: any) => assignment.status === 'Attended'
  ) || [];

  // Sort by date descending
  const sortedTrainings = [...completedTrainings].sort((a: any, b: any) =>
    new Date(b.programs?.end_date_time).getTime() - new Date(a.programs?.end_date_time).getTime()
  );

  return (
    <EmployeeLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">My Training Hours</h1>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Hours Completed
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{hoursCompleted} hrs</div>
              <p className="text-xs text-muted-foreground">
                This year ({new Date().getFullYear()})
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Annual Target
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{targetHours} hrs</div>
              <p className="text-xs text-muted-foreground">
                Required per year
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Hours Remaining
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{hoursRemaining} hrs</div>
              <p className="text-xs text-muted-foreground">
                To reach target
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardHeader>
            <CardTitle>Annual Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progress</span>
                <span className="text-sm text-muted-foreground">{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </div>
            <p className="text-sm text-muted-foreground">
              {hoursCompleted} of {targetHours} hours completed
            </p>
          </CardContent>
        </Card>

        {/* Hours by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Hours by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.hoursByCategory && Object.entries(stats.hoursByCategory)
                .filter(([_, hours]) => hours > 0)
                .map(([category, hours]) => {
                  const categoryPercentage = hoursCompleted > 0
                    ? Math.round((Number(hours) / hoursCompleted) * 100)
                    : 0;
                  return (
                    <div key={category} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{category}</span>
                        <span className="text-muted-foreground">
                          {hours} hrs ({categoryPercentage}%)
                        </span>
                      </div>
                      <Progress value={categoryPercentage} className="h-2" />
                    </div>
                  );
                })}
              {(!stats?.hoursByCategory || Object.values(stats.hoursByCategory).every(h => h === 0)) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No training hours recorded yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Training History */}
        <Card className="overflow-x-auto">
          <CardHeader>
            <CardTitle>Training History</CardTitle>
          </CardHeader>
          <CardContent>
            {sortedTrainings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No completed trainings yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Program Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Date Completed</TableHead>
                    <TableHead className="text-right">Hours</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTrainings.map((assignment: any) => (
                    <TableRow key={assignment.id}>
                      <TableCell className="font-medium">
                        {assignment.programs?.title}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {assignment.programs?.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {format(new Date(assignment.programs?.end_date_time), 'MMM dd, yyyy')}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {assignment.programs?.hours} hrs
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </EmployeeLayout>
  );
}
