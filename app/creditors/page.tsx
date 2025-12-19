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
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [creditorFilter, setCreditorFilter] = useState('');
    const [groupFilter, setGroupFilter] = useState('');

    useEffect(() => {
        // Initialize dates on client-side to avoid hydration mismatch
        setStartDate(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
        setEndDate(format(new Date(), 'yyyy-MM-dd'));
    }, []);

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
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to fetch creditors');
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
        if (startDate || endDate) {
            fetchCreditors();
        }
    }, [startDate, endDate, creditorFilter, groupFilter]);

    const clearFilters = () => {
        setStartDate(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
        setEndDate(format(new Date(), 'yyyy-MM-dd'));
        setCreditorFilter('');
        setGroupFilter('');
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

        // Table data
        const tableData = data.records.map((record) => [
            format(new Date(record.date), 'dd/MM/yyyy'),
            record.creditor_name,
            record.type === 'credit' ? 'Credit' : 'Payment',
            record.type === 'credit' ? `$${record.amount.toFixed(2)}` : '-',
            record.type === 'payment' ? `$${record.amount.toFixed(2)}` : '-',
            record.bookkeeper_name || record.notes || record.group_name || '-',
        ]);

        // Add table
        autoTable(doc, {
            head: [['Date', 'Creditor', 'Type', 'Credit', 'Payment', 'Details']],
            body: tableData,
            startY: 42,
            styles: { fontSize: 9 },
            headStyles: { fillColor: [108, 92, 231] }, // Kava bar primary color
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
        <main className="container py-xl">
            <div className="flex justify-between items-center mb-lg">
                <h1 className="h2 font-bold">🤝 Creditors Tab</h1>
                {data && (
                    <div className="flex gap-sm items-center">
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={exportToPDF}
                            disabled={data.records.length === 0}
                        >
                            📄 Export PDF
                        </button>
                        <div className={`badge ${data.outstandingBalance > 0 ? 'badge-error' : 'badge-success'}`}>
                            Outstanding: ${data.outstandingBalance.toFixed(2)}
                        </div>
                    </div>
                )}
            </div>

            {/* Filters */}
            <div className="card mb-lg">
                <div className="grid grid-4 gap-md">
                    <div className="form-group">
                        <label className="form-label">Search Creditor</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Filter by name..."
                            value={creditorFilter}
                            onChange={(e) => setCreditorFilter(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Group/Event</label>
                        <input
                            type="text"
                            className="input"
                            placeholder="Filter by group..."
                            value={groupFilter}
                            onChange={(e) => setGroupFilter(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">From Date</label>
                        <input
                            type="date"
                            className="input"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">To Date</label>
                        <input
                            type="date"
                            className="input"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>
                <div className="mt-md">
                    <button className="btn btn-secondary btn-sm" onClick={clearFilters}>
                        Clear Filters
                    </button>
                </div>
            </div>

            {error && (
                <div className="alert alert-error mb-lg">
                    {error}
                </div>
            )}

            {/* Summary Grid */}
            {data && (
                <div className="grid grid-3 gap-md mb-lg">
                    <div className="card text-center py-md">
                        <div className="text-dim text-sm uppercase font-bold mb-xs">Total Credits</div>
                        <div className="h3 text-warning">${data.totalCredits.toFixed(2)}</div>
                    </div>
                    <div className="card text-center py-md">
                        <div className="text-dim text-sm uppercase font-bold mb-xs">Total Payments</div>
                        <div className="h3 text-success">${data.totalPayments.toFixed(2)}</div>
                    </div>
                    <div className="card text-center py-md">
                        <div className="text-dim text-sm uppercase font-bold mb-xs">Outstanding Balance</div>
                        <div className={`h3 ${data.outstandingBalance > 0 ? 'text-error' : 'text-success'}`}>
                            ${data.outstandingBalance.toFixed(2)}
                        </div>
                    </div>
                </div>
            )}

            {/* Records Table */}
            <div className="table-container card">
                {loading ? (
                    <div className="flex justify-center py-2xl">
                        <span className="spinner" />
                    </div>
                ) : data && data.records.length > 0 ? (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Creditor</th>
                                <th>Type</th>
                                <th className="text-right">Credit</th>
                                <th className="text-right">Payment</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.records.map((record, index) => (
                                <tr key={index} className={record.type === 'payment' ? 'bg-success-subtle' : ''}>
                                    <td>{format(new Date(record.date), 'MMM dd, yyyy')}</td>
                                    <td className="font-bold">{record.creditor_name}</td>
                                    <td>
                                        <span className={`badge ${record.type === 'credit' ? 'badge-warning' : 'badge-success'}`}>
                                            {record.type === 'credit' ? '⏳ Credit' : '💰 Payment'}
                                        </span>
                                    </td>
                                    <td className="text-right text-warning">
                                        {record.type === 'credit' ? `$${record.amount.toFixed(2)}` : '-'}
                                    </td>
                                    <td className="text-right text-success">
                                        {record.type === 'payment' ? `$${record.amount.toFixed(2)}` : '-'}
                                    </td>
                                    <td className="text-dim text-sm">
                                        {record.bookkeeper_name || record.notes || record.group_name || '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <div className="text-center py-2xl text-dim">
                        No creditor records found for the selected filters.
                    </div>
                )}
            </div>
        </main>
    );
}
