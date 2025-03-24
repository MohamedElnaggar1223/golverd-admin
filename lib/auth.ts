import { connectDB } from "@/lib/mongoose";
import SuperUser from "@/models/SuperUser";
import { compare } from "bcrypt";
import { randomUUID } from "crypto";
import { NextAuthOptions, User, getServerSession } from "next-auth";
import { AdapterUser } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import { Session } from "next-auth";

// Extend the built-in types
declare module "next-auth" {
    interface User {
        id: string;
        role: string;
        isActive: boolean;
        isBusinessOwner: boolean;
    }

    interface Session {
        user: {
            id: string;
            name: string;
            email: string;
            role: string;
            isActive: boolean;
            isBusinessOwner: boolean;
        }
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string;
        role: string;
        isActive: boolean;
        isBusinessOwner: boolean;
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

                const user = await SuperUser.findByEmail(credentials.email);

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

                console.log("User: ", user);

                return {
                    id: user._id,
                    email: user.email,
                    name: user.name,
                    role: user.role,
                    isActive: user.isActive,
                    isBusinessOwner: user.isBusinessOwner
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
        const session = await getServerSession(authOptions);

        if (!session?.user?.email) {
            return null;
        }

        await connectDB();

        const currentUser = await SuperUser.findByEmail(session.user.email);

        if (!currentUser || !currentUser.isActive) {
            return null;
        }

        return {
            id: currentUser._id,
            email: currentUser.email,
            name: currentUser.name,
            role: currentUser.role,
        };
    } catch (error) {
        console.error("Error getting current user:", error);
        return null;
    }
}

// Simple server action to get session data without additional DB queries
export async function getSession() {
    return await getServerSession(authOptions);
} 