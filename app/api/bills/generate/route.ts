import { NextResponse } from "next/server";
import { generateMonthlyBills } from "@/lib/actions/bill-actions";
import { getSession } from "@/lib/auth";

export async function POST() {
    try {
        // Check authentication
        const session = await getSession();
        if (!session?.user) {
            return NextResponse.json(
                { error: "Unauthorized access" },
                { status: 401 }
            );
        }

        // Only allow admins to generate bills
        if (session.user.role !== "admin" && session.user.role !== "super") {
            return NextResponse.json(
                { error: "Insufficient permissions" },
                { status: 403 }
            );
        }

        // Generate bills
        const result = await generateMonthlyBills();

        return NextResponse.json({
            success: true,
            message: `Bills generation completed successfully. Created: ${result.created}, Skipped: ${result.skipped}`,
            ...result
        });
    } catch (error: any) {
        console.error("Error generating bills:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate bills" },
            { status: 500 }
        );
    }
} 