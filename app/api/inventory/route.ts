import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { query } from '@/lib/db';

const CUPS_PER_PACKET = 8;

export async function GET(request: NextRequest) {
    try {
        const session = await requireAuth();
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        // Filter by user (unless admin looking at specific user, or admin seeing all?)
        // Usually inventory is per-business (per user context).
        // If admin, maybe show aggregate? For now, let's assume session user context.

        const params: any[] = [];
        let userFilter = '';
        if (session.role !== 'admin') {
            userFilter = 'WHERE user_id = ?';
            params.push(session.userId);
        } else if (userId) {
            userFilter = 'WHERE user_id = ?';
            params.push(parseInt(userId));
        } else {
            // Admin viewing general dashboard might want total across all users, 
            // but inventory is physical and likely per-location/owner.
            // Let's default to aggregating all if admin and no user specified, or just handling the current logic.
            // We'll use 'WHERE 1=1' base if no filter
            userFilter = 'WHERE 1=1';
        }

        // 1. Get Total Purchased Packets
        const purchaseQuery = `
            SELECT COALESCE(SUM(packets_purchased), 0) as totalPurchased
            FROM powder_purchases
            ${userFilter}
        `;
        const purchaseResult = await query<any>(purchaseQuery, params);
        const totalPurchasedPackets = purchaseResult[0].totalPurchased;
        const totalPurchasedCups = totalPurchasedPackets * CUPS_PER_PACKET;

        // 2. Get Total Used from Daily Entries
        const usageQuery = `
            SELECT 
                COALESCE(SUM(packets_used), 0) as totalPacketsUsed,
                COALESCE(SUM(cups_used), 0) as totalCupsUsed
            FROM daily_entries
            ${userFilter}
        `;
        const usageResult = await query<any>(usageQuery, params);
        const usedPacketsEntry = usageResult[0].totalPacketsUsed;
        const usedCupsEntry = usageResult[0].totalCupsUsed;

        const totalUsedCups = (usedPacketsEntry * CUPS_PER_PACKET) + usedCupsEntry;

        // 3. Get Powder Adjustments (in cups)
        const adjustmentQuery = `
            SELECT COALESCE(SUM(amount), 0) as totalAdjustments
            FROM adjustments
            WHERE type = 'powder'
            ${userFilter.replace('WHERE', 'AND')}
        `;
        const adjustmentResult = await query<any>(adjustmentQuery, params);
        const totalPowderAdjustments = adjustmentResult[0].totalAdjustments;

        // 4. Calculate Balance (purchased + adjustments - used)
        const balanceCups = totalPurchasedCups + totalPowderAdjustments - totalUsedCups;

        // Use trunc for integer part to handle negative numbers correctly for display
        // e.g. -10 cups -> -1 packet, -2 cups (using trunc: -1, rem: -2)
        // If floor: -10/8 = -1.25 -> -2. Remainder?
        const remainingPackets = Math.trunc(balanceCups / CUPS_PER_PACKET);
        const remainingCups = balanceCups % CUPS_PER_PACKET;
        // Handle negative balance (use 'remaining' notation properly)
        // If balance is negative, packets/cups might look weird with modulo.
        // Let's just pass raw values and let frontend format or handle negatives.

        return NextResponse.json({
            totalPurchasedPackets,
            totalUsedFromPackets: usedPacketsEntry,
            totalUsedFromCups: usedCupsEntry,
            totalUsedCupsConverted: totalUsedCups,
            totalPowderAdjustments,
            remainingCupsBalance: balanceCups,
            formatted: {
                packets: remainingPackets,
                cups: remainingCups
            }
        });

    } catch (error: any) {
        console.error('Get inventory error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}
