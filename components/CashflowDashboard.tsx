'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import Link from 'next/link';
import AdjustmentForm from './AdjustmentForm';

interface Adjustment {
    id: number;
    date: string;
    type: string;
    amount: number;
    notes: string;
}

interface CreditPayment {
    id: number;
    creditor_name: string;
    payment_date: string;
    amount: number;
    notes: string;
}

interface CashflowSummary {
    period: string;
    startDate: string;
    endDate: string;
    income: {
        totalCashInHand: number;
        totalCreditPayments: number;
        totalCredits: number;
        total: number;
    };
    expenses: {
        powderPurchases: number;
        operationalExpenses: number;
        total: number;
    };
    netCashflow: number;
    outstandingCredits: number;
    entries: Array<{
        date: string;
        income: number;
        expenses: number;
        netCashflow: number;
    }>;
    adjustments: {
        cash: number;
        powder: number;
    };
    adjustmentsList: Adjustment[];
    creditPaymentsList: CreditPayment[];
}

export default function CashflowDashboard() {
    const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
    const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });
    const [summary, setSummary] = useState<CashflowSummary | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));

    useEffect(() => {
        fetchCashflow();
    }, [period, startDate, endDate]);

    const fetchCashflow = async () => {
        try {
            setLoading(true);
            const response = await fetch(
                `/api/cashflow?period=${period}&startDate=${startDate}&endDate=${endDate}`
            );
            if (!response.ok) throw new Error('Failed to fetch cashflow data');
            const data = await response.json();
            setSummary(data);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const setCurrentMonth = () => {
        setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    };

    const setLastMonth = () => {
        const lastMonth = subMonths(new Date(), 1);
        setStartDate(format(startOfMonth(lastMonth), 'yyyy-MM-dd'));
        setEndDate(format(endOfMonth(lastMonth), 'yyyy-MM-dd'));
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    if (loading) {
        return <div className="card"><p>Loading cashflow data...</p></div>;
    }

    if (error) {
        return <div className="card"><p style={{ color: '#ef4444' }}>Error: {error}</p></div>;
    }

    if (!summary) {
        return <div className="card"><p>No cashflow data available</p></div>;
    }

    return (
        <div className="card">
            <h2 className="card-title">Cashflow Analysis</h2>

            {/* Date Range Selector */}
            <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '24px',
                flexWrap: 'wrap',
                alignItems: 'center'
            }}>
                <div>
                    <label className="label" style={{ marginBottom: '4px' }}>Start Date</label>
                    <input
                        type="date"
                        className="input"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                    />
                </div>
                <div>
                    <label className="label" style={{ marginBottom: '4px' }}>End Date</label>
                    <input
                        type="date"
                        className="input"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                    <button onClick={setCurrentMonth} className="btn" style={{ padding: '8px 16px' }}>
                        This Month
                    </button>
                    <button onClick={setLastMonth} className="btn" style={{ padding: '8px 16px' }}>
                        Last Month
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px',
                marginBottom: '16px'
            }}>
                {/* Cash Received */}
                <div className="stat-card" style={{
                    padding: '16px',
                    backgroundColor: '#1a1a1a',
                    borderRadius: '12px',
                    border: '1px solid #2a2a2a'
                }}>
                    <div style={{ color: '#888', fontSize: '12px', marginBottom: '8px' }}>💵 Cash Received</div>
                    <div style={{ fontSize: 'clamp(18px, 4vw, 28px)', fontWeight: 'bold', color: '#10b981', marginBottom: '8px' }}>
                        ${summary.income.totalCashInHand.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#666', lineHeight: '1.4' }}>
                        Actual cash collected
                    </div>
                </div>

                {/* Credit Payments Collected */}
                <div className="stat-card" style={{
                    padding: '16px',
                    backgroundColor: '#1a1a1a',
                    borderRadius: '12px',
                    border: '1px solid #8b5cf6'
                }}>
                    <div style={{ color: '#8b5cf6', fontSize: '12px', marginBottom: '8px' }}>💰 Credit Payments</div>
                    <div style={{ fontSize: 'clamp(18px, 4vw, 28px)', fontWeight: 'bold', color: '#8b5cf6', marginBottom: '8px' }}>
                        ${(summary.income.totalCreditPayments || 0).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#666', lineHeight: '1.4' }}>
                        Collected from creditors
                    </div>
                </div>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '32px'
            }}>
                {/* Total Expenses */}
                <div className="stat-card" style={{
                    padding: '16px',
                    backgroundColor: '#1a1a1a',
                    borderRadius: '12px',
                    border: '1px solid #ef4444'
                }}>
                    <div style={{ color: '#ef4444', fontSize: '12px', marginBottom: '8px' }}>💸 Total Expenses</div>
                    <div style={{ fontSize: 'clamp(18px, 4vw, 28px)', fontWeight: 'bold', color: '#ef4444', marginBottom: '8px' }}>
                        ${summary.expenses.total.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#666', lineHeight: '1.4' }}>
                        Powder + Operations
                    </div>
                </div>

                {/* Outstanding Credits */}
                <div className="stat-card" style={{
                    padding: '16px',
                    backgroundColor: '#1a1a1a',
                    borderRadius: '12px',
                    border: '1px solid #f59e0b'
                }}>
                    <div style={{ color: '#f59e0b', fontSize: '12px', marginBottom: '8px' }}>⏳ Outstanding</div>
                    <div style={{ fontSize: 'clamp(18px, 4vw, 28px)', fontWeight: 'bold', color: '#f59e0b', marginBottom: '8px' }}>
                        ${(summary.outstandingCredits || 0).toFixed(2)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#666', lineHeight: '1.4' }}>
                        Credits not collected
                    </div>
                </div>

                {/* Net Cash Balance */}
                <div className="stat-card" style={{
                    padding: '16px',
                    backgroundColor: '#1a1a1a',
                    borderRadius: '12px',
                    border: summary.netCashflow >= 0 ? '2px solid #10b981' : '2px solid #ef4444'
                }}>
                    <div style={{ color: '#888', fontSize: '12px', marginBottom: '8px' }}>🏦 Net Balance</div>
                    <div style={{
                        fontSize: 'clamp(18px, 4vw, 28px)',
                        fontWeight: 'bold',
                        color: summary.netCashflow >= 0 ? '#10b981' : '#ef4444',
                        marginBottom: '8px'
                    }}>
                        ${summary.netCashflow.toFixed(2)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#666', lineHeight: '1.4' }}>
                        Total cash on hand
                    </div>
                </div>
            </div>

            {/* Cashflow Log Table */}
            <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>📋 Cashflow Log</h3>
            <div style={{ overflowX: 'auto', marginBottom: '32px' }}>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Description</th>
                            <th style={{ textAlign: 'right' }}>In (+)</th>
                            <th style={{ textAlign: 'right' }}>Out (-)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Daily entries - Cash Received */}
                        {summary.entries.map((entry, index) => (
                            <tr key={`income-${index}`}>
                                <td>{format(new Date(entry.date), 'MMM dd, yyyy')}</td>
                                <td><span style={{ color: '#10b981' }}>💵 Cash Received</span></td>
                                <td>Daily sales</td>
                                <td style={{ textAlign: 'right', color: '#10b981' }}>${entry.income.toFixed(2)}</td>
                                <td style={{ textAlign: 'right', color: '#666' }}>-</td>
                            </tr>
                        ))}

                        {/* Daily entries - Expenses */}
                        {summary.entries.filter(e => e.expenses > 0).map((entry, index) => (
                            <tr key={`expense-${index}`}>
                                <td>{format(new Date(entry.date), 'MMM dd, yyyy')}</td>
                                <td><span style={{ color: '#ef4444' }}>💸 Expenses</span></td>
                                <td>Operational expenses</td>
                                <td style={{ textAlign: 'right', color: '#666' }}>-</td>
                                <td style={{ textAlign: 'right', color: '#ef4444' }}>${entry.expenses.toFixed(2)}</td>
                            </tr>
                        ))}

                        {/* Adjustments */}
                        {(summary.adjustmentsList || []).map((adj, index) => (
                            <tr key={`adj-${index}`} style={{ backgroundColor: adj.amount >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
                                <td>{format(new Date(adj.date), 'MMM dd, yyyy')}</td>
                                <td>
                                    <span style={{ color: adj.amount >= 0 ? '#10b981' : '#ef4444' }}>
                                        {adj.amount >= 0 ? '📈 Adjustment (In)' : '📉 Adjustment (Out)'}
                                    </span>
                                </td>
                                <td>{adj.notes || 'Cash adjustment'}</td>
                                <td style={{ textAlign: 'right', color: '#10b981' }}>
                                    {adj.amount >= 0 ? `$${adj.amount.toFixed(2)}` : '-'}
                                </td>
                                <td style={{ textAlign: 'right', color: '#ef4444' }}>
                                    {adj.amount < 0 ? `$${Math.abs(adj.amount).toFixed(2)}` : '-'}
                                </td>
                            </tr>
                        ))}

                        {/* Summary Row */}
                        <tr style={{ backgroundColor: '#2a2a2a', fontWeight: 'bold' }}>
                            <td colSpan={3} style={{ textAlign: 'right' }}>TOTALS:</td>
                            <td style={{ textAlign: 'right', color: '#10b981' }}>
                                ${(summary.income.totalCashInHand + Math.max(0, summary.adjustments?.cash || 0)).toFixed(2)}
                            </td>
                            <td style={{ textAlign: 'right', color: '#ef4444' }}>
                                ${(summary.expenses.total + Math.abs(Math.min(0, summary.adjustments?.cash || 0))).toFixed(2)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Outstanding Credits Section */}
            {(summary.outstandingCredits || summary.income.totalCredits) > 0 && (
                <div style={{
                    padding: '16px',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    borderRadius: '12px',
                    border: '1px solid #f59e0b',
                    marginBottom: '32px'
                }}>
                    <h4 style={{ color: '#f59e0b', marginBottom: '8px' }}>⏳ Outstanding Credits (Not Yet Collected)</h4>
                    <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#f59e0b', margin: 0 }}>
                        ${(summary.outstandingCredits || summary.income.totalCredits).toFixed(2)}
                    </p>
                    <p style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                        This amount is owed but not yet received. It will be added to cash balance when collected.
                    </p>
                </div>
            )}

            {/* Visual Chart Placeholder */}
            <div style={{
                marginTop: '32px',
                padding: '40px',
                backgroundColor: '#1a1a1a',
                borderRadius: '12px',
                textAlign: 'center'
            }}>
                <div style={{ color: '#888', marginBottom: '16px' }}>Income vs Expenses Chart</div>
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'flex-end',
                    gap: '24px',
                    height: '200px'
                }}>
                    {/* Income Bar */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            width: '80px',
                            height: `${Math.min((summary.income.total / Math.max(summary.income.total, summary.expenses.total)) * 180, 180)}px`,
                            backgroundColor: '#10b981',
                            borderRadius: '8px 8px 0 0',
                            marginBottom: '8px'
                        }}></div>
                        <div style={{ fontSize: '12px', color: '#888' }}>Income</div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#10b981' }}>
                            ${summary.income.total.toFixed(0)}
                        </div>
                    </div>

                    {/* Expenses Bar */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            width: '80px',
                            height: `${Math.min((summary.expenses.total / Math.max(summary.income.total, summary.expenses.total)) * 180, 180)}px`,
                            backgroundColor: '#ef4444',
                            borderRadius: '8px 8px 0 0',
                            marginBottom: '8px'
                        }}></div>
                        <div style={{ fontSize: '12px', color: '#888' }}>Expenses</div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ef4444' }}>
                            ${summary.expenses.total.toFixed(0)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
