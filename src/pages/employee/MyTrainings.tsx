import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserAssignments } from '@/hooks/useAssignments';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ArrowLeft, Search, Calendar, Clock, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

export default function MyTrainings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: assignments, isLoading, error } = useUserAssignments(user?.id || '');
  const [searchQuery, setSearchQuery] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Assigned':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Registered':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Attended':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'No-Show':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Cancelled':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filterAssignments = (status: string) => {
    if (!assignments) return [];

    let filtered = assignments;

    // Filter by status
    if (status === 'upcoming') {
      filtered = filtered.filter((a: any) =>
        ['Assigned', 'Registered'].includes(a.status) &&
        new Date(a.programs?.start_date_time) >= new Date()
      );
    } else if (status === 'completed') {
      filtered = filtered.filter((a: any) => a.status === 'Attended');
    } else if (status === 'cancelled') {
      filtered = filtered.filter((a: any) =>
        a.status === 'Cancelled' || a.status === 'No-Show'
      );
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter((a: any) =>
        a.programs?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.programs?.category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
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
            <h1 className="text-xl font-semibold ml-4">My Trainings</h1>
          </div>
        </header>
        <div className="p-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive">Error Loading Trainings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {error instanceof Error ? error.message : 'Failed to load training data'}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const upcomingCount = filterAssignments('upcoming').length;
  const completedCount = filterAssignments('completed').length;
  const cancelledCount = filterAssignments('cancelled').length;

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
          {/* Search Bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title or category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="upcoming" className="space-y-4">
            <TabsList>
              <TabsTrigger value="upcoming">
                Upcoming ({upcomingCount})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({completedCount})
              </TabsTrigger>
              <TabsTrigger value="cancelled">
                Cancelled ({cancelledCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="upcoming" className="space-y-4">
              {filterAssignments('upcoming').length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">No upcoming trainings</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {filterAssignments('upcoming').map((assignment: any) => (
                    <Card key={assignment.id} className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold">{assignment.programs?.title}</h3>
                              <Badge className={getStatusColor(assignment.status)}>
                                {assignment.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Badge variant="outline">{assignment.programs?.category}</Badge>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-4 w-4" />
                                <span>{assignment.programs?.hours} hours</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {format(new Date(assignment.programs?.start_date_time), 'MMM dd, yyyy • h:mm a')} -
                                {format(new Date(assignment.programs?.end_date_time), ' h:mm a')}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed">
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Program Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filterAssignments('completed').length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No completed trainings
                        </TableCell>
                      </TableRow>
                    ) : (
                      filterAssignments('completed').map((assignment: any) => (
                        <TableRow key={assignment.id}>
                          <TableCell className="font-medium">
                            {assignment.programs?.title}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{assignment.programs?.category}</Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(assignment.programs?.start_date_time), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>{assignment.programs?.hours} hrs</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(assignment.status)}>
                              {assignment.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="cancelled">
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Program Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filterAssignments('cancelled').length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No cancelled trainings
                        </TableCell>
                      </TableRow>
                    ) : (
                      filterAssignments('cancelled').map((assignment: any) => (
                        <TableRow key={assignment.id}>
                          <TableCell className="font-medium">
                            {assignment.programs?.title}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{assignment.programs?.category}</Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(assignment.programs?.start_date_time), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>{assignment.programs?.hours} hrs</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(assignment.status)}>
                              {assignment.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
