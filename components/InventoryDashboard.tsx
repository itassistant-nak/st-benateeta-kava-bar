'use client';

import { useState, useEffect } from 'react';

interface InventoryData {
    totalPurchasedPackets: number;
    totalUsedFromPackets: number;
    totalUsedFromCups: number;
    totalUsedCupsConverted: number;
    remainingCupsBalance: number;
    formatted: {
        packets: number;
        cups: number;
    };
}

export default function InventoryDashboard({ refreshTrigger }: { refreshTrigger?: number }) {
    const [data, setData] = useState<InventoryData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchInventory();
    }, [refreshTrigger]);

    const fetchInventory = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/api/inventory');
            if (!response.ok) throw new Error('Failed to fetch inventory data');
            const jsonData = await response.json();
            setData(jsonData);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading) {
        return <div className="card"><p>Loading inventory...</p></div>;
    }

    if (error) {
        return <div className="card"><p className="text-error">Error: {error}</p></div>;
    }

    if (!data) return null;

    const isLowStock = data.formatted.packets < 3;
    // Format display for negative values properly
    let displayPackets = data.formatted.packets;
    let displayCups = data.formatted.cups;

    // If balance is negative
    if (data.remainingCupsBalance < 0) {
        // Just show total negative cups equivalent roughly, or standard calculation handles it (e.g. -1 packet, -2 cups)
        // JS modulo on negative numbers behaves differently (-10 % 8 = -2). Math.floor(-10/8) = -2.
        // So -2 packets, -2 cups = -16 - 2 = -18? No. 
        // -1.25 packets.
        // Let's stick to the raw calculation from API which used Math.floor.
    }

    return (
        <div className="card" style={{ marginBottom: '24px', border: isLowStock ? '1px solid #ef4444' : '1px solid #2a2a2a' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 className="card-title" style={{ margin: 0 }}>📦 Powder Inventory</h3>
                {isLowStock && (
                    <span className="badge badge-error" style={{ animation: 'pulse 2s infinite' }}>
                        Low Stock
                    </span>
                )}
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px'
            }}>
                {/* Total Purchased */}
                <div style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    padding: '12px',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Purchased</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#3b82f6' }}>
                        {data.totalPurchasedPackets}
                        <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#666', marginLeft: '4px' }}>pkts</span>
                    </div>
                </div>

                {/* Total Used */}
                <div style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    padding: '12px',
                    borderRadius: '8px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Used</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ef4444' }}>
                        {(data.totalUsedCupsConverted / 8).toFixed(1)}
                        <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#666', marginLeft: '4px' }}>pkts</span>
                    </div>
                </div>

                {/* Remaining */}
                <div style={{
                    backgroundColor: 'rgba(255,255,255,0.03)',
                    padding: '12px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    border: isLowStock ? '1px solid #ef4444' : '1px solid transparent'
                }}>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '4px' }}>Remaining</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: isLowStock ? '#ef4444' : '#10b981' }}>
                        {displayPackets}
                        <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#666', marginLeft: '2px' }}>p</span>
                        {' '}
                        {displayCups}
                        <span style={{ fontSize: '12px', fontWeight: 'normal', color: '#666', marginLeft: '2px' }}>c</span>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '16px', fontSize: '12px', color: '#666', textAlign: 'center' }}>
                Total: {(data.remainingCupsBalance).toFixed(1)} cups available
                {data.remainingCupsBalance < 0 && (
                    <span style={{ color: '#ef4444', marginLeft: '8px' }}>(Deficit)</span>
                )}
            </div>

            <style jsx>{`
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
            `}</style>
        </div>
    );
}
