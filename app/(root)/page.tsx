import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function HomePage() {
	const user = await getCurrentUser();

	if (!user) {
		redirect("/signin");
	}

	console.log(user);

	return (
		<div>
			<h1>Home</h1>
		</div>
	)
}
