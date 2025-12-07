import { NextResponse } from 'next/server';
import { requireAdminOrManager } from '@/lib/session';
import { getAllFeatures } from '@/lib/auth';

export async function GET() {
    try {
        await requireAdminOrManager();
        const features = await getAllFeatures();
        return NextResponse.json(features);
    } catch (error: any) {
        console.error('Get features error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message.includes('Forbidden') ? 403 : error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}

