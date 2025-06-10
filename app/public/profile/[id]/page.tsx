'use client';

import { useEffect, useState } from 'react';
import { getPublicTeamMemberById } from '@/lib/actions/team-actions';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { useParams } from 'next/navigation';

export default function PublicProfile() {
    const [teamMember, setTeamMember] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const params = useParams<{ id: string }>();

    useEffect(() => {
        const fetchTeamMember = async () => {
            try {
                setLoading(true);
                const data = await getPublicTeamMemberById(params.id);
                setTeamMember(data);
            } catch (err) {
                console.error('Error fetching team member:', err);
                setError('Failed to load profile information');
            } finally {
                setLoading(false);
            }
        };

        fetchTeamMember();
    }, [params.id]);

    if (loading) {
        return (
            <div className="container max-w-2xl mx-auto py-12 px-4">
                <Card>
                    <CardHeader className="text-center pb-6">
                        <CardTitle>
                            <Skeleton className="h-8 w-[200px] mx-auto mb-2" />
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center space-y-6">
                        <Skeleton className="h-36 w-36 rounded-full" />
                        <div className="space-y-2 w-full max-w-sm">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error || !teamMember) {
        return (
            <div className="container max-w-2xl mx-auto py-12 px-4">
                <Card>
                    <CardHeader className="text-center pb-6">
                        <CardTitle className="text-red-600">Profile Not Found</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center">
                        <p className="text-gray-500">
                            {error || "This profile doesn't exist or has been removed."}
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const initials = teamMember.name
        ? teamMember.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : 'TM';

    return (
        <div className="container max-w-2xl mx-auto py-12 px-4">
            <Card>
                <CardHeader className="text-center pb-6">
                    <CardTitle className="text-2xl font-bold">Team Member Profile</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-6">
                    <Avatar className="h-36 w-36 border-2 border-primary">
                        {teamMember.profilePicture ? (
                            <AvatarImage src={teamMember.profilePicture} alt={teamMember.name} />
                        ) : (
                            <AvatarFallback className="text-4xl">{initials}</AvatarFallback>
                        )}
                    </Avatar>

                    <div className="text-center">
                        <h2 className="text-2xl font-bold">{teamMember.name}</h2>
                        <p className="text-lg text-gray-500">{teamMember.position?.name || 'Team Member'}</p>
                    </div>

                    <div className="w-full max-w-md space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <h3 className="font-medium text-gray-700 mb-2">Contact Information</h3>
                            <p className="text-gray-600"><span className="font-medium">Email:</span> {teamMember.email}</p>
                        </div>

                        {teamMember.createdAt && (
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <h3 className="font-medium text-gray-700 mb-2">Team Information</h3>
                                <p className="text-gray-600">
                                    <span className="font-medium">Joined:</span> {formatDistanceToNow(new Date(teamMember.createdAt), { addSuffix: true })}
                                </p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
} 