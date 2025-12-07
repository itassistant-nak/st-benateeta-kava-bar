import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrManager } from '@/lib/session';
import { getAllUsers, createUser, getUsersWithFeatures, UserRole } from '@/lib/auth';

export async function GET(request: NextRequest) {
    try {
        await requireAdminOrManager();
        const { searchParams } = new URL(request.url);
        const includeFeatures = searchParams.get('includeFeatures') === 'true';

        if (includeFeatures) {
            const users = await getUsersWithFeatures();
            return NextResponse.json(users);
        }

        const users = await getAllUsers();
        return NextResponse.json(users);
    } catch (error: any) {
        console.error('Get users error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message.includes('Forbidden') ? 403 : error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const session = await requireAdminOrManager();
        const { username, password, role = 'user' } = await request.json();

        if (!username || !password) {
            return NextResponse.json(
                { error: 'Username and password are required' },
                { status: 400 }
            );
        }

        // Managers can only create users, not admins or other managers
        if (session.role === 'manager' && (role === 'admin' || role === 'manager')) {
            return NextResponse.json(
                { error: 'Managers can only create regular users' },
                { status: 403 }
            );
        }

        const validRoles: UserRole[] = ['admin', 'manager', 'user'];
        if (!validRoles.includes(role)) {
            return NextResponse.json(
                { error: 'Invalid role. Must be admin, manager, or user' },
                { status: 400 }
            );
        }

        const userId = await createUser(username, password, role);

        return NextResponse.json(
            { id: userId, username, role },
            { status: 201 }
        );
    } catch (error: any) {
        console.error('Create user error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message.includes('Forbidden') ? 403 : error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}
