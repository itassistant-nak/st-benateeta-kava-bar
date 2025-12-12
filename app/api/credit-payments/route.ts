import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { query, execute, getLastInsertId } from '@/lib/db';

// Helper to convert BigInt to Number for JSON serialization
function serializePayment(payment: any): any {
    if (!payment) return payment;
    return {
        ...payment,
        id: typeof payment.id === 'bigint' ? Number(payment.id) : payment.id,
        user_id: typeof payment.user_id === 'bigint' ? Number(payment.user_id) : payment.user_id,
        amount: typeof payment.amount === 'bigint' ? Number(payment.amount) : payment.amount,
    };
}

interface CreditPayment {
    id: number;
    user_id: number;
    creditor_name: string;
    payment_date: string;
    amount: number;
    notes: string | null;
    created_at: string;
}

export async function GET(request: NextRequest) {
    try {
        const session = await requireAuth();
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const creditorName = searchParams.get('creditorName');

        let sql = 'SELECT * FROM credit_payments WHERE 1=1';
        const params: any[] = [];

        // Admins and managers can see all payments
        if (session.role !== 'admin' && session.role !== 'manager') {
            sql += ' AND user_id = ?';
            params.push(session.userId);
        }

        if (startDate) {
            sql += ' AND payment_date >= ?';
            params.push(startDate);
        }

        if (endDate) {
            sql += ' AND payment_date <= ?';
            params.push(endDate);
        }

        if (creditorName) {
            sql += ' AND creditor_name LIKE ?';
            params.push(`%${creditorName}%`);
        }

        sql += ' ORDER BY payment_date DESC';

        const payments = await query<CreditPayment>(sql, params);
        return NextResponse.json(payments.map(serializePayment));
    } catch (error: any) {
        console.error('Get credit payments error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await requireAuth();
        const body = await request.json();

        const { creditor_name, payment_date, amount, notes = null } = body;

        if (!creditor_name || !payment_date || amount === undefined) {
            return NextResponse.json(
                { error: 'Creditor name, payment date, and amount are required' },
                { status: 400 }
            );
        }

        if (amount <= 0) {
            return NextResponse.json(
                { error: 'Amount must be greater than 0' },
                { status: 400 }
            );
        }

        await execute(
            `INSERT INTO credit_payments (user_id, creditor_name, payment_date, amount, notes)
             VALUES (?, ?, ?, ?, ?)`,
            [session.userId, creditor_name, payment_date, amount, notes]
        );

        const id = await getLastInsertId();
        const newPayment = await query<CreditPayment>('SELECT * FROM credit_payments WHERE id = ?', [Number(id)]);

        return NextResponse.json(serializePayment(newPayment[0]), { status: 201 });
    } catch (error: any) {
        console.error('Create credit payment error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const session = await requireAuth();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 });
        }

        const existing = await query<CreditPayment>('SELECT * FROM credit_payments WHERE id = ?', [parseInt(id)]);

        if (existing.length === 0) {
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
        }

        if (session.role !== 'admin' && existing[0].user_id !== session.userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        await execute('DELETE FROM credit_payments WHERE id = ?', [parseInt(id)]);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete credit payment error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}

