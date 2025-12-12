import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { query } from '@/lib/db';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';

interface ReportEntry {
    date: string;
    cash_in_hand: number;
    credits: number;
    waiter_expense: number;
    servers_expense: number;
    bookkeeping_expense: number;
    other_expenses: number;
    expenses: number;
    powder_cost: number;
    profit: number;
    packets_used: number;
    cups_used: number;
}

export async function GET(request: NextRequest) {
    try {
        const session = await requireAuth();
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'daily'; // daily, weekly, monthly
        const date = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
        const userId = searchParams.get('userId');

        let startDate: string;
        let endDate: string;
        const currentDate = new Date(date);

        switch (period) {
            case 'weekly':
                startDate = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                endDate = format(endOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                break;
            case 'monthly':
                startDate = format(startOfMonth(currentDate), 'yyyy-MM-dd');
                endDate = format(endOfMonth(currentDate), 'yyyy-MM-dd');
                break;
            default: // daily
                startDate = date;
                endDate = date;
        }

        let sql = `
      SELECT 
        date,
        SUM(cash_in_hand) as cash_in_hand,
        SUM(credits) as credits,
        SUM(waiter_expense) as waiter_expense,
        SUM(servers_expense) as servers_expense,
        SUM(bookkeeping_expense) as bookkeeping_expense,
        SUM(other_expenses) as other_expenses,
        SUM(waiter_expense + servers_expense + bookkeeping_expense + other_expenses) as expenses,
        SUM(powder_cost) as powder_cost,
        SUM(profit) as profit,
        SUM(packets_used) as packets_used,
        SUM(cups_used) as cups_used
      FROM daily_entries
      WHERE date >= ? AND date <= ?
    `;
        const params: any[] = [startDate, endDate];

        // Regular users can only see their own reports
        if (session.role !== 'admin') {
            sql += ' AND user_id = ?';
            params.push(session.userId);
        } else if (userId) {
            sql += ' AND user_id = ?';
            params.push(parseInt(userId));
        }

        sql += ' GROUP BY date ORDER BY date DESC';

        // Fetch powder purchases for the same period
        let purchaseSql = `
            SELECT 
                SUM(packets_purchased) as packets_purchased,
                SUM(total_cost) as total_cost
            FROM powder_purchases
            WHERE purchase_date >= ? AND purchase_date <= ?
        `;
        const purchaseParams: any[] = [startDate, endDate];

        if (session.role !== 'admin') {
            purchaseSql += ' AND user_id = ?';
            purchaseParams.push(session.userId);
        } else if (userId) {
            purchaseSql += ' AND user_id = ?';
            purchaseParams.push(parseInt(userId));
        }

        const purchaseResult = await query<any>(purchaseSql, purchaseParams);
        const purchaseTotals = {
            packets_purchased: purchaseResult[0].packets_purchased || 0,
            total_cost: purchaseResult[0].total_cost || 0
        };

        const entries = await query<ReportEntry>(sql, params);

        // Calculate totals
        const totals = {
            cash_in_hand: 0,
            credits: 0,
            expenses: 0,
            waiter_expense: 0,
            servers_expense: 0,
            bookkeeping_expense: 0,
            other_expenses: 0,
            powder_cost: 0, // Usage-based cost (COGS)
            profit: 0,
            packets_used: 0,
            cups_used: 0,
            // New Cashflow Metrics
            purchase_cost: purchaseTotals.total_cost, // Actual cash spent on powder
            packets_purchased: purchaseTotals.packets_purchased
        };

        entries.forEach(entry => {
            totals.cash_in_hand += entry.cash_in_hand;
            totals.credits += entry.credits;
            totals.expenses += entry.expenses;
            totals.waiter_expense += entry.waiter_expense;
            totals.servers_expense += entry.servers_expense;
            totals.bookkeeping_expense += entry.bookkeeping_expense;
            totals.other_expenses += entry.other_expenses;
            totals.powder_cost += entry.powder_cost;
            totals.profit += entry.profit;
            totals.packets_used += entry.packets_used;
            totals.cups_used += entry.cups_used;
        });

        return NextResponse.json({
            period,
            startDate,
            endDate,
            entries,
            totals,
        });
    } catch (error: any) {
        console.error('Get reports error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}
