
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { query } from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const session = await requireAuth();
        const { searchParams } = new URL(request.url);
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const creditorName = searchParams.get('creditorName');
        const groupName = searchParams.get('groupName');

        // 1. Fetch Daily Entries (for Credits)
        let entriesSql = `
            SELECT 
                date, 
                bookkeeper_name, 
                group_name,
                credit_entries,
                user_id
            FROM daily_entries 
            WHERE 1=1
        `;
        const entriesParams: any[] = [];

        if (session.role !== 'admin' && session.role !== 'manager') {
            entriesSql += ' AND user_id = ?';
            entriesParams.push(session.userId);
        }

        if (startDate) {
            entriesSql += ' AND date >= ?';
            entriesParams.push(startDate);
        }
        if (endDate) {
            entriesSql += ' AND date <= ?';
            entriesParams.push(endDate);
        }
        if (groupName) {
            entriesSql += ' AND group_name LIKE ?';
            entriesParams.push(`%${groupName}%`);
        }

        const entries = await query<any>(entriesSql, entriesParams);

        // 2. Fetch Credit Payments
        let paymentsSql = `
            SELECT 
                payment_date as date, 
                creditor_name, 
                amount, 
                notes,
                user_id
            FROM credit_payments 
            WHERE 1=1
        `;
        const paymentsParams: any[] = [];

        if (session.role !== 'admin' && session.role !== 'manager') {
            paymentsSql += ' AND user_id = ?';
            paymentsParams.push(session.userId);
        }

        if (startDate) {
            paymentsSql += ' AND payment_date >= ?';
            paymentsParams.push(startDate);
        }
        if (endDate) {
            paymentsSql += ' AND payment_date <= ?';
            paymentsParams.push(endDate);
        }
        if (creditorName) {
            paymentsSql += ' AND creditor_name LIKE ?';
            paymentsParams.push(`%${creditorName}%`);
        }

        const payments = await query<any>(paymentsSql, paymentsParams);

        // 3. Process and Aggregate Data
        const records: any[] = [];
        const uniqueCreditorsSet = new Set<string>();
        const uniqueGroupsSet = new Set<string>();

        // Process credits from daily entries
        entries.forEach((entry: any) => {
            if (entry.group_name) uniqueGroupsSet.add(entry.group_name);

            if (entry.credit_entries) {
                try {
                    const parsedCredits = JSON.parse(entry.credit_entries);
                    if (Array.isArray(parsedCredits)) {
                        parsedCredits.forEach((credit: any) => {
                            if (credit.name) uniqueCreditorsSet.add(credit.name);

                            // Apply name filter in memory for daily_entries
                            if (creditorName && !credit.name.toLowerCase().includes(creditorName.toLowerCase())) {
                                return;
                            }

                            records.push({
                                date: entry.date,
                                creditor_name: credit.name,
                                amount: credit.amount,
                                bookkeeper_name: entry.bookkeeper_name || 'N/A',
                                group_name: entry.group_name || 'N/A',
                                type: 'credit',
                                notes: null
                            });
                        });
                    }
                } catch (e) {
                    console.error('Error parsing credit_entries for date', entry.date, e);
                }
            }
        });

        // Process payments
        payments.forEach((p: any) => {
            if (p.creditor_name) uniqueCreditorsSet.add(p.creditor_name);

            records.push({
                date: p.date,
                creditor_name: p.creditor_name,
                amount: p.amount,
                bookkeeper_name: null,
                group_name: null,
                type: 'payment',
                notes: p.notes
            });
        });

        // Sort by date DESC
        records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Calculate Totals
        let totalCredits = 0;
        let totalPayments = 0;

        records.forEach(r => {
            if (r.type === 'credit') totalCredits += r.amount;
            else totalPayments += r.amount;
        });

        const result = {
            records,
            totalCredits,
            totalPayments,
            outstandingBalance: totalCredits - totalPayments,
            count: records.length,
            uniqueCreditors: Array.from(uniqueCreditorsSet).sort(),
            uniqueGroups: Array.from(uniqueGroupsSet).sort()
        };

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('Get creditors error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}
