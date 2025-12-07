import SystemPage from '@/components/SystemPage';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

export default async function SystemAdminPage() {
    const session = await getSession();

    if (!session) {
        redirect('/');
    }

    // Only admins can access system page
    if (session.role !== 'admin') {
        redirect('/dashboard');
    }

    return (
        <div className="container" style={{ paddingTop: 'var(--spacing-xl)', paddingBottom: 'var(--spacing-2xl)' }}>
            <SystemPage />
        </div>
    );
}

