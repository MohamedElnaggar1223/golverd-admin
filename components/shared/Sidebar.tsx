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

export function AdminSidebar() {
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
                            <SidebarMenuItem>
                                <Link prefetch={true} href="/">
                                    <SidebarMenuButton tooltip='Dashboard' className='text-white hover:bg-transparent hover:text-white hover:cursor-pointer space-x-2 py-8 pl-6 rounded-none'>
                                        <Image src="/images/dashboard.svg" alt="Dashboard" width={24} height={24} />
                                        <span className='text-lg font-inter font-medium'>Dashboard</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <Link prefetch={true} href="/team">
                                    <SidebarMenuButton tooltip='Team' className='text-white hover:bg-transparent hover:text-white hover:cursor-pointer space-x-2 py-8 pl-6 rounded-none'>
                                        <Image src="/images/team.svg" alt="Team" width={24} height={24} />
                                        <span className='text-lg font-inter font-medium'>Team</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <Link prefetch={true} href="/users">
                                    <SidebarMenuButton tooltip='Users' className='text-white hover:bg-transparent hover:text-white hover:cursor-pointer space-x-2 py-8 pl-6 rounded-none'>
                                        <Image src="/images/users.svg" alt="Users" width={24} height={24} />
                                        <span className='text-lg font-inter font-medium'>Users</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <Link prefetch={true} href="/vendors">
                                    <SidebarMenuButton tooltip='Vendors' className='text-white hover:bg-transparent hover:text-white hover:cursor-pointer space-x-2 py-8 pl-6 rounded-none'>
                                        <Image src="/images/vendors.svg" alt="Vendors" width={24} height={24} />
                                        <span className='text-lg font-inter font-medium'>Vendors</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <Link prefetch={true} href="/orders">
                                    <SidebarMenuButton tooltip='Orders & Appointments' className='text-white hover:bg-transparent hover:text-white hover:cursor-pointer space-x-2 py-8 pl-6 rounded-none'>
                                        <Image src="/images/orders.svg" alt="Orders & Appointments" width={24} height={24} />
                                        <span className='text-lg font-inter font-medium'>O & A</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                            <SidebarMenuItem>
                                <Link prefetch={true} href="/finance">
                                    <SidebarMenuButton tooltip='Finance' className='text-white hover:bg-transparent hover:text-white hover:cursor-pointer space-x-2 py-8 pl-6 rounded-none'>
                                        <Image src="/images/finance.svg" alt="Finance" width={24} height={24} />
                                        <span className='text-lg font-inter font-medium'>Finance</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
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
