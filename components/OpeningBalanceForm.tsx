
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface Props {
    onSuccess?: () => void;
}

export default function OpeningBalanceForm({ onSuccess }: Props) {
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [openingCash, setOpeningCash] = useState('');
    const [openingPackets, setOpeningPackets] = useState('');
    const [openingCups, setOpeningCups] = useState('');
    const [openingNotes, setOpeningNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Fetch existing data for this date
        checkExistingEntry(date);
    }, [date]);

    const checkExistingEntry = async (selectedDate: string) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/entries?startDate=${selectedDate}&endDate=${selectedDate}`);
            if (response.ok) {
                const data = await response.json();
                if (data && data.length > 0) {
                    const entry = data[0];
                    setOpeningCash(entry.opening_cash?.toString() || '');
                    setOpeningPackets(entry.opening_packets?.toString() || '');
                    setOpeningCups(entry.opening_cups?.toString() || '');
                    setOpeningNotes(entry.opening_notes || '');
                } else {
                    // Reset if no entry
                    setOpeningCash('');
                    setOpeningPackets('');
                    setOpeningCups('');
                    setOpeningNotes('');
                }
            }
        } catch (err) {
            console.error('Failed to fetch entry', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            const response = await fetch('/api/entries', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date,
                    opening_cash: parseFloat(openingCash) || 0,
                    opening_packets: parseFloat(openingPackets) || 0,
                    opening_cups: parseFloat(openingCups) || 0,
                    opening_notes: openingNotes || null,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to save opening balance');
            }

            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
            if (onSuccess) onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <h3 className="mb-lg">Opening Balance</h3>

            {error && (
                <div className="badge badge-error mb-lg w-full" style={{ padding: 'var(--spacing-md)' }}>
                    {error}
                </div>
            )}

            {success && (
                <div className="badge badge-success mb-lg w-full" style={{ padding: 'var(--spacing-md)' }}>
                    ✅ Saved successfully!
                </div>
            )}

            <form onSubmit={handleSubmit}>
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

                <div className="grid grid-2" style={{ gap: 'var(--spacing-md)' }}>
                    <div className="form-group" style={{ gridColumn: 'span 2' }}>
                        <label className="form-label">Opening Cash (AUD)</label>
                        <input
                            type="number"
                            step="0.01"
                            className="input"
                            value={openingCash}
                            onChange={(e) => setOpeningCash(e.target.value)}
                            placeholder="0.00"
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Opening Packets</label>
                        <input
                            type="number"
                            step="1"
                            className="input"
                            value={openingPackets}
                            onChange={(e) => setOpeningPackets(e.target.value)}
                            placeholder="0"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Opening Cups</label>
                        <input
                            type="number"
                            step="1"
                            className="input"
                            value={openingCups}
                            onChange={(e) => setOpeningCups(e.target.value)}
                            placeholder="0"
                        />
                    </div>
                </div>

                <div className="form-group" style={{ marginTop: 'var(--spacing-md)' }}>
                    <label className="form-label">Details / Adjustments</label>
                    <textarea
                        className="textarea"
                        value={openingNotes}
                        onChange={(e) => setOpeningNotes(e.target.value)}
                        placeholder="Any notes about the opening balance..."
                        rows={3}
                    />
                </div>

                <div style={{ marginTop: 'var(--spacing-xl)' }}>
                    <button type="submit" className="btn btn-success w-full" disabled={loading}>
                        {loading ? <span className="spinner" /> : 'Save Opening Balance'}
                    </button>
                </div>
            </form>
        </div>
    );
}
