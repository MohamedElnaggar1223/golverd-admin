import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "Finance | Golverd Admin",
    description: "Manage vendor bills and financial operations",
};

export default async function FinanceLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getSession();

    // Redirect to login if not authenticated
    if (!session?.user) {
        redirect("/sign-in");
    }

    return (
        <section className="container">
            {children}
        </section>
    );
}

