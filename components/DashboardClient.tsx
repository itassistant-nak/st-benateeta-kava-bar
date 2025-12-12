'use client';

import { useState } from 'react';
import DailyEntryForm from '@/components/DailyEntryForm';
import EntryList from '@/components/EntryList';

export default function DashboardClient() {
    const [refreshKey, setRefreshKey] = useState(0);

    const handleEntrySuccess = () => {
        // Trigger refresh of entry list
        setRefreshKey(prev => prev + 1);
    };

    return (
        <div className="container" style={{ paddingTop: 'var(--spacing-xl)', paddingBottom: 'var(--spacing-2xl)' }}>
            <div className="mb-2xl">
                <div>
                    <h1>Daily Entry</h1>
                    <p className="text-muted">Track your daily kava bar income and expenses</p>
                </div>
            </div>

            <div className="grid gap-xl">
                <DailyEntryForm onSuccess={handleEntrySuccess} />
                <EntryList key={refreshKey} />
            </div>
        </div>
    );
}

