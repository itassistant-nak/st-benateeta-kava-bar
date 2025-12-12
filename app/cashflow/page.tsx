'use client';

import { useState } from 'react';
import PowderPurchaseForm from '@/components/PowderPurchaseForm';
import PowderPurchaseList from '@/components/PowderPurchaseList';
import CashflowDashboard from '@/components/CashflowDashboard';
import InventoryDashboard from '@/components/InventoryDashboard';

export default function CashflowPage() {
    const [activeTab, setActiveTab] = useState<'purchases' | 'analysis'>('purchases');
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handlePurchaseSuccess = () => {
        setRefreshTrigger(prev => prev + 1);
    };

    return (
        <div className="container">
            <div style={{ marginBottom: '32px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: 'bold', marginBottom: '8px' }}>
                    💰 Cashflow Management
                </h1>
                <p style={{ color: '#888' }}>
                    Track powder purchases and analyze your cashflow
                </p>
            </div>

            {/* Inventory Status */}
            <InventoryDashboard refreshTrigger={refreshTrigger} />


            {/* Tab Navigation */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '24px',
                borderBottom: '1px solid #2a2a2a',
                paddingBottom: '0'
            }}>
                <button
                    onClick={() => setActiveTab('purchases')}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: activeTab === 'purchases' ? '#2a2a2a' : 'transparent',
                        color: activeTab === 'purchases' ? '#fff' : '#888',
                        border: 'none',
                        borderBottom: activeTab === 'purchases' ? '2px solid #10b981' : '2px solid transparent',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: activeTab === 'purchases' ? 'bold' : 'normal',
                        transition: 'all 0.2s'
                    }}
                >
                    🛒 Powder Purchases
                </button>
                <button
                    onClick={() => setActiveTab('analysis')}
                    style={{
                        padding: '12px 24px',
                        backgroundColor: activeTab === 'analysis' ? '#2a2a2a' : 'transparent',
                        color: activeTab === 'analysis' ? '#fff' : '#888',
                        border: 'none',
                        borderBottom: activeTab === 'analysis' ? '2px solid #10b981' : '2px solid transparent',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: activeTab === 'analysis' ? 'bold' : 'normal',
                        transition: 'all 0.2s'
                    }}
                >
                    📊 Cashflow Analysis
                </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'purchases' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <PowderPurchaseForm onSuccess={handlePurchaseSuccess} />
                    <PowderPurchaseList refreshTrigger={refreshTrigger} />
                </div>
            )}

            {activeTab === 'analysis' && (
                <CashflowDashboard />
            )}
        </div>
    );
}
