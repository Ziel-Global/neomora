// import React, { useState, useEffect } from 'react';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
// import { useParticipantSession } from '@/contexts/ParticipantSessionContext';
// import { eventStore } from '@/lib/emsStore';
// import { getRegistrationById, Registration } from '@/api/registrationApi';
// import { StatusBadge } from '@/components/common/StatusBadge';
// import { FileText, Plane, Loader2 } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import { useNavigate } from 'react-router-dom';
// import { toast } from 'sonner';

// const Registrations: React.FC = () => {
//     const { participant } = useParticipantSession();
//     const [registrations, setRegistrations] = useState<Registration[]>([]);
//     const [loading, setLoading] = useState(true);
//     const navigate = useNavigate();

//     useEffect(() => {
//         if (!participant) return;

//         const fetchRegistrations = async () => {
//             try {
//                 setLoading(true);
//                 // Load UUID registration IDs saved in localStorage at time of form submission
//                 const savedIds: string[] = JSON.parse(localStorage.getItem('ems_my_registration_ids') || '[]');
//                 if (savedIds.length === 0) {
//                     setRegistrations([]);
//                     return;
//                 }
//                 // Fetch each registration via GET /registrations/:id (confirmed working with participant token)
//                 const results = await Promise.allSettled(
//                     savedIds.map((id) => getRegistrationById(id))
//                 );
//                 const regs = results
//                     .filter((r): r is PromiseFulfilledResult<Registration> => r.status === 'fulfilled')
//                     .map((r) => r.value);
//                 setRegistrations(regs);
//             } catch (err) {
//                 console.error('Failed to fetch registrations:', err);
//                 toast.error('Failed to load registrations');
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchRegistrations();
//     }, [participant]);

//     const getEventName = (reg: Registration) => {
//         // Backend may return event as nested object inside registration
//         const nestedName = (reg as any)?.event?.name || (reg as any)?.event?.title;
//         if (nestedName) return nestedName;
//         if (reg.eventId) return eventStore.getById(reg.eventId)?.name || reg.eventId;
//         return 'Unknown Event';
//     };

//     if (!participant) return null;

//     if (loading) {
//         return (
//             <div className="space-y-6">
//                 <div>
//                     <h1 className="text-3xl font-bold mb-2">My Registrations</h1>
//                     <p className="text-muted-foreground">Track the status of your event registrations.</p>
//                 </div>
//                 <Card>
//                     <CardContent className="pt-10 pb-10 text-center text-muted-foreground">
//                         <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin opacity-50" />
//                         <p>Loading registrations...</p>
//                     </CardContent>
//                 </Card>
//             </div>
//         );
//     }

//     return (
//         <div className="space-y-6">
//             <div>
//                 <h1 className="text-3xl font-bold mb-2">My Registrations</h1>
//                 <p className="text-muted-foreground">Track the status of your event registrations.</p>
//             </div>

//             {registrations.length === 0 ? (
//                 <Card>
//                     <CardContent className="pt-10 pb-10 text-center text-muted-foreground">
//                         <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
//                         <p>You have not registered for any events yet.</p>
//                         <div className="mt-4">
//                             <Button onClick={() => navigate('/register')}>Register for Event</Button>
//                         </div>
//                     </CardContent>
//                 </Card>
//             ) : (
//                 <div className="space-y-4">
//                     {registrations.map((reg) => (
//                         <Card key={reg.id}>
//                             <CardHeader className="pb-2">
//                                 <div className="flex justify-between items-start">
//                                     <div>
//                                         <CardTitle className="text-lg font-bold">{getEventName(reg)}</CardTitle>
//                                         <p className="text-sm text-muted-foreground mt-1">Ref: {reg.id}</p>
//                                     </div>
//                                     <StatusBadge status={reg.status || 'Pending'} />
//                                 </div>
//                             </CardHeader>
//                             <CardContent>
//                                 <div className="flex flex-wrap gap-2 mt-2">
//                                     {reg.needsTransport && (
//                                         <Badge variant="secondary" className="text-xs">
//                                             <Plane className="h-3 w-3 mr-1" />
//                                             Travel Requested
//                                         </Badge>
//                                     )}
//                                     {reg.needsAccommodation && (
//                                         <Badge variant="secondary" className="text-xs">
//                                             <FileText className="h-3 w-3 mr-1" />
//                                             Accommodation Requested
//                                         </Badge>
//                                     )}
//                                     {reg.passportCopy && (
//                                         <Badge variant="outline" className="text-xs">
//                                             Passport: Uploaded
//                                         </Badge>
//                                     )}
//                                 </div>
//                             </CardContent>
//                         </Card>
//                     ))}
//                 </div>
//             )}
//         </div>
//     );
// };

// export default Registrations;


// import React, { useState, useEffect } from 'react';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Badge } from '@/components/ui/badge';
// import { useParticipantSession } from '@/contexts/ParticipantSessionContext';
// import { eventStore } from '@/lib/emsStore';
// import { getRegistrationById, getMyRegistrations, Registration } from '@/api/registrationApi';
// import { StatusBadge } from '@/components/common/StatusBadge';
// import { FileText, Plane, Loader2 } from 'lucide-react';
// import { Button } from '@/components/ui/button';
// import { useNavigate } from 'react-router-dom';
// import { toast } from 'sonner';

// const REGISTRATION_IDS_KEY = 'ems_my_registration_ids';

// const Registrations: React.FC = () => {
//     const { participant } = useParticipantSession();
//     const [registrations, setRegistrations] = useState<Registration[]>([]);
//     const [loading, setLoading] = useState(true);
//     const navigate = useNavigate();

//     useEffect(() => {
//         if (!participant) return;

//         const fetchRegistrations = async () => {
//             try {
//                 setLoading(true);

//                 // Primary source: ask the backend for all registrations belonging to this participant
//                 const apiRegs = await getMyRegistrations().catch((err) => {
//                     console.error('Failed to fetch registrations from API:', err);
//                     return [] as Registration[];
//                 });

//                 let regs: Registration[] = Array.isArray(apiRegs) ? [...apiRegs] : [];

//                 // Fallback / merge: some registrations may only be known locally
//                 // (e.g. saved right after submission before a full list refresh,
//                 // or on a device where getMyRegistrations() hasn't caught up yet)
//                 const savedIds: string[] = JSON.parse(localStorage.getItem(REGISTRATION_IDS_KEY) || '[]');
//                 const missingIds = savedIds.filter((id) => !regs.some((r) => r.id === id));

//                 if (missingIds.length > 0) {
//                     const results = await Promise.allSettled(
//                         missingIds.map((id) => getRegistrationById(id))
//                     );

//                     const fetched: Registration[] = [];
//                     const staleIds: string[] = [];

//                     results.forEach((result, idx) => {
//                         if (result.status === 'fulfilled' && result.value) {
//                             fetched.push(result.value);
//                         } else {
//                             // Registration no longer exists / not accessible —
//                             // stop retrying it on every future load
//                             staleIds.push(missingIds[idx]);
//                         }
//                     });

//                     regs = [...regs, ...fetched];

//                     if (staleIds.length > 0) {
//                         const cleaned = savedIds.filter((id) => !staleIds.includes(id));
//                         localStorage.setItem(REGISTRATION_IDS_KEY, JSON.stringify(cleaned));
//                     }
//                 }

//                 // Keep localStorage in sync with whatever the backend says is
//                 // "mine" too, so the fallback stays useful even if a
//                 // registration was created on a different device/browser.
//                 const allIds = Array.from(new Set([...regs.map((r) => r.id), ...savedIds]));
//                 localStorage.setItem(REGISTRATION_IDS_KEY, JSON.stringify(allIds));

//                 setRegistrations(regs);
//             } catch (err) {
//                 console.error('Failed to fetch registrations:', err);
//                 toast.error('Failed to load registrations');
//             } finally {
//                 setLoading(false);
//             }
//         };

//         fetchRegistrations();
//     }, [participant]);

//     const getEventName = (reg: Registration) => {
//         // Backend may return event as nested object inside registration
//         const nestedName = (reg as any)?.event?.name || (reg as any)?.event?.title;
//         if (nestedName) return nestedName;
//         if (reg.eventId) return eventStore.getById(reg.eventId)?.name || reg.eventId;
//         return 'Unknown Event';
//     };

//     if (!participant) return null;

//     if (loading) {
//         return (
//             <div className="space-y-6">
//                 <div>
//                     <h1 className="text-3xl font-bold mb-2">My Registrations</h1>
//                     <p className="text-muted-foreground">Track the status of your event registrations.</p>
//                 </div>
//                 <Card>
//                     <CardContent className="pt-10 pb-10 text-center text-muted-foreground">
//                         <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin opacity-50" />
//                         <p>Loading registrations...</p>
//                     </CardContent>
//                 </Card>
//             </div>
//         );
//     }

//     return (
//         <div className="space-y-6">
//             <div>
//                 <h1 className="text-3xl font-bold mb-2">My Registrations</h1>
//                 <p className="text-muted-foreground">Track the status of your event registrations.</p>
//             </div>

//             {registrations.length === 0 ? (
//                 <Card>
//                     <CardContent className="pt-10 pb-10 text-center text-muted-foreground">
//                         <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
//                         <p>You have not registered for any events yet.</p>
//                         <div className="mt-4">
//                             <Button onClick={() => navigate('/register')}>Register for Event</Button>
//                         </div>
//                     </CardContent>
//                 </Card>
//             ) : (
//                 <div className="space-y-4">
//                     {registrations.map((reg) => (
//                         <Card key={reg.id}>
//                             <CardHeader className="pb-2">
//                                 <div className="flex justify-between items-start">
//                                     <div>
//                                         <CardTitle className="text-lg font-bold">{getEventName(reg)}</CardTitle>
//                                         <p className="text-sm text-muted-foreground mt-1">Ref: {reg.id}</p>
//                                     </div>
//                                     <StatusBadge status={reg.status || 'Pending'} />
//                                 </div>
//                             </CardHeader>
//                             <CardContent>
//                                 <div className="flex flex-wrap gap-2 mt-2">
//                                     {reg.needsTransport && (
//                                         <Badge variant="secondary" className="text-xs">
//                                             <Plane className="h-3 w-3 mr-1" />
//                                             Travel Requested
//                                         </Badge>
//                                     )}
//                                     {reg.needsAccommodation && (
//                                         <Badge variant="secondary" className="text-xs">
//                                             <FileText className="h-3 w-3 mr-1" />
//                                             Accommodation Requested
//                                         </Badge>
//                                     )}
//                                     {reg.passportCopy && (
//                                         <Badge variant="outline" className="text-xs">
//                                             Passport: Uploaded
//                                         </Badge>
//                                     )}
//                                 </div>
//                             </CardContent>
//                         </Card>
//                     ))}
//                 </div>
//             )}
//         </div>
//     );
// };

// export default Registrations;

import React, { useState, useEffect } from 'react';
import { useParticipantSession } from '@/contexts/ParticipantSessionContext';
import { eventStore } from '@/lib/emsStore';
import { getRegistrationById, getMyRegistrations, Registration } from '@/api/registrationApi';
import {
    FileText,
    Plane,
    Loader2,
    MapPin,
    Calendar,
    UserCircle,
    AlertCircle,
    ArrowRight,
    Hotel,
    BadgeCheck,
    CheckCircle2,
    Clock,
    XCircle,
    Send,
    LayoutGrid,
    List,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const REGISTRATION_IDS_KEY = 'ems_my_registration_ids';
const VIEW_MODE_KEY = 'ems_registrations_view_mode';

type ViewMode = 'cards' | 'table';

const readStoredViewMode = (): ViewMode => {
    try {
        return localStorage.getItem(VIEW_MODE_KEY) === 'table' ? 'table' : 'cards';
    } catch {
        return 'cards';
    }
};

const STATUS_STYLES: Record<
    string,
    { label: string; pill: string; accent: string; border: string; icon: React.ElementType }
> = {
    Approved: {
        label: 'Approved',
        pill: 'bg-status-success-bg text-status-success ring-status-success/20',
        accent: 'bg-status-success',
        border: 'border-status-success/20',
        icon: CheckCircle2,
    },
    Rejected: {
        label: 'Not approved',
        pill: 'bg-status-error-bg text-status-error ring-status-error/20',
        accent: 'bg-status-error',
        border: 'border-status-error/20',
        icon: XCircle,
    },
    'Update Requested': {
        label: 'Needs your update',
        pill: 'bg-status-warning-bg text-status-warning ring-status-warning/25',
        accent: 'bg-status-warning',
        border: 'border-status-warning/30',
        icon: AlertCircle,
    },
    'Under Review': {
        label: 'Under review',
        pill: 'bg-status-info-bg text-status-info ring-status-info/20',
        accent: 'bg-status-info',
        border: 'border-border/80',
        icon: Clock,
    },
    Submitted: {
        label: 'Submitted',
        pill: 'bg-status-info-bg text-status-info ring-status-info/20',
        accent: 'bg-primary/40',
        border: 'border-border/80',
        icon: Send,
    },
    Draft: {
        label: 'Draft',
        pill: 'bg-muted text-muted-foreground ring-border',
        accent: 'bg-muted-foreground/30',
        border: 'border-border/80',
        icon: FileText,
    },
};

const getStatusStyle = (status?: string) =>
    STATUS_STYLES[status || ''] || {
        label: status || 'Pending',
        pill: 'bg-muted text-muted-foreground ring-border',
        accent: 'bg-primary/40',
        border: 'border-border/80',
        icon: Clock,
    };

const STATUS_EXPLAINERS: Record<string, string> = {
    Approved: 'You are cleared to attend this event.',
    Rejected: 'This registration was not approved by the organisers.',
    'Under Review': 'The review team is checking your details.',
    Submitted: 'Waiting for the review team to look at it.',
    Draft: 'You have not submitted this yet.',
};

const Registrations: React.FC = () => {
    const { participant } = useParticipantSession();
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<ViewMode>(readStoredViewMode);
    const navigate = useNavigate();

    const setViewModeAndPersist = (mode: ViewMode) => {
        setViewMode(mode);
        try {
            localStorage.setItem(VIEW_MODE_KEY, mode);
        } catch {
            // ignore storage failures
        }
    };

    useEffect(() => {
        if (!participant) return;

        const fetchRegistrations = async () => {
            try {
                setLoading(true);

                // Primary source: ask the backend for all registrations belonging to this participant
                const apiRegs = await getMyRegistrations().catch((err) => {
                    console.error('Failed to fetch registrations from API:', err);
                    return [] as Registration[];
                });

                let regs: Registration[] = Array.isArray(apiRegs) ? [...apiRegs] : [];

                // Fallback / merge: some registrations may only be known locally
                // (e.g. saved right after submission before a full list refresh,
                // or on a device where getMyRegistrations() hasn't caught up yet)
                const savedIds: string[] = JSON.parse(localStorage.getItem(REGISTRATION_IDS_KEY) || '[]');
                const missingIds = savedIds.filter((id) => !regs.some((r) => r.id === id));

                if (missingIds.length > 0) {
                    const results = await Promise.allSettled(
                        missingIds.map((id) => getRegistrationById(id))
                    );

                    const fetched: Registration[] = [];
                    const staleIds: string[] = [];

                    results.forEach((result, idx) => {
                        if (result.status === 'fulfilled' && result.value) {
                            fetched.push(result.value);
                        } else {
                            // Registration no longer exists / not accessible —
                            // stop retrying it on every future load
                            staleIds.push(missingIds[idx]);
                        }
                    });

                    regs = [...regs, ...fetched];

                    if (staleIds.length > 0) {
                        const cleaned = savedIds.filter((id) => !staleIds.includes(id));
                        localStorage.setItem(REGISTRATION_IDS_KEY, JSON.stringify(cleaned));
                    }
                }

                // Keep localStorage in sync with whatever the backend says is
                // "mine" too, so the fallback stays useful even if a
                // registration was created on a different device/browser.
                const allIds = Array.from(new Set([...regs.map((r) => r.id), ...savedIds]));
                localStorage.setItem(REGISTRATION_IDS_KEY, JSON.stringify(allIds));

                setRegistrations(regs);
            } catch (err) {
                console.error('Failed to fetch registrations:', err);
                toast.error('Failed to load registrations');
            } finally {
                setLoading(false);
            }
        };

        fetchRegistrations();
    }, [participant]);

    const getEventName = (reg: Registration) => {
        // Backend may return event as nested object inside registration
        const nestedName = (reg as any)?.event?.name || (reg as any)?.event?.title;
        if (nestedName) return nestedName;
        if (reg.eventId) return eventStore.getById(reg.eventId)?.name || reg.eventId;
        return 'Unknown Event';
    };

    const getEventMeta = (reg: Registration) => {
        const event = (reg as any)?.event;
        const city = event?.city || eventStore.getById(reg.eventId)?.city;
        const startDate = event?.startDate || eventStore.getById(reg.eventId)?.startDate;
        const endDate = event?.endDate || eventStore.getById(reg.eventId)?.endDate;
        const role = (reg as any)?.participant?.role;
        return { city, startDate, endDate, role };
    };

    const formatDate = (date?: string | null) => {
        if (!date) return null;
        try {
            return new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
        } catch {
            return null;
        }
    };

    if (!participant) return null;

    const rows = registrations.map((reg) => {
        const { city, startDate, endDate, role } = getEventMeta(reg);
        const start = formatDate(startDate);
        const end = formatDate(endDate);

        return {
            reg,
            eventName: getEventName(reg),
            city,
            role,
            dateLabel: start || end ? `${start || ''}${start && end ? ' – ' : ''}${end || ''}` : null,
            status: getStatusStyle(reg.status),
            needsUpdate: reg.status === 'Update Requested',
            requests: [
                reg.needsTransport && { icon: Plane, label: 'Travel requested', short: 'Travel' },
                reg.needsAccommodation && { icon: Hotel, label: 'Accommodation requested', short: 'Stay' },
                reg.passportCopy && { icon: BadgeCheck, label: 'Passport uploaded', short: 'Passport' },
            ].filter(Boolean) as { icon: React.ElementType; label: string; short: string }[],
        };
    });

    const goToUpdate = (reg: Registration) =>
        navigate(`/register?registrationId=${encodeURIComponent(reg.id)}`);

    const approvedCount = registrations.filter((reg) => reg.status === 'Approved').length;
    const inReviewCount = registrations.filter(
        (reg) => reg.status === 'Submitted' || reg.status === 'Under Review',
    ).length;
    const actionNeededCount = registrations.filter((reg) => reg.status === 'Update Requested').length;

    const pageHeader = (
        <header className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-primary/[0.06] via-card to-card px-6 py-6 shadow-sm sm:px-8 sm:py-7">
            <div
                className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-primary/[0.07] blur-3xl"
                aria-hidden
            />
            <div
                className="pointer-events-none absolute -bottom-24 left-1/3 h-40 w-40 rounded-full bg-accent/10 blur-3xl"
                aria-hidden
            />
            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-xl space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary/70">
                        Participant portal
                    </p>
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                        My Registrations
                    </h1>
                    <p className="text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                        Track where each event registration stands and respond if the review team needs anything.
                    </p>
                </div>

                {!loading && registrations.length > 0 && (
                    <div className="grid grid-cols-3 gap-3 sm:gap-4">
                        {[
                            { label: 'Approved', value: approvedCount, tone: 'text-status-success' },
                            { label: 'In review', value: inReviewCount, tone: 'text-status-info' },
                            { label: 'Action needed', value: actionNeededCount, tone: 'text-status-warning' },
                        ].map((stat) => (
                            <div
                                key={stat.label}
                                className="min-w-[88px] rounded-xl border border-border/70 bg-card/80 px-3.5 py-3 shadow-sm backdrop-blur-sm"
                            >
                                <p className={cn('text-2xl font-semibold tabular-nums tracking-tight', stat.tone)}>
                                    {stat.value}
                                </p>
                                <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                                    {stat.label}
                                </p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </header>
    );

    if (loading) {
        return (
            <div className="space-y-8">
                {pageHeader}
                <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/40 py-24">
                    <Loader2 className="h-9 w-9 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Loading your registrations…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {pageHeader}

            {registrations.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-20 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                        <FileText className="h-7 w-7 text-muted-foreground/50" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">No registrations yet</h2>
                    <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">
                        Once you accept an invitation and complete registration, it will show up here with its status.
                    </p>
                </div>
            ) : (
                <section className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 px-0.5">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary/60" />
                            <h2 className="text-sm font-semibold text-foreground">
                                Registrations
                                <span className="ml-1.5 font-normal text-muted-foreground">({registrations.length})</span>
                            </h2>
                        </div>

                        <div
                            className="inline-flex items-center rounded-lg border border-border bg-card p-0.5 shadow-sm"
                            role="group"
                            aria-label="Display mode"
                        >
                            <button
                                type="button"
                                onClick={() => setViewModeAndPersist('cards')}
                                className={cn(
                                    'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors',
                                    viewMode === 'cards'
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                                aria-pressed={viewMode === 'cards'}
                            >
                                <LayoutGrid className="h-3.5 w-3.5" />
                                Cards
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewModeAndPersist('table')}
                                className={cn(
                                    'inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors',
                                    viewMode === 'table'
                                        ? 'bg-primary text-primary-foreground shadow-sm'
                                        : 'text-muted-foreground hover:text-foreground',
                                )}
                                aria-pressed={viewMode === 'table'}
                            >
                                <List className="h-3.5 w-3.5" />
                                Table
                            </button>
                        </div>
                    </div>

                    {viewMode === 'table' ? (
                        <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-sm">
                            <div className="overflow-x-auto">
                                <Table className="w-full table-fixed">
                                    <TableHeader>
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="h-11 min-w-0 bg-muted/40 text-[11px] font-semibold uppercase tracking-wider">Event</TableHead>
                                            <TableHead className="h-11 w-[140px] bg-muted/40 text-[11px] font-semibold uppercase tracking-wider">Location</TableHead>
                                            <TableHead className="h-11 w-[150px] bg-muted/40 text-[11px] font-semibold uppercase tracking-wider">Dates</TableHead>
                                            <TableHead className="h-11 w-[110px] bg-muted/40 text-[11px] font-semibold uppercase tracking-wider">Role</TableHead>
                                            <TableHead className="h-11 w-[110px] bg-muted/40 text-[11px] font-semibold uppercase tracking-wider">Included</TableHead>
                                            <TableHead className="h-11 w-[165px] bg-muted/40 text-[11px] font-semibold uppercase tracking-wider">Status</TableHead>
                                            <TableHead className="h-11 w-[140px] bg-muted/40 text-[11px] font-semibold uppercase tracking-wider">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {rows.map((row) => {
                                            const StatusIcon = row.status.icon;

                                            return (
                                                <TableRow
                                                    key={row.reg.id}
                                                    className="border-border/60 transition-colors hover:bg-muted/25"
                                                >
                                                    <TableCell className="min-w-0 py-3">
                                                        <div className="flex items-center gap-3">
                                                            <div
                                                                className={cn(
                                                                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[13px] font-bold text-primary ring-1 ring-inset ring-primary/10',
                                                                    'bg-gradient-to-br from-primary/15 to-primary/5',
                                                                )}
                                                            >
                                                                {row.eventName.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="truncate text-sm font-semibold text-foreground">
                                                                    {row.eventName}
                                                                </p>
                                                                {STATUS_EXPLAINERS[row.reg.status || ''] && (
                                                                    <p className="truncate text-xs text-muted-foreground">
                                                                        {STATUS_EXPLAINERS[row.reg.status || '']}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="min-w-0 py-3">
                                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                                                            <span className="truncate">{row.city || 'TBC'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="min-w-0 py-3">
                                                        <div className="flex items-center gap-1.5 text-sm">
                                                            <Calendar className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                                            <span className="truncate">{row.dateLabel || 'TBC'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="min-w-0 py-3 text-sm text-foreground/80">
                                                        <span className="block truncate">{row.role || '—'}</span>
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        {row.requests.length === 0 ? (
                                                            <span className="text-sm text-muted-foreground">—</span>
                                                        ) : (
                                                            <div className="flex items-center gap-1">
                                                                {row.requests.map((request) => (
                                                                    <span
                                                                        key={request.label}
                                                                        title={request.label}
                                                                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-muted/40 text-primary/70"
                                                                    >
                                                                        <request.icon className="h-3.5 w-3.5" />
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        <span
                                                            className={cn(
                                                                'inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                                                                row.status.pill,
                                                            )}
                                                        >
                                                            <StatusIcon className="h-3.5 w-3.5 shrink-0" />
                                                            <span className="truncate">{row.status.label}</span>
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="py-3">
                                                        {row.needsUpdate ? (
                                                            <Button
                                                                size="sm"
                                                                className="h-8 w-full gap-1.5 whitespace-nowrap px-2 text-xs shadow-sm"
                                                                onClick={() => goToUpdate(row.reg)}
                                                            >
                                                                Update now
                                                                <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                                                            </Button>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">
                                                                Nothing to do
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    ) : (
                    <div className="space-y-4">
                        {rows.map(({ reg, eventName, city, role, dateLabel, status, needsUpdate, requests }) => {
                            const StatusIcon = status.icon;

                            return (
                                <article
                                    key={reg.id}
                                    className={cn(
                                        'group relative overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.08)] transition-all duration-300',
                                        'hover:shadow-[0_1px_2px_rgba(15,23,42,0.05),0_16px_40px_-16px_rgba(15,23,42,0.14)]',
                                        status.border,
                                    )}
                                >
                                    <div className={cn('absolute inset-y-0 left-0 w-1', status.accent)} aria-hidden />

                                    <div className="pl-4 sm:pl-5">
                                        <div className="space-y-5 p-5 sm:p-6">
                                            <div className="flex flex-wrap items-start justify-between gap-3">
                                                <div className="min-w-0 space-y-1">
                                                    <h3 className="text-xl font-semibold tracking-tight text-foreground">
                                                        {eventName}
                                                    </h3>
                                                    {STATUS_EXPLAINERS[reg.status || ''] && (
                                                        <p className="text-xs text-muted-foreground">
                                                            {STATUS_EXPLAINERS[reg.status || '']}
                                                        </p>
                                                    )}
                                                </div>
                                                <span
                                                    className={cn(
                                                        'inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                                                        status.pill,
                                                    )}
                                                >
                                                    <StatusIcon className="h-3.5 w-3.5" />
                                                    {status.label}
                                                </span>
                                            </div>

                                            <div className="grid gap-3 sm:grid-cols-3">
                                                <div className="flex items-start gap-2.5 rounded-xl bg-muted/40 px-3 py-2.5">
                                                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/60" />
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                            Location
                                                        </p>
                                                        <p className="truncate text-sm font-medium text-foreground">
                                                            {city || 'To be confirmed'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-2.5 rounded-xl bg-muted/40 px-3 py-2.5">
                                                    <Calendar className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/60" />
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                            Event dates
                                                        </p>
                                                        <p className="text-sm font-medium text-foreground">
                                                            {dateLabel || 'To be confirmed'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-start gap-2.5 rounded-xl bg-muted/40 px-3 py-2.5">
                                                    <UserCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/60" />
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                            Your role
                                                        </p>
                                                        <p className="truncate text-sm font-medium text-foreground">
                                                            {role || '—'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {needsUpdate && (
                                                <div className="rounded-xl border border-status-warning/30 bg-status-warning-bg/60 p-4">
                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                                        <div className="flex gap-3">
                                                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-warning" />
                                                            <div>
                                                                <p className="text-sm font-semibold text-foreground">
                                                                    The review team needs a change
                                                                </p>
                                                                <p className="mt-1 text-sm leading-relaxed text-foreground/70">
                                                                    {reg.rejectionReason ||
                                                                        'Please review your registration details and submit it again.'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            className="h-9 shrink-0 gap-1.5 shadow-sm"
                                                            onClick={() => goToUpdate(reg)}
                                                        >
                                                            Update now
                                                            <ArrowRight className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {requests.length > 0 && (
                                            <div className="flex flex-wrap items-center gap-2 border-t border-border/70 bg-muted/20 px-5 py-3.5 sm:px-6">
                                                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                                                    Included
                                                </span>
                                                {requests.map((request) => (
                                                    <span
                                                        key={request.label}
                                                        className="inline-flex items-center gap-1.5 rounded-md border border-border/70 bg-card px-2 py-1 text-xs font-medium text-foreground/75"
                                                    >
                                                        <request.icon className="h-3.5 w-3.5 text-primary/60" />
                                                        {request.label}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                    )}
                </section>
            )}
        </div>
    );
};

export default Registrations;
