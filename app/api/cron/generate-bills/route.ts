import { NextResponse } from "next/server";
import { generateMonthlyBills } from "@/lib/actions/bill-actions";

/**
 * Cron job to generate monthly bills for all active vendors
 * 
 * Schedule: 0 0 1 * * (at midnight on the 1st day of every month)
 * 
 * Authentication:
 * - Vercel cron: Automatically includes 'x-vercel-cron: 1' header
 * - Manual/External: Requires 'Authorization: Bearer {CRON_SECRET}' header
 * 
 * To test manually:
 * curl -X GET https://your-domain.com/api/cron/generate-bills \
 *   -H "Authorization: Bearer YOUR_CRON_SECRET"
 */
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
    try {
        // Check if this is a legitimate request
        const cronSecret = request.headers.get('authorization');
        // const vercelCronHeader = request.headers.get('x-vercel-cron');

        // Vercel automatically adds 'x-vercel-cron: 1' header for cron jobs
        // For manual/external calls, we still support the authorization header
        // const isVercelCron = vercelCronHeader === '1';
        const isAuthorizedExternal = cronSecret === `Bearer ${process.env.CRON_SECRET}`;

        console.log(`[Cron] Auth check - Vercel cron: ${isAuthorizedExternal}, External auth: ${isAuthorizedExternal}`);

        if (!isAuthorizedExternal) {
            console.log('[Cron] Unauthorized access attempt');
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

        // Generate bills (skip permission check for cron/system calls)
        const result = await generateMonthlyBills(true);

        // Log the outcome for monitoring
        const authSource = isAuthorizedExternal ? 'Vercel Cron' : 'External API';
        console.log(`[Cron] Bills generation completed via ${authSource}: Created ${result.created}, Skipped ${result.skipped}`);

        return NextResponse.json({
            success: true,
            message: `Automated bills generation completed. Created: ${result.created}, Skipped: ${result.skipped}`,
            authSource,
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