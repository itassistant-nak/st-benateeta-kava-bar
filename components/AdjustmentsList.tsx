'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface Adjustment {
    id: number;
    date: string;
    type: 'cash' | 'powder';
    amount: number;
    notes: string;
    created_at: string;
}

export default function AdjustmentsList({ refreshKey }: { refreshKey?: number }) {
    const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchAdjustments();
    }, [refreshKey]);

    const fetchAdjustments = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/adjustments');
            if (!response.ok) throw new Error('Failed to fetch adjustments');
            const data = await response.json();
            setAdjustments(data);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const formatAmount = (amount: number, type: 'cash' | 'powder') => {
        if (type === 'cash') {
            return amount >= 0 ? `+$${amount.toFixed(2)}` : `-$${Math.abs(amount).toFixed(2)}`;
        } else {
            // Convert cups to packets and cups for display
            const packets = Math.floor(Math.abs(amount) / 8);
            const cups = Math.abs(amount) % 8;
            const sign = amount >= 0 ? '+' : '-';

            if (packets > 0 && cups > 0) {
                return `${sign}${packets}p ${cups}c`;
            } else if (packets > 0) {
                return `${sign}${packets}p`;
            } else {
                return `${sign}${cups}c`;
            }
        }
    };

    if (loading) {
        return <div className="card"><p>Loading adjustments...</p></div>;
    }

    if (error) {
        return <div className="card"><p className="text-error">Error: {error}</p></div>;
    }

    if (adjustments.length === 0) {
        return (
            <div className="card text-center" style={{ padding: 'var(--spacing-xl)' }}>
                <p className="text-muted">No adjustments recorded yet.</p>
            </div>
        );
    }

    return (
        <div className="card">
            <h3 className="card-title mb-lg">Adjustment History</h3>
            <div style={{ overflowX: 'auto' }}>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {adjustments.map((adj) => (
                            <tr key={adj.id}>
                                <td>{format(new Date(adj.date), 'MMM dd, yyyy')}</td>
                                <td>
                                    <span className={`badge ${adj.type === 'cash' ? 'badge-success' : 'badge-info'}`}>
                                        {adj.type === 'cash' ? '💵 Cash' : '🥥 Powder'}
                                    </span>
                                </td>
                                <td>
                                    <span
                                        className={adj.amount >= 0 ? 'text-green-500' : 'text-red-500'}
                                        style={{ fontWeight: 'bold' }}
                                    >
                                        {formatAmount(adj.amount, adj.type)}
                                    </span>
                                </td>
                                <td className="text-muted">{adj.notes}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
