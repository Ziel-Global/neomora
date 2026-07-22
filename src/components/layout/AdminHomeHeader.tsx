import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { LogOut, Calendar, Users, Shield, BarChart3 } from 'lucide-react';

export const AdminHomeHeader: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { user, logout } = useAuth();
    const location = useLocation();
    const isRtl = i18n.language === 'ar';

    const isActive = (path: string) => location.pathname === path;

    return (
        <header className="sticky top-0 z-30 bg-sidebar border-b border-sidebar-border px-6 py-0 flex items-center gap-4 h-16 shadow-sm">
            <Link to="/admin" className="flex items-center gap-2 mr-4">
                <img src="/neomoraWhite.png" alt="NeoMora" className="h-6 w-auto" />
                <span className="text-sidebar-foreground/40 font-light text-lg mx-1">|</span>
                <span className="text-sidebar-foreground font-semibold text-base tracking-tight">
                    {t('events.admin_portal')}
                </span>
            </Link>

            <nav className="flex items-center gap-1 mx-4">
                <Link to="/admin">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`gap-2 ${isActive('/admin') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'}`}
                    >
                        <Calendar className="h-4 w-4" />
                        {t('common.events')}
                    </Button>
                </Link>
                <Link to="/admin/participants">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`gap-2 ${isActive('/admin/participants') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'}`}
                    >
                        <Users className="h-4 w-4" />
                        {t('common.members')}
                    </Button>
                </Link>
                <Link to="/admin/managers">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`gap-2 ${isActive('/admin/managers') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'}`}
                    >
                        <Users className="h-4 w-4" />
                        Managers
                    </Button>
                </Link>
                <Link to="/admin/subadmins">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`gap-2 ${isActive('/admin/subadmins') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'}`}
                    >
                        <Shield className="h-4 w-4" />
                        {t('common.manage_staff')}
                    </Button>
                </Link>
                <Link to="/admin/reports">
                    <Button
                        variant="ghost"
                        size="sm"
                        className={`gap-2 ${isActive('/admin/reports') ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:text-sidebar-foreground'}`}
                    >
                        <BarChart3 className="h-4 w-4" />
                        {t('common.reports')}
                    </Button>
                </Link>
            </nav>

            <div className={`${isRtl ? 'mr-auto' : 'ml-auto'} flex items-center gap-3`}>
                <LanguageSwitcher />
                <div className="flex items-center gap-2 text-sm text-sidebar-foreground/80">
                    <div className="h-8 w-8 rounded-full bg-sidebar-accent flex items-center justify-center font-medium text-sidebar-accent-foreground">
                        {user?.name?.charAt(0) ?? 'A'}
                    </div>
                    <span className="hidden sm:block">{user?.name ?? t('common.admin')}</span>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                    onClick={logout}
                >
                    <LogOut className={`h-4 w-4 ${isRtl ? 'ml-1.5' : 'mr-1.5'}`} />
                    {t('common.sign_out')}
                </Button>
            </div>
        </header>
    );
};
