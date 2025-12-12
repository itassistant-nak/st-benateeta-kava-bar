'use client';

import { useState, useEffect } from 'react';

interface SummaryData {
    cashOnHand: number;
    powderPackets: number;
    powderCups: number;
}

export default function DashboardSummary() {
    const [data, setData] = useState<SummaryData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSummary();
    }, []);

    const fetchSummary = async () => {
        try {
            setLoading(true);

            // Fetch cash adjustments
            const cashResponse = await fetch('/api/adjustments');
            const adjustments = await cashResponse.json();
            const cashAdjustments = adjustments
                .filter((adj: any) => adj.type === 'cash')
                .reduce((sum: number, adj: any) => sum + adj.amount, 0);

            // Fetch powder inventory
            const inventoryResponse = await fetch('/api/inventory');
            const inventory = await inventoryResponse.json();

            setData({
                cashOnHand: cashAdjustments,
                powderPackets: inventory.formatted.packets,
                powderCups: inventory.formatted.cups
            });
        } catch (err) {
            console.error('Failed to fetch summary:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="grid grid-2 gap-md mobile-1-col mb-xl">
                <div className="card">
                    <p className="text-muted">Loading...</p>
                </div>
                <div className="card">
                    <p className="text-muted">Loading...</p>
                </div>
            </div>
        );
    }

    if (!data) return null;

    return (
        <div className="grid grid-2 gap-md mobile-1-col mb-xl">
            {/* Cash on Hand */}
            <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <p style={{ margin: 0, opacity: 0.9, fontSize: '0.875rem' }}>Cash on Hand</p>
                        <h2 style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold' }}>
                            ${data.cashOnHand.toFixed(2)}
                        </h2>
                    </div>
                    <div style={{ fontSize: '3rem', opacity: 0.3 }}>💵</div>
                </div>
            </div>

            {/* Powder on Hand */}
            <div className="card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                        <p style={{ margin: 0, opacity: 0.9, fontSize: '0.875rem' }}>Powder on Hand</p>
                        <h2 style={{ margin: '0.5rem 0 0 0', fontSize: '2rem', fontWeight: 'bold' }}>
                            {data.powderPackets}p {data.powderCups}c
                        </h2>
                        <p style={{ margin: '0.25rem 0 0 0', opacity: 0.8, fontSize: '0.75rem' }}>
                            ({data.powderPackets * 8 + data.powderCups} cups total)
                        </p>
                    </div>
                    <div style={{ fontSize: '3rem', opacity: 0.3 }}>🥥</div>
                </div>
            </div>
        </div>
    );
}
