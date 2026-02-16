import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Mail,
  FileText,
  Plane,
  Hotel,
  FileCheck2,
  Bus,
  BadgeCheck,
  Package,
  Users2,
  FolderKanban,
  Settings,
  BarChart3,
  Shield,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronDown,
   Flag,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href?: string;
  children?: { label: string; href: string }[];
}

const adminNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'common.dashboard', href: '/admin' },
  { icon: Calendar, label: 'common.events', href: '/admin/events' },
  { icon: Users, label: 'common.participants', href: '/admin/participants' },
  { icon: Mail, label: 'common.invitations', href: '/admin/invitations' },
  { icon: FileText, label: 'common.registrations', href: '/admin/registrations' },
   { icon: Flag, label: 'common.delegations', href: '/admin/delegations' },
  { icon: FileCheck2, label: 'common.visas', href: '/admin/visas' },
  { icon: Plane, label: 'common.travel', href: '/admin/travel' },
  { icon: Hotel, label: 'common.accommodation', href: '/admin/accommodation' },
  { icon: Bus, label: 'common.transportation', href: '/admin/transportation' },
  { icon: BadgeCheck, label: 'common.accreditation', href: '/admin/accreditation' },
  { icon: Package, label: 'common.equipment', href: '/admin/equipment' },
  { icon: Users2, label: 'common.crowd_management', href: '/admin/crowd' },
  { icon: FolderKanban, label: 'common.projects', href: '/admin/projects' },
  { icon: Shield, label: 'common.manage_staff', href: '/admin/subadmins' },
];

const systemNavItems: NavItem[] = [
  { icon: BarChart3, label: 'common.reports', href: '/admin/reports' },
  { icon: Shield, label: 'common.audit_log', href: '/admin/audit' },
  { icon: Bell, label: 'common.notifications', href: '/admin/notifications' },
];

export const AdminSidebar: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  // const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    // AuthContext handles redirect to role-specific login
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = item.href ? location.pathname === item.href : false;
    const Icon = item.icon;

    if (item.children) {
      return (
        <Collapsible>
          <CollapsibleTrigger className="nav-link nav-link-inactive w-full justify-between">
            <span className="flex items-center gap-3">
              <Icon className="h-5 w-5" />
              {t(item.label)}
            </span>
            <ChevronDown className="h-4 w-4" />
          </CollapsibleTrigger>
          <CollapsibleContent className="ps-11 space-y-1">
            {item.children.map((child) => (
              <Link
                key={child.href}
                to={child.href}
                className={cn(
                  'block py-2 px-3 rounded-lg text-sm transition-colors',
                  location.pathname === child.href
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
                )}
                onClick={() => setIsMobileOpen(false)}
              >
                {t(child.label)}
              </Link>
            ))}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <Link
        to={item.href!}
        className={cn(
          'nav-link',
          isActive ? 'nav-link-active' : 'nav-link-inactive'
        )}
        onClick={() => setIsMobileOpen(false)}
      >
        <Icon className="h-5 w-5" />
        {t(item.label)}
      </Link>
    );
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6 ">

        <img
          src="/neomoraWhite.png"
          alt="NeoMora"
          className="h-6 w-auto"
        />
        <div className="ms-auto">
            <LanguageSwitcher />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3 space-y-6">
        <div className="space-y-1">
          {adminNavItems.map((item) => (
            <NavLink key={item.label} item={item} />
          ))}
        </div>

        <div className="space-y-1">
          <p className="px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50 mb-2">
            System
          </p>
          {systemNavItems.map((item) => (
            <NavLink key={item.label} item={item} />
          ))}
        </div>
      </div>

      {/* User section */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground font-medium">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.name || 'Admin User'}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              {user?.email || 'admin@eventems.com'}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 me-2" />
          {t('common.sign_out')}
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-primary text-primary-foreground shadow-lg"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        aria-label="Toggle menu"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed start-0 top-0 z-40 h-screen w-64 flex-col bg-sidebar transition-transform lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
          'flex'
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
};
