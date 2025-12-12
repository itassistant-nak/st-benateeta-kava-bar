'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface DailyEntryFormProps {
    onSuccess?: () => void;
}

const PACKET_COST = 63;
const CUPS_PER_PACKET = 8;
const CUP_COST = PACKET_COST / CUPS_PER_PACKET;

// Te tia roti cost calculation
const WAITER_PER_PACKET = 5;
const WAITER_PER_CUP = 0.625;

export default function DailyEntryForm({ onSuccess }: DailyEntryFormProps) {
    const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [groupName, setGroupName] = useState('');
    const [waiterName, setWaiterName] = useState(''); // Aran te tia tei
    const [bookkeeperName, setBookkeeperName] = useState(''); // Aran te tia boki
    const [serversNamesList, setServersNamesList] = useState<string[]>([]); // Araia taan serve (multiple)
    const [newServerName, setNewServerName] = useState('');
    const [cashInHand, setCashInHand] = useState('');
    const [credits, setCredits] = useState('');
    const [numberOfServers, setNumberOfServers] = useState(''); // Number of servers working
    const [waiterExpense, setWaiterExpense] = useState('');
    const [serversExpense, setServersExpense] = useState('');
    const [bookkeepingExpense, setBookkeepingExpense] = useState('');
    const [otherExpenses, setOtherExpenses] = useState('');
    const [packets, setPackets] = useState('');
    const [cups, setCups] = useState('');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Credits (Taian tarau) - popup modal
    const [creditEntries, setCreditEntries] = useState<{ name: string, amount: number }[]>([]);
    const [showCreditModal, setShowCreditModal] = useState(false);
    const [newCreditName, setNewCreditName] = useState('');
    const [newCreditAmount, setNewCreditAmount] = useState('');

    // Additional payments (Kabwaratarau man taian kamooi)
    const [additionalPayments, setAdditionalPayments] = useState<{ name: string, amount: number }[]>([]);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [newPaymentName, setNewPaymentName] = useState('');
    const [newPaymentAmount, setNewPaymentAmount] = useState('');

    // Calculate powder cost and waiter cost in real-time
    const packetsNum = parseFloat(packets) || 0;
    const cupsNum = parseFloat(cups) || 0;
    const powderCost = packetsNum * PACKET_COST + cupsNum * CUP_COST;

    // Auto-calculate waiter expense based on powder usage
    const calculatedWaiterExpense = packetsNum * WAITER_PER_PACKET + cupsNum * WAITER_PER_CUP;

    // Auto-calculate server expense based on progressive payment
    // ($5 for first packet + $1 per additional packet) × number of servers
    const numServers = parseFloat(numberOfServers) || 0;
    let calculatedServerExpense = 0;
    if (packetsNum > 0 && numServers > 0) {
        // $5 for first packet + $1 for each additional packet, then multiply by number of servers
        const amountPerServerSet = 5 + Math.max(0, packetsNum - 1);
        calculatedServerExpense = amountPerServerSet * numServers;
    }

    const cashNum = parseFloat(cashInHand) || 0;
    const creditsTotal = creditEntries.reduce((sum, credit) => sum + credit.amount, 0);
    const creditsNum = creditsTotal;
    const waiterNum = calculatedWaiterExpense; // Use calculated value
    const serversNum = calculatedServerExpense; // Use calculated value
    const bookkeepingNum = parseFloat(bookkeepingExpense) || 0;
    const otherNum = parseFloat(otherExpenses) || 0;
    const additionalPaymentsTotal = additionalPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalExpenses = waiterNum + serversNum + bookkeepingNum + otherNum; // Removed additionalPaymentsTotal
    const profit = cashNum + creditsNum + totalExpenses - powderCost;
    const netProfit = cashNum + creditsNum - powderCost; // Net profit without expenses

    // Helper functions for additional payments
    const addPayment = () => {
        if (newPaymentName.trim() && newPaymentAmount) {
            setAdditionalPayments([...additionalPayments, {
                name: newPaymentName.trim(),
                amount: parseFloat(newPaymentAmount) || 0
            }]);
            setNewPaymentName('');
            setNewPaymentAmount('');
        }
    };

    const removePayment = (index: number) => {
        setAdditionalPayments(additionalPayments.filter((_, i) => i !== index));
    };

    // Helper functions for credits
    const addCredit = () => {
        if (newCreditName.trim() && newCreditAmount) {
            setCreditEntries([...creditEntries, {
                name: newCreditName.trim(),
                amount: parseFloat(newCreditAmount) || 0
            }]);
            setNewCreditName('');
            setNewCreditAmount('');
        }
    };

    const removeCredit = (index: number) => {
        setCreditEntries(creditEntries.filter((_, i) => i !== index));
    };

    // Helper functions for server names
    const addServerName = () => {
        if (newServerName.trim()) {
            setServersNamesList([...serversNamesList, newServerName.trim()]);
            setNewServerName('');
        }
    };

    const removeServerName = (index: number) => {
        setServersNamesList(serversNamesList.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            const response = await fetch('/api/entries', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    date,
                    group_name: groupName || null,
                    waiter_name: waiterName || null,
                    bookkeeper_name: bookkeeperName || null,
                    servers_names: JSON.stringify(serversNamesList),
                    cash_in_hand: cashNum,
                    credits: creditsNum,
                    credit_entries: JSON.stringify(creditEntries),
                    waiter_expense: calculatedWaiterExpense,
                    servers_expense: calculatedServerExpense,
                    bookkeeping_expense: bookkeepingNum,
                    other_expenses: otherNum,
                    additional_payments: JSON.stringify(additionalPayments),
                    packets_used: packetsNum,
                    cups_used: cupsNum,
                    notes: notes || null,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to save entry');
            }

            const data = await response.json();
            const wasUpdated = data.updated === true;

            // Show success message
            setSuccessMessage(wasUpdated
                ? `Entry for ${date} has been updated!`
                : `Entry for ${date} has been created!`);

            // Reset form
            setGroupName('');
            setWaiterName('');
            setBookkeeperName('');
            setServersNamesList([]);
            setNewServerName('');
            setCashInHand('');
            setCreditEntries([]);
            setAdditionalPayments([]);
            setServersExpense('');
            setBookkeepingExpense('');
            setOtherExpenses('');
            setPackets('');
            setCups('');
            setPackets('');
            setCups('');
            setNotes('');
            setDate(format(new Date(), 'yyyy-MM-dd'));

            // Clear success message after 5 seconds
            setTimeout(() => setSuccessMessage(''), 5000);

            if (onSuccess) onSuccess();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="card">
            <h3 className="mb-lg">Daily Entry</h3>

            {error && (
                <div className="badge badge-error mb-lg w-full" style={{ padding: 'var(--spacing-md)' }}>
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="badge badge-success mb-lg w-full" style={{ padding: 'var(--spacing-md)' }}>
                    ✅ {successMessage}
                </div>
            )}

            <div className="grid grid-2">
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
                    <label className="form-label">Group Name</label>
                    <input
                        type="text"
                        className="input"
                        value={groupName}
                        onChange={(e) => setGroupName(e.target.value)}
                        placeholder="Enter group name"
                    />
                    <span className="form-hint">Optional - name of the group or event</span>
                </div>
            </div>

            <div className="grid grid-2">

                <div className="form-group">
                    <label className="form-label">Aran te tia roti</label>
                    <input
                        type="text"
                        className="input"
                        value={waiterName}
                        onChange={(e) => setWaiterName(e.target.value)}
                        placeholder="Te tia roti name"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Aran te tia boki</label>
                    <input
                        type="text"
                        className="input"
                        value={bookkeeperName}
                        onChange={(e) => setBookkeeperName(e.target.value)}
                        placeholder="Bookkeeper name"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Araia taan serve</label>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                        <input
                            type="text"
                            className="input"
                            value={newServerName}
                            onChange={(e) => setNewServerName(e.target.value)}
                            placeholder="Enter server name"
                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addServerName())}
                            style={{ flex: 1 }}
                        />
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={addServerName}
                            style={{ whiteSpace: 'nowrap' }}
                        >
                            Add
                        </button>
                    </div>
                    {serversNamesList.length > 0 && (
                        <div style={{ marginTop: 'var(--spacing-sm)', display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                            {serversNamesList.map((name, index) => (
                                <div key={index} style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.5rem',
                                    padding: '0.25rem 0.5rem',
                                    backgroundColor: 'var(--primary)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.875rem'
                                }}>
                                    <span>{name}</span>
                                    <button
                                        type="button"
                                        onClick={() => removeServerName(index)}
                                        style={{
                                            background: 'none',
                                            border: 'none',
                                            color: 'inherit',
                                            cursor: 'pointer',
                                            padding: 0,
                                            fontSize: '1rem',
                                            lineHeight: 1
                                        }}
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="form-group">
                    <label className="form-label">Kabwaratarau man taian kamooi</label>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                        <input
                            type="number"
                            step="0.01"
                            className="input"
                            value={additionalPaymentsTotal.toFixed(2)}
                            readOnly
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', cursor: 'not-allowed', flex: 1 }}
                        />
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => setShowPaymentModal(true)}
                            style={{ whiteSpace: 'nowrap' }}
                        >
                            Manage ({additionalPayments.length})
                        </button>
                    </div>
                    <span className="form-hint">{additionalPayments.length} additional payment(s)</span>
                </div>
            </div>

            {/* Powder ae kabonaganaaki (Powder Used) */}
            <div style={{
                border: '2px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--spacing-lg)',
                marginTop: 'var(--spacing-lg)',
                backgroundColor: 'rgba(255, 255, 255, 0.02)'
            }}>
                <h4 style={{
                    marginTop: 0,
                    marginBottom: 'var(--spacing-lg)',
                    color: 'var(--primary)',
                    fontSize: '1.1rem',
                    fontWeight: 600
                }}>Powder ae kabonaganaaki</h4>

                <div className="grid grid-2">
                    <div className="form-group">
                        <label className="form-label">1/2 KG Nimtai</label>
                        <input
                            type="number"
                            step="1"
                            min="0"
                            className="input"
                            value={packets}
                            onChange={(e) => setPackets(e.target.value)}
                            placeholder="0"
                        />
                        <span className="form-hint">1 packet = ${PACKET_COST}</span>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Cups Used</label>
                        <input
                            type="number"
                            step="1"
                            min="0"
                            max="7"
                            className="input"
                            value={cups}
                            onChange={(e) => setCups(e.target.value)}
                            placeholder="0"
                        />
                        <span className="form-hint">1 cup = ${CUP_COST.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Expenses */}
            <div style={{
                border: '2px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--spacing-lg)',
                marginTop: 'var(--spacing-lg)',
                backgroundColor: 'rgba(255, 255, 255, 0.02)'
            }}>
                <h4 style={{
                    marginTop: 0,
                    marginBottom: 'var(--spacing-lg)',
                    color: 'var(--primary)',
                    fontSize: '1.1rem',
                    fontWeight: 600
                }}>Expenses</h4>

                <div className="grid grid-2">
                    <div className="form-group">
                        <label className="form-label">Taian tarau (Credits)</label>
                        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                            <input
                                type="number"
                                step="0.01"
                                className="input"
                                value={creditsTotal.toFixed(2)}
                                readOnly
                                style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', cursor: 'not-allowed', flex: 1 }}
                            />
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={() => setShowCreditModal(true)}
                                style={{ whiteSpace: 'nowrap' }}
                            >
                                Manage ({creditEntries.length})
                            </button>
                        </div>
                        <span className="form-hint">{creditEntries.length} credit entry(ies)</span>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Boon te tia Roti - AUD</label>
                        <input
                            type="number"
                            step="0.01"
                            className="input"
                            value={calculatedWaiterExpense.toFixed(2)}
                            readOnly
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', cursor: 'not-allowed' }}
                        />
                        <span className="form-hint">Auto-calculated: ${WAITER_PER_PACKET}/packet + ${WAITER_PER_CUP}/cup</span>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Number of Servers</label>
                        <input
                            type="number"
                            step="1"
                            min="0"
                            className="input"
                            value={numberOfServers}
                            onChange={(e) => setNumberOfServers(e.target.value)}
                            placeholder="0"
                        />
                        <span className="form-hint">How many servers are working?</span>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Servers (Taan serve) - AUD</label>
                        <input
                            type="number"
                            step="0.01"
                            className="input"
                            value={calculatedServerExpense.toFixed(2)}
                            readOnly
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)', cursor: 'not-allowed' }}
                        />
                        <span className="form-hint">($5 + $1 per extra packet) × number of servers</span>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Book Keeping (booki) - AUD</label>
                        <input
                            type="number"
                            step="0.01"
                            className="input"
                            value={bookkeepingExpense}
                            onChange={(e) => setBookkeepingExpense(e.target.value)}
                            placeholder="0.00"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Other Expenses - AUD</label>
                        <input
                            type="number"
                            step="0.01"
                            className="input"
                            value={otherExpenses}
                            onChange={(e) => setOtherExpenses(e.target.value)}
                            placeholder="0.00"
                        />
                        <span className="form-hint">Any additional expenses</span>
                    </div>
                </div>

                <div className="form-group" style={{ marginTop: 'var(--spacing-md)' }}>
                    <label className="form-label">Notes (Optional)</label>
                    <textarea
                        className="textarea"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Any additional notes about today..."
                    />
                </div>
            </div>

            {/* Cash in Hand */}
            <div className="form-group" style={{ marginTop: 'var(--spacing-lg)' }}>
                <label className="form-label">Cash in Hand (AUD)</label>
                <input
                    type="number"
                    step="0.01"
                    className="input"
                    value={cashInHand}
                    onChange={(e) => setCashInHand(e.target.value)}
                    placeholder="0.00"
                    required
                />
            </div>

            {/* Calculation Preview */}
            <div className="mt-lg mb-lg" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: 'var(--spacing-md)'
            }}>
                <div className="stat-card">
                    <div className="stat-label">+ Total Expenses</div>
                    <div className="stat-value" style={{ fontSize: 'clamp(1rem, 4vw, 1.5rem)' }}>
                        ${totalExpenses.toFixed(2)}
                    </div>
                    <div className="text-dim" style={{ fontSize: '0.65rem', wordBreak: 'break-word' }}>
                        W:${waiterNum.toFixed(0)} S:${serversNum.toFixed(0)} B:${bookkeepingNum.toFixed(0)} O:${otherNum.toFixed(0)}
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-label">- Powder Cost</div>
                    <div className="stat-value" style={{ fontSize: 'clamp(1rem, 4vw, 1.5rem)' }}>
                        ${powderCost.toFixed(2)}
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-label">Net Profit</div>
                    <div className={`stat-value ${netProfit >= 0 ? 'text-success' : 'text-error'}`} style={{ fontSize: 'clamp(1rem, 4vw, 1.5rem)' }}>
                        ${netProfit.toFixed(2)}
                    </div>
                    <div className="text-dim" style={{ fontSize: '0.65rem' }}>
                        Cash + Credits - Powder
                    </div>
                </div>

                <div className="stat-card">
                    <div className="stat-label">= Profit</div>
                    <div className={`stat-value ${profit >= 0 ? 'text-success' : 'text-error'}`} style={{ fontSize: 'clamp(1rem, 4vw, 1.5rem)' }}>
                        ${profit.toFixed(2)}
                    </div>
                </div>
            </div>

            <button type="submit" className="btn btn-success w-full" disabled={loading}>
                {loading ? <span className="spinner" /> : 'Save Entry'}
            </button>

            {/* Additional Payments Modal */}
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
                    zIndex: 1000
                }}>
                    <div className="card" style={{
                        maxWidth: '600px',
                        width: '90%',
                        maxHeight: '80vh',
                        overflow: 'auto'
                    }}>
                        <h3 style={{ marginTop: 0 }}>Kabwaratarau man taian kamooi</h3>

                        {/* Add New Payment Form */}
                        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                            <div className="grid grid-2" style={{ gap: 'var(--spacing-sm)' }}>
                                <div className="form-group">
                                    <label className="form-label">Name</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={newPaymentName}
                                        onChange={(e) => setNewPaymentName(e.target.value)}
                                        placeholder="Enter name"
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPayment())}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Amount (AUD)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="input"
                                        value={newPaymentAmount}
                                        onChange={(e) => setNewPaymentAmount(e.target.value)}
                                        placeholder="0.00"
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addPayment())}
                                    />
                                </div>
                            </div>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={addPayment}
                                style={{ marginTop: 'var(--spacing-sm)' }}
                            >
                                Add Payment
                            </button>
                        </div>

                        {/* Payments Table */}
                        {additionalPayments.length > 0 && (
                            <div className="table-container" style={{ marginBottom: 'var(--spacing-lg)' }}>
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Amount</th>
                                            <th style={{ width: '80px' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {additionalPayments.map((payment, index) => (
                                            <tr key={index}>
                                                <td>{payment.name}</td>
                                                <td>${payment.amount.toFixed(2)}</td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="btn btn-error"
                                                        onClick={() => removePayment(index)}
                                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td><strong>Total</strong></td>
                                            <td><strong>${additionalPaymentsTotal.toFixed(2)}</strong></td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}

                        {/* Close Button */}
                        <button
                            type="button"
                            className="btn btn-success w-full"
                            onClick={() => setShowPaymentModal(false)}
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}

            {/* Credits Modal (Taian tarau) */}
            {showCreditModal && (
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
                    zIndex: 1000
                }}>
                    <div className="card" style={{
                        maxWidth: '600px',
                        width: '90%',
                        maxHeight: '80vh',
                        overflow: 'auto'
                    }}>
                        <h3 style={{ marginTop: 0 }}>Taian tarau (Credits)</h3>

                        {/* Add New Credit Form */}
                        <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                            <div className="grid grid-2" style={{ gap: 'var(--spacing-sm)' }}>
                                <div className="form-group">
                                    <label className="form-label">Name</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={newCreditName}
                                        onChange={(e) => setNewCreditName(e.target.value)}
                                        placeholder="Enter name"
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCredit())}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Amount (AUD)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        className="input"
                                        value={newCreditAmount}
                                        onChange={(e) => setNewCreditAmount(e.target.value)}
                                        placeholder="0.00"
                                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCredit())}
                                    />
                                </div>
                            </div>
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={addCredit}
                                style={{ marginTop: 'var(--spacing-sm)' }}
                            >
                                Add Credit
                            </button>
                        </div>

                        {/* Credits Table */}
                        {creditEntries.length > 0 && (
                            <div className="table-container" style={{ marginBottom: 'var(--spacing-lg)' }}>
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Amount</th>
                                            <th style={{ width: '80px' }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {creditEntries.map((credit, index) => (
                                            <tr key={index}>
                                                <td>{credit.name}</td>
                                                <td>${credit.amount.toFixed(2)}</td>
                                                <td>
                                                    <button
                                                        type="button"
                                                        className="btn btn-error"
                                                        onClick={() => removeCredit(index)}
                                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                                                    >
                                                        Remove
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td><strong>Total</strong></td>
                                            <td><strong>${creditsTotal.toFixed(2)}</strong></td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        )}

                        {/* Close Button */}
                        <button
                            type="button"
                            className="btn btn-success w-full"
                            onClick={() => setShowCreditModal(false)}
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </form>
    );
}
