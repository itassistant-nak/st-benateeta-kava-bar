import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { query, execute, getLastInsertId } from '@/lib/db';

// Helper to convert BigInt to Number for JSON serialization
function serializePurchase(purchase: any): any {
    if (!purchase) return purchase;
    return {
        ...purchase,
        id: typeof purchase.id === 'bigint' ? Number(purchase.id) : purchase.id,
        user_id: typeof purchase.user_id === 'bigint' ? Number(purchase.user_id) : purchase.user_id,
        packets_purchased: typeof purchase.packets_purchased === 'bigint' ? Number(purchase.packets_purchased) : purchase.packets_purchased,
        cost_per_packet: typeof purchase.cost_per_packet === 'bigint' ? Number(purchase.cost_per_packet) : purchase.cost_per_packet,
        total_cost: typeof purchase.total_cost === 'bigint' ? Number(purchase.total_cost) : purchase.total_cost,
    };
}

interface PowderPurchase {
    id: number;
    user_id: number;
    purchase_date: string;
    supplier_name: string | null;
    packets_purchased: number;
    cost_per_packet: number;
    total_cost: number;
    payment_method: string | null;
    invoice_number: string | null;
    notes: string | null;
    created_at: string;
}

export async function GET(request: NextRequest) {
    try {
        const session = await requireAuth();
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const userId = searchParams.get('userId');

        let sql = 'SELECT * FROM powder_purchases WHERE 1=1';
        const params: any[] = [];

        // Regular users can only see their own purchases
        if (session.role !== 'admin') {
            sql += ' AND user_id = ?';
            params.push(session.userId);
        } else if (userId) {
            sql += ' AND user_id = ?';
            params.push(parseInt(userId));
        }

        if (startDate) {
            sql += ' AND purchase_date >= ?';
            params.push(startDate);
        }

        if (endDate) {
            sql += ' AND purchase_date <= ?';
            params.push(endDate);
        }

        sql += ' ORDER BY purchase_date DESC';

        const purchases = await query<PowderPurchase>(sql, params);
        return NextResponse.json(purchases.map(serializePurchase));
    } catch (error: any) {
        console.error('Get powder purchases error:', error);
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

        const {
            purchase_date,
            supplier_name = null,
            packets_purchased = 0,
            cost_per_packet = 63,
            payment_method = null,
            invoice_number = null,
            notes = null,
        } = body;

        if (!purchase_date) {
            return NextResponse.json(
                { error: 'Purchase date is required' },
                { status: 400 }
            );
        }

        if (packets_purchased <= 0) {
            return NextResponse.json(
                { error: 'Packets purchased must be greater than 0' },
                { status: 400 }
            );
        }

        // Calculate total cost
        const total_cost = packets_purchased * cost_per_packet;

        // Create new purchase
        await execute(
            `INSERT INTO powder_purchases
            (user_id, purchase_date, supplier_name, packets_purchased, cost_per_packet, total_cost, payment_method, invoice_number, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [session.userId, purchase_date, supplier_name, packets_purchased, cost_per_packet, total_cost, payment_method, invoice_number, notes]
        );

        const id = await getLastInsertId();
        const newPurchase = await query<PowderPurchase>('SELECT * FROM powder_purchases WHERE id = ?', [Number(id)]);

        return NextResponse.json(serializePurchase(newPurchase[0]), { status: 201 });
    } catch (error: any) {
        console.error('Create powder purchase error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    try {
        const session = await requireAuth();
        const body = await request.json();

        const {
            id,
            purchase_date,
            supplier_name,
            packets_purchased,
            cost_per_packet,
            payment_method,
            invoice_number,
            notes,
        } = body;

        if (!id) {
            return NextResponse.json(
                { error: 'Purchase ID is required' },
                { status: 400 }
            );
        }

        // Check if purchase exists and belongs to user (unless admin)
        const existing = await query<PowderPurchase>(
            'SELECT * FROM powder_purchases WHERE id = ?',
            [id]
        );

        if (existing.length === 0) {
            return NextResponse.json(
                { error: 'Purchase not found' },
                { status: 404 }
            );
        }

        if (session.role !== 'admin' && existing[0].user_id !== session.userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        // Calculate total cost
        const total_cost = packets_purchased * cost_per_packet;

        // Update purchase
        await execute(
            `UPDATE powder_purchases SET
                purchase_date = ?, supplier_name = ?, packets_purchased = ?,
                cost_per_packet = ?, total_cost = ?, payment_method = ?,
                invoice_number = ?, notes = ?
            WHERE id = ?`,
            [purchase_date, supplier_name, packets_purchased, cost_per_packet, total_cost, payment_method, invoice_number, notes, id]
        );

        const updated = await query<PowderPurchase>('SELECT * FROM powder_purchases WHERE id = ?', [id]);
        return NextResponse.json(serializePurchase(updated[0]));
    } catch (error: any) {
        console.error('Update powder purchase error:', error);
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
            return NextResponse.json(
                { error: 'Purchase ID is required' },
                { status: 400 }
            );
        }

        // Check if purchase exists and belongs to user (unless admin)
        const existing = await query<PowderPurchase>(
            'SELECT * FROM powder_purchases WHERE id = ?',
            [parseInt(id)]
        );

        if (existing.length === 0) {
            return NextResponse.json(
                { error: 'Purchase not found' },
                { status: 404 }
            );
        }

        if (session.role !== 'admin' && existing[0].user_id !== session.userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 403 }
            );
        }

        await execute('DELETE FROM powder_purchases WHERE id = ?', [parseInt(id)]);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete powder purchase error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}
