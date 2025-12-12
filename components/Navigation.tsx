'use client';

import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';

interface UserAccess {
    dashboard: boolean;
    reports: boolean;
    print: boolean;
    admin: boolean;
    system: boolean;
}

export default function Navigation() {
    const router = useRouter();
    const pathname = usePathname();
    const [loggingOut, setLoggingOut] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [access, setAccess] = useState<UserAccess>({
        dashboard: true,
        reports: false,
        print: false,
        admin: false,
        system: false,
    });
    const [username, setUsername] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAccess = async () => {
            try {
                const response = await fetch('/api/auth/me');
                if (response.ok) {
                    const data = await response.json();
                    setAccess(data.access);
                    setUsername(data.user?.username || '');
                }
            } catch (error) {
                console.error('Failed to fetch user access:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchAccess();
    }, []);

    // Close mobile menu on route change
    useEffect(() => {
        setMobileMenuOpen(false);
    }, [pathname]);

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/');
            router.refresh();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setLoggingOut(false);
        }
    };

    const isActive = (path: string) => pathname === path;

    const navLinks = (
        <>
            {access.dashboard && (
                <Link
                    href="/dashboard"
                    className={`btn btn-secondary ${isActive('/dashboard') ? 'active' : ''}`}
                    style={isActive('/dashboard') ? { borderColor: 'var(--color-primary)' } : {}}
                >
                    Daily Entry
                </Link>
            )}
            {access.dashboard && (
                <Link
                    href="/analytics"
                    className={`btn btn-secondary ${isActive('/analytics') ? 'active' : ''}`}
                    style={isActive('/analytics') ? { borderColor: 'var(--color-primary)' } : {}}
                >
                    Dashboard
                </Link>
            )}
            {access.reports && (
                <Link
                    href="/reports"
                    className={`btn btn-secondary ${isActive('/reports') ? 'active' : ''}`}
                    style={isActive('/reports') ? { borderColor: 'var(--color-primary)' } : {}}
                >
                    Reports
                </Link>
            )}
            {access.dashboard && (
                <Link
                    href="/opening"
                    className={`btn btn-secondary ${isActive('/opening') ? 'active' : ''}`}
                    style={isActive('/opening') ? { borderColor: 'var(--color-primary)' } : {}}
                >
                    Adjustments
                </Link>
            )}
            {access.dashboard && (
                <Link
                    href="/cashflow"
                    className={`btn btn-secondary ${isActive('/cashflow') ? 'active' : ''}`}
                    style={isActive('/cashflow') ? { borderColor: 'var(--color-primary)' } : {}}
                >
                    Cashflow
                </Link>
            )}
            {access.dashboard && (
                <Link
                    href="/creditors"
                    className={`btn btn-secondary ${isActive('/creditors') ? 'active' : ''}`}
                    style={isActive('/creditors') ? { borderColor: 'var(--color-primary)' } : {}}
                >
                    Creditors
                </Link>
            )}
            {access.admin && (
                <Link
                    href="/admin"
                    className={`btn btn-secondary ${isActive('/admin') ? 'active' : ''}`}
                    style={isActive('/admin') ? { borderColor: 'var(--color-primary)' } : {}}
                >
                    Admin
                </Link>
            )}
            {access.system && (
                <Link
                    href="/system"
                    className={`btn btn-secondary ${isActive('/system') ? 'active' : ''}`}
                    style={isActive('/system') ? { borderColor: 'var(--color-primary)' } : {}}
                >
                    System
                </Link>
            )}
        </>
    );

    return (
        <>
            <nav style={{
                background: 'var(--color-bg-elevated)',
                borderBottom: '1px solid var(--color-border)',
                padding: 'var(--spacing-md) 0',
                position: 'sticky',
                top: 0,
                zIndex: 100,
            }}>
                <div className="container flex justify-between items-center">
                    {/* Logo */}
                    <Link href="/dashboard" style={{ fontSize: '1.1rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        🥥 <span className="hide-mobile">ST Benateeta</span> Kava Bar
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="flex items-center gap-sm hide-mobile">
                        {navLinks}
                    </div>

                    {/* Desktop User Info & Logout */}
                    <div className="flex items-center gap-md hide-mobile">
                        {username && (
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem' }}>
                                👤 {username}
                            </span>
                        )}
                        <button
                            onClick={handleLogout}
                            className="btn btn-secondary"
                            disabled={loggingOut}
                        >
                            {loggingOut ? <span className="spinner" /> : 'Logout'}
                        </button>
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        className="btn btn-secondary hide-desktop"
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        style={{ padding: 'var(--spacing-sm)', fontSize: '1.25rem' }}
                        aria-label="Toggle menu"
                    >
                        {mobileMenuOpen ? '✕' : '☰'}
                    </button>
                </div>
            </nav>

            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <>
                    <div
                        className="mobile-menu-overlay hide-desktop"
                        onClick={() => setMobileMenuOpen(false)}
                    />
                    <div className="mobile-menu-content hide-desktop">
                        {/* User Info */}
                        {username && (
                            <div style={{
                                padding: 'var(--spacing-md)',
                                marginBottom: 'var(--spacing-md)',
                                borderBottom: '1px solid var(--color-border)',
                                color: 'var(--color-text-muted)'
                            }}>
                                👤 {username}
                            </div>
                        )}

                        {/* Navigation Links */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                            {access.dashboard && (
                                <Link
                                    href="/dashboard"
                                    className={`btn ${isActive('/dashboard') ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ justifyContent: 'flex-start' }}
                                >
                                    📝 Daily Entry
                                </Link>
                            )}
                            {access.dashboard && (
                                <Link
                                    href="/analytics"
                                    className={`btn ${isActive('/analytics') ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ justifyContent: 'flex-start' }}
                                >
                                    📊 Dashboard
                                </Link>
                            )}
                            {access.reports && (
                                <Link
                                    href="/reports"
                                    className={`btn ${isActive('/reports') ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ justifyContent: 'flex-start' }}
                                >
                                    📈 Reports
                                </Link>
                            )}
                            {access.dashboard && (
                                <Link
                                    href="/opening"
                                    className={`btn ${isActive('/opening') ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ justifyContent: 'flex-start' }}
                                >
                                    ⚙️ Adjustments
                                </Link>
                            )}
                            {access.dashboard && (
                                <Link
                                    href="/cashflow"
                                    className={`btn ${isActive('/cashflow') ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ justifyContent: 'flex-start' }}
                                >
                                    💰 Cashflow
                                </Link>
                            )}
                            {access.dashboard && (
                                <Link
                                    href="/creditors"
                                    className={`btn ${isActive('/creditors') ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ justifyContent: 'flex-start' }}
                                >
                                    💳 Creditors
                                </Link>
                            )}
                            {access.admin && (
                                <Link
                                    href="/admin"
                                    className={`btn ${isActive('/admin') ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ justifyContent: 'flex-start' }}
                                >
                                    ⚙️ Admin
                                </Link>
                            )}
                            {access.system && (
                                <Link
                                    href="/system"
                                    className={`btn ${isActive('/system') ? 'btn-primary' : 'btn-secondary'}`}
                                    style={{ justifyContent: 'flex-start' }}
                                >
                                    🔧 System
                                </Link>
                            )}
                        </div>

                        {/* Logout Button */}
                        <div style={{ marginTop: 'var(--spacing-xl)', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border)' }}>
                            <button
                                onClick={handleLogout}
                                className="btn btn-danger w-full"
                                disabled={loggingOut}
                            >
                                {loggingOut ? <span className="spinner" /> : '🚪 Logout'}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
