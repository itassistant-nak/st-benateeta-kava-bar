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

interface CreditorRecord {
    date: string;
    creditor_name: string;
    amount: number;
    bookkeeper_name: string | null;
    group_name: string | null;
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
        const creditors: CreditorRecord[] = [];

        for (const entry of entries) {
            if (entry.credit_entries) {
                try {
                    const credits: CreditEntry[] = JSON.parse(entry.credit_entries);
                    for (const credit of credits) {
                        // Filter by creditor name if specified
                        if (creditorName && !credit.name.toLowerCase().includes(creditorName.toLowerCase())) {
                            continue;
                        }
                        creditors.push({
                            date: entry.date,
                            creditor_name: credit.name,
                            amount: credit.amount,
                            bookkeeper_name: entry.bookkeeper_name,
                            group_name: entry.group_name,
                        });
                    }
                } catch (e) {
                    // Skip invalid JSON
                    console.error('Invalid credit_entries JSON:', e);
                }
            }
        }

        // Calculate totals
        const totalAmount = creditors.reduce((sum, c) => sum + c.amount, 0);

        // Get unique creditor names for filter dropdown
        const uniqueCreditors = [...new Set(creditors.map(c => c.creditor_name))].sort();
        
        // Get unique group names for filter dropdown
        const uniqueGroups = [...new Set(entries.filter(e => e.group_name).map(e => e.group_name!))].sort();

        return NextResponse.json({
            creditors,
            totalAmount,
            count: creditors.length,
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

