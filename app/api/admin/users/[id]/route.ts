import { NextRequest, NextResponse } from 'next/server';
import { requireAdminOrManager } from '@/lib/session';
import { deleteUser, getUserById } from '@/lib/auth';

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await requireAdminOrManager();
        const { id } = await params;
        const userId = parseInt(id);

        if (userId === 1) {
            return NextResponse.json(
                { error: 'Cannot delete default admin user' },
                { status: 400 }
            );
        }

        // Managers can only delete regular users
        if (session.role === 'manager') {
            const targetUser = await getUserById(userId);
            if (targetUser && (targetUser.role === 'admin' || targetUser.role === 'manager')) {
                return NextResponse.json(
                    { error: 'Managers can only delete regular users' },
                    { status: 403 }
                );
            }
        }

        await deleteUser(userId);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Delete user error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message.includes('Forbidden') ? 403 : error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}
