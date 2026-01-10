import { ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  LayoutDashboard,
  BookOpen,
  Users,
  FileCheck,
  FileText,
  ClipboardCheck,
  Send,
  LogOut,
  Menu,
  Lock,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const ADMIN_PIN = '101010';

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isPinVerified, setIsPinVerified] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    // Check if PIN was already verified in this session
    const verified = sessionStorage.getItem('adminPinVerified');
    if (verified === 'true') {
      setIsPinVerified(true);
    }
  }, []);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      setIsPinVerified(true);
      sessionStorage.setItem('adminPinVerified', 'true');
      setPinError(false);
    } else {
      setPinError(true);
      setPin('');
    }
  };

  const handleBackLogout = () => {
    sessionStorage.removeItem('adminPinVerified');
    signOut();
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: BookOpen, label: 'Programs', path: '/dashboard/programs' },
    { icon: Users, label: 'Users', path: '/admin/users' },
    { icon: FileCheck, label: 'Training Evaluation', path: '/dashboard/evaluations' },
    { icon: ClipboardCheck, label: 'Annual Evaluation', path: '/dashboard/annual-evaluations' },
    { icon: Send, label: 'Proposed Trainings', path: '/dashboard/proposed-trainings' },
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

  // PIN verification overlay
  if (!isPinVerified) {
    return (
      <div className="min-h-screen bg-background relative">
        {/* Blurred background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 backdrop-blur-sm" />

        {/* PIN entry card */}
        <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
          <Card className="w-full max-w-sm">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Admin Access</CardTitle>
              <p className="text-sm text-muted-foreground">Enter PIN to continue</p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePinSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Enter PIN"
                    value={pin}
                    onChange={(e) => {
                      setPin(e.target.value);
                      setPinError(false);
                    }}
                    className={`text-center text-lg tracking-widest ${pinError ? 'border-destructive' : ''}`}
                    maxLength={6}
                    autoFocus
                  />
                  {pinError && (
                    <p className="text-sm text-destructive text-center">PIN salah. Sila cuba lagi.</p>
                  )}
                </div>
                <Button type="submit" className="w-full">
                  Masuk
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleBackLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
            {/* <ThemeToggle /> */}
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
    </div>
  );
}
