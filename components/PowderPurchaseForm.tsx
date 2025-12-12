'use client';

import { useState } from 'react';
import { format } from 'date-fns';

interface PowderPurchaseFormProps {
    onSuccess?: () => void;
}

export default function PowderPurchaseForm({ onSuccess }: PowderPurchaseFormProps) {
    const [purchaseDate, setPurchaseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [supplierName, setSupplierName] = useState('');
    const [packetsPurchased, setPacketsPurchased] = useState('');
    const [costPerPacket, setCostPerPacket] = useState('63');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [invoiceNumber, setInvoiceNumber] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const packetsNum = parseFloat(packetsPurchased) || 0;
    const costNum = parseFloat(costPerPacket) || 63;
    const totalCost = packetsNum * costNum;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setMessage(null);

        try {
            const response = await fetch('/api/powder-purchases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    purchase_date: purchaseDate,
                    supplier_name: supplierName || null,
                    packets_purchased: packetsNum,
                    cost_per_packet: costNum,
                    payment_method: paymentMethod,
                    invoice_number: invoiceNumber || null,
                    notes: notes || null,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to create purchase');
            }

            setMessage({ type: 'success', text: 'Powder purchase recorded successfully!' });

            // Reset form
            setSupplierName('');
            setPacketsPurchased('');
            setCostPerPacket('63');
            setPaymentMethod('cash');
            setInvoiceNumber('');
            setNotes('');
            setPurchaseDate(format(new Date(), 'yyyy-MM-dd'));

            if (onSuccess) {
                onSuccess();
            }
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="card">
            <h2 className="card-title">Record Powder Purchase</h2>

            {message && (
                <div className={`alert alert-${message.type}`} style={{
                    padding: '12px 16px',
                    marginBottom: '20px',
                    borderRadius: '8px',
                    backgroundColor: message.type === 'success' ? '#10b981' : '#ef4444',
                    color: 'white'
                }}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="form">
                <div className="form-grid">
                    {/* Purchase Date */}
                    <div className="form-group">
                        <label className="label">Purchase Date *</label>
                        <input
                            type="date"
                            className="input"
                            value={purchaseDate}
                            onChange={(e) => setPurchaseDate(e.target.value)}
                            required
                        />
                    </div>

                    {/* Supplier Name */}
                    <div className="form-group">
                        <label className="label">Supplier Name</label>
                        <input
                            type="text"
                            className="input"
                            value={supplierName}
                            onChange={(e) => setSupplierName(e.target.value)}
                            placeholder="Factory name"
                        />
                    </div>

                    {/* Packets Purchased */}
                    <div className="form-group">
                        <label className="label">Packets Purchased *</label>
                        <input
                            type="number"
                            className="input"
                            value={packetsPurchased}
                            onChange={(e) => setPacketsPurchased(e.target.value)}
                            placeholder="0"
                            min="0"
                            step="1"
                            required
                        />
                    </div>

                    {/* Cost per Packet */}
                    <div className="form-group">
                        <label className="label">Cost per Packet (AUD) *</label>
                        <input
                            type="number"
                            className="input"
                            value={costPerPacket}
                            onChange={(e) => setCostPerPacket(e.target.value)}
                            placeholder="63"
                            min="0"
                            step="0.01"
                            required
                        />
                    </div>

                    {/* Total Cost (Read-only) */}
                    <div className="form-group">
                        <label className="label">Total Cost (AUD)</label>
                        <input
                            type="text"
                            className="input"
                            value={`$${totalCost.toFixed(2)}`}
                            readOnly
                            style={{ backgroundColor: '#1a1a1a', color: '#10b981', fontWeight: 'bold' }}
                        />
                    </div>

                    {/* Payment Method */}
                    <div className="form-group">
                        <label className="label">Payment Method</label>
                        <select
                            className="input"
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                        >
                            <option value="cash">Cash</option>
                            <option value="credit">Credit</option>
                            <option value="bank_transfer">Bank Transfer</option>
                        </select>
                    </div>

                    {/* Invoice Number */}
                    <div className="form-group">
                        <label className="label">Invoice Number</label>
                        <input
                            type="text"
                            className="input"
                            value={invoiceNumber}
                            onChange={(e) => setInvoiceNumber(e.target.value)}
                            placeholder="Optional"
                        />
                    </div>
                </div>

                {/* Notes */}
                <div className="form-group" style={{ marginTop: '16px' }}>
                    <label className="label">Notes</label>
                    <textarea
                        className="input"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Additional notes about this purchase..."
                        rows={3}
                        style={{ resize: 'vertical' }}
                    />
                </div>

                <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isSubmitting}
                    style={{ marginTop: '20px', width: '100%' }}
                >
                    {isSubmitting ? 'Recording...' : 'Record Purchase'}
                </button>
            </form>
        </div>
    );
}
