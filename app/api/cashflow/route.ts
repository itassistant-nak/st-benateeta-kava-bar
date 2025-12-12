import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { query } from '@/lib/db';

interface CashflowEntry {
    date: string;
    income: number;
    expenses: number;
    netCashflow: number;
    powderUsed?: {
        packets: number;
        cups: number;
    };
}

interface CashflowSummary {
    period: 'daily' | 'weekly' | 'monthly';
    startDate: string;
    endDate: string;
    income: {
        totalCashInHand: number;
        totalCredits: number;
        total: number;
    };
    expenses: {
        powderPurchases: number;
        operationalExpenses: number;
        total: number;
    };
    netCashflow: number;
    entries: CashflowEntry[];
}

export async function GET(request: NextRequest) {
    try {
        const session = await requireAuth();
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'monthly';
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const userId = searchParams.get('userId');

        let dateFilter = '';
        const params: any[] = [];

        // Build user filter
        let userFilter = '';
        if (session.role !== 'admin') {
            userFilter = 'AND de.user_id = ?';
            params.push(session.userId);
        } else if (userId) {
            userFilter = 'AND de.user_id = ?';
            params.push(parseInt(userId));
        }

        // Build date filter
        if (startDate && endDate) {
            dateFilter = 'AND de.date BETWEEN ? AND ?';
            params.push(startDate, endDate);
        } else {
            // Default to current month
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            dateFilter = 'AND de.date BETWEEN ? AND ?';
            params.push(
                firstDay.toISOString().split('T')[0],
                lastDay.toISOString().split('T')[0]
            );
        }

        // Get income data from daily entries
        const incomeData = await query<any>(
            `SELECT 
                COALESCE(SUM(cash_in_hand), 0) as totalCashInHand,
                COALESCE(SUM(credits), 0) as totalCredits
            FROM daily_entries de
            WHERE 1=1 ${userFilter} ${dateFilter}`,
            params
        );

        // Get operational expenses from daily entries
        const operationalData = await query<any>(
            `SELECT 
                COALESCE(SUM(waiter_expense + servers_expense + bookkeeping_expense + other_expenses), 0) as totalOperational
            FROM daily_entries de
            WHERE 1=1 ${userFilter} ${dateFilter}`,
            params
        );

        // Get powder purchase expenses
        const purchaseParams: any[] = [];
        let purchaseUserFilter = '';
        if (session.role !== 'admin') {
            purchaseUserFilter = 'AND user_id = ?';
            purchaseParams.push(session.userId);
        } else if (userId) {
            purchaseUserFilter = 'AND user_id = ?';
            purchaseParams.push(parseInt(userId));
        }

        let purchaseDateFilter = '';
        if (startDate && endDate) {
            purchaseDateFilter = 'AND purchase_date BETWEEN ? AND ?';
            purchaseParams.push(startDate, endDate);
        } else {
            const now = new Date();
            const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            purchaseDateFilter = 'AND purchase_date BETWEEN ? AND ?';
            purchaseParams.push(
                firstDay.toISOString().split('T')[0],
                lastDay.toISOString().split('T')[0]
            );
        }

        const purchaseData = await query<any>(
            `SELECT COALESCE(SUM(total_cost), 0) as totalPurchases
            FROM powder_purchases
            WHERE 1=1 ${purchaseUserFilter} ${purchaseDateFilter}`,
            purchaseParams
        );

        // Get daily breakdown
        // Construct params for the daily breakdown query
        // Order: Subquery params (purchaseUserFilter) -> Outer query params (userFilter, dateFilter)
        const dailyEntriesParams: any[] = [];

        // Subquery param (same as userFilter logic)
        if (session.role !== 'admin') {
            dailyEntriesParams.push(session.userId);
        } else if (userId) {
            dailyEntriesParams.push(parseInt(userId));
        }

        // Outer query params
        dailyEntriesParams.push(...params);

        const dailyEntries = await query<any>(
            `SELECT 
                de.date,
                COALESCE(de.cash_in_hand + de.credits, 0) as income,
                COALESCE(pp.purchase_cost, 0) + COALESCE(de.waiter_expense + de.servers_expense + de.bookkeeping_expense + de.other_expenses, 0) as expenses,
                COALESCE(de.packets_used, 0) as packets_used,
                COALESCE(de.cups_used, 0) as cups_used
            FROM daily_entries de
            LEFT JOIN (
                SELECT purchase_date, SUM(total_cost) as purchase_cost
                FROM powder_purchases
                WHERE 1=1 ${purchaseUserFilter}
                GROUP BY purchase_date
            ) pp ON de.date = pp.purchase_date
            WHERE 1=1 ${userFilter} ${dateFilter}
            ORDER BY de.date DESC`,
            dailyEntriesParams
        );

        const entries: CashflowEntry[] = dailyEntries.map((entry: any) => ({
            date: entry.date,
            income: entry.income,
            expenses: entry.expenses,
            netCashflow: entry.income - entry.expenses,
            powderUsed: {
                packets: entry.packets_used,
                cups: entry.cups_used
            }
        }));

        const totalCashInHand = incomeData[0].totalCashInHand;
        const totalCredits = incomeData[0].totalCredits;
        const totalOperationalExpenses = operationalData[0].totalOperational;
        const totalPowderPurchases = purchaseData[0].totalPurchases;

        // 3. Get Adjustments (cash only for cashflow) - handle missing table gracefully
        let adjustments: any[] = [];
        try {
            let adjSql = 'SELECT * FROM adjustments WHERE 1=1';
            const adjParams: any[] = [];

            if (session.role !== 'admin') {
                adjSql += ' AND user_id = ?';
                adjParams.push(session.userId);
            } else if (userId) {
                adjSql += ' AND user_id = ?';
                adjParams.push(parseInt(userId));
            }

            if (startDate) {
                adjSql += ' AND date >= ?';
                adjParams.push(startDate);
            }
            if (endDate) {
                adjSql += ' AND date <= ?';
                adjParams.push(endDate);
            }

            adjSql += ' ORDER BY date DESC';
            adjustments = await query<any>(adjSql, adjParams);
        } catch (err: any) {
            // If adjustments table doesn't exist yet, just use empty array
            if (err.message && (err.message.includes('no such table') || err.message.includes('adjustments'))) {
                console.log('Adjustments table not found, using empty array');
                adjustments = [];
            } else {
                throw err;
            }
        }

        // Calculate Adjustment Totals
        const totalCashAdjustments = adjustments
            .filter((a: any) => a.type === 'cash')
            .reduce((sum: number, a: any) => sum + (Number(a.amount) || 0), 0);

        const totalPowderAdjustments = adjustments
            .filter((a: any) => a.type === 'powder')
            .reduce((sum: number, a: any) => sum + (Number(a.amount) || 0), 0);

        // Calculate Totals
        const totalIncome = totalCashInHand + totalCredits;
        const totalExpenses = totalPowderPurchases + totalOperationalExpenses;
        const netCashflow = totalIncome - totalExpenses + totalCashAdjustments;

        return NextResponse.json({
            period,
            startDate: startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
            endDate: endDate || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0],
            income: {
                totalCashInHand,
                totalCredits,
                total: totalIncome
            },
            expenses: {
                powderPurchases: totalPowderPurchases,
                operationalExpenses: totalOperationalExpenses,
                total: totalExpenses
            },
            adjustments: {
                cash: totalCashAdjustments,
                powder: totalPowderAdjustments
            },
            netCashflow,
            entries
        });
    } catch (error: any) {
        console.error('Get cashflow error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}
