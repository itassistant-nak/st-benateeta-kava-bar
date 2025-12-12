'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface PowderPurchase {
    id: number;
    user_id: number;
    purchase_date: string;
    supplier_name: string | null;
    packets_purchased: number;
    cost_per_packet: number;
    total_cost: number;
    payment_method: string | null;
    invoice_number: string | null;
    notes: string | null;
    created_at: string;
}

interface PowderPurchaseListProps {
    refreshTrigger?: number;
}

export default function PowderPurchaseList({ refreshTrigger }: PowderPurchaseListProps) {
    const [purchases, setPurchases] = useState<PowderPurchase[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<Partial<PowderPurchase>>({});

    useEffect(() => {
        fetchPurchases();
    }, [refreshTrigger]);

    const fetchPurchases = async () => {
        try {
            setIsLoading(true);
            const response = await fetch('/api/powder-purchases');
            if (!response.ok) throw new Error('Failed to fetch purchases');
            const data = await response.json();
            setPurchases(data);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this purchase?')) return;

        try {
            const response = await fetch(`/api/powder-purchases?id=${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) throw new Error('Failed to delete purchase');

            setPurchases(purchases.filter(p => p.id !== id));
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const startEdit = (purchase: PowderPurchase) => {
        setEditingId(purchase.id);
        setEditForm(purchase);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    const saveEdit = async () => {
        try {
            const response = await fetch('/api/powder-purchases', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(editForm),
            });

            if (!response.ok) throw new Error('Failed to update purchase');

            const updated = await response.json();
            setPurchases(purchases.map(p => p.id === updated.id ? updated : p));
            setEditingId(null);
            setEditForm({});
        } catch (err: any) {
            alert('Error: ' + err.message);
        }
    };

    const totalPurchases = purchases.reduce((sum, p) => sum + p.total_cost, 0);
    const totalPackets = purchases.reduce((sum, p) => sum + p.packets_purchased, 0);

    if (isLoading) {
        return <div className="card"><p>Loading purchases...</p></div>;
    }

    if (error) {
        return <div className="card"><p style={{ color: '#ef4444' }}>Error: {error}</p></div>;
    }

    return (
        <div className="card">
            <h2 className="card-title">Powder Purchase History</h2>

            {purchases.length === 0 ? (
                <p style={{ color: '#888', textAlign: 'center', padding: '40px 0' }}>
                    No powder purchases recorded yet.
                </p>
            ) : (
                <>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Supplier</th>
                                    <th>Packets</th>
                                    <th>Cost/Packet</th>
                                    <th>Total Cost</th>
                                    <th>Payment</th>
                                    <th>Invoice</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchases.map((purchase) => (
                                    <tr key={purchase.id}>
                                        {editingId === purchase.id ? (
                                            <>
                                                <td>
                                                    <input
                                                        type="date"
                                                        className="input"
                                                        value={editForm.purchase_date || ''}
                                                        onChange={(e) => setEditForm({ ...editForm, purchase_date: e.target.value })}
                                                        style={{ width: '140px', padding: '4px 8px' }}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        className="input"
                                                        value={editForm.supplier_name || ''}
                                                        onChange={(e) => setEditForm({ ...editForm, supplier_name: e.target.value })}
                                                        style={{ width: '120px', padding: '4px 8px' }}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="input"
                                                        value={editForm.packets_purchased || 0}
                                                        onChange={(e) => setEditForm({
                                                            ...editForm,
                                                            packets_purchased: parseInt(e.target.value) || 0
                                                        })}
                                                        style={{ width: '80px', padding: '4px 8px' }}
                                                    />
                                                </td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className="input"
                                                        value={editForm.cost_per_packet || 0}
                                                        onChange={(e) => setEditForm({
                                                            ...editForm,
                                                            cost_per_packet: parseFloat(e.target.value) || 0
                                                        })}
                                                        style={{ width: '80px', padding: '4px 8px' }}
                                                    />
                                                </td>
                                                <td>${((editForm.packets_purchased || 0) * (editForm.cost_per_packet || 0)).toFixed(2)}</td>
                                                <td>
                                                    <select
                                                        className="input"
                                                        value={editForm.payment_method || 'cash'}
                                                        onChange={(e) => setEditForm({ ...editForm, payment_method: e.target.value })}
                                                        style={{ width: '100px', padding: '4px 8px' }}
                                                    >
                                                        <option value="cash">Cash</option>
                                                        <option value="credit">Credit</option>
                                                        <option value="bank_transfer">Bank Transfer</option>
                                                    </select>
                                                </td>
                                                <td>
                                                    <input
                                                        type="text"
                                                        className="input"
                                                        value={editForm.invoice_number || ''}
                                                        onChange={(e) => setEditForm({ ...editForm, invoice_number: e.target.value })}
                                                        style={{ width: '100px', padding: '4px 8px' }}
                                                    />
                                                </td>
                                                <td>
                                                    <button onClick={saveEdit} className="btn-icon" title="Save">💾</button>
                                                    <button onClick={cancelEdit} className="btn-icon" title="Cancel">❌</button>
                                                </td>
                                            </>
                                        ) : (
                                            <>
                                                <td>{format(new Date(purchase.purchase_date), 'MMM dd, yyyy')}</td>
                                                <td>{purchase.supplier_name || '-'}</td>
                                                <td>{purchase.packets_purchased}</td>
                                                <td>${purchase.cost_per_packet.toFixed(2)}</td>
                                                <td style={{ color: '#ef4444', fontWeight: 'bold' }}>${purchase.total_cost.toFixed(2)}</td>
                                                <td style={{ textTransform: 'capitalize' }}>{purchase.payment_method || '-'}</td>
                                                <td>{purchase.invoice_number || '-'}</td>
                                                <td>
                                                    <button onClick={() => startEdit(purchase)} className="btn-icon" title="Edit">✏️</button>
                                                    <button onClick={() => handleDelete(purchase.id)} className="btn-icon" title="Delete">🗑️</button>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Summary */}
                    <div style={{
                        marginTop: '20px',
                        padding: '16px',
                        backgroundColor: '#1a1a1a',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-around',
                        flexWrap: 'wrap',
                        gap: '16px'
                    }}>
                        <div>
                            <div style={{ color: '#888', fontSize: '14px' }}>Total Purchases</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>{purchases.length}</div>
                        </div>
                        <div>
                            <div style={{ color: '#888', fontSize: '14px' }}>Total Packets</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3b82f6' }}>{totalPackets}</div>
                        </div>
                        <div>
                            <div style={{ color: '#888', fontSize: '14px' }}>Total Cost</div>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>${totalPurchases.toFixed(2)}</div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
