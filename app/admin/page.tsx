import AdminPanel from '@/components/AdminPanel';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getUserFeatures } from '@/lib/auth';

export default async function AdminPage() {
    const session = await getSession();

    if (!session) {
        redirect('/');
    }

    // Check if user has admin access
    const isAdminOrManager = session.role === 'admin' || session.role === 'manager';
    const features = await getUserFeatures(session.userId);
    const hasAdminFeature = features.some(f => f.name === 'admin');

    if (!isAdminOrManager && !hasAdminFeature) {
        redirect('/dashboard');
    }

    return (
        <div className="container" style={{ paddingTop: 'var(--spacing-xl)', paddingBottom: 'var(--spacing-2xl)' }}>
            <AdminPanel />
        </div>
    );
}
