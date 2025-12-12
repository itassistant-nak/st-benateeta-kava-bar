'use client';

import { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    AreaChart, Area, ComposedChart, Line
} from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import DashboardSummary from '@/components/DashboardSummary';

interface CashflowSummary {
    period: string;
    income: {
        total: number;
        totalCashInHand: number;
        totalCredits: number;
    };
    expenses: {
        total: number;
        powderPurchases: number;
        operationalExpenses: number;
    };
    netCashflow: number;
    entries: Array<{
        date: string;
        income: number;
        expenses: number;
        netCashflow: number;
        powderUsed?: {
            packets: number;
            cups: number;
        };
    }>;
}

interface InventoryData {
    remainingCupsBalance: number;
    formatted: {
        packets: number;
        cups: number;
    };
    totalPurchasedPackets: number;
}

export default function StatsDashboard() {
    const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('monthly');
    const [startDate, setStartDate] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    const [summary, setSummary] = useState<CashflowSummary | null>(null);
    const [inventory, setInventory] = useState<InventoryData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, [startDate, endDate]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [cashflowRes, inventoryRes] = await Promise.all([
                fetch(`/api/cashflow?period=${period}&startDate=${startDate}&endDate=${endDate}`),
                fetch('/api/inventory')
            ]);

            if (!cashflowRes.ok || !inventoryRes.ok) throw new Error('Failed to fetch data');

            const cashflowData = await cashflowRes.json();
            const inventoryData = await inventoryRes.json();

            setSummary(cashflowData);
            setInventory(inventoryData);
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

    if (loading) return <div className="card"><span className="spinner"></span> Loading stats...</div>;
    if (error) return <div className="card text-error">Error: {error}</div>;
    if (!summary || !inventory) return null;

    // Prepare data for charts (reverse for chronological order)
    const chartData = [...summary.entries].reverse().map(entry => ({
        date: format(new Date(entry.date), 'MM/dd'),
        Income: entry.income,
        Expenses: entry.expenses,
        Net: entry.netCashflow,
        PowderPackets: entry.powderUsed?.packets || 0,
        PowderCups: entry.powderUsed?.cups || 0,
        // Convert total usage to cups for a single line? Or roughly packets
        TotalCupsUsed: (entry.powderUsed?.packets || 0) * 8 + (entry.powderUsed?.cups || 0)
    }));

    return (
        <div className="grid gap-xl">
            {/* Cash and Powder Summary Cards */}
            <DashboardSummary />

            {/* Header / Controls */}
            <div className="card">
                <div className="flex justify-between items-center wrap-mobile gap-md">
                    <h2 className="card-title text-xl m-0">📊 Analytics Dashboard</h2>
                    <div className="flex gap-sm items-center wrap-mobile">
                        <input
                            type="date"
                            className="input"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <span className="text-muted">-</span>
                        <input
                            type="date"
                            className="input"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                        <div className="flex gap-xs">
                            <button onClick={setCurrentMonth} className="btn btn-sm">This Month</button>
                            <button onClick={setLastMonth} className="btn btn-sm">Last Month</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-md mobile-1-col">
                <div className="card bg-elevated border-l-4 border-green-500">
                    <div className="text-muted text-sm uppercase tracking-wide">Total Income</div>
                    <div className="text-2xl font-bold text-green-500 mt-sm">
                        ${summary.income.total.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted mt-xs">
                        Cash: ${summary.income.totalCashInHand.toLocaleString()}
                    </div>
                </div>

                <div className="card bg-elevated border-l-4 border-red-500">
                    <div className="text-muted text-sm uppercase tracking-wide">Total Expenses</div>
                    <div className="text-2xl font-bold text-red-500 mt-sm">
                        ${summary.expenses.total.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted mt-xs">
                        Ops: ${summary.expenses.operationalExpenses.toLocaleString()}
                    </div>
                </div>

                <div className={`card bg-elevated border-l-4 ${summary.netCashflow >= 0 ? 'border-blue-500' : 'border-orange-500'}`}>
                    <div className="text-muted text-sm uppercase tracking-wide">Net Profit</div>
                    <div className={`text-2xl font-bold mt-sm ${summary.netCashflow >= 0 ? 'text-blue-500' : 'text-orange-500'}`}>
                        ${summary.netCashflow.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted mt-xs">
                        {summary.netCashflow >= 0 ? '+ Positive' : '- Loss'}
                    </div>
                </div>

                <div className={`card bg-elevated border-l-4 ${inventory.formatted.packets < 3 ? 'border-red-500' : 'border-purple-500'}`}>
                    <div className="text-muted text-sm uppercase tracking-wide">Powder Stock</div>
                    <div className="text-2xl font-bold text-purple-500 mt-sm">
                        {inventory.formatted.packets}p {inventory.formatted.cups}c
                    </div>
                    <div className="text-xs text-muted mt-xs">
                        {inventory.formatted.packets < 3 ? '⚠️ Low Stock' : 'Healthy Stock'}
                    </div>
                </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-2 gap-xl mobile-1-col">
                {/* Cashflow Chart */}
                <div className="card">
                    <h3 className="card-title mb-lg">Cashflow Trend</h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="date" fontSize={12} tickMargin={10} />
                                <YAxis fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#333' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend />
                                <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Powder Usage Chart */}
                <div className="card">
                    <h3 className="card-title mb-lg">Powder Consumption (Cups)</h3>
                    <div style={{ height: '300px', width: '100%' }}>
                        <ResponsiveContainer>
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorCups" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                <XAxis dataKey="date" fontSize={12} tickMargin={10} />
                                <YAxis fontSize={12} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e1e1e', borderColor: '#333' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="TotalCupsUsed"
                                    stroke="#8b5cf6"
                                    fillOpacity={1}
                                    fill="url(#colorCups)"
                                    name="Cups Used"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Quick Stats Summary */}
            <div className="card">
                <h3 className="card-title mb-md">Analytics Summary ({startDate} to {endDate})</h3>
                <div className="grid grid-cols-3 gap-md mobile-1-col text-center">
                    <div>
                        <div className="text-3xl font-bold">{summary.entries.length}</div>
                        <div className="text-muted text-sm">Active Days</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-green-500">
                            ${(summary.income.total / (summary.entries.length || 1)).toFixed(0)}
                        </div>
                        <div className="text-muted text-sm">Avg Daily Income</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold text-purple-500">
                            {((chartData.reduce((acc, curr) => acc + curr.TotalCupsUsed, 0)) / (summary.entries.length || 1)).toFixed(1)}
                        </div>
                        <div className="text-muted text-sm">Avg Daily Cups</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
