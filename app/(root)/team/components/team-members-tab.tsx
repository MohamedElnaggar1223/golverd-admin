'use client';

import { getPositions, getTeamMembers } from "@/lib/actions/team-actions";
import { useState, useEffect, useMemo } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";
import Link from "next/link";

export function TeamMembersTab() {
    const [searchQuery, setSearchQuery] = useState('');
    const [positionFilter, setPositionFilter] = useState('all');
    const [debouncedSearch, setDebouncedSearch] = useState('');

    const { data: allTeamMembers } = useSuspenseQuery({
        queryKey: ['team-members'],
        queryFn: getTeamMembers
    });

    const { data: positions } = useSuspenseQuery({
        queryKey: ['positions'],
        queryFn: getPositions
    });

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchQuery);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    const filteredTeamMembers = useMemo(() => {
        if (!allTeamMembers) return [];

        return allTeamMembers.filter(member => {
            // Apply search filter
            const matchesSearch = !debouncedSearch ||
                member.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                member.email.toLowerCase().includes(debouncedSearch.toLowerCase());

            // Apply position filter
            const matchesPosition = positionFilter === 'all' ||
                member.positionId === positionFilter;

            return matchesSearch && matchesPosition && !member.isBusinessOwner;
        });
    }, [allTeamMembers, debouncedSearch, positionFilter]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search team members..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 w-full"
                    />
                </div>
                <Select value={positionFilter} onValueChange={setPositionFilter}>
                    <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Filter by position" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Positions</SelectItem>
                        {positions?.map((position: any) => (
                            <SelectItem key={position._id} value={position._id}>
                                {position.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredTeamMembers.map((member: any) => (
                    <Card key={member._id} className="overflow-hidden">
                        <CardHeader className="pb-0">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-12 w-12">
                                        <AvatarImage src={member.profilePicture || ''} alt={member.name} />
                                        <AvatarFallback>
                                            {member.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="font-medium">{member.name}</h3>
                                        <p className="text-sm text-gray-500">{member.email}</p>
                                    </div>
                                </div>
                                {member.isBusinessOwner && (
                                    <Badge variant="secondary">Business Owner</Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4">
                            <div className="flex justify-between">
                                <div>
                                    <p className="text-sm font-medium">Position</p>
                                    <p className="text-sm text-gray-500">{member.position?.name || 'No Position'}</p>
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Joined</p>
                                    <p className="text-sm text-gray-500">
                                        {member.createdAt
                                            ? formatDistanceToNow(new Date(member.createdAt), { addSuffix: true })
                                            : 'Unknown'}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter className="border-t bg-gray-50 flex justify-end">
                            <Button asChild variant="ghost" size="sm">
                                <Link href={`/team/edit/${member._id}`}>
                                    View & Edit
                                </Link>
                            </Button>
                        </CardFooter>
                    </Card>
                ))}

                {filteredTeamMembers.length === 0 && (
                    <div className="col-span-full text-center py-8 text-gray-500">
                        No team members found. Try adjusting your search or filter.
                    </div>
                )}
            </div>
        </div>
    );
} 