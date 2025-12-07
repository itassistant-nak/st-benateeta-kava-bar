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

    return (
        <nav style={{
            background: 'var(--color-bg-elevated)',
            borderBottom: '1px solid var(--color-border)',
            padding: 'var(--spacing-md) 0',
        }}>
            <div className="container flex justify-between items-center">
                <div className="flex items-center gap-lg">
                    <Link href="/dashboard" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                        🥥 ST Benateeta Kava Bar
                    </Link>

                    <div className="flex gap-sm">
                        {access.dashboard && (
                            <Link
                                href="/dashboard"
                                className={`btn btn-secondary ${isActive('/dashboard') ? 'active' : ''}`}
                                style={isActive('/dashboard') ? { borderColor: 'var(--color-primary)' } : {}}
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
                    </div>
                </div>

                <div className="flex items-center gap-md">
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
            </div>
        </nav>
    );
}
