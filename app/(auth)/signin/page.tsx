import { Metadata } from "next";
import SignInForm from "@/components/auth/SignInForm";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = {
    title: "Sign In | Admin Dashboard",
    description: "Sign in to access the admin dashboard",
};

export default async function SignInPage() {
    // Check if user is already authenticated
    const user = await getCurrentUser();

    // If user is already authenticated, redirect to dashboard
    if (user) {
        redirect("/dashboard");
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <SignInForm />
        </div>
    );
} 