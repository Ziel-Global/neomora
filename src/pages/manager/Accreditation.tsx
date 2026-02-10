
import React, { useState, useEffect } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { useManagerSession } from '@/contexts/ManagerSessionContext';
import { teamMemberStore, teamStore } from '@/lib/teamStore';
import { accreditationStore, AccreditationProfile, BadgeRecord, participantStore } from '@/lib/emsStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, Search, Shield, UserCheck, BadgeCheck, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/common/StatsCard';

const ManagerAccreditationPage: React.FC = () => {
    const { manager } = useManagerSession();
    const [members, setMembers] = useState<any[]>([]);
    const [profiles, setProfiles] = useState<AccreditationProfile[]>([]);
    const [badges, setBadges] = useState<BadgeRecord[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Load data
    useEffect(() => {
        if (manager) {
            loadData();
        }
    }, [manager]);

    const loadData = () => {
        if (!manager) return;

        // Get manager's team members
        const teamMembers = teamMemberStore.getByManager(manager.id);
        setMembers(teamMembers);

        // Get all accreditation data (in a real app, API would filter this)
        const allProfiles = accreditationStore.getProfiles();
        const allBadges = accreditationStore.getBadges();

        setProfiles(allProfiles);
        setBadges(allBadges);
    };

    const handleRefresh = () => {
        loadData();
    };

    // Combine data for display
    const tableData = members.map(member => {
        // 1. Try strict link via registrationId
        let profile = profiles.find(p => p.registrationId === member.registrationId);

        // 2. If not found, try to link via Email (using Participant Store as bridge)
        if (!profile && member.email) {
            const participant = participantStore.getByEmail(member.email);
            if (participant) {
                profile = profiles.find(p => p.participantId === participant.id);
            }
        }

        // 3. Fallback: Fuzzy link via Name
        if (!profile) {
            profile = profiles.find(p =>
                p.profileData.firstName.toLowerCase() === member.firstName.toLowerCase() &&
                p.profileData.lastName.toLowerCase() === member.lastName.toLowerCase()
            );
        }

        const badge = profile ? badges.find(b => b.profileId === profile.id) : null;

        // Auto-fix: If we found a profile but member doesn't have registrationId, we could assume they are registered
        const displayRegistrationId = member.registrationId || profile?.registrationId;

        return {
            member,
            profile,
            badge,
            displayRegistrationId
        };
    }).filter(item => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
            item.member.firstName.toLowerCase().includes(searchLower) ||
            item.member.lastName.toLowerCase().includes(searchLower) ||
            item.member.role.toLowerCase().includes(searchLower)
        );
    });

    // Calculate stats
    const stats = {
        totalMembers: members.length,
        accredited: profiles.filter(p => p.status === 'Approved').length,
        pending: profiles.filter(p => p.status === 'Pending Review' || p.status === 'Security Check').length,
        badgesReady: badges.filter(b => b.productionStatus === 'Ready' || b.distributionStatus === 'Collected').length
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'Approved': return 'success';
            case 'Pending Review': return 'warning';
            case 'Security Check': return 'warning';
            case 'Rejected': return 'destructive';
            case 'On Hold': return 'warning';
            default: return 'secondary';
        }
    };

    const getBadgeStatusColor = (status?: string) => {
        switch (status) {
            case 'Ready': return 'success';
            case 'Collected': return 'default'; // dark/black
            case 'Activated': return 'default';
            case 'Printed': return 'info';
            case 'Queued': return 'warning';
            default: return 'outline';
        }
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Team Accreditation"
                description="Monitor accreditation status and badge availability for your delegation."
                actions={
                    <Button variant="outline" onClick={handleRefresh}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh
                    </Button>
                }
            />

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <StatsCard title="Total Members" value={stats.totalMembers} icon={UserCheck} />
                <StatsCard title="Accredited" value={stats.accredited} icon={Shield} />
                <StatsCard title="Pending Review" value={stats.pending} icon={AlertCircle} />
                <StatsCard title="Badges Ready" value={stats.badgesReady} icon={BadgeCheck} />
            </div>

            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search members..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            <Card>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Member Name</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Registration</TableHead>
                            <TableHead>Accreditation Status</TableHead>
                            <TableHead>Badge Status</TableHead>
                            <TableHead>Zone Access</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tableData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                    No members found matching your search.
                                </TableCell>
                            </TableRow>
                        ) : (
                            tableData.map(({ member, profile, badge }) => (
                                <TableRow key={member.id}>
                                    <TableCell className="font-medium">
                                        {member.firstName} {member.lastName}
                                    </TableCell>
                                    <TableCell>{member.role}</TableCell>
                                    <TableCell>
                                        {profile?.registrationId ? (
                                            <Badge variant="outline">{profile.registrationId}</Badge>
                                        ) : member.registrationId ? (
                                            <Badge variant="outline">{member.registrationId}</Badge>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">Not Registered</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {profile ? (
                                            <Badge variant={getStatusColor(profile.status) as any}>
                                                {profile.status}
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {badge ? (
                                            <Badge variant={getBadgeStatusColor(badge.distributionStatus === 'Not Distributed' ? badge.productionStatus : badge.distributionStatus) as any}>
                                                {badge.distributionStatus !== 'Not Distributed' ? badge.distributionStatus : badge.productionStatus}
                                            </Badge>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {badge?.zoneAccess ? (
                                            <div className="flex gap-1 flex-wrap">
                                                {badge.zoneAccess.slice(0, 2).map((zone, i) => (
                                                    <Badge key={i} variant="secondary" className="text-xs">{zone}</Badge>
                                                ))}
                                                {badge.zoneAccess.length > 2 && (
                                                    <Badge variant="secondary" className="text-xs">+{badge.zoneAccess.length - 2}</Badge>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">-</span>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
};

export default ManagerAccreditationPage;
