import { Suspense } from "react";
import Team from "./components/team";

export default function TeamPage() {
    return (
        <Suspense>
            <Team />
        </Suspense>
    )
}
