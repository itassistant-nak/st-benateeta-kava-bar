import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrManager } from '@/lib/session';
import { getUserFeatures, setUserFeatures } from '@/lib/auth';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await requireAdminOrManager();
        const { id } = await params;
        const userId = parseInt(id);

        const features = await getUserFeatures(userId);
        return NextResponse.json(features);
    } catch (error: any) {
        console.error('Get user features error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message.includes('Forbidden') ? 403 : error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await requireAdminOrManager();
        const { id } = await params;
        const userId = parseInt(id);
        const { featureIds } = await request.json();

        if (!Array.isArray(featureIds)) {
            return NextResponse.json(
                { error: 'featureIds must be an array' },
                { status: 400 }
            );
        }

        await setUserFeatures(userId, featureIds, session.userId);
        const updatedFeatures = await getUserFeatures(userId);

        return NextResponse.json({
            success: true,
            features: updatedFeatures
        });
    } catch (error: any) {
        console.error('Update user features error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message.includes('Forbidden') ? 403 : error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}

