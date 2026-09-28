import { ReactNode, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { LogOut, Menu, type LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LanguageSwitch } from '@/components/layout/LanguageSwitch';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  /** Count shown as a pill on the right (e.g. pending items). Hidden when 0. */
  badge?: number;
}

export interface NavSection {
  title?: string;
  items: NavItem[];
}

function Brand({ compact = false }: { compact?: boolean }) {
  const { t } = useLanguage();
  return (
    <Link
      to="/dashboard"
      className="flex items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {/* The logo is a JPEG on white; give it a white chip in dark mode so it doesn't sit in a box */}
      <span className="flex items-center rounded-md dark:bg-white dark:px-1.5 dark:py-1">
        <img src="/mpclogo.jpeg" alt="MPC" className="h-7 w-auto object-contain" />
      </span>
      <span className={cn('text-[15px] font-semibold tracking-tight', compact && 'hidden sm:inline')}>
        {t.common.appName}
      </span>
    </Link>
  );
}

function SidebarNav({ sections, onNavigate }: { sections: NavSection[]; onNavigate?: () => void }) {
  const { t } = useLanguage();
  return (
    <nav aria-label={t.common.navigation} className="space-y-6">
      {sections.map((section, index) => (
        <div key={section.title ?? index}>
          {section.title && (
            <p className="mb-1.5 px-3 text-xs font-medium text-muted-foreground">{section.title}</p>
          )}
          <ul className="space-y-0.5">
            {section.items.map((item) => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  end={item.path === '/dashboard'}
                  onClick={onNavigate}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      isActive
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    )
                  }
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {!!item.badge && (
                    <span className="ml-auto rounded-md bg-warning-soft px-1.5 py-0.5 text-xs font-semibold tabular-nums text-warning-soft-foreground">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Initials from a Malaysian name, skipping patronymic connectors (bin, binti, a/l, a/p). */
function getInitials(name: string): string {
  const words = name
    .split(/\s+/)
    .filter((word) => word && !/^(bin|binti|bt\.?|b\.?|a\/l|a\/p)$/i.test(word));
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();
}

function UserMenu() {
  const { user, role, signOut } = useAuth();
  const { t } = useLanguage();
  const displayName = user?.name || user?.email || '';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-9 gap-2 px-1.5 lg:pr-2.5" aria-label={t.common.account}>
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
            {getInitials(displayName) || '?'}
          </span>
          <span className="hidden max-w-[10rem] truncate text-sm font-medium lg:inline">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{user?.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {role === 'admin' ? t.roles.admin : t.roles.employee}
          </p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="gap-2">
          <LogOut className="h-4 w-4" />
          {t.common.signOut}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Shared app frame for admin and staff pages: fixed sidebar, sticky top bar, content column. */
export function AppShell({ sections, children }: { sections: NavSection[]; children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useLanguage();

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow-card"
      >
        {t.common.skipToContent}
      </a>

      {/* Desktop sidebar — fixed to the viewport, scrolls on its own */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-sidebar md:flex">
        <div className="flex h-16 shrink-0 items-center border-b px-5">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-5">
          <SidebarNav sections={sections} />
        </div>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-ml-2 md:hidden" aria-label={t.common.openMenu}>
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-72 flex-col p-0">
              <SheetTitle className="sr-only">{t.common.navigation}</SheetTitle>
              <div className="flex h-16 shrink-0 items-center border-b px-5">
                <Brand />
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-5">
                <SidebarNav sections={sections} onNavigate={() => setMobileOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          <div className="md:hidden">
            <Brand compact />
          </div>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <LanguageSwitch />
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>

        <main id="main-content" className="overflow-x-clip px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
