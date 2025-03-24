import { TeamMemberEdit } from '@/app/(root)/team/components/team-member-edit';
import { Suspense } from 'react';
import { Loader } from 'lucide-react';

export default async function EditTeamMemberPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return (
        <div className="w-full px-6 py-6">
            <h1 className="text-2xl font-bold mb-6">Edit Team Member</h1>
            <TeamMemberEdit id={id} />
        </div>
    );
} 