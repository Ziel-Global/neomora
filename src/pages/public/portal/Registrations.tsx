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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useParticipantSession } from '@/contexts/ParticipantSessionContext';
import { eventStore } from '@/lib/emsStore';
import { getRegistrationById, getMyRegistrations, Registration } from '@/api/registrationApi';
import { StatusBadge } from '@/components/common/StatusBadge';
import { FileText, Plane, Loader2, MapPin, Calendar, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const REGISTRATION_IDS_KEY = 'ems_my_registration_ids';

const Registrations: React.FC = () => {
    const { participant } = useParticipantSession();
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

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

    if (loading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold mb-2">My Registrations</h1>
                    <p className="text-muted-foreground">Track the status of your event registrations.</p>
                </div>
                <Card>
                    <CardContent className="pt-10 pb-10 text-center text-muted-foreground">
                        <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin opacity-50" />
                        <p>Loading registrations...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start gap-4 flex-wrap">
                <div>
                    <h1 className="text-3xl font-bold mb-2">My Registrations</h1>
                    <p className="text-muted-foreground">Track the status of your event registrations.</p>
                </div>
                {/* Always visible so the participant can register for additional events */}
                {/* <Button onClick={() => navigate('/register')}>Register for Event</Button> */}
            </div>

            {registrations.length === 0 ? (
                <Card>
                    <CardContent className="pt-10 pb-10 text-center text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                        <p>You have not registered for any events yet.</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {registrations.map((reg) => {
                        const { city, startDate, endDate, role } = getEventMeta(reg);
                        const start = formatDate(startDate);
                        const end = formatDate(endDate);

                        return (
                            <Card key={reg.id}>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <CardTitle className="text-lg font-bold">{getEventName(reg)}</CardTitle>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                                                {city && (
                                                    <span className="flex items-center gap-1">
                                                        <MapPin className="h-3.5 w-3.5" />
                                                        {city}
                                                    </span>
                                                )}
                                                {(start || end) && (
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3.5 w-3.5" />
                                                        {start}{start && end ? ' - ' : ''}{end}
                                                    </span>
                                                )}
                                                {role && (
                                                    <span className="flex items-center gap-1">
                                                        <UserCircle className="h-3.5 w-3.5" />
                                                        {role}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <StatusBadge status={reg.status || 'Pending'} />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {reg.needsTransport && (
                                            <Badge variant="secondary" className="text-xs">
                                                <Plane className="h-3 w-3 mr-1" />
                                                Travel Requested
                                            </Badge>
                                        )}
                                        {reg.needsAccommodation && (
                                            <Badge variant="secondary" className="text-xs">
                                                <FileText className="h-3 w-3 mr-1" />
                                                Accommodation Requested
                                            </Badge>
                                        )}
                                        {reg.passportCopy && (
                                            <Badge variant="outline" className="text-xs">
                                                Passport: Uploaded
                                            </Badge>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Registrations;