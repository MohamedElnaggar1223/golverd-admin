import { Bell } from "lucide-react";
import { SidebarTrigger } from "../ui/sidebar";
import { Avatar } from "../ui/avatar";
import { AvatarFallback } from "@radix-ui/react-avatar";
import UserButton from "./UserButton";

export default function Header() {
    return (
        <header className='bg-gradient-to-r from-[#2A1C1B] w-full to-[#90605D] flex items-center justify-between h-[5.5rem]'>
            <SidebarTrigger className='text-white' />
            <div className='flex items-center gap-8 pr-12'>
                {/* TODO: Add notifications */}
                <Bell size={24} fill='white' stroke='white' />
                <UserButton />
            </div>
        </header>
    )
}
