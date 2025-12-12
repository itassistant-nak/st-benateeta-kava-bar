'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface Entry {
    id: number;
    date: string;
    group_name: string | null;
    cash_in_hand: number;
    credits: number;
    waiter_expense: number;
    servers_expense: number;
    bookkeeping_expense: number;
    other_expenses: number;
    packets_used: number;
    cups_used: number;
    powder_cost: number;
    profit: number;
    notes: string | null;
}

export default function EntryList() {
    const [entries, setEntries] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const handlePrint = (entry: Entry) => {
        const totalExpenses = entry.waiter_expense + entry.servers_expense + entry.bookkeeping_expense + entry.other_expenses;
        const printContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Daily Entry - ${format(new Date(entry.date), 'MMM dd, yyyy')}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; }
                    h1 { text-align: center; color: #333; border-bottom: 2px solid #8B7355; padding-bottom: 10px; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .date { font-size: 1.2em; color: #666; }
                    .section { margin: 15px 0; padding: 15px; background: #f9f9f9; border-radius: 8px; }
                    .section-title { font-weight: bold; color: #8B7355; margin-bottom: 10px; font-size: 1.1em; }
                    .row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; }
                    .row:last-child { border-bottom: none; }
                    .label { color: #666; }
                    .value { font-weight: bold; }
                    .profit { font-size: 1.3em; color: ${entry.profit >= 0 ? '#10B981' : '#EF4444'}; }
                    .notes { font-style: italic; color: #666; margin-top: 10px; }
                    .footer { text-align: center; margin-top: 20px; color: #999; font-size: 0.9em; }
                    @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>🥥 ST Benateeta Kava Bar Daily Entry</h1>
                    <div class="date">${format(new Date(entry.date), 'MMMM dd, yyyy')}</div>
                    ${entry.group_name ? `<div style="color: #666; margin-top: 5px;">Group: ${entry.group_name}</div>` : ''}
                </div>

                <div class="section">
                    <div class="section-title">Revenue</div>
                    <div class="row"><span class="label">Cash in Hand</span><span class="value">$${entry.cash_in_hand.toFixed(2)}</span></div>
                    <div class="row"><span class="label">Credits</span><span class="value">$${entry.credits.toFixed(2)}</span></div>
                </div>

                <div class="section">
                    <div class="section-title">Expenses</div>
                    <div class="row"><span class="label">Te tia roti</span><span class="value">$${entry.waiter_expense.toFixed(2)}</span></div>
                    <div class="row"><span class="label">Servers</span><span class="value">$${entry.servers_expense.toFixed(2)}</span></div>
                    <div class="row"><span class="label">Bookkeeping</span><span class="value">$${entry.bookkeeping_expense.toFixed(2)}</span></div>
                    <div class="row"><span class="label">Other</span><span class="value">$${entry.other_expenses.toFixed(2)}</span></div>
                    <div class="row" style="border-top: 2px solid #ddd; margin-top: 5px; padding-top: 10px;">
                        <span class="label"><strong>Total Expenses</strong></span>
                        <span class="value">$${totalExpenses.toFixed(2)}</span>
                    </div>
                </div>

                <div class="section">
                    <div class="section-title">Powder Usage</div>
                    <div class="row"><span class="label">Packets Used</span><span class="value">${entry.packets_used}</span></div>
                    <div class="row"><span class="label">Cups Used</span><span class="value">${entry.cups_used}</span></div>
                    <div class="row"><span class="label">Powder Cost</span><span class="value">$${entry.powder_cost.toFixed(2)}</span></div>
                </div>

                <div class="section" style="background: #f0f0f0;">
                    <div class="row">
                        <span class="label" style="font-size: 1.1em;"><strong>Rakan te kamooi iakuun kabanemwane</strong></span>
                        <span class="value profit">$${entry.profit.toFixed(2)}</span>
                    </div>
                </div>

                ${entry.notes ? `<div class="notes"><strong>Notes:</strong> ${entry.notes}</div>` : ''}

                <div class="footer">
                    Printed on ${format(new Date(), 'MMMM dd, yyyy \'at\' h:mm a')}
                </div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.onload = () => {
                printWindow.print();
            };
        }
    };

    const fetchEntries = async () => {
        try {
            const response = await fetch('/api/entries');
            if (!response.ok) throw new Error('Failed to fetch entries');
            const data = await response.json();
            setEntries(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEntries();
    }, []);

    if (loading) {
        return (
            <div className="card text-center">
                <div className="spinner" style={{ margin: '0 auto' }} />
                <p className="text-muted mt-md">Loading entries...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card">
                <div className="badge badge-error w-full" style={{ padding: 'var(--spacing-md)' }}>
                    {error}
                </div>
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className="card text-center">
                <p className="text-muted">No entries yet. Create your first entry above!</p>
            </div>
        );
    }

    return (
        <div className="card">
            <h3 className="mb-lg">Recent Entries</h3>

            <div className="table-container">
                <table className="table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Cash</th>
                            <th>Credits</th>
                            <th>Expenses</th>
                            <th>Powder</th>
                            <th>Rakan te kamooi iakuun kabanemwane</th>
                            <th>Print</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.map((entry) => (
                            <tr key={entry.id}>
                                <td>
                                    <strong>{format(new Date(entry.date), 'MMM dd, yyyy')}</strong>
                                    {entry.group_name && (
                                        <div className="text-dim" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                            Group: {entry.group_name}
                                        </div>
                                    )}
                                    {entry.notes && (
                                        <div className="text-dim" style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>
                                            {entry.notes}
                                        </div>
                                    )}
                                </td>
                                <td>${entry.cash_in_hand.toFixed(2)}</td>
                                <td>${entry.credits.toFixed(2)}</td>
                                <td>
                                    ${(entry.waiter_expense + entry.servers_expense + entry.bookkeeping_expense + entry.other_expenses).toFixed(2)}
                                    <div className="text-dim" style={{ fontSize: '0.75rem' }}>
                                        W:${entry.waiter_expense.toFixed(0)} S:${entry.servers_expense.toFixed(0)} B:${entry.bookkeeping_expense.toFixed(0)} O:${entry.other_expenses.toFixed(0)}
                                    </div>
                                </td>
                                <td>
                                    ${entry.powder_cost.toFixed(2)}
                                    <div className="text-dim" style={{ fontSize: '0.75rem' }}>
                                        {entry.packets_used}p + {entry.cups_used}c
                                    </div>
                                </td>
                                <td>
                                    <span className={entry.profit >= 0 ? 'text-success' : 'text-error'}>
                                        <strong>${entry.profit.toFixed(2)}</strong>
                                    </span>
                                </td>
                                <td>
                                    <button
                                        onClick={() => handlePrint(entry)}
                                        className="btn btn-secondary"
                                        style={{ padding: 'var(--spacing-xs) var(--spacing-sm)', fontSize: '0.85rem' }}
                                        title="Print this entry"
                                    >
                                        🖨️
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
