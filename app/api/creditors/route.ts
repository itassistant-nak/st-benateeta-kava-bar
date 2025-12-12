import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { query } from '@/lib/db';

interface DailyEntry {
    id: number;
    user_id: number;
    date: string;
    group_name: string | null;
    credit_entries: string | null;
    bookkeeper_name: string | null;
}

interface CreditEntry {
    name: string;
    amount: number;
}

interface CreditPayment {
    id: number;
    creditor_name: string;
    payment_date: string;
    amount: number;
    notes: string | null;
}

interface CreditorRecord {
    date: string;
    creditor_name: string;
    amount: number;
    bookkeeper_name: string | null;
    group_name: string | null;
    type: 'credit' | 'payment';
    notes?: string | null;
}

export async function GET(request: NextRequest) {
    try {
        const session = await requireAuth();
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const creditorName = searchParams.get('creditorName');
        const groupName = searchParams.get('groupName');

        let sql = 'SELECT id, user_id, date, group_name, credit_entries, bookkeeper_name FROM daily_entries WHERE 1=1';
        const params: any[] = [];

        // Admins and managers can see all entries
        if (session.role !== 'admin' && session.role !== 'manager') {
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

        if (groupName) {
            sql += ' AND group_name LIKE ?';
            params.push(`%${groupName}%`);
        }

        sql += ' ORDER BY date DESC';

        const entries = await query<DailyEntry>(sql, params);

        // Extract credit entries from each daily entry
        const records: CreditorRecord[] = [];

        for (const entry of entries) {
            if (entry.credit_entries) {
                try {
                    const credits: CreditEntry[] = JSON.parse(entry.credit_entries);
                    for (const credit of credits) {
                        // Filter by creditor name if specified
                        if (creditorName && !credit.name.toLowerCase().includes(creditorName.toLowerCase())) {
                            continue;
                        }
                        records.push({
                            date: entry.date,
                            creditor_name: credit.name,
                            amount: credit.amount,
                            bookkeeper_name: entry.bookkeeper_name,
                            group_name: entry.group_name,
                            type: 'credit',
                        });
                    }
                } catch (e) {
                    // Skip invalid JSON
                    console.error('Invalid credit_entries JSON:', e);
                }
            }
        }

        // Get all unique creditor names from credits
        const creditNames = [...new Set(records.map(c => c.creditor_name))];

        // Fetch credit payments
        let paymentSql = 'SELECT * FROM credit_payments WHERE 1=1';
        const paymentParams: any[] = [];

        if (session.role !== 'admin' && session.role !== 'manager') {
            paymentSql += ' AND user_id = ?';
            paymentParams.push(session.userId);
        }

        if (startDate) {
            paymentSql += ' AND payment_date >= ?';
            paymentParams.push(startDate);
        }

        if (endDate) {
            paymentSql += ' AND payment_date <= ?';
            paymentParams.push(endDate);
        }

        if (creditorName) {
            paymentSql += ' AND creditor_name LIKE ?';
            paymentParams.push(`%${creditorName}%`);
        }

        let payments: CreditPayment[] = [];
        try {
            payments = await query<CreditPayment>(paymentSql, paymentParams);
        } catch (err) {
            // Table might not exist yet
            console.log('Credit payments table not found');
        }

        // Add payments to records
        for (const payment of payments) {
            records.push({
                date: payment.payment_date,
                creditor_name: payment.creditor_name,
                amount: payment.amount,
                bookkeeper_name: null,
                group_name: null,
                type: 'payment',
                notes: payment.notes,
            });
        }

        // Sort all records by date descending
        records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Calculate totals
        const totalCredits = records.filter(r => r.type === 'credit').reduce((sum, c) => sum + c.amount, 0);
        const totalPayments = records.filter(r => r.type === 'payment').reduce((sum, c) => sum + c.amount, 0);
        const outstandingBalance = totalCredits - totalPayments;

        // Get unique creditor names for filter dropdown (from both credits and payments)
        const paymentNames = payments.map(p => p.creditor_name);
        const uniqueCreditors = [...new Set([...creditNames, ...paymentNames])].sort();

        // Get unique group names for filter dropdown
        const uniqueGroups = [...new Set(entries.filter(e => e.group_name).map(e => e.group_name!))].sort();

        return NextResponse.json({
            records,
            totalCredits,
            totalPayments,
            outstandingBalance,
            count: records.length,
            uniqueCreditors,
            uniqueGroups,
        });
    } catch (error: any) {
        console.error('Get creditors error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}

