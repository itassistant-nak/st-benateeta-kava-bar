'use client';

import { useState, useEffect } from 'react';
import { format, startOfWeek, startOfMonth, subWeeks, subMonths } from 'date-fns';

interface ReportData {
    period: string;
    startDate: string;
    endDate: string;
    entries: Array<{
        date: string;
        cash_in_hand: number;
        credits: number;
        waiter_expense: number;
        servers_expense: number;
        bookkeeping_expense: number;
        other_expenses: number;
        expenses: number;
        powder_cost: number;
        profit: number;
        packets_used: number;
        cups_used: number;
    }>;
    totals: {
        cash_in_hand: number;
        credits: number;
        expenses: number;
        waiter_expense: number;
        servers_expense: number;
        bookkeeping_expense: number;
        other_expenses: number;
        powder_cost: number;
        profit: number;
        packets_used: number;
        cups_used: number;
        purchase_cost: number;
        packets_purchased: number;
    };
}

export default function ReportsDashboard() {
    const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
    const [currentDate, setCurrentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [selectedEntry, setSelectedEntry] = useState<ReportData['entries'][0] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchReport = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await fetch(`/api/reports?period=${period}&date=${currentDate}`);
            if (!response.ok) throw new Error('Failed to fetch report');
            const data = await response.json();
            setReportData(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [period, currentDate]);

    const navigatePeriod = (direction: 'prev' | 'next') => {
        const date = new Date(currentDate);
        let newDate: Date;

        if (period === 'weekly') {
            newDate = direction === 'prev' ? subWeeks(date, 1) : new Date(date.setDate(date.getDate() + 7));
        } else if (period === 'monthly') {
            newDate = direction === 'prev' ? subMonths(date, 1) : new Date(date.setMonth(date.getMonth() + 1));
        } else {
            newDate = direction === 'prev' ? new Date(date.setDate(date.getDate() - 1)) : new Date(date.setDate(date.getDate() + 1));
        }

        setCurrentDate(format(newDate, 'yyyy-MM-dd'));
    };

    return (
        <div>
            {/* Period Tabs */}
            <div className="tabs">
                <button
                    className={`tab ${period === 'daily' ? 'active' : ''}`}
                    onClick={() => setPeriod('daily')}
                >
                    Daily
                </button>
                <button
                    className={`tab ${period === 'weekly' ? 'active' : ''}`}
                    onClick={() => setPeriod('weekly')}
                >
                    Weekly
                </button>
                <button
                    className={`tab ${period === 'monthly' ? 'active' : ''}`}
                    onClick={() => setPeriod('monthly')}
                >
                    Monthly
                </button>
            </div>

            {/* Date Navigation */}
            <div className="flex items-center justify-between mb-lg">
                <button className="btn btn-secondary" onClick={() => navigatePeriod('prev')}>
                    ← Previous
                </button>

                {reportData && (
                    <div className="text-center">
                        <h3 className="mb-sm">
                            {format(new Date(reportData.startDate), 'MMM dd')} - {format(new Date(reportData.endDate), 'MMM dd, yyyy')}
                        </h3>
                    </div>
                )}

                <button className="btn btn-secondary" onClick={() => navigatePeriod('next')}>
                    Next →
                </button>
            </div>

            {loading && (
                <div className="card text-center">
                    <div className="spinner" style={{ margin: '0 auto' }} />
                    <p className="text-muted mt-md">Loading report...</p>
                </div>
            )}

            {error && (
                <div className="card">
                    <div className="badge badge-error w-full" style={{ padding: 'var(--spacing-md)' }}>
                        {error}
                    </div>
                </div>
            )}

            {!loading && !error && reportData && (
                <>
                    {/* Summary Stats */}
                    <div className="grid grid-3 mb-xl">
                        <div className="stat-card">
                            <div className="stat-label">Total Revenue</div>
                            <div className="stat-value">
                                ${(reportData.totals.cash_in_hand + reportData.totals.credits + reportData.totals.expenses).toFixed(2)}
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-label">Powder Cost (COGS)</div>
                            <div className="stat-value">
                                ${reportData.totals.powder_cost.toFixed(2)}
                            </div>
                            <div className="text-dim" style={{ fontSize: '0.875rem' }}>
                                Used: {reportData.totals.packets_used}pkts {reportData.totals.cups_used}cups
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-label">Operational Profit</div>
                            <div className={`stat-value ${reportData.totals.profit >= 0 ? 'text-success' : 'text-error'}`}>
                                ${reportData.totals.profit.toFixed(2)}
                            </div>
                        </div>
                    </div>

                    {/* Flow Analysis (Powder & Cash) */}
                    <div className="grid grid-2 gap-lg mb-xl">
                        {/* Powder Flow */}
                        <div className="card">
                            <h4 className="mb-md">📦 Powder Flow</h4>
                            <div className="flex justify-between items-center mb-sm">
                                <span className="text-muted">Purchased:</span>
                                <span className="font-bold">{reportData.totals.packets_purchased} packets</span>
                            </div>
                            <div className="flex justify-between items-center mb-sm">
                                <span className="text-muted">Used:</span>
                                <span>
                                    {reportData.totals.packets_used} pkts, {reportData.totals.cups_used} cups
                                </span>
                            </div>
                            <div className="flex justify-between items-center pt-sm" style={{ borderTop: '1px solid var(--border-color)' }}>
                                <span className="text-muted">Net Flow (Approx):</span>
                                <span className={
                                    (reportData.totals.packets_purchased - (reportData.totals.packets_used + reportData.totals.cups_used / 8)) >= 0
                                        ? 'text-success font-bold'
                                        : 'text-error font-bold'
                                }>
                                    {(reportData.totals.packets_purchased - (reportData.totals.packets_used + reportData.totals.cups_used / 8)).toFixed(2)} pkts
                                </span>
                            </div>
                        </div>

                        {/* Cash Flow */}
                        <div className="card">
                            <h4 className="mb-md">💰 Cash Flow</h4>
                            <div className="flex justify-between items-center mb-sm">
                                <span className="text-muted">Total Income:</span>
                                <span className="font-bold text-success">
                                    +${(reportData.totals.cash_in_hand + reportData.totals.credits).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between items-center mb-sm">
                                <span className="text-muted">Total Spent:</span>
                                <span className="text-error">
                                    -${(reportData.totals.expenses + reportData.totals.purchase_cost).toFixed(2)}
                                </span>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: '#666', marginLeft: '12px' }}>
                                (Ops: ${reportData.totals.expenses.toFixed(2)} + Powder: ${reportData.totals.purchase_cost.toFixed(2)})
                            </div>
                            <div className="flex justify-between items-center pt-sm mt-sm" style={{ borderTop: '1px solid var(--border-color)' }}>
                                <span className="text-muted">Net Cashflow:</span>
                                <span className={
                                    ((reportData.totals.cash_in_hand + reportData.totals.credits) - (reportData.totals.expenses + reportData.totals.purchase_cost)) >= 0
                                        ? 'text-success font-bold'
                                        : 'text-error font-bold'
                                }>
                                    ${((reportData.totals.cash_in_hand + reportData.totals.credits) - (reportData.totals.expenses + reportData.totals.purchase_cost)).toFixed(2)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Breakdown Table */}
                    <div className="card">
                        <h4 className="mb-lg">Detailed Breakdown <span className="text-muted" style={{ fontSize: '0.9rem', fontWeight: 'normal' }}>(Click row for details)</span></h4>

                        {reportData.entries.length > 0 ? (
                            <div className="table-container mt-lg">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Revenue</th>
                                            <th>Powder</th>
                                            <th>Profit</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {reportData.entries.map((entry, index) => (
                                            <tr key={index} onClick={() => setSelectedEntry(entry)} style={{ cursor: 'pointer', transition: 'background-color 0.2s' }} className="hover:bg-gray-800">
                                                <td>{format(new Date(entry.date), 'MMM dd, yyyy')}</td>
                                                <td>${(entry.cash_in_hand + entry.credits + entry.expenses).toFixed(2)}</td>
                                                <td>${entry.powder_cost.toFixed(2)}</td>
                                                <td>
                                                    <span className={entry.profit >= 0 ? 'text-success' : 'text-error'}>
                                                        <strong>${entry.profit.toFixed(2)}</strong>
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-muted text-center py-xl">No entries found for this period.</p>
                        )}
                    </div>
                </>
            )}

            {/* Daily Details Modal */}
            {selectedEntry && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '20px'
                }} onClick={() => setSelectedEntry(null)}>
                    <div className="card" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-xl">
                            <h3 style={{ margin: 0 }}>
                                📅 {format(new Date(selectedEntry.date), 'MMMM dd, yyyy')}
                            </h3>
                            <button onClick={() => setSelectedEntry(null)} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#fff' }}>
                                &times;
                            </button>
                        </div>

                        {/* Top Stats */}
                        <div className="grid grid-2 gap-md mb-xl">
                            <div className="stat-card" style={{ padding: '16px' }}>
                                <div className="stat-label">Total Revenue</div>
                                <div className="stat-value" style={{ fontSize: '1.5rem' }}>
                                    ${(selectedEntry.cash_in_hand + selectedEntry.credits + selectedEntry.expenses).toFixed(2)}
                                </div>
                            </div>
                            <div className="stat-card" style={{ padding: '16px' }}>
                                <div className="stat-label">Net Profit</div>
                                <div className={`stat-value ${selectedEntry.profit >= 0 ? 'text-success' : 'text-error'}`} style={{ fontSize: '1.5rem' }}>
                                    ${selectedEntry.profit.toFixed(2)}
                                </div>
                            </div>
                        </div>

                        <h4 className="mb-md">Expense Breakdown</h4>
                        <div className="grid grid-2 gap-md mb-xl">
                            <div className="p-md rounded" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                <div className="text-muted text-sm mb-xs">Te tia roti</div>
                                <div className="font-bold text-lg">${selectedEntry.waiter_expense.toFixed(2)}</div>
                            </div>
                            <div className="p-md rounded" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                <div className="text-muted text-sm mb-xs">Servers</div>
                                <div className="font-bold text-lg">${selectedEntry.servers_expense.toFixed(2)}</div>
                            </div>
                            <div className="p-md rounded" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                <div className="text-muted text-sm mb-xs">Bookkeeping</div>
                                <div className="font-bold text-lg">${selectedEntry.bookkeeping_expense.toFixed(2)}</div>
                            </div>
                            <div className="p-md rounded" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                                <div className="text-muted text-sm mb-xs">Other</div>
                                <div className="font-bold text-lg">${selectedEntry.other_expenses.toFixed(2)}</div>
                            </div>
                        </div>

                        <h4 className="mb-md">Powder Usage</h4>
                        <div className="p-md rounded mb-xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                            <div className="flex justify-between items-center mb-sm">
                                <span className="text-muted">Packets Used:</span>
                                <span className="font-bold">{selectedEntry.packets_used}</span>
                            </div>
                            <div className="flex justify-between items-center mb-sm">
                                <span className="text-muted">Cups Used:</span>
                                <span className="font-bold">{selectedEntry.cups_used}</span>
                            </div>
                            <div className="flex justify-between items-center pt-sm" style={{ borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                                <span className="text-muted">Total Cost:</span>
                                <span className="font-bold text-error">-${selectedEntry.powder_cost.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="p-md rounded" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}>
                            <div className="flex justify-between items-center">
                                <span className="text-muted">Credits (Owed):</span>
                                <span className="font-bold">${selectedEntry.credits.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between items-center mt-sm">
                                <span className="text-muted">Cash Collected:</span>
                                <span className="font-bold text-success">${selectedEntry.cash_in_hand.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
