import { cookies } from 'next/headers';
import { getUserById, User, UserRole } from './auth';

const SESSION_COOKIE_NAME = 'kava_session';

export interface Session {
    userId: number;
    username: string;
    role: UserRole;
}

export async function createSession(user: User): Promise<void> {
    const sessionData = JSON.stringify({
        userId: user.id,
        username: user.username,
        role: user.role,
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionData, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/',
    });
}

export async function getSession(): Promise<Session | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie) return null;

    try {
        const session = JSON.parse(sessionCookie.value) as Session;
        // Verify user still exists
        const user = await getUserById(session.userId);
        if (!user) {
            await destroySession();
            return null;
        }
        return session;
    } catch {
        return null;
    }
}

export async function destroySession(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function requireAuth(): Promise<Session> {
    const session = await getSession();
    if (!session) {
        throw new Error('Unauthorized');
    }
    return session;
}

export async function requireAdmin(): Promise<Session> {
    const session = await requireAuth();
    if (session.role !== 'admin') {
        throw new Error('Forbidden: Admin access required');
    }
    return session;
}

export async function requireAdminOrManager(): Promise<Session> {
    const session = await requireAuth();
    if (session.role !== 'admin' && session.role !== 'manager') {
        throw new Error('Forbidden: Admin or Manager access required');
    }
    return session;
}
