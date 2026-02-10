import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
    Flag,
    Users,
    Hotel,
    ChevronDown,
    ChevronUp,
    Bed,
    CheckCircle,
    LogIn,
    LogOut
} from 'lucide-react';
import { Delegation, Team, teamStore } from '@/lib/teamStore';
import { EMSParticipant, EMSAccommodation } from '@/lib/emsStore';

interface DelegationAccommodationCardProps {
    delegation: Delegation;
    pendingParticipants: EMSParticipant[];
    allocations: EMSAccommodation[];
    participants: Map<string, EMSParticipant>;
    onAllocate: (ids: string[]) => void;
    onConfirm: (ids: string[]) => void;
}

export const DelegationAccommodationCard: React.FC<DelegationAccommodationCardProps> = ({
    delegation,
    pendingParticipants,
    allocations,
    participants,
    onAllocate,
    onConfirm,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);

    // Calculate stats
    const stats = {
        pending: pendingParticipants.length,
        provisional: allocations.filter(a => a.status === 'Provisional').length,
        confirmed: allocations.filter(a => a.status === 'Confirmed').length,
        checkedIn: allocations.filter(a => a.status === 'Checked-In').length,
        checkedOut: allocations.filter(a => a.status === 'Checked-Out').length,
        total: allocations.length,
    };

    // Get IDs for actions
    const pendingIds = pendingParticipants.map(p => p.id);
    const provisionalIds = allocations.filter(a => a.status === 'Provisional').map(a => a.id);

    // Get teams in this delegation
    const teams = delegation.teamIds
        .map(id => teamStore.getById(id))
        .filter((t): t is Team => t !== undefined);

    const handleAllocateAll = () => {
        if (pendingIds.length > 0) {
            onAllocate(pendingIds);
        }
    };

    const handleConfirmAll = () => {
        if (provisionalIds.length > 0) {
            onConfirm(provisionalIds);
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
                    <div className="p-2 rounded-lg bg-amber-500/10">
                        <div className="flex items-center justify-center gap-1">
                            <Bed className="h-3 w-3 text-amber-500" />
                            <p className="text-xl font-bold text-amber-600">{stats.pending}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">Pending</p>
                    </div>
                    <div className="p-2 rounded-lg bg-orange-500/10">
                        <div className="flex items-center justify-center gap-1">
                            <Hotel className="h-3 w-3 text-orange-500" />
                            <p className="text-xl font-bold text-orange-600">{stats.provisional}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">Provisional</p>
                    </div>
                    <div className="p-2 rounded-lg bg-blue-500/10">
                        <div className="flex items-center justify-center gap-1">
                            <CheckCircle className="h-3 w-3 text-blue-500" />
                            <p className="text-xl font-bold text-blue-600">{stats.confirmed}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">Confirmed</p>
                    </div>
                    <div className="p-2 rounded-lg bg-green-500/10">
                        <div className="flex items-center justify-center gap-1">
                            <LogIn className="h-3 w-3 text-green-500" />
                            <p className="text-xl font-bold text-green-600">{stats.checkedIn}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">Checked-In</p>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                    {stats.pending > 0 && (
                        <Button
                            size="sm"
                            variant="outline"
                            className="flex-1"
                            onClick={handleAllocateAll}
                        >
                            <Bed className="h-4 w-4 mr-1" />
                            Allocate All ({stats.pending})
                        </Button>
                    )}
                    {stats.provisional > 0 && (
                        <Button
                            size="sm"
                            className="flex-1"
                            onClick={handleConfirmAll}
                        >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Confirm All ({stats.provisional})
                        </Button>
                    )}
                </div>

                {/* Expandable Member List */}
                {(pendingParticipants.length > 0 || allocations.length > 0) && (
                    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                        <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="w-full">
                                <Users className="h-4 w-4 mr-2" />
                                {isExpanded ? 'Hide' : 'Show'} Details
                                {isExpanded ? (
                                    <ChevronUp className="h-4 w-4 ml-2" />
                                ) : (
                                    <ChevronDown className="h-4 w-4 ml-2" />
                                )}
                            </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {/* Pending Participants */}
                                {pendingParticipants.map((participant) => (
                                    <div
                                        key={participant.id}
                                        className="flex items-center justify-between p-2 rounded-lg bg-amber-500/5 border border-amber-500/20 text-sm"
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center text-xs font-medium text-amber-600">
                                                {participant.firstName?.[0]}{participant.lastName?.[0]}
                                            </div>
                                            <div>
                                                <p className="font-medium" dir="auto">
                                                    {participant.firstName} {participant.lastName}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {participant.role}
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-500">
                                            Needs Accommodation
                                        </Badge>
                                    </div>
                                ))}

                                {/* Allocated Participants */}
                                {allocations.map((allocation) => {
                                    const participant = participants.get(allocation.participantId);
                                    return (
                                        <div
                                            key={allocation.id}
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
                                                        {allocation.hotelName} • Room {allocation.roomNumber}
                                                    </p>
                                                </div>
                                            </div>
                                            <Badge
                                                variant={
                                                    allocation.status === 'Checked-In' ? 'default' :
                                                        allocation.status === 'Confirmed' ? 'secondary' :
                                                            allocation.status === 'Cancelled' ? 'destructive' : 'outline'
                                                }
                                                className="text-xs"
                                            >
                                                {allocation.status}
                                            </Badge>
                                        </div>
                                    );
                                })}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                )}

                {/* Empty State */}
                {pendingParticipants.length === 0 && allocations.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                        No accommodation data for this delegation
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
