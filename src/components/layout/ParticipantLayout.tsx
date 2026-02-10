import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useParticipantSession } from '@/contexts/ParticipantSessionContext';
import { ParticipantSidebar } from './ParticipantSidebar';
import { Loader2 } from 'lucide-react';

export const ParticipantLayout: React.FC = () => {
    const { isLoggedIn, participant, isLoading } = useParticipantSession();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (!isLoading && (!isLoggedIn || !participant)) {
            // Redirect to login if not authenticated
            navigate('/login/participant', { state: { from: location } });
        }
    }, [isLoading, isLoggedIn, participant, navigate, location]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isLoggedIn || !participant) {
        return null; // Will redirect via useEffect
    }

    return (
        <div className="min-h-screen bg-background">
            <ParticipantSidebar />

            {/* Main Content Area */}
            <main className="lg:pl-64 min-h-screen transition-all duration-300 ease-in-out">
                <div className="container py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
