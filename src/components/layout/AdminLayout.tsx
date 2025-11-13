import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
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
} from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: BookOpen, label: 'Programs', path: '/dashboard/programs' },
    { icon: ClipboardCheck, label: 'Attendance', path: '/dashboard/attendance' },
    { icon: Users, label: 'Users', path: '/admin/users' },
    { icon: FileCheck, label: 'Evaluations', path: '/dashboard/evaluations' },
    { icon: Award, label: 'Certificates', path: '/dashboard/certificates' },
    { icon: FileText, label: 'Reports', path: '/dashboard/reports' },
  ];

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
            <h1 className="text-xl font-semibold cursor-pointer" onClick={() => navigate('/dashboard')}>
              MyLearning Pro
            </h1>
          </div>
          <Button variant="ghost" onClick={signOut}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
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
    </div>
  );
}
