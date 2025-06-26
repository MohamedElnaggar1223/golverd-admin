import { connectDB } from "@/lib/mongoose";
import SuperUser from "@/models/SuperUser";
import Position from "@/models/Position";
import { compare } from "bcrypt";
import { randomUUID } from "crypto";
import { NextAuthOptions, User, getServerSession } from "next-auth";
import { AdapterUser } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import { Session } from "next-auth";
import { UserPermissions, createDefaultPermissions, createBusinessOwnerPermissions } from "@/lib/permissions";

// Extend the built-in types
declare module "next-auth" {
    interface User {
        id: string;
        role: string;
        isActive: boolean;
        isBusinessOwner: boolean;
        permissions: UserPermissions;
        positionId?: string;
        accountsManaged?: string[];
    }

    interface Session {
        user: {
            id: string;
            name: string;
            email: string;
            role: string;
            isActive: boolean;
            isBusinessOwner: boolean;
            permissions: UserPermissions;
            positionId?: string;
            accountsManaged?: string[];
        }
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: string;
        isActive: boolean;
        isBusinessOwner: boolean;
        permissions: UserPermissions;
        positionId?: string;
        accountsManaged?: string[];
    }
}

export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: "credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }

                await connectDB();

                const user = await SuperUser.findOne({ email: credentials.email }).populate('position');

                if (!user || !user.isActive) {
                    return null;
                }

                const passwordValid = await compare(credentials.password, user.password);

                if (!passwordValid) {
                    return null;
                }

                // Update last login timestamp
                user.lastLogin = new Date();
                await user.save();

                // Get user permissions
                let permissions: UserPermissions;

                if (user.isBusinessOwner) {
                    // Business owners get all permissions
                    permissions = createBusinessOwnerPermissions();
                } else if (user.positionId) {
                    // Get permissions from position
                    const position = await Position.findById(user.positionId);
                    if (position) {
                        permissions = position.permissions as UserPermissions;
                    } else {
                        // Fallback to default permissions if position not found
                        permissions = createDefaultPermissions();
                    }
                } else {
                    // No position assigned, use default permissions
                    permissions = createDefaultPermissions();
                }

                console.log("User: ", user);
                console.log("Permissions: ", permissions);

                return {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    isActive: user.isActive,
                    isBusinessOwner: user.isBusinessOwner,
                    permissions,
                    positionId: user.positionId,
                    accountsManaged: user.accountsManaged || []
                };
            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.name = user.name;
                token.role = user.role;
                token.isActive = user.isActive;
                token.isBusinessOwner = user.isBusinessOwner;
                token.permissions = user.permissions;
                token.positionId = user.positionId;
                token.accountsManaged = user.accountsManaged;
            }
            return token;
        },
        async session({ session, token }) {
            if (token && session.user) {
                session.user.id = token.id;
                session.user.email = token.email as string;
                session.user.name = token.name as string;
                session.user.role = token.role;
                session.user.isActive = token.isActive;
                session.user.isBusinessOwner = token.isBusinessOwner;
                session.user.permissions = token.permissions;
                session.user.positionId = token.positionId;
                session.user.accountsManaged = token.accountsManaged;
            }
            return session;
        }
    },
    pages: {
        signIn: "/signin",
    },
    session: {
        strategy: "jwt",
        maxAge: 24 * 60 * 60, // 24 hours
    },
    secret: process.env.NEXTAUTH_SECRET,
};

export async function createInitialSuperUser() {
    if (process.env.NODE_ENV !== "development") {
        return;
    }

    await connectDB();

    const existingSuperUser = await SuperUser.findOne({ role: "super" });

    if (!existingSuperUser) {
        console.log("Creating initial super user...");
        const newSuperUser = new SuperUser({
            _id: randomUUID(),
            email: process.env.INITIAL_SUPER_EMAIL || "admin@example.com",
            password: process.env.INITIAL_SUPER_PASSWORD || "adminPassword123",
            name: "Super Admin",
            role: "super",
            isActive: true,
        });

        await newSuperUser.save();
        console.log("Initial super user created successfully");
    }
}

export async function getCurrentUser() {
    try {
        const session = await getSession(); // Use our wrapped getSession instead

        if (!session?.user?.email) {
            return null;
        }

        await connectDB();

        const currentUser = await SuperUser.findOne({ email: session.user.email }).populate('position');

        if (!currentUser || !currentUser.isActive) {
            return null;
        }

        // Get user permissions
        let permissions: UserPermissions;

        if (currentUser.isBusinessOwner) {
            // Business owners get all permissions
            permissions = createBusinessOwnerPermissions();
        } else if (currentUser.positionId) {
            // Get permissions from position
            const position = await Position.findById(currentUser.positionId);
            if (position) {
                permissions = position.permissions as UserPermissions;
            } else {
                // Fallback to default permissions if position not found
                permissions = createDefaultPermissions();
            }
        } else {
            // No position assigned, use default permissions
            permissions = createDefaultPermissions();
        }

        return {
            id: currentUser._id,
            email: currentUser.email,
            name: currentUser.name,
            role: currentUser.role,
            permissions,
            positionId: currentUser.positionId,
            isBusinessOwner: currentUser.isBusinessOwner,
            isActive: currentUser.isActive,
            accountsManaged: currentUser.accountsManaged || [],
        };
    } catch (error: any) {
        // During static rendering, return null instead of throwing
        if (error?.digest === 'DYNAMIC_SERVER_USAGE' ||
            error?.message?.includes('headers') ||
            error?.message?.includes('Dynamic server usage')) {
            return null;
        }
        console.error("Error getting current user:", error);
        return null;
    }
}

// Simple server action to get session data without additional DB queries
export async function getSession() {
    try {
        return await getServerSession(authOptions);
    } catch (error: any) {
        // During static rendering, getServerSession tries to access headers which fails
        // Return null during build/static generation
        if (error?.digest === 'DYNAMIC_SERVER_USAGE' ||
            error?.message?.includes('headers') ||
            error?.message?.includes('Dynamic server usage')) {
            return null;
        }
        throw error;
    }
} 