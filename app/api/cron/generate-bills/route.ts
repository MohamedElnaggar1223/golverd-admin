import { NextResponse } from "next/server";
import { generateMonthlyBills } from "@/lib/actions/bill-actions";

// Vercel cron syntax: 0 0 1 * * (at midnight on the 1st day of every month)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
    try {
        // Check for authorization header with API key for security
        // This allows external cron services to securely trigger this endpoint
        const authHeader = request.headers.get('authorization');
        const apiKey = process.env.CRON_SECRET;

        // Verify the API key
        if (!apiKey || authHeader !== `Bearer ${apiKey}`) {
            return NextResponse.json(
                { error: "Unauthorized access" },
                { status: 401 }
            );
        }

        // Add a timestamp check to ensure this only runs once on the first day of the month
        const now = new Date();
        const dayOfMonth = now.getDate();

        // Only run on the 1st day of the month (to prevent multiple runs if cron is misconfigured)
        if (dayOfMonth !== 1) {
            return NextResponse.json({
                success: true,
                message: "Skipped: Not the first day of the month",
                skipped: true
            });
        }

        // Generate bills
        const result = await generateMonthlyBills();

        // Log the outcome for monitoring
        console.log(`[Cron] Bills generation completed: Created ${result.created}, Skipped ${result.skipped}`);

        return NextResponse.json({
            success: true,
            message: `Automated bills generation completed. Created: ${result.created}, Skipped: ${result.skipped}`,
            ...result
        });
    } catch (error: any) {
        console.error("[Cron] Error generating bills:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate bills" },
            { status: 500 }
        );
    }
} 