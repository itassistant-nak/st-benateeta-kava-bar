import ReportsDashboard from '@/components/ReportsDashboard';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getUserFeatures } from '@/lib/auth';

export default async function ReportsPage() {
    const session = await getSession();

    if (!session) {
        redirect('/');
    }

    // Check if user has reports access
    const isAdminOrManager = session.role === 'admin' || session.role === 'manager';
    const features = await getUserFeatures(session.userId);
    const hasReportsFeature = features.some(f => f.name === 'reports');

    if (!isAdminOrManager && !hasReportsFeature) {
        redirect('/dashboard');
    }

    return (
        <div className="container" style={{ paddingTop: 'var(--spacing-xl)', paddingBottom: 'var(--spacing-2xl)' }}>
            <div className="mb-2xl">
                <h1>Reports & Analytics</h1>
                <p className="text-muted">View your performance over time</p>
            </div>

            <ReportsDashboard />
        </div>
    );
}
