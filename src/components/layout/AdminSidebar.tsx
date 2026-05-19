import React, { useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
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
  BarChart3,
  Shield,
  Bell,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Flag,
  ArrowLeft,
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
  path: string; // relative path segment, e.g. "dashboard"
  children?: { label: string; path: string }[];
}

const eventNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'common.dashboard', path: 'dashboard' },
  { icon: Mail, label: 'common.invitations', path: 'invitations' },
  { icon: FileText, label: 'common.registrations', path: 'registrations' },
  { icon: Flag, label: 'common.delegations', path: 'delegations' },
  { icon: Users, label: 'common.participants', path: 'participants' },
  { icon: FileCheck2, label: 'common.visas', path: 'visas' },
  { icon: Plane, label: 'common.travel', path: 'travel' },
  { icon: Hotel, label: 'common.accommodation', path: 'accommodation' },
  { icon: Bus, label: 'common.transportation', path: 'transportation' },
  { icon: BadgeCheck, label: 'common.accreditation', path: 'accreditation' },
  { icon: Package, label: 'common.equipment', path: 'equipment' },
  { icon: Users2, label: 'common.crowd_management', path: 'crowd' },
  { icon: FolderKanban, label: 'common.projects', path: 'projects' },
];

export const AdminSidebar: React.FC = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const isRtl = i18n.language === 'ar';

  const handleLogout = () => {
    logout();
  };

  // Build full href for a nav item
  const buildHref = (path: string) => `/admin/events/${eventId}/${path}`;

  const NavLink = ({ item }: { item: NavItem }) => {
    const href = buildHref(item.path);
    // Match on segment to handle nested paths like participants/:id
    const isActive = location.pathname.startsWith(href);
    const Icon = item.icon;

    if (item.children) {
      return (
        <Collapsible>
          <CollapsibleTrigger className="nav-link nav-link-inactive w-full justify-between">
            <span className="flex items-center gap-3">
              <Icon className="h-5 w-5" />
              {t(item.label)}
            </span>
            <ChevronDown className={`h-4 w-4 ${isRtl ? 'rotate-0' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className={`${isRtl ? 'pe-11' : 'ps-11'} space-y-1`}>
            {item.children.map(child => {
              const childHref = buildHref(child.path);
              return (
                <Link
                  key={childHref}
                  to={childHref}
                  className={cn(
                    'block py-2 px-3 rounded-lg text-sm transition-colors text-start',
                    location.pathname === childHref
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'
                  )}
                  onClick={() => setIsMobileOpen(false)}
                >
                  {t(child.label)}
                </Link>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <Link
        to={href}
        className={cn('nav-link', isActive ? 'nav-link-active' : 'nav-link-inactive')}
        onClick={() => setIsMobileOpen(false)}
      >
        <Icon className="h-5 w-5" />
        {t(item.label)}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <img src="/neomoraWhite.png" alt="NeoMora" className="h-6 w-auto" />
        <div className={isRtl ? 'mr-auto' : 'ml-auto'}>
          <LanguageSwitcher />
        </div>
      </div>

      {/* All Events back link */}
      <div className="px-3 pt-3">
        <button
          onClick={() => { setIsMobileOpen(false); navigate('/admin'); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors text-start"
        >
          {isRtl ? <ArrowLeft className="h-4 w-4 shrink-0 rotate-180" /> : <ArrowLeft className="h-4 w-4 shrink-0" />}
          <span>{t('events.all_events')}</span>
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-3 px-3 space-y-6">
        <div className="space-y-1">
          {eventNavItems.map(item => (
            <NavLink key={item.path} item={item} />
          ))}
        </div>
      </div>

      {/* User section */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground font-medium">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="flex-1 min-w-0 text-start">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.name || t('common.admin')}
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
          <LogOut className={`h-4 w-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />
          {t('common.sign_out')}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        className={cn(
          "fixed top-4 z-50 lg:hidden p-2 rounded-lg bg-primary text-primary-foreground shadow-lg",
          isRtl ? "right-4" : "left-4"
        )}
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
          'fixed top-0 z-40 h-screen w-64 flex-col bg-sidebar transition-transform lg:translate-x-0',
          isRtl ? 'right-0' : 'left-0',
          isMobileOpen ? 'translate-x-0' : (isRtl ? 'translate-x-full' : '-translate-x-full'),
          'flex'
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
};

