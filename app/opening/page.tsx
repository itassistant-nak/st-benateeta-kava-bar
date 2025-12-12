import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import AdjustmentsClientPage from './client';

export default async function OpeningPage() {
    const session = await getSession();

    if (!session) {
        redirect('/');
    }

    return <AdjustmentsClientPage />;
}
