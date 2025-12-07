import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { readSystemLogs, readDatabaseLogs, clearSystemLogs, clearDatabaseLogs } from '@/lib/logger';

export async function GET(request: NextRequest) {
    try {
        await requireAdmin();
        
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'all';
        
        let logs: { system?: any[], database?: any[] } = {};
        
        if (type === 'system' || type === 'all') {
            logs.system = readSystemLogs();
        }
        
        if (type === 'database' || type === 'all') {
            logs.database = readDatabaseLogs();
        }
        
        return NextResponse.json(logs);
    } catch (error: any) {
        console.error('Get logs error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message.includes('Forbidden') ? 403 : error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}

export async function DELETE(request: NextRequest) {
    try {
        await requireAdmin();
        
        const { searchParams } = new URL(request.url);
        const type = searchParams.get('type') || 'all';
        
        if (type === 'system' || type === 'all') {
            clearSystemLogs();
        }
        
        if (type === 'database' || type === 'all') {
            clearDatabaseLogs();
        }
        
        return NextResponse.json({ success: true, message: `${type} logs cleared` });
    } catch (error: any) {
        console.error('Clear logs error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message.includes('Forbidden') ? 403 : error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}

