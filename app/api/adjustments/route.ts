
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { query, execute, getLastInsertId } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const session = await requireAuth();
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');

        let sql = 'SELECT * FROM adjustments WHERE 1=1';
        const params: any[] = [];

        // Regular users see only their own? Or admins see all?
        // Usually adjustments are admin/manager thing.
        // Let's allow users to see their own.
        if (session.role !== 'admin') {
            sql += ' AND user_id = ?';
            params.push(session.userId);
        }

        if (startDate) {
            sql += ' AND date >= ?';
            params.push(startDate);
        }

        if (endDate) {
            sql += ' AND date <= ?';
            params.push(endDate);
        }

        sql += ' ORDER BY date DESC, created_at DESC';

        const adjustments = await query(sql, params);
        return NextResponse.json(adjustments);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await requireAuth();
        const body = await request.json();
        const { date, type, amount, notes } = body;

        console.log('Adjustment POST received:', { date, type, amount, notes, amountType: typeof amount });

        if (!date || !type || amount === undefined || amount === null) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Validate amount is a valid number
        const numAmount = Number(amount);
        if (!isFinite(numAmount)) {
            console.error('Invalid amount received:', amount, 'Type:', typeof amount);
            return NextResponse.json({ error: 'Invalid amount value' }, { status: 400 });
        }

        console.log('Executing INSERT with:', { userId: session.userId, date, type, numAmount, notes });

        await execute(
            `INSERT INTO adjustments (user_id, date, type, amount, notes)
             VALUES (?, ?, ?, ?, ?)`,
            [session.userId, date, type, numAmount, notes || null]
        );

        console.log('INSERT successful');

        // Return a simple success response instead of querying the database
        // to avoid potential BigInt serialization issues
        return NextResponse.json({
            success: true,
            message: 'Adjustment saved successfully'
        }, { status: 201 });
    } catch (error: any) {
        console.error('Adjustment POST error:', error);
        console.error('Error stack:', error.stack);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}
