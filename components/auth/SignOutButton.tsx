"use client";

import { Loader2, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog-no-x";

export default function SignOutButton() {
    const router = useRouter();

    const [loading, setLoading] = useState(false)

    const handleSignOut = async () => {
        setLoading(true)

        await signOut({ redirect: false });

        router.push("/signin");
        router.refresh();

        setLoading(false)
    };

    return (
        <>
            <div onClick={handleSignOut} className='flex py-2 text-white cursor-pointer text-sm items-center justify-center gap-1'>
                <LogOut size={16} />
                <span>Log Out</span>
            </div>
            <Dialog open={loading}>
                <DialogContent className='flex items-center justify-center bg-transparent border-none shadow-none outline-none'>
                    <DialogTitle />
                    <Loader2 className='animate-spin' size={42} color="#000" />
                </DialogContent>
            </Dialog>
        </>
    );
} 