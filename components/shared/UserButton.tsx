'use client'

import { useUser } from "@/lib/hooks/useUser"
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar"

export default function UserButton() {
    const { user } = useUser()

    return (
        <div className='flex items-center gap-4 text-lg text-white'>
            <Avatar>
                <AvatarImage src={user?.email} />
                <AvatarFallback className='text-black font-semibold'>
                    {user?.name?.charAt(0).toUpperCase()}{user?.name?.charAt(1).toUpperCase()}
                </AvatarFallback>
            </Avatar>
            <span>{user?.name}</span>
        </div>
    )
}
