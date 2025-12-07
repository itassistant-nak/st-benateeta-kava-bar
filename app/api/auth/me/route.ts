import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getUserFeatures } from '@/lib/auth';

export async function GET() {
    try {
        const session = await getSession();
        
        if (!session) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Get user's features
        const features = await getUserFeatures(session.userId);
        const featureNames = features.map(f => f.name);

        // Admins and managers have all features by default
        const hasAllAccess = session.role === 'admin' || session.role === 'manager';

        return NextResponse.json({
            user: {
                id: session.userId,
                username: session.username,
                role: session.role,
            },
            features: featureNames,
            access: {
                dashboard: hasAllAccess || featureNames.includes('dashboard'),
                reports: hasAllAccess || featureNames.includes('reports'),
                print: hasAllAccess || featureNames.includes('print'),
                admin: hasAllAccess || featureNames.includes('admin'),
                system: session.role === 'admin', // Only admin can access system
            }
        });
    } catch (error: any) {
        console.error('Get current user error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

