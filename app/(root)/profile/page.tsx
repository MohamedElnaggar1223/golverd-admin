import { getCurrentUser } from "@/lib/auth";
import { ProfileEdit } from "./components/profile-edit";

export default async function ProfilePage() {
    const user = await getCurrentUser();

    if (!user) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center p-6 max-w-md">
                    <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
                    <p className="mb-4">Please log in to view your profile</p>
                </div>
            </div>
        );
    }

    return <ProfileEdit id={user.id} />;
} 