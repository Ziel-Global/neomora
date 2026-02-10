import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useParticipantSession } from '@/contexts/ParticipantSessionContext';
import { User, Mail, Phone, MapPin, Globe } from 'lucide-react';

const Profile: React.FC = () => {
    const { participant } = useParticipantSession();

    if (!participant) return null;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold mb-2">My Profile</h1>
                <p className="text-muted-foreground">View your personal information connected to this account.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Personal Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                            <p className="text-lg">{participant.firstName} {participant.lastName}</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-muted-foreground">Organization</label>
                            <p className="text-lg">{participant.organization}</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-muted-foreground">Role</label>
                            <p className="text-lg">{participant.role}</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-muted-foreground">Nationality</label>
                            <div className="flex items-center gap-2">
                                <Globe className="h-4 w-4 text-muted-foreground" />
                                <p className="text-lg">{participant.nationality}</p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-6 grid md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <p className="text-lg">{participant.email}</p>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-muted-foreground">Phone Number</label>
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <p className="text-lg">{participant.phone || 'Not provided'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="border-t pt-6 grid md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-muted-foreground">Dietary Requirements</label>
                            <p className="text-base">{participant.dietaryNotes || 'None'}</p>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-muted-foreground">Accessibility Needs</label>
                            <p className="text-base">{participant.accessibilityNeeds || 'None'}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="text-center text-sm text-muted-foreground mt-8">
                <p>To update your profile information, please contact the event support team.</p>
            </div>
        </div>
    );
};

export default Profile;
