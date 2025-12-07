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
        powder_cost: number;
        profit: number;
        packets_used: number;
        cups_used: number;
    };
}

export default function ReportsDashboard() {
    const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
    const [currentDate, setCurrentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [reportData, setReportData] = useState<ReportData | null>(null);
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
                            <div className="stat-label">Powder Cost</div>
                            <div className="stat-value">
                                ${reportData.totals.powder_cost.toFixed(2)}
                            </div>
                            <div className="text-dim" style={{ fontSize: '0.875rem' }}>
                                {reportData.totals.packets_used} packets + {reportData.totals.cups_used} cups
                            </div>
                        </div>

                        <div className="stat-card">
                            <div className="stat-label">Net Profit</div>
                            <div className={`stat-value ${reportData.totals.profit >= 0 ? 'text-success' : 'text-error'}`}>
                                ${reportData.totals.profit.toFixed(2)}
                            </div>
                        </div>
                    </div>

                    {/* Detailed Breakdown */}
                    <div className="card">
                        <h4 className="mb-lg">Breakdown</h4>

                        <div className="grid grid-2 gap-md mb-lg">
                            <div>
                                <div className="text-muted mb-sm">Cash in Hand</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                                    ${reportData.totals.cash_in_hand.toFixed(2)}
                                </div>
                            </div>

                            <div>
                                <div className="text-muted mb-sm">Credits</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                                    ${reportData.totals.credits.toFixed(2)}
                                </div>
                            </div>

                            <div>
                                <div className="text-muted mb-sm">Expenses</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                                    ${reportData.totals.expenses.toFixed(2)}
                                </div>
                            </div>

                            <div>
                                <div className="text-muted mb-sm">Days with Entries</div>
                                <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                                    {reportData.entries.length}
                                </div>
                            </div>
                        </div>

                        {reportData.entries.length > 0 && (
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
                                            <tr key={index}>
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
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
