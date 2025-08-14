import { LayoutDashboard, Settings, Shield, BookOpen, TrendingUp } from 'lucide-react';
import { routes } from 'wasp/client/router';

export const userMenuItems = [
  {
    name: 'PDF Learning Dashboard',
    to: routes.PDFLearningRoute.to,
    icon: LayoutDashboard,
    isAdminOnly: false,
    isAuthRequired: true,
  },
  {
    name: 'Learning Modules',
    to: routes.ModuleManagementRoute.to,
    icon: BookOpen,
    isAdminOnly: false,
    isAuthRequired: true,
  },
  {
    name: 'Progress Dashboard',
    to: routes.ProgressDashboardRoute.to,
    icon: TrendingUp,
    isAdminOnly: false,
    isAuthRequired: true,
  },
  {
    name: 'Account Settings',
    to: routes.AccountRoute.to,
    icon: Settings,
    isAuthRequired: false,
    isAdminOnly: false,
  },
  {
    name: 'Admin Dashboard',
    to: routes.AdminRoute.to,
    icon: Shield,
    isAuthRequired: false,
    isAdminOnly: true,
  },
] as const;
