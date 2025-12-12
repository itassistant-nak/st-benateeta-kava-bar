
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/session';
import { execute } from '@/lib/db';

export async function POST(request: NextRequest) {
    try {
        const session = await requireAuth();
        if (session.role !== 'admin') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Clear daily_entries
        await execute('DELETE FROM daily_entries');

        // Clear powder_purchases
        await execute('DELETE FROM powder_purchases');

        // Optional: Reset SQLite sequence if you want ID to start from 1?
        // await execute("DELETE FROM sqlite_sequence WHERE name='daily_entries' OR name='powder_purchases'");

        return NextResponse.json({ message: 'Database entries cleared successfully' });
    } catch (error: any) {
        console.error('Reset database error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
