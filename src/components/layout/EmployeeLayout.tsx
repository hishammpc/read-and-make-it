import { ReactNode } from 'react';
import { LayoutDashboard, BookOpen, Clock, FileCheck, ClipboardCheck, Users, UsersRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { usePendingSuperviseeCount, useIsSupervisor } from '@/hooks/useAnnualEvaluations';
import { useHasTeam } from '@/hooks/useSupervisors';
import { AppShell, type NavSection } from '@/components/layout/AppShell';

interface EmployeeLayoutProps {
  children: ReactNode;
}

export default function EmployeeLayout({ children }: EmployeeLayoutProps) {
  const { user } = useAuth();
  const { t } = useLanguage();

  const { data: pendingSuperviseeCount } = usePendingSuperviseeCount(user?.userId || '');
  const { data: isSupervisor } = useIsSupervisor(user?.userId || '');
  const { data: hasTeam } = useHasTeam(user?.userId || '');

  const sections: NavSection[] = [
    { items: [{ icon: LayoutDashboard, label: t.nav.dashboard, path: '/dashboard' }] },
    {
      title: t.nav.sectionTraining,
      items: [
        { icon: BookOpen, label: t.nav.myTrainings, path: '/dashboard/my-trainings' },
        { icon: Clock, label: t.nav.myHours, path: '/dashboard/my-hours' },
        { icon: FileCheck, label: t.nav.programEvaluations, path: '/dashboard/my-evaluations' },
        // Only for staff with people reporting to them
        ...(hasTeam ? [{ icon: UsersRound, label: t.nav.myTeam, path: '/dashboard/my-team' }] : []),
      ],
    },
    {
      title: t.nav.sectionAnnualEvaluation,
      items: [
        { icon: ClipboardCheck, label: t.nav.myEvaluation, path: '/dashboard/my-annual-evaluation' },
        // Only for staff who supervise someone
        ...(isSupervisor
          ? [
              {
                icon: Users,
                label: t.nav.staffEvaluation,
                path: '/dashboard/supervisee-evaluations',
                badge: pendingSuperviseeCount,
              },
            ]
          : []),
      ],
    },
  ];

  return <AppShell sections={sections}>{children}</AppShell>;
}
