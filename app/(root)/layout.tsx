import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "../globals.css";
import Providers from "@/providers/query-provider";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/shared/Sidebar";
import Header from "@/components/shared/Header";
import AuthProvider from "@/providers/session-provider";
import { Toaster } from "@/components/ui/sonner"
import NotificationProvider from '@/providers/notification-provider';
import { PermissionProvider } from "@/contexts/PermissionContext";

const inter = Inter({
	variable: "--font-geist-sans",
	subsets: ["latin"],
	weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
	title: "Golverd Admin",
	description: "Admin Dashboard for Golverd",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${inter.variable} antialiased`}
			>
				<AuthProvider>
					<PermissionProvider>
						<NotificationProvider>
							<Providers>
								<SidebarProvider>
									<AdminSidebar />
									<main className='w-full bg-[#E8E4E1]'>
										<Header />
										{children}
									</main>
								</SidebarProvider>
							</Providers>
						</NotificationProvider>
					</PermissionProvider>
				</AuthProvider>
				<Toaster />
			</body>
		</html>
	);
}
