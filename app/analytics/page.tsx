import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getUserFeatures } from '@/lib/auth';
import StatsDashboard from '@/components/StatsDashboard';

export default async function AnalyticsPage() {
    const session = await getSession();

    if (!session) {
        redirect('/');
    }

    // Check if user has dashboard access
    const isAdminOrManager = session.role === 'admin' || session.role === 'manager';
    const features = await getUserFeatures(session.userId);
    const hasDashboardFeature = features.some(f => f.name === 'dashboard');

    if (!isAdminOrManager && !hasDashboardFeature) {
        return (
            <div className="container" style={{ paddingTop: 'var(--spacing-xl)', paddingBottom: 'var(--spacing-2xl)' }}>
                <div className="card text-center">
                    <h1>🚫 Access Denied</h1>
                    <p className="text-muted mt-md">You don't have access to the analytics dashboard.</p>
                    <p className="text-muted">Please contact an administrator to get access.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="container" style={{ paddingTop: 'var(--spacing-xl)', paddingBottom: 'var(--spacing-2xl)' }}>
            <StatsDashboard />
        </div>
    );
}
