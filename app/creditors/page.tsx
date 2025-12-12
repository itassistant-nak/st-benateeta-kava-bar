'use client';

import { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';

interface CreditorRecord {
    date: string;
    creditor_name: string;
    amount: number;
    bookkeeper_name: string | null;
    group_name: string | null;
}

interface CreditorData {
    creditors: CreditorRecord[];
    totalAmount: number;
    count: number;
    uniqueCreditors: string[];
    uniqueGroups: string[];
}

export default function CreditorsPage() {
    const [data, setData] = useState<CreditorData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filters
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [creditorFilter, setCreditorFilter] = useState('');
    const [groupFilter, setGroupFilter] = useState('');

    const fetchCreditors = async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (creditorFilter) params.append('creditorName', creditorFilter);
            if (groupFilter) params.append('groupName', groupFilter);

            const response = await fetch(`/api/creditors?${params.toString()}`);
            if (!response.ok) {
                throw new Error('Failed to fetch creditors');
            }
            const result = await response.json();
            setData(result);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCreditors();
    }, [startDate, endDate, creditorFilter, groupFilter]);

    const clearFilters = () => {
        setStartDate(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
        setEndDate(format(new Date(), 'yyyy-MM-dd'));
        setCreditorFilter('');
        setGroupFilter('');
    };

    return (
        <div className="container" style={{ paddingTop: 'var(--spacing-xl)', paddingBottom: 'var(--spacing-2xl)' }}>
            <div className="card">
                <h1 style={{ marginBottom: 'var(--spacing-lg)' }}>💳 Creditors</h1>

                {/* Filters */}
                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: 'var(--spacing-md)',
                    marginBottom: 'var(--spacing-lg)',
                    padding: 'var(--spacing-md)',
                    background: 'var(--color-bg)',
                    borderRadius: 'var(--radius-md)'
                }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Start Date</label>
                        <input
                            type="date"
                            className="input"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">End Date</label>
                        <input
                            type="date"
                            className="input"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Creditor Name</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Filter by name..."
                            value={creditorFilter}
                            onChange={(e) => setCreditorFilter(e.target.value)}
                            list="creditor-names"
                        />
                        <datalist id="creditor-names">
                            {data?.uniqueCreditors.map((name) => (
                                <option key={name} value={name} />
                            ))}
                        </datalist>
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Group Name</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Filter by group..."
                            value={groupFilter}
                            onChange={(e) => setGroupFilter(e.target.value)}
                            list="group-names"
                        />
                        <datalist id="group-names">
                            {data?.uniqueGroups.map((name) => (
                                <option key={name} value={name} />
                            ))}
                        </datalist>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
                    <button className="btn btn-secondary" onClick={clearFilters}>
                        Clear Filters
                    </button>
                </div>

                {error && (
                    <div className="badge badge-error mb-lg" style={{ padding: 'var(--spacing-md)' }}>
                        {error}
                    </div>
                )}

                {/* Summary */}
                {data && (
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                        gap: 'var(--spacing-md)',
                        marginBottom: 'var(--spacing-lg)'
                    }}>
                        <div className="stat-card">
                            <div className="stat-label">Total Records</div>
                            <div className="stat-value">{data.count}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Total Amount</div>
                            <div className="stat-value" style={{ color: 'var(--color-warning)' }}>
                                ${data.totalAmount.toFixed(2)}
                            </div>
                        </div>
                    </div>
                )}

                {/* Table */}
                {loading ? (
                    <div className="text-center">
                        <span className="spinner" /> Loading...
                    </div>
                ) : data && data.creditors.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                    <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left' }}>Date</th>
                                    <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left' }}>Creditor Name</th>
                                    <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>Amount</th>
                                    <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left' }}>Bookkeeper</th>
                                    <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left' }}>Group</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.creditors.map((record, index) => (
                                    <tr
                                        key={`${record.date}-${record.creditor_name}-${index}`}
                                        style={{
                                            borderBottom: '1px solid var(--color-border)',
                                            background: index % 2 === 0 ? 'transparent' : 'var(--color-bg)'
                                        }}
                                    >
                                        <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
                                            {format(new Date(record.date), 'dd/MM/yyyy')}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontWeight: 500 }}>
                                            {record.creditor_name}
                                        </td>
                                        <td style={{
                                            padding: 'var(--spacing-sm) var(--spacing-md)',
                                            textAlign: 'right',
                                            color: 'var(--color-warning)',
                                            fontWeight: 600
                                        }}>
                                            ${record.amount.toFixed(2)}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', color: 'var(--color-text-muted)' }}>
                                            {record.bookkeeper_name || '-'}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', color: 'var(--color-text-muted)' }}>
                                            {record.group_name || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ borderTop: '2px solid var(--color-border)', fontWeight: 700 }}>
                                    <td colSpan={2} style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
                                        Total ({data.count} records)
                                    </td>
                                    <td style={{
                                        padding: 'var(--spacing-sm) var(--spacing-md)',
                                        textAlign: 'right',
                                        color: 'var(--color-warning)'
                                    }}>
                                        ${data.totalAmount.toFixed(2)}
                                    </td>
                                    <td colSpan={2}></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                ) : (
                    <div className="text-center text-muted" style={{ padding: 'var(--spacing-xl)' }}>
                        No credit records found for the selected filters.
                    </div>
                )}
            </div>
        </div>
    );
}

