'use client';

import { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Extend jsPDF type for autoTable
declare module 'jspdf' {
    interface jsPDF {
        lastAutoTable: { finalY: number };
    }
}

interface CreditorRecord {
    date: string;
    creditor_name: string;
    amount: number;
    bookkeeper_name: string | null;
    group_name: string | null;
    type: 'credit' | 'payment';
    notes?: string | null;
}

interface CreditorData {
    records: CreditorRecord[];
    totalCredits: number;
    totalPayments: number;
    outstandingBalance: number;
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

    // Add Payment Modal
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentCreditor, setPaymentCreditor] = useState('');
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentDate, setPaymentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [paymentNotes, setPaymentNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

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

    const handleAddPayment = async () => {
        if (!paymentCreditor || !paymentAmount || !paymentDate) {
            setError('Please fill in all required fields');
            return;
        }

        setSubmitting(true);
        try {
            const response = await fetch('/api/credit-payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    creditor_name: paymentCreditor,
                    payment_date: paymentDate,
                    amount: parseFloat(paymentAmount),
                    notes: paymentNotes || null,
                }),
            });

            if (!response.ok) {
                const result = await response.json();
                throw new Error(result.error || 'Failed to add payment');
            }

            // Reset form and close modal
            setPaymentCreditor('');
            setPaymentAmount('');
            setPaymentDate(format(new Date(), 'yyyy-MM-dd'));
            setPaymentNotes('');
            setShowPaymentModal(false);

            // Refresh data
            fetchCreditors();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const exportToPDF = () => {
        if (!data || data.records.length === 0) return;

        const doc = new jsPDF();

        // Title
        doc.setFontSize(18);
        doc.text('ST Benateeta Kava Bar - Creditors Report', 14, 22);

        // Date range
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Period: ${format(new Date(startDate), 'dd/MM/yyyy')} - ${format(new Date(endDate), 'dd/MM/yyyy')}`, 14, 30);
        doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 36);

        // Filters applied
        let filterText = 'Filters: ';
        if (creditorFilter) filterText += `Creditor: ${creditorFilter}, `;
        if (groupFilter) filterText += `Group: ${groupFilter}, `;
        if (filterText === 'Filters: ') filterText += 'None';
        else filterText = filterText.slice(0, -2); // Remove trailing comma
        doc.text(filterText, 14, 42);

        // Table data
        const tableData = data.records.map((record) => [
            format(new Date(record.date), 'dd/MM/yyyy'),
            record.creditor_name,
            record.type === 'credit' ? 'Credit' : 'Payment',
            record.type === 'credit' ? `$${record.amount.toFixed(2)}` : '-',
            record.type === 'payment' ? `$${record.amount.toFixed(2)}` : '-',
            record.bookkeeper_name || record.notes || '-',
        ]);

        // Add table
        autoTable(doc, {
            head: [['Date', 'Creditor', 'Type', 'Credit', 'Payment', 'Notes']],
            body: tableData,
            startY: 48,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [74, 144, 226] },
            foot: [[
                'TOTALS',
                '',
                '',
                `$${data.totalCredits.toFixed(2)}`,
                `$${data.totalPayments.toFixed(2)}`,
                `Balance: $${data.outstandingBalance.toFixed(2)}`
            ]],
            footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        });

        // Save the PDF
        const fileName = `creditors-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        doc.save(fileName);
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

                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)', flexWrap: 'wrap' }}>
                    <button className="btn btn-secondary" onClick={clearFilters}>
                        Clear Filters
                    </button>
                    <button
                        className="btn btn-success"
                        onClick={() => setShowPaymentModal(true)}
                    >
                        💰 Add Payment
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={exportToPDF}
                        disabled={!data || data.records.length === 0}
                    >
                        📄 Export PDF
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
                            <div className="stat-label">Total Credits</div>
                            <div className="stat-value" style={{ color: 'var(--color-warning)' }}>
                                ${data.totalCredits.toFixed(2)}
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Total Payments</div>
                            <div className="stat-value" style={{ color: 'var(--color-success)' }}>
                                ${data.totalPayments.toFixed(2)}
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-label">Outstanding Balance</div>
                            <div className="stat-value" style={{ color: data.outstandingBalance > 0 ? 'var(--color-error)' : 'var(--color-success)' }}>
                                ${data.outstandingBalance.toFixed(2)}
                            </div>
                        </div>
                    </div>
                )}

                {/* Table */}
                {loading ? (
                    <div className="text-center">
                        <span className="spinner" /> Loading...
                    </div>
                ) : data && data.records.length > 0 ? (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
                                    <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left' }}>Date</th>
                                    <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left' }}>Creditor</th>
                                    <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'center' }}>Type</th>
                                    <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>Credit</th>
                                    <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'right' }}>Payment</th>
                                    <th style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'left' }}>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.records.map((record, index) => (
                                    <tr
                                        key={`${record.date}-${record.creditor_name}-${record.type}-${index}`}
                                        style={{
                                            borderBottom: '1px solid var(--color-border)',
                                            background: record.type === 'payment'
                                                ? 'rgba(16, 185, 129, 0.1)'
                                                : (index % 2 === 0 ? 'transparent' : 'var(--color-bg)')
                                        }}
                                    >
                                        <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
                                            {format(new Date(record.date), 'dd/MM/yyyy')}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', fontWeight: 500 }}>
                                            {record.creditor_name}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', textAlign: 'center' }}>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '12px',
                                                fontSize: '12px',
                                                fontWeight: 600,
                                                background: record.type === 'credit' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                                color: record.type === 'credit' ? '#f59e0b' : '#10b981'
                                            }}>
                                                {record.type === 'credit' ? '⏳ Credit' : '💰 Payment'}
                                            </span>
                                        </td>
                                        <td style={{
                                            padding: 'var(--spacing-sm) var(--spacing-md)',
                                            textAlign: 'right',
                                            color: 'var(--color-warning)',
                                            fontWeight: 600
                                        }}>
                                            {record.type === 'credit' ? `$${record.amount.toFixed(2)}` : '-'}
                                        </td>
                                        <td style={{
                                            padding: 'var(--spacing-sm) var(--spacing-md)',
                                            textAlign: 'right',
                                            color: 'var(--color-success)',
                                            fontWeight: 600
                                        }}>
                                            {record.type === 'payment' ? `$${record.amount.toFixed(2)}` : '-'}
                                        </td>
                                        <td style={{ padding: 'var(--spacing-sm) var(--spacing-md)', color: 'var(--color-text-muted)' }}>
                                            {record.bookkeeper_name || record.notes || record.group_name || '-'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ borderTop: '2px solid var(--color-border)', fontWeight: 700 }}>
                                    <td colSpan={3} style={{ padding: 'var(--spacing-sm) var(--spacing-md)' }}>
                                        TOTALS
                                    </td>
                                    <td style={{
                                        padding: 'var(--spacing-sm) var(--spacing-md)',
                                        textAlign: 'right',
                                        color: 'var(--color-warning)'
                                    }}>
                                        ${data.totalCredits.toFixed(2)}
                                    </td>
                                    <td style={{
                                        padding: 'var(--spacing-sm) var(--spacing-md)',
                                        textAlign: 'right',
                                        color: 'var(--color-success)'
                                    }}>
                                        ${data.totalPayments.toFixed(2)}
                                    </td>
                                    <td style={{
                                        padding: 'var(--spacing-sm) var(--spacing-md)',
                                        fontWeight: 700,
                                        color: data.outstandingBalance > 0 ? 'var(--color-error)' : 'var(--color-success)'
                                    }}>
                                        Balance: ${data.outstandingBalance.toFixed(2)}
                                    </td>
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

            {/* Add Payment Modal */}
            {showPaymentModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: 'var(--spacing-md)'
                }}>
                    <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
                        <h2 style={{ marginBottom: 'var(--spacing-lg)' }}>💰 Add Credit Payment</h2>

                        <div className="form-group">
                            <label className="form-label">Creditor Name *</label>
                            <input
                                type="text"
                                className="input"
                                value={paymentCreditor}
                                onChange={(e) => setPaymentCreditor(e.target.value)}
                                placeholder="Enter creditor name"
                                list="payment-creditor-names"
                            />
                            <datalist id="payment-creditor-names">
                                {data?.uniqueCreditors.map((name) => (
                                    <option key={name} value={name} />
                                ))}
                            </datalist>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Payment Date *</label>
                            <input
                                type="date"
                                className="input"
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Amount *</label>
                            <input
                                type="number"
                                className="input"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <input
                                type="text"
                                className="input"
                                value={paymentNotes}
                                onChange={(e) => setPaymentNotes(e.target.value)}
                                placeholder="Optional notes"
                            />
                        </div>

                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-lg)' }}>
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowPaymentModal(false)}
                                style={{ flex: 1 }}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-success"
                                onClick={handleAddPayment}
                                disabled={submitting}
                                style={{ flex: 1 }}
                            >
                                {submitting ? 'Saving...' : 'Add Payment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

