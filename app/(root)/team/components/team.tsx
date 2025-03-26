'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Metadata } from "next";
import { TeamMembersTab } from "./team-members-tab";
import { PositionsTab } from "./positions-tab";
import { NewTeamMemberTab } from "./new-team-member-tab";
import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function TeamPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState("members");

    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab && ["members", "positions", "new"].includes(tab)) {
            setActiveTab(tab);
        }
    }, [searchParams]);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        router.push(`/team?tab=${value}`);
    };

    return (
        <div className="py-6 w-full px-6">
            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="w-fit mb-8 bg-transparent">
                    <TabsTrigger className='data-[state=active]:bg-[#44312D] data-[state=active]:text-white rounded-sm py-1.5 px-4 w-fit' value="members">Team Members</TabsTrigger>
                    <TabsTrigger className='data-[state=active]:bg-[#44312D] data-[state=active]:text-white rounded-sm py-1.5 px-4 w-fit' value="positions">Positions</TabsTrigger>
                    <TabsTrigger className='data-[state=active]:bg-[#44312D] data-[state=active]:text-white rounded-sm py-1.5 px-4 w-fit' value="new">Add Team Member</TabsTrigger>
                </TabsList>
                <TabsContent value="members" className="mt-0 w-full">
                    <TeamMembersTab />
                </TabsContent>
                <TabsContent value="positions" className="mt-0 w-full">
                    <PositionsTab />
                </TabsContent>
                <TabsContent value="new" className="mt-0 w-full">
                    <NewTeamMemberTab />
                </TabsContent>
            </Tabs>
        </div>
    );
} 