
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
    opening_cash: number;
    opening_packets: number;
    opening_cups: number;
    opening_notes: string | null;
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
            opening_cash = 0,
            opening_packets = 0,
            opening_cups = 0,
            opening_notes = null,
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
            // Update existing entry - try with opening columns first, fall back if they don't exist
            isUpdate = true;
            try {
                await execute(
                    `UPDATE daily_entries SET
                        group_name = ?, cash_in_hand = ?, credits = ?, waiter_expense = ?,
                        servers_expense = ?, bookkeeping_expense = ?, other_expenses = ?,
                        packets_used = ?, cups_used = ?, powder_cost = ?, profit = ?, notes = ?,
                        opening_cash = ?, opening_packets = ?, opening_cups = ?, opening_notes = ?
                    WHERE user_id = ? AND date = ?`,
                    [group_name, cash_in_hand, credits, waiter_expense, servers_expense,
                        bookkeeping_expense, other_expenses, packets_used, cups_used,
                        powderCost, profit, notes, opening_cash, opening_packets, opening_cups, opening_notes, session.userId, date]
                );
            } catch (err: any) {
                // If opening columns don't exist, update without them
                if (err.message && err.message.includes('no column named opening')) {
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
                } else {
                    throw err;
                }
            }
            const updated = await query<DailyEntry>(
                'SELECT * FROM daily_entries WHERE user_id = ? AND date = ?',
                [session.userId, date]
            );
            entry = updated[0];
        } else {
            // Create new entry - try with opening columns first, fall back if they don't exist
            try {
                await execute(
                    `INSERT INTO daily_entries
                    (user_id, date, group_name, cash_in_hand, credits, waiter_expense, servers_expense, bookkeeping_expense, other_expenses, packets_used, cups_used, powder_cost, profit, notes, opening_cash, opening_packets, opening_cups, opening_notes)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [session.userId, date, group_name, cash_in_hand, credits, waiter_expense, servers_expense, bookkeeping_expense, other_expenses, packets_used, cups_used, powderCost, profit, notes, opening_cash, opening_packets, opening_cups, opening_notes]
                );
            } catch (err: any) {
                // If opening columns don't exist, insert without them
                if (err.message && err.message.includes('no column named opening')) {
                    await execute(
                        `INSERT INTO daily_entries
                        (user_id, date, group_name, cash_in_hand, credits, waiter_expense, servers_expense, bookkeeping_expense, other_expenses, packets_used, cups_used, powder_cost, profit, notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [session.userId, date, group_name, cash_in_hand, credits, waiter_expense, servers_expense, bookkeeping_expense, other_expenses, packets_used, cups_used, powderCost, profit, notes]
                    );
                } else {
                    throw err;
                }
            }
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

export async function PATCH(request: NextRequest) {
    try {
        const session = await requireAuth();
        const body = await request.json();
        const { date, ...updates } = body;

        if (!date) {
            return NextResponse.json({ error: 'Date is required' }, { status: 400 });
        }

        // Check if entry exists
        const existingEntries = await query<DailyEntry>(
            'SELECT * FROM daily_entries WHERE user_id = ? AND date = ?',
            [session.userId, date]
        );

        if (existingEntries.length === 0) {
            // If patching a non-existent entry, create it with provided fields + defaults
            const {
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
                opening_cash = 0,
                opening_packets = 0,
                opening_cups = 0,
                opening_notes = null,
            } = updates;

            const powderCost = calculatePowderCost(packets_used, cups_used);
            const profit = calculateProfit(cash_in_hand, credits, waiter_expense, servers_expense, bookkeeping_expense, other_expenses, powderCost);

            await execute(
                `INSERT INTO daily_entries
                (user_id, date, group_name, cash_in_hand, credits, waiter_expense, servers_expense, bookkeeping_expense, other_expenses, packets_used, cups_used, powder_cost, profit, notes, opening_cash, opening_packets, opening_cups, opening_notes)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [session.userId, date, group_name, cash_in_hand, credits, waiter_expense, servers_expense, bookkeeping_expense, other_expenses, packets_used, cups_used, powderCost, profit, notes, opening_cash, opening_packets, opening_cups, opening_notes]
            );
            const id = await getLastInsertId();
            const newEntry = await query<DailyEntry>('SELECT * FROM daily_entries WHERE id = ?', [id]);
            return NextResponse.json({ ...newEntry[0], updated: false }, { status: 201 });
        }

        const currentEntry = existingEntries[0];
        const fieldsToUpdate: string[] = [];
        const params: any[] = [];

        // Helper to add update if field exists in body
        const checkField = (key: string, dbCol: string) => {
            if (updates[key] !== undefined) {
                fieldsToUpdate.push(`${dbCol} = ?`);
                params.push(updates[key]);
            }
        };

        checkField('group_name', 'group_name');
        checkField('cash_in_hand', 'cash_in_hand');
        checkField('credits', 'credits');
        checkField('waiter_expense', 'waiter_expense');
        checkField('servers_expense', 'servers_expense');
        checkField('bookkeeping_expense', 'bookkeeping_expense');
        checkField('other_expenses', 'other_expenses');
        checkField('packets_used', 'packets_used');
        checkField('cups_used', 'cups_used');
        checkField('notes', 'notes');
        checkField('opening_cash', 'opening_cash');
        checkField('opening_packets', 'opening_packets');
        checkField('opening_cups', 'opening_cups');
        checkField('opening_notes', 'opening_notes');

        if (fieldsToUpdate.length === 0) {
            return NextResponse.json(currentEntry);
        }

        // Recalculate derived fields if dependencies changed
        // Merge current and updates
        const merged = { ...currentEntry, ...updates }; // Note: simple merge, but DB cols use underscore, updates might match or not?
        // Wait, body keys match DB cols mostly? No, body has 'waiter_expense' etc.
        // My checkField used same key for both.

        // Need to recalc profit/powder_cost if relevant fields change
        const packets = updates.packets_used !== undefined ? updates.packets_used : currentEntry.packets_used;
        const cups = updates.cups_used !== undefined ? updates.cups_used : currentEntry.cups_used;

        const powderCost = calculatePowderCost(packets, cups);
        if (powderCost !== currentEntry.powder_cost) {
            fieldsToUpdate.push('powder_cost = ?');
            params.push(powderCost);
        }

        // Recalc Profit
        const cash = updates.cash_in_hand !== undefined ? updates.cash_in_hand : currentEntry.cash_in_hand;
        const credit = updates.credits !== undefined ? updates.credits : currentEntry.credits;
        const waiter = updates.waiter_expense !== undefined ? updates.waiter_expense : currentEntry.waiter_expense;
        const server = updates.servers_expense !== undefined ? updates.servers_expense : currentEntry.servers_expense;
        const book = updates.bookkeeping_expense !== undefined ? updates.bookkeeping_expense : currentEntry.bookkeeping_expense;
        const other = updates.other_expenses !== undefined ? updates.other_expenses : currentEntry.other_expenses;

        const profit = calculateProfit(cash, credit, waiter, server, book, other, powderCost);
        if (profit !== currentEntry.profit) {
            fieldsToUpdate.push('profit = ?');
            params.push(profit);
        }

        // Execute Update
        params.push(session.userId, date);
        const sql = `UPDATE daily_entries SET ${fieldsToUpdate.join(', ')} WHERE user_id = ? AND date = ?`;

        await execute(sql, params);

        const updated = await query<DailyEntry>(
            'SELECT * FROM daily_entries WHERE user_id = ? AND date = ?',
            [session.userId, date]
        );

        return NextResponse.json({ ...updated[0], updated: true });

    } catch (error: any) {
        console.error('Patch entry error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}
