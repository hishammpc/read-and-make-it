import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen,
  FileCheck,
  Award,
  Clock,
  LogOut,
} from 'lucide-react';

export default function EmployeeDashboard() {
  const { signOut, user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="flex items-center justify-between h-16 px-4">
          <h1 className="text-xl font-semibold">MyLearning Pro</h1>
          <Button variant="ghost" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Welcome Back!
            </h2>
            <p className="text-muted-foreground">
              Here's your training overview
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Training Hours
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0 hrs</div>
                <p className="text-xs text-muted-foreground">
                  This year
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Pending Evaluations
                </CardTitle>
                <FileCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  To complete
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Certificates
                </CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">
                  Earned
                </p>
              </CardContent>
            </Card>
          </div>

          {/* My Next Program */}
          <Card>
            <CardHeader>
              <CardTitle>My Next Program</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                No upcoming programs scheduled
              </p>
            </CardContent>
          </Card>

          {/* Annual Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Annual Training Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm text-muted-foreground">0%</span>
                </div>
                <Progress value={0} className="h-2" />
              </div>
              <p className="text-sm text-muted-foreground">
                0 of 0 hours completed
              </p>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" className="h-24 flex-col">
              <BookOpen className="w-6 h-6 mb-2" />
              <span>My Trainings</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col">
              <FileCheck className="w-6 h-6 mb-2" />
              <span>My Evaluations</span>
            </Button>
            <Button variant="outline" className="h-24 flex-col">
              <Award className="w-6 h-6 mb-2" />
              <span>My Certificates</span>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
