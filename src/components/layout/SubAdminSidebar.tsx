import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
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
  LogOut,
  Menu,
  X,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
  badge?: number;
}

const subAdminNavItems: NavItem[] = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/subadmin' },
  { icon: Mail, label: 'Invitations', href: '/subadmin/invitations', badge: 12 },
  { icon: FileText, label: 'Registrations', href: '/subadmin/registrations', badge: 8 },
  { icon: Plane, label: 'Air Travel', href: '/subadmin/travel', badge: 5 },
  { icon: Hotel, label: 'Accommodation', href: '/subadmin/accommodation', badge: 3 },
  { icon: FileCheck2, label: 'Visas', href: '/subadmin/visas', badge: 15 },
  { icon: Bus, label: 'Transportation', href: '/subadmin/transportation' },
  { icon: BadgeCheck, label: 'Accreditation', href: '/subadmin/accreditation', badge: 7 },
  { icon: Package, label: 'Equipment', href: '/subadmin/equipment' },
  { icon: Users2, label: 'Crowd Management', href: '/subadmin/crowd' },
  { icon: FolderKanban, label: 'Projects', href: '/subadmin/projects' },
];

export const SubAdminSidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = () => {
    logout();
    // AuthContext handles redirect to role-specific login
  };

  const NavLink = ({ item }: { item: NavItem }) => {
    const isActive = location.pathname === item.href;
    const Icon = item.icon;

    return (
      <Link
        to={item.href}
        className={cn(
          'nav-link flex items-center justify-between',
          isActive ? 'nav-link-active' : 'nav-link-inactive'
        )}
        onClick={() => setIsMobileOpen(false)}
      >
        <span className="flex items-center gap-3">
          <Icon className="h-5 w-5" />
          {item.label}
        </span>
        {item.badge && item.badge > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white text-[10px] font-medium text-emerald-950 px-1.5 shadow-sm">
            {item.badge}
          </span>
        )}
      </Link>
    );
  };

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-6">
        <div>
          <img
            src="/neomoraWhite.png"
            alt="NeoMora"
            className="h-6 w-auto"
          />

        </div>
      </div>

      {/* Quick Stats */}
      <div className="px-3 py-4 border-b border-sidebar-border">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-sidebar-accent/50 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-emerald-500">
              <CheckCircle className="h-3 w-3" />
              <span className="text-xs font-medium">24</span>
            </div>
            <p className="text-[10px] text-sidebar-foreground/60 mt-0.5">Approved</p>
          </div>
          <div className="bg-sidebar-accent/50 rounded-lg p-2 text-center">
            <div className="flex items-center justify-center gap-1 text-amber-500">
              <AlertCircle className="h-3 w-3" />
              <span className="text-xs font-medium">50</span>
            </div>
            <p className="text-[10px] text-sidebar-foreground/60 mt-0.5">Pending</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3 space-y-1">
        {subAdminNavItems.map((item) => (
          <NavLink key={item.label} item={item} />
        ))}
      </div>

      {/* User section */}
      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground font-medium">
            {user?.name?.charAt(0) || 'O'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">
              {user?.name || 'Operations User'}
            </p>
            <p className="text-xs text-sidebar-foreground/60 truncate">
              Sub-Admin
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-secondary text-secondary-foreground shadow-lg"
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
          'fixed left-0 top-0 z-40 h-screen w-64 flex-col bg-sidebar transition-transform lg:translate-x-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full',
          'flex'
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
};
