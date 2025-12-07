import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { query, execute, getLastInsertId } from '@/lib/db';

const PACKET_COST = 63;
const CUPS_PER_PACKET = 8;
const CUP_COST = PACKET_COST / CUPS_PER_PACKET;

interface DailyEntry {
    id: number;
    user_id: number;
    date: string;
    group_name: string | null;
    cash_in_hand: number;
    credits: number;
    waiter_expense: number;
    servers_expense: number;
    bookkeeping_expense: number;
    other_expenses: number;
    packets_used: number;
    cups_used: number;
    powder_cost: number;
    profit: number;
    notes: string | null;
    created_at: string;
}

function calculatePowderCost(packets: number, cups: number): number {
    return packets * PACKET_COST + cups * CUP_COST;
}

function calculateProfit(cashInHand: number, credits: number, waiter: number, servers: number, bookkeeping: number, other: number, powderCost: number): number {
    const totalExpenses = waiter + servers + bookkeeping + other;
    return cashInHand + credits + totalExpenses - powderCost;
}

export async function GET(request: NextRequest) {
    try {
        const session = await requireAuth();
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const userId = searchParams.get('userId');

        let sql = 'SELECT * FROM daily_entries WHERE 1=1';
        const params: any[] = [];

        // Regular users can only see their own entries
        if (session.role !== 'admin') {
            sql += ' AND user_id = ?';
            params.push(session.userId);
        } else if (userId) {
            sql += ' AND user_id = ?';
            params.push(parseInt(userId));
        }

        if (startDate) {
            sql += ' AND date >= ?';
            params.push(startDate);
        }

        if (endDate) {
            sql += ' AND date <= ?';
            params.push(endDate);
        }

        sql += ' ORDER BY date DESC';

        const entries = await query<DailyEntry>(sql, params);
        return NextResponse.json(entries);
    } catch (error: any) {
        console.error('Get entries error:', error);
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
            date,
            group_name = null,
            cash_in_hand = 0,
            credits = 0,
            waiter_expense = 0,
            servers_expense = 0,
            bookkeeping_expense = 0,
            other_expenses = 0,
            packets_used = 0,
            cups_used = 0,
            notes = null,
        } = body;

        if (!date) {
            return NextResponse.json(
                { error: 'Date is required' },
                { status: 400 }
            );
        }

        const powderCost = calculatePowderCost(packets_used, cups_used);
        const profit = calculateProfit(cash_in_hand, credits, waiter_expense, servers_expense, bookkeeping_expense, other_expenses, powderCost);

        // Check if entry already exists for this user and date
        const existingEntries = await query<DailyEntry>(
            'SELECT * FROM daily_entries WHERE user_id = ? AND date = ?',
            [session.userId, date]
        );

        let entry: DailyEntry;
        let isUpdate = false;

        if (existingEntries.length > 0) {
            // Update existing entry
            isUpdate = true;
            await execute(
                `UPDATE daily_entries SET
                    group_name = ?, cash_in_hand = ?, credits = ?, waiter_expense = ?,
                    servers_expense = ?, bookkeeping_expense = ?, other_expenses = ?,
                    packets_used = ?, cups_used = ?, powder_cost = ?, profit = ?, notes = ?
                WHERE user_id = ? AND date = ?`,
                [group_name, cash_in_hand, credits, waiter_expense, servers_expense,
                 bookkeeping_expense, other_expenses, packets_used, cups_used,
                 powderCost, profit, notes, session.userId, date]
            );
            const updated = await query<DailyEntry>(
                'SELECT * FROM daily_entries WHERE user_id = ? AND date = ?',
                [session.userId, date]
            );
            entry = updated[0];
        } else {
            // Create new entry
            await execute(
                `INSERT INTO daily_entries
                (user_id, date, group_name, cash_in_hand, credits, waiter_expense, servers_expense, bookkeeping_expense, other_expenses, packets_used, cups_used, powder_cost, profit, notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [session.userId, date, group_name, cash_in_hand, credits, waiter_expense, servers_expense, bookkeeping_expense, other_expenses, packets_used, cups_used, powderCost, profit, notes]
            );
            const id = await getLastInsertId();
            const newEntry = await query<DailyEntry>('SELECT * FROM daily_entries WHERE id = ?', [id]);
            entry = newEntry[0];
        }

        return NextResponse.json({ ...entry, updated: isUpdate }, { status: isUpdate ? 200 : 201 });
    } catch (error: any) {
        console.error('Create entry error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}
