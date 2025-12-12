'use client';

import { useState } from 'react';
import AdjustmentForm from '@/components/AdjustmentForm';
import AdjustmentsList from '@/components/AdjustmentsList';

export default function AdjustmentsClientPage() {
    const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleAdjustmentSuccess = () => {
        setShowAdjustmentForm(false);
        setRefreshKey(prev => prev + 1);
    };

    return (
        <div className="container" style={{ paddingTop: 'var(--spacing-xl)', paddingBottom: 'var(--spacing-2xl)' }}>
            <div className="mb-2xl">
                <h1>Adjustments</h1>
                <p className="text-muted">Manage stock and cash adjustments</p>
            </div>

            <div className="grid gap-xl" style={{ maxWidth: '1200px', margin: '0 auto' }}>
                {/* Adjustments Form Section */}
                <div className="card">
                    <div className="flex justify-between items-center mb-lg">
                        <div>
                            <h3 className="m-0">Stock & Cash Adjustments</h3>
                            <p className="text-muted text-sm mt-xs">Add or remove stock/cash with notes</p>
                        </div>
                        {!showAdjustmentForm && (
                            <button
                                className="btn btn-primary"
                                onClick={() => setShowAdjustmentForm(true)}
                            >
                                + New Adjustment
                            </button>
                        )}
                    </div>

                    {showAdjustmentForm && (
                        <div className="mb-lg">
                            <AdjustmentForm
                                onSuccess={handleAdjustmentSuccess}
                                onCancel={() => setShowAdjustmentForm(false)}
                            />
                        </div>
                    )}

                    <div className="text-muted text-sm">
                        <p><strong>How to use adjustments:</strong></p>
                        <ul style={{ marginLeft: 'var(--spacing-lg)', marginTop: 'var(--spacing-sm)' }}>
                            <li><strong>Cash adjustments</strong>: Use positive values to add cash, negative to remove</li>
                            <li><strong>Powder adjustments</strong>: Specify packets and cups separately (e.g., +2 packets, -3 cups)</li>
                            <li>All adjustments require notes explaining the reason</li>
                            <li>Adjustments are tracked separately and included in reports</li>
                        </ul>
                    </div>
                </div>

                {/* Adjustments History Table */}
                <AdjustmentsList key={refreshKey} refreshKey={refreshKey} />
            </div>
        </div>
    );
}
