'use server';

import { connectDB } from '@/lib/mongoose';
import Position from '@/models/Position';
import SuperUser from '@/models/SuperUser';
import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { uploadToCloudinary } from '@/lib/utils/upload';

// Position management
export async function getPositions() {
    try {
        await connectDB();

        // Authentication check
        const session = await getSession();
        if (!session?.user) {
            throw new Error('Not authenticated');
        }

        const positions = await Position.find().sort({ name: 1 }).lean();
        return positions;
    } catch (error) {
        console.error('Error fetching positions:', error);
        return [];
    }
}

export async function getPositionById(id: string) {
    try {
        await connectDB();

        // Authentication check
        const session = await getSession();
        if (!session?.user) {
            throw new Error('Not authenticated');
        }

        return await Position.findById(id).lean();
    } catch (error) {
        console.error('Error fetching position:', error);
        throw error;
    }
}

export async function createPosition(data: {
    name: string;
    permissions: Record<string, boolean>;
}) {
    try {
        await connectDB();

        // Authentication check
        const session = await getSession();
        if (!session?.user) {
            throw new Error('Not authenticated');
        }

        // Check if user is business owner
        const currentUser = await SuperUser.findById(session.user.id);
        if (!currentUser?.isBusinessOwner) {
            throw new Error('Unauthorized');
        }

        const position = new Position({
            _id: randomUUID(),
            name: data.name,
            permissions: data.permissions
        });

        await position.save();

        // Return a plain object, not the Mongoose document
        return {
            _id: position._id.toString(),
            name: position.name,
            permissions: position.permissions
        };
    } catch (error) {
        console.error('Error creating position:', error);
        throw error;
    }
}

export async function updatePosition(
    id: string,
    data: {
        name: string;
        permissions: Record<string, boolean>;
    }
) {
    try {
        await connectDB();

        // Authentication check
        const session = await getSession();
        if (!session?.user) {
            throw new Error('Not authenticated');
        }

        // Check if user is business owner
        const currentUser = await SuperUser.findById(session.user.id);
        if (!currentUser?.isBusinessOwner) {
            throw new Error('Unauthorized');
        }

        const position = await Position.findByIdAndUpdate(
            id,
            { name: data.name, permissions: data.permissions },
            { new: true }
        ).lean();

        if (!position) {
            throw new Error('Position not found');
        }

        return position;
    } catch (error) {
        console.error('Error updating position:', error);
        throw error;
    }
}

export async function deletePosition(id: string) {
    try {
        await connectDB();

        // Authentication check
        const session = await getSession();
        if (!session?.user) {
            throw new Error('Not authenticated');
        }

        // Check if user is business owner
        const currentUser = await SuperUser.findById(session.user.id);
        if (!currentUser?.isBusinessOwner) {
            throw new Error('Unauthorized');
        }

        // Check if any team members use this position
        const teamMembersWithPosition = await SuperUser.find({ positionId: id });

        console.log("TEAM MEMBERS WITH POSITION: ", teamMembersWithPosition)

        if (teamMembersWithPosition.length > 0) {
            throw new Error('Cannot delete position that is assigned to team members');
        }

        const position = await Position.findByIdAndDelete(id);

        if (!position) {
            throw new Error('Position not found');
        }

        return { success: true };
    } catch (error) {
        console.error('Error deleting position:', error);
        throw error;
    }
}

// Team Member management
export async function getTeamMembers() {
    try {
        await connectDB();

        // Authentication check
        const session = await getSession();
        if (!session?.user) {
            throw new Error('Not authenticated');
        }

        const teamMembers = await SuperUser.find({ isActive: true })
            .populate('position')
            .sort({ name: 1 })
            .select('-password')
            .lean();

        return teamMembers;
    } catch (error) {
        console.error('Error fetching team members:', error);
        return [];
    }
}

export async function getTeamMembersByPosition(positionId: string) {
    try {
        await connectDB();

        // Authentication check
        const session = await getSession();
        if (!session?.user) {
            throw new Error('Not authenticated');
        }

        return await SuperUser.find({ positionId, isActive: true })
            .populate('position')
            .sort({ name: 1 })
            .select('-password')
            .lean();
    } catch (error) {
        console.error('Error fetching team members by position:', error);
        return [];
    }
}

export async function searchTeamMembers(query: string) {
    try {
        await connectDB();

        // Authentication check
        const session = await getSession();
        if (!session?.user) {
            throw new Error('Not authenticated');
        }

        const regex = new RegExp(query, 'i');

        const teamMembers = await SuperUser.find({
            isActive: true,
            $or: [
                { name: { $regex: regex } },
                { email: { $regex: regex } }
            ]
        })
            .populate('position')
            .sort({ name: 1 })
            .select('-password')
            .lean();

        return teamMembers;
    } catch (error) {
        console.error('Error searching team members:', error);
        return [];
    }
}

export async function getTeamMemberById(id: string) {
    try {
        await connectDB();

        console.log("GETTING TEAM MEMBER BY ID: ", id)

        // Authentication check
        const session = await getSession();
        if (!session?.user) {
            throw new Error('Not authenticated');
        }

        return await SuperUser.findById(id)
            .populate('position')
            .select('-password')
            .lean();
    } catch (error) {
        console.error('Error fetching team member:', error);
        throw error;
    }
}

export async function createTeamMember(data: {
    name: string;
    email: string;
    password: string;
    positionId: string;
    profilePicture?: any;
    accountsManaged?: string[];
}) {
    try {
        await connectDB();

        // Authentication check
        const session = await getSession();
        if (!session?.user) {
            throw new Error('Not authenticated');
        }

        // Check if user has permission to edit team members
        const currentUser = await SuperUser.findById(session.user.id).populate('position');
        if (!currentUser?.isBusinessOwner &&
            !(currentUser?.position?.permissions?.editTeamMembers ||
                currentUser?.position?.permissions?.editAll)) {
            throw new Error('Unauthorized');
        }

        const existingUser = await SuperUser.findOne({ email: data.email });
        if (existingUser) {
            throw new Error('Email already exists');
        }

        let imageUrl = '';
        if (data.profilePicture) {
            if (typeof data.profilePicture !== 'string') {
                imageUrl = await uploadToCloudinary(data.profilePicture);
            } else {
                imageUrl = data.profilePicture;
            }
        }

        const teamMember = new SuperUser({
            _id: randomUUID(),
            name: data.name,
            email: data.email,
            password: data.password,
            positionId: data.positionId,
            profilePicture: imageUrl || '',
            accountsManaged: data.accountsManaged || [],
            role: 'super',
            isActive: true,
            isBusinessOwner: false
        });

        await teamMember.save();

        // Convert to plain object before returning
        const plainTeamMember = {
            _id: teamMember._id.toString(),
            name: teamMember.name,
            email: teamMember.email,
            positionId: teamMember.positionId,
            profilePicture: teamMember.profilePicture,
            accountsManaged: teamMember.accountsManaged,
            role: teamMember.role,
            isActive: teamMember.isActive,
            isBusinessOwner: teamMember.isBusinessOwner,
        };

        return plainTeamMember;
    } catch (error) {
        console.error('Error creating team member:', error);
        throw error;
    }
}

export async function updateTeamMember(
    id: string,
    data: {
        name?: string;
        email?: string;
        password?: string;
        positionId?: string;
        profilePicture?: any;
        accountsManaged?: string[];
    }
) {
    try {
        await connectDB();

        // Authentication check
        const session = await getSession();
        if (!session?.user) {
            throw new Error('Not authenticated');
        }

        // Check if team member exists
        const teamMember = await SuperUser.findById(id);
        if (!teamMember) {
            throw new Error('Team member not found');
        }

        // Check if user has permission to edit team members
        const currentUser = await SuperUser.findById(session.user.id).populate('position');

        // Business owner cannot be edited by other team members
        if (teamMember.isBusinessOwner && !currentUser?.isBusinessOwner) {
            throw new Error('Cannot edit business owner');
        }

        if (!currentUser?.isBusinessOwner &&
            !(currentUser?.position?.permissions?.editTeamMembers ||
                currentUser?.position?.permissions?.editAll) && session.user.id !== id) {
            throw new Error('Unauthorized');
        }

        // Check if email exists (if being updated)
        if (data.email && data.email !== teamMember.email) {
            const existingUser = await SuperUser.findOne({ email: data.email });
            if (existingUser) {
                throw new Error('Email already exists');
            }
        }

        // Process profile picture
        if (data.profilePicture && typeof data.profilePicture !== 'string') {
            data.profilePicture = await uploadToCloudinary(data.profilePicture);
        }

        // Update fields safely
        if (data.name !== undefined) teamMember.name = data.name;
        if (data.email !== undefined) teamMember.email = data.email;
        if (data.password !== undefined) teamMember.password = data.password;
        if (data.profilePicture !== undefined && typeof data.profilePicture === 'string') {
            teamMember.profilePicture = data.profilePicture;
        }
        if (data.positionId !== undefined) teamMember.positionId = data.positionId;
        if (data.accountsManaged !== undefined) teamMember.accountsManaged = data.accountsManaged;

        await teamMember.save();

        // Convert to plain object
        const updatedMember = await SuperUser.findById(id)
            .populate('position')
            .select('-password')
            .lean();

        return updatedMember;
    } catch (error) {
        console.error('Error updating team member:', error);
        throw error;
    }
}

export async function deleteTeamMember(id: string) {
    try {
        await connectDB();

        // Authentication check
        const session = await getSession();
        if (!session?.user) {
            throw new Error('Not authenticated');
        }

        // Check if team member exists
        const teamMember = await SuperUser.findById(id);
        if (!teamMember) {
            throw new Error('Team member not found');
        }

        // Cannot delete business owner
        if (teamMember.isBusinessOwner) {
            throw new Error('Cannot delete business owner');
        }

        // Check if user has permission to edit team members
        const currentUser = await SuperUser.findById(session.user.id).populate('position');
        if (!currentUser?.isBusinessOwner &&
            !(currentUser?.position?.permissions?.editTeamMembers ||
                currentUser?.position?.permissions?.editAll)) {
            throw new Error('Unauthorized');
        }

        // Soft delete by setting isActive to false
        // teamMember.isActive = false;
        // await teamMember.save();

        await SuperUser.findByIdAndDelete(id);

        return { success: true };
    } catch (error) {
        console.error('Error deleting team member:', error);
        throw error;
    }
} 