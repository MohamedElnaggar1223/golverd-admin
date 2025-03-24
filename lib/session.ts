'use server'

import { authOptions } from "@/lib/auth";
import { getServerSession } from "next-auth";

export const getSession = async () => {
    const session = await getServerSession(authOptions);
    return session;
}

export const getCurrentUser = async () => {
    const session = await getSession();

    if (!session?.user) {
        return null;
    }

    return session.user;
} 