'use client'

import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "@/components/ui/sidebar"
import Image from "next/image"
import SignOutButton from "../auth/SignOutButton"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { ChevronDown, ChevronUp } from "lucide-react"
import { RequireRouteAccess } from "@/components/guards/PermissionGuard"

export function AdminSidebar() {
    const pathname = usePathname();
    const [vendorsOpen, setVendorsOpen] = useState(false);

    // Auto-open vendors submenu when on vendors pages
    useEffect(() => {
        if (pathname?.startsWith('/vendors')) {
            setVendorsOpen(true);
        }
    }, [pathname]);

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader className='pt-6'>
                <Image
                    src="/images/golverd-icon.svg"
                    alt="Logo"
                    width={66}
                    height={42}
                    className='mx-auto'
                />
            </SidebarHeader>
            <SidebarContent className='px-0'>
                <SidebarGroup className='px-0'>
                    <SidebarGroupContent className='pt-12 px-0'>
                        <SidebarMenu className='space-y-1.5'>
                            <SidebarMenuItem>
                                <Link prefetch={true} href="/profile">
                                    <SidebarMenuButton tooltip='Profile' className='text-white hover:bg-transparent hover:text-white hover:cursor-pointer space-x-2 py-8 pl-6 rounded-none'>
                                        <Image src="/images/profile.svg" alt="Profile" width={24} height={24} />
                                        <span className='text-lg font-inter font-medium'>Profile</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                            <RequireRouteAccess route="/">
                                <SidebarMenuItem>
                                    <Link prefetch={true} href="/">
                                        <SidebarMenuButton tooltip='Dashboard' className='text-white hover:bg-transparent hover:text-white hover:cursor-pointer space-x-2 py-8 pl-6 rounded-none'>
                                            <Image src="/images/dashboard.svg" alt="Dashboard" width={24} height={24} />
                                            <span className='text-lg font-inter font-medium'>Dashboard</span>
                                        </SidebarMenuButton>
                                    </Link>
                                </SidebarMenuItem>
                            </RequireRouteAccess>
                            <RequireRouteAccess route="/team">
                                <SidebarMenuItem>
                                    <Link prefetch={true} href="/team">
                                        <SidebarMenuButton tooltip='Team' className='text-white hover:bg-transparent hover:text-white hover:cursor-pointer space-x-2 py-8 pl-6 rounded-none'>
                                            <Image src="/images/team.svg" alt="Team" width={24} height={24} />
                                            <span className='text-lg font-inter font-medium'>Team</span>
                                        </SidebarMenuButton>
                                    </Link>
                                </SidebarMenuItem>
                            </RequireRouteAccess>
                            <RequireRouteAccess route="/users">
                                <SidebarMenuItem>
                                    <Link prefetch={true} href="/users">
                                        <SidebarMenuButton tooltip='Users' className='text-white hover:bg-transparent hover:text-white hover:cursor-pointer space-x-2 py-8 pl-6 rounded-none'>
                                            <Image src="/images/users.svg" alt="Users" width={24} height={24} />
                                            <span className='text-lg font-inter font-medium'>Users</span>
                                        </SidebarMenuButton>
                                    </Link>
                                </SidebarMenuItem>
                            </RequireRouteAccess>
                            <RequireRouteAccess route="/vendors">
                                <SidebarMenuItem>
                                    <div>
                                        <button
                                            onClick={() => setVendorsOpen(!vendorsOpen)}
                                            className='flex items-center text-white hover:bg-transparent hover:text-white hover:cursor-pointer space-x-2 py-8 pl-6 rounded-none w-full'
                                        >
                                            <Image src="/images/vendors.svg" alt="Vendors" width={24} height={24} />
                                            <span className='text-lg font-inter font-medium'>Vendors</span>
                                            {vendorsOpen ? (
                                                <ChevronUp className="ml-auto h-4 w-4 shrink-0 text-white opacity-50 mr-4" />
                                            ) : (
                                                <ChevronDown className="ml-auto h-4 w-4 shrink-0 text-white opacity-50 mr-4" />
                                            )}
                                        </button>
                                        {vendorsOpen && (
                                            <div className="bg-[#44312D]">
                                                <SidebarMenuItem>
                                                    <Link prefetch={true} href="/vendors/requests">
                                                        <SidebarMenuButton tooltip='Requests' className='text-white hover:bg-transparent hover:text-white hover:cursor-pointer space-x-2 py-5 pl-14 rounded-none'>
                                                            <span className='text-base font-inter font-medium'>Requests</span>
                                                        </SidebarMenuButton>
                                                    </Link>
                                                </SidebarMenuItem>
                                                <SidebarMenuItem>
                                                    <Link prefetch={true} href="/vendors/accounts">
                                                        <SidebarMenuButton tooltip='Accounts' className='text-white hover:bg-transparent hover:text-white hover:cursor-pointer space-x-2 py-5 pl-14 rounded-none'>
                                                            <span className='text-base font-inter font-medium'>Accounts</span>
                                                        </SidebarMenuButton>
                                                    </Link>
                                                </SidebarMenuItem>
                                            </div>
                                        )}
                                    </div>
                                </SidebarMenuItem>
                            </RequireRouteAccess>
                            <RequireRouteAccess route="/orders-and-appointments">
                                <SidebarMenuItem>
                                    <Link prefetch={true} href="/orders-and-appointments">
                                        <SidebarMenuButton tooltip='Orders & Appointments' className='text-white hover:bg-transparent hover:text-white hover:cursor-pointer space-x-2 py-8 pl-6 rounded-none'>
                                            <Image src="/images/orders.svg" alt="Orders & Appointments" width={24} height={24} />
                                            <span className='text-lg font-inter font-medium'>O & A</span>
                                        </SidebarMenuButton>
                                    </Link>
                                </SidebarMenuItem>
                            </RequireRouteAccess>
                            <RequireRouteAccess route="/finance">
                                <SidebarMenuItem>
                                    <Link prefetch={true} href="/finance">
                                        <SidebarMenuButton tooltip='Finance' className='text-white hover:bg-transparent hover:text-white hover:cursor-pointer space-x-2 py-8 pl-6 rounded-none'>
                                            <Image src="/images/finance.svg" alt="Finance" width={24} height={24} />
                                            <span className='text-lg font-inter font-medium'>Finance</span>
                                        </SidebarMenuButton>
                                    </Link>
                                </SidebarMenuItem>
                            </RequireRouteAccess>
                        </SidebarMenu>
                    </SidebarGroupContent>
                </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
                <SignOutButton />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    )
}
