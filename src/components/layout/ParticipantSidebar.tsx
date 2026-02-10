import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useParticipantSession } from '@/contexts/ParticipantSessionContext';
import { Button } from '@/components/ui/button';
import {
    LayoutDashboard,
    Calendar,
    Mail,
    FileText,
    Plane,
    Hotel,
    User,
    LogOut,
    Menu,
    X,
    HelpCircle,
    FileCheck2,
    Bus,
    BadgeCheck
} from 'lucide-react';

interface NavItem {
    icon: React.ElementType;
    label: string;
    href: string;
}

const participantNavItems: NavItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/portal/dashboard' },
    { icon: Mail, label: 'Invitations', href: '/portal/invitations' },
    { icon: FileText, label: 'Registrations', href: '/portal/registrations' },
    { icon: BadgeCheck, label: 'Accreditation', href: '/portal/accreditation' },
    { icon: FileCheck2, label: 'Visa & Documents', href: '/portal/visa' },
    { icon: Plane, label: 'Travel & Flights', href: '/portal/travel' },
    { icon: Hotel, label: 'Accommodation', href: '/portal/accommodation' },
    { icon: Bus, label: 'Transportation', href: '/portal/transportation' },
    { icon: User, label: 'My Profile', href: '/portal/profile' },
    { icon: HelpCircle, label: 'Support', href: '/portal/support' },
];

export const ParticipantSidebar: React.FC = () => {
    const location = useLocation();
    const { participant, logout } = useParticipantSession();
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Helper to determine if a link is active
    // Handles partial matching for sub-routes if needed, but extensive exact matching is safer here
    const isActiveLink = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/');

    const NavLink = ({ item }: { item: NavItem }) => {
        const active = isActiveLink(item.href);
        const Icon = item.icon;

        return (
            <Link
                to={item.href}
                className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    active
                        ? 'bg-primary/10 text-primary'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
                onClick={() => setIsMobileOpen(false)}
            >
                <Icon className="h-5 w-5" />
                {item.label}
            </Link>
        );
    };

    const SidebarContent = () => (
        <>
            {/* Logo */}
            <div className="flex h-16 items-center gap-2 border-b px-6">
                <Link to="/" className="flex items-center gap-2">
                    <img
                        src="/neomora1.png"
                        alt="NeoMora"
                        className="h-6 w-auto"
                    />
                </Link>
            </div>

            {/* Navigation */}
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                {participantNavItems.map((item) => (
                    <NavLink key={item.label} item={item} />
                ))}
            </div>

            {/* User section */}
            <div className="border-t p-4">
                <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                        {participant?.firstName?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                            {participant?.firstName} {participant?.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                            {participant?.email}
                        </p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-muted-foreground hover:text-foreground"
                    onClick={() => {
                        logout();
                        // Redirect handled by auth context usually, or we can force it
                        window.location.href = '/login/participant';
                    }}
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
                className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-primary text-primary-foreground shadow-lg"
                onClick={() => setIsMobileOpen(!isMobileOpen)}
                aria-label="Toggle menu"
            >
                {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>

            {/* Mobile overlay */}
            {isMobileOpen && (
                <div
                    className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed left-0 top-0 z-40 h-screen w-64 flex-col bg-card border-r transition-transform lg:translate-x-0',
                    isMobileOpen ? 'translate-x-0' : '-translate-x-full',
                    'flex'
                )}
            >
                <SidebarContent />
            </aside>
        </>
    );
};
