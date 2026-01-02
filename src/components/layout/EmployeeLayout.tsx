import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  BookOpen,
  Clock,
  Award,
  FileCheck,
  ClipboardCheck,
  Users,
  LogOut,
  Menu,
  Send,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { usePendingSuperviseeCount } from '@/hooks/useAnnualEvaluations';
import { isProposalPeriodOpen } from '@/hooks/useProposedTrainings';
import ProposedTrainingDialog from '@/components/employee/ProposedTrainingDialog';

interface EmployeeLayoutProps {
  children: ReactNode;
}

export default function EmployeeLayout({ children }: EmployeeLayoutProps) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showProposalDialog, setShowProposalDialog] = useState(false);

  // Check if user has supervisees with pending evaluations
  const { data: pendingSuperviseeCount } = usePendingSuperviseeCount(user?.userId || '');

  // Check if proposal period is open
  const proposalPeriodOpen = isProposalPeriodOpen();

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: BookOpen, label: 'My Trainings', path: '/dashboard/my-trainings' },
    { icon: Clock, label: 'My Hours', path: '/dashboard/my-hours' },
    { icon: Award, label: 'My Certificates', path: '/dashboard/my-certificates' },
    { icon: FileCheck, label: 'Program Evaluations', path: '/dashboard/my-evaluations' },
    { icon: ClipboardCheck, label: 'Annual Evaluation', path: '/dashboard/my-annual-evaluation' },
  ];

  // Add supervisor menu item if user has supervisees
  if (pendingSuperviseeCount !== undefined && pendingSuperviseeCount >= 0) {
    menuItems.push({
      icon: Users,
      label: `Staff Evaluations${pendingSuperviseeCount > 0 ? ` (${pendingSuperviseeCount})` : ''}`,
      path: '/dashboard/supervisee-evaluations',
    });
  }

  const handleNavigation = (path: string) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  const isActivePath = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-4">
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="pt-16">
                  <nav className="space-y-1 p-4">
                    {menuItems.map((item) => (
                      <Button
                        key={item.label}
                        variant={isActivePath(item.path) ? 'secondary' : 'ghost'}
                        className="w-full justify-start"
                        onClick={() => handleNavigation(item.path)}
                      >
                        <item.icon className="w-4 h-4 mr-3" />
                        {item.label}
                      </Button>
                    ))}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
              <img
                src="/mpclogo.jpeg"
                alt="MPC Logo"
                className="h-10 object-contain"
              />
              <h1 className="text-xl font-semibold">
                MyLearning Pro
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {proposalPeriodOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProposalDialog(true)}
              >
                <Send className="w-4 h-4 mr-2" />
                Propose Training
              </Button>
            )}
            <Button variant="ghost" onClick={signOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Desktop */}
        <aside className="hidden md:block w-64 border-r bg-card min-h-[calc(100vh-4rem)] sticky top-16">
          <nav className="space-y-1 p-4">
            {menuItems.map((item) => (
              <Button
                key={item.label}
                variant={isActivePath(item.path) ? 'secondary' : 'ghost'}
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
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Proposed Training Dialog */}
      <ProposedTrainingDialog
        open={showProposalDialog}
        onOpenChange={setShowProposalDialog}
      />
    </div>
  );
}
