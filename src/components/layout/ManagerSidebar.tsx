import React from 'react';
import { NavLink } from '@/components/NavLink';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { useManagerSession } from '@/contexts/ManagerSessionContext';
import {
  LayoutDashboard,
  Users,
  UserPlus,
  ClipboardList,
  Settings,
  LogOut,
  Flag,
  Mail,
  FileText,
  UserCheck,
  Plane,
  Hotel,
  Globe,
  Bus,
  BadgeCheck as BadgeIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const menuItems = [
  { title: 'Dashboard', url: '/manager/dashboard', icon: LayoutDashboard },
  { title: 'Invitations', url: '/manager/invitations', icon: Mail },
  { title: 'Register', url: '/manager/register-list', icon: UserCheck },
  { title: 'My Teams', url: '/manager/teams', icon: Users },
  { title: 'Add Members', url: '/manager/add-members', icon: UserPlus },
  { title: 'Visa', url: '/manager/visa', icon: Globe },
  { title: 'Travel', url: '/manager/travel', icon: Plane },
  { title: 'Accommodation', url: '/manager/accommodation', icon: Hotel },
  { title: 'Registrations', url: '/manager/registrations', icon: ClipboardList },
  { title: 'Delegations', url: '/manager/delegations', icon: Flag },
  { title: 'Transportation', url: '/manager/transportation', icon: Bus },
  { title: 'Accreditation', url: '/manager/accreditation', icon: BadgeIcon },
];

export const ManagerSidebar: React.FC = () => {
  const { state } = useSidebar();
  const location = useLocation();
  const { manager, logout } = useManagerSession();
  const navigate = useNavigate();
  const collapsed = state === 'collapsed';

  const handleLogout = () => {
    logout();
    navigate('/login/manager');
  };

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Users className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="font-semibold text-sm">Team Manager</h2>
              <p className="text-xs text-muted-foreground">Portal</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50"
                      activeClassName="bg-muted text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        {manager && (
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {manager.firstName[0]}{manager.lastName[0]}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {manager.firstName} {manager.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate">{manager.country}</p>
              </div>
            )}
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          {!collapsed && 'Sign Out'}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};