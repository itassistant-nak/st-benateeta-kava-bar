import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getUserFeatures } from '@/lib/auth';
import DashboardClient from '@/components/DashboardClient';

export default async function DashboardPage() {
    const session = await getSession();

    if (!session) {
        redirect('/');
    }

    // Check if user has dashboard access
    const isAdminOrManager = session.role === 'admin' || session.role === 'manager';
    const features = await getUserFeatures(session.userId);
    const hasDashboardFeature = features.some(f => f.name === 'dashboard');

    if (!isAdminOrManager && !hasDashboardFeature) {
        // User has no features - show access denied
        return (
            <div className="container" style={{ paddingTop: 'var(--spacing-xl)', paddingBottom: 'var(--spacing-2xl)' }}>
                <div className="card text-center">
                    <h1>🚫 Access Denied</h1>
                    <p className="text-muted mt-md">You don't have access to any features yet.</p>
                    <p className="text-muted">Please contact an administrator to get access.</p>
                </div>
            </div>
        );
    }

    return <DashboardClient />;
}
