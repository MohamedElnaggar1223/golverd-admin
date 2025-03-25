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
            <h1 className="text-lg font-bold mb-6">Team Members</h1>
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-[560px] bg-white rounded-sm border-none">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Search team members..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 w-full rounded-sm"
                    />
                </div>
                <Select value={positionFilter} onValueChange={setPositionFilter}>
                    <SelectTrigger className="w-full sm:w-[200px] rounded-sm bg-white">
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
                    <Card key={member._id} className="overflow-hidden rounded-[4px] w-fit min-w-[370px] py-4">
                        <CardHeader className="pb-0 border-b border-gray-200 shadow-[0px_1px_0px_0px_rgba(0,0,0,0.1)]">
                            <div className='w-full flex items-center justify-end space-x-1'>
                                <p className="text-sm font-medium">Joined</p>
                                <p className="text-sm text-gray-500">
                                    {member.createdAt
                                        ? formatDistanceToNow(new Date(member.createdAt), { addSuffix: true })
                                        : 'Unknown'}
                                </p>
                            </div>
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-16 w-16">
                                        <AvatarImage src={member.profilePicture || ''} alt={member.name} />
                                        <AvatarFallback className='bg-[#E8E4E1]'>
                                            {member.name.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <h3 className="font-medium">{member.name}</h3>
                                        <p className="text-sm text-gray-500">{member.position?.name || 'No Position'}</p>
                                    </div>
                                </div>
                                {member.isBusinessOwner && (
                                    <Badge variant="secondary">Business Owner</Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="">
                            <div className="flex justify-between">
                                <div>
                                    <p className="text-sm font-medium">Email</p>
                                    <p className="text-sm text-black">{member.email}</p>
                                </div>
                                <Button asChild variant="ghost" size="sm" className="rounded-[4px] px-4 py-5 bg-[#2A1C1B] hover:bg-[#2A1C1B] hover:text-white text-white">
                                    <Link href={`/team/edit/${member._id}`}>
                                        View & Edit
                                    </Link>
                                </Button>
                            </div>
                        </CardContent>
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