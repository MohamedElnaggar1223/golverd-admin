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
            <h1 className="text-2xl font-bold mb-6">Team Management</h1>

            <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8">
                    <TabsTrigger value="members">Team Members</TabsTrigger>
                    <TabsTrigger value="positions">Positions</TabsTrigger>
                    <TabsTrigger value="new">Add Team Member</TabsTrigger>
                </TabsList>
                <TabsContent value="members" className="mt-0">
                    <TeamMembersTab />
                </TabsContent>
                <TabsContent value="positions" className="mt-0">
                    <PositionsTab />
                </TabsContent>
                <TabsContent value="new" className="mt-0">
                    <NewTeamMemberTab />
                </TabsContent>
            </Tabs>
        </div>
    );
} 