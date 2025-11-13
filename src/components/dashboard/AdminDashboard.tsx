import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminDashboardStats } from '@/hooks/useDashboardStats';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ClipboardCheck,
  FileCheck,
  Award,
  FileText,
  LogOut,
  Menu,
  AlertCircle,
  Calendar,
  Loader2,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function AdminDashboard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: stats, isLoading, error } = useAdminDashboardStats();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', active: true },
    { icon: BookOpen, label: 'Programs', path: '/dashboard/programs' },
    { icon: ClipboardCheck, label: 'Attendance', path: '/dashboard/attendance' },
    { icon: Users, label: 'Users', path: '/dashboard/users' },
    { icon: FileCheck, label: 'Evaluations', path: '/dashboard/evaluations' },
    { icon: Award, label: 'Certificates', path: '/dashboard/certificates' },
    { icon: FileText, label: 'Reports', path: '/dashboard/reports' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  // Transform department data for chart
  const chartData = stats?.hoursByDepartment
    ? Object.entries(stats.hoursByDepartment).map(([department, hours]) => ({
        department,
        hours,
      }))
    : [];

  // Format date helper
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-4">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <nav className="space-y-1 p-4">
                  {menuItems.map((item) => (
                    <Button
                      key={item.label}
                      variant={item.active ? 'secondary' : 'ghost'}
                      className="w-full justify-start"
                      onClick={() => handleNavigation(item.path)}
                    >
                      <item.icon className="w-4 h-4 mr-3" />
                      {item.label}
                    </Button>
                  ))}
                </nav>
              </SheetContent>
            </Sheet>
            <h1 className="text-xl font-semibold">MyLearning Pro</h1>
          </div>
          <Button variant="ghost" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:block w-64 border-r bg-card min-h-[calc(100vh-4rem)]">
          <nav className="space-y-1 p-4">
            {menuItems.map((item) => (
              <Button
                key={item.label}
                variant={item.active ? 'secondary' : 'ghost'}
                className="w-full justify-start"
                onClick={() => handleNavigation(item.path)}
              >
                <item.icon className="w-4 h-4 mr-3" />
                {item.label}
              </Button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
              <p className="text-muted-foreground">
                Welcome to MyLearning Pro Admin Dashboard
              </p>
            </div>

            {/* Error State */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  Failed to load dashboard statistics. Please try again later.
                </AlertDescription>
              </Alert>
            )}

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Loading dashboard data...</span>
              </div>
            )}

            {/* Dashboard Content */}
            {!isLoading && stats && (
              <>
                {/* KPI Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Programs
                      </CardTitle>
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalPrograms}</div>
                      <p className="text-xs text-muted-foreground">
                        This year
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Participants
                      </CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalParticipants}</div>
                      <p className="text-xs text-muted-foreground">
                        Active users
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Training Hours
                      </CardTitle>
                      <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.totalHours}</div>
                      <p className="text-xs text-muted-foreground">
                        Total this year
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Compliance
                      </CardTitle>
                      <Award className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats.compliancePercentage}%</div>
                      <p className="text-xs text-muted-foreground">
                        Program completion
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    <Button onClick={() => navigate('/dashboard/programs/new')}>
                      <BookOpen className="w-4 h-4 mr-2" />
                      Create Program
                    </Button>
                    <Button variant="secondary" onClick={() => navigate('/dashboard/users/new')}>
                      <Users className="w-4 h-4 mr-2" />
                      Add User
                    </Button>
                    <Button variant="secondary" onClick={() => navigate('/dashboard/reports')}>
                      <FileText className="w-4 h-4 mr-2" />
                      Generate Report
                    </Button>
                  </CardContent>
                </Card>

                {/* Charts and Data Section */}
                <div className="grid gap-6 md:grid-cols-2">
                  {/* Hours by Department Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Training Hours by Department</CardTitle>
                      <CardDescription>Total hours completed this year</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="department" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="hours" fill="hsl(var(--primary))" />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                          No department data available
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Upcoming Programs */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Upcoming Programs</CardTitle>
                      <CardDescription>Next 7 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {stats.upcomingPrograms.length > 0 ? (
                        <div className="space-y-4">
                          {stats.upcomingPrograms.map((program: any) => (
                            <div
                              key={program.id}
                              className="flex items-start space-x-3 pb-3 border-b last:border-0"
                            >
                              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                              <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium leading-none">
                                  {program.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDateTime(program.start_date_time)}
                                </p>
                                {program.venue && (
                                  <p className="text-xs text-muted-foreground">
                                    {program.venue}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                          No upcoming programs in the next 7 days
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Overdue Evaluations */}
                {stats.overdueEvaluations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Overdue Evaluations</CardTitle>
                      <CardDescription>
                        Programs completed over 3 days ago without evaluation
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {stats.overdueEvaluations.map((item: any) => (
                          <div
                            key={item.id}
                            className="flex items-start justify-between pb-3 border-b last:border-0"
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium">
                                {item.programs?.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Participant: {item.profiles?.name || item.profiles?.email}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Completed: {formatDate(item.programs?.end_date_time)}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => navigate(`/dashboard/evaluations`)}
                            >
                              Review
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
