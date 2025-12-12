
'use client';

import { useState } from 'react';
import { format } from 'date-fns';

interface Props {
    onSuccess: () => void;
    onCancel: () => void;
}

export default function AdjustmentForm({ onSuccess, onCancel }: Props) {
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [type, setType] = useState<'cash' | 'powder'>('cash');
    const [amount, setAmount] = useState('');
    const [packets, setPackets] = useState('');
    const [cups, setCups] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            let finalAmount: number;

            if (type === 'powder') {
                // Convert packets and cups to total cups (8 cups per packet)
                const packetValue = packets.trim() === '' ? 0 : parseFloat(packets);
                const cupValue = cups.trim() === '' ? 0 : parseFloat(cups);

                // Check for invalid numbers
                if (isNaN(packetValue) || isNaN(cupValue)) {
                    setError('Please enter valid numbers for packets and cups');
                    setLoading(false);
                    return;
                }

                finalAmount = (packetValue * 8) + cupValue;

                // Validate that at least one value is non-zero
                if (finalAmount === 0) {
                    setError('Please enter at least one non-zero value for packets or cups');
                    setLoading(false);
                    return;
                }
            } else {
                // Validate cash amount
                if (!amount || amount.trim() === '') {
                    setError('Please enter a cash amount');
                    setLoading(false);
                    return;
                }

                finalAmount = parseFloat(amount);

                if (isNaN(finalAmount)) {
                    setError('Please enter a valid amount');
                    setLoading(false);
                    return;
                }

                if (finalAmount === 0) {
                    setError('Amount cannot be zero');
                    setLoading(false);
                    return;
                }
            }

            // Final safety check
            if (!isFinite(finalAmount)) {
                setError('Invalid amount calculated');
                setLoading(false);
                return;
            }

            const payload = {
                date,
                type,
                amount: finalAmount,
                notes
            };

            console.log('Sending adjustment:', payload);

            const response = await fetch('/api/adjustments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to save adjustment');
            }

            onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card" style={{ width: '100%' }}>
            <h3 style={{ marginTop: 0 }}>Add Adjustment</h3>

            {error && (
                <div className="badge badge-error mb-md w-full">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit}>
                <div className="grid grid-2 gap-md mobile-1-col">
                    <div className="form-group">
                        <label className="form-label">Date</label>
                        <input
                            type="date"
                            className="input"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Type</label>
                        <select
                            className="input"
                            value={type}
                            onChange={(e) => setType(e.target.value as 'cash' | 'powder')}
                        >
                            <option value="cash">Cash Value (AUD)</option>
                            <option value="powder">Powder (Stock)</option>
                        </select>
                    </div>
                </div>

                {type === 'cash' ? (
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="form-label">Amount (+/-)</label>
                        <input
                            type="number"
                            step="0.01"
                            className="input"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="-50.00 or 50.00"
                            required
                        />
                        <span className="form-hint">
                            Positive to increase, Negative to decrease.
                        </span>
                    </div>
                ) : (
                    <>
                        <div className="form-group">
                            <label className="form-label">Packets (+/-)</label>
                            <input
                                type="number"
                                step="1"
                                className="input"
                                value={packets}
                                onChange={(e) => setPackets(e.target.value)}
                                placeholder="0"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Cups (+/-)</label>
                            <input
                                type="number"
                                step="1"
                                className="input"
                                value={cups}
                                onChange={(e) => setCups(e.target.value)}
                                placeholder="0"
                            />
                        </div>
                        <div className="form-hint" style={{ gridColumn: 'span 2' }}>
                            Use negative values to remove stock (e.g., -2 packets for damaged goods)
                        </div>
                    </>
                )}

                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                    <label className="form-label">Notes</label>
                    <textarea
                        className="textarea"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Reason for adjustment..."
                        rows={2}
                        required
                    />
                </div>

                <div style={{ display: 'flex', gap: 'var(--spacing-md)', marginTop: 'var(--spacing-lg)', gridColumn: 'span 2' }}>
                    <button type="button" className="btn btn-secondary flex-1" onClick={onCancel}>
                        Cancel
                    </button>
                    <button type="submit" className="btn btn-primary flex-1" disabled={loading}>
                        {loading ? <span className="spinner" /> : 'Save'}
                    </button>
                </div>
            </form>
        </div>
    );
}
