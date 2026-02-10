import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    Flag,
    Users,
    Check,
    Plane,
    ChevronDown,
    ChevronUp,
    Clock,
    CheckCircle,
    Ticket
} from 'lucide-react';
import { Delegation, Team, TeamMember, teamStore, teamMemberStore } from '@/lib/teamStore';
import { EMSTravelBooking, EMSParticipant } from '@/lib/emsStore';

interface DelegationTravelCardProps {
    delegation: Delegation;
    bookings: EMSTravelBooking[];
    participants: Map<string, EMSParticipant>;
    onApprove: (ids: string[]) => void;
    onBook: (ids: string[]) => void;
}

export const DelegationTravelCard: React.FC<DelegationTravelCardProps> = ({
    delegation,
    bookings,
    participants,
    onApprove,
    onBook,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Calculate stats
    const stats = {
        total: bookings.length,
        pending: bookings.filter(b => b.status === 'Requested').length,
        approved: bookings.filter(b => b.status === 'Approved').length,
        ticketed: bookings.filter(b => b.status === 'Ticketed').length,
        rejected: bookings.filter(b => b.status === 'Rejected').length,
    };

    // Get pending and approved booking IDs
    const pendingIds = bookings.filter(b => b.status === 'Requested').map(b => b.id);
    const approvedIds = bookings.filter(b => b.status === 'Approved').map(b => b.id);

    // Get teams in this delegation
    const teams = delegation.teamIds
        .map(id => teamStore.getById(id))
        .filter((t): t is Team => t !== undefined);

    const handleApproveAll = () => {
        if (pendingIds.length > 0) {
            onApprove(pendingIds);
        }
    };

    const handleBookAll = () => {
        if (approvedIds.length > 0) {
            onBook(approvedIds);
        }
    };

    return (
        <Card className="overflow-hidden">
            <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Flag className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <CardTitle className="text-lg">{delegation.country}</CardTitle>
                            <p className="text-sm text-muted-foreground">
                                {teams.length} team{teams.length !== 1 ? 's' : ''} • {delegation.totalMembers} members
                            </p>
                        </div>
                    </div>
                    <Badge
                        variant={delegation.status === 'Approved' ? 'default' : 'secondary'}
                        className="shrink-0"
                    >
                        {delegation.status}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-xl font-bold">{stats.total}</p>
                        <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-500/10">
                        <div className="flex items-center justify-center gap-1">
                            <Clock className="h-3 w-3 text-amber-500" />
                            <p className="text-xl font-bold text-amber-600">{stats.pending}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-500/10">
                        <div className="flex items-center justify-center gap-1">
                            <CheckCircle className="h-3 w-3 text-blue-500" />
                            <p className="text-xl font-bold text-blue-600">{stats.approved}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">Approved</p>
                    </div>
                    <div className="p-2 rounded-lg bg-green-500/10">
                        <div className="flex items-center justify-center gap-1">
                            <Ticket className="h-3 w-3 text-green-500" />
                            <p className="text-xl font-bold text-green-600">{stats.ticketed}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">Ticketed</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    {stats.pending > 0 && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={handleApproveAll}
                        >
                            <Check className="h-4 w-4 mr-1" />
                            Approve All ({stats.pending})
                        </Button>
                    )}
                    {stats.approved > 0 && (
                        <Button
                            size="sm"
                            className="flex-1"
                            onClick={handleBookAll}
                        >
                            <Plane className="h-4 w-4 mr-1" />
                            Book All ({stats.approved})
                        </Button>
                    )}
                </div>

                {/* Expandable Member List */}
                {bookings.length > 0 && (
                    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-full">
                                <Users className="h-4 w-4 mr-2" />
                                {isExpanded ? 'Hide' : 'Show'} Member Details
                                {isExpanded ? (
                                    <ChevronUp className="h-4 w-4 ml-2" />
                                ) : (
                                    <ChevronDown className="h-4 w-4 ml-2" />
                                )}
                            </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {bookings.map((booking) => {
                                    const participant = participants.get(booking.participantId);
                                    return (
                                        <div
                                            key={booking.id}
                                            className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                                                    {participant?.firstName?.[0]}{participant?.lastName?.[0]}
                                                </div>
                                                <div>
                                                    <p className="font-medium" dir="auto">
                                                        {participant?.firstName} {participant?.lastName}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {booking.originCity} • {booking.preferredDepartureDate || 'No date'}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge
                                                variant={
                                                    booking.status === 'Ticketed' ? 'default' :
                                                        booking.status === 'Approved' ? 'secondary' :
                                                            booking.status === 'Rejected' ? 'destructive' : 'outline'
                                                }
                                                className="text-xs"
                                            >
                                                {booking.status}
                                            </Badge>
                                        </div>
                                    );
                                })}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                )}

                {/* Empty State */}
                {bookings.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                        No travel requests for this delegation
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
