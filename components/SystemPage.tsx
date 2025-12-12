'use client';

import { useState, useEffect } from 'react';

interface LogEntry {
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
    message: string;
    details?: string;
}

interface Backup {
    filename: string;
    size: number;
    created: string;
}

export default function SystemPage() {
    const [activeTab, setActiveTab] = useState<'logs' | 'backup' | 'data'>('logs');
    const [logType, setLogType] = useState<'system' | 'database'>('system');
    const [systemLogs, setSystemLogs] = useState<LogEntry[]>([]);
    const [databaseLogs, setDatabaseLogs] = useState<LogEntry[]>([]);
    const [backups, setBackups] = useState<Backup[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [creating, setCreating] = useState(false);
    const [restoring, setRestoring] = useState(false);
    const [resetting, setResetting] = useState(false);

    const fetchLogs = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/admin/system/logs');
            if (!response.ok) throw new Error('Failed to fetch logs');
            const data = await response.json();
            setSystemLogs(data.system || []);
            setDatabaseLogs(data.database || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchBackups = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch('/api/admin/system/backup?action=list');
            if (!response.ok) throw new Error('Failed to fetch backups');
            const data = await response.json();
            setBackups(data.backups || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'logs') {
            fetchLogs();
        } else {
            fetchBackups();
        }
    }, [activeTab]);

    const clearLogs = async (type: 'system' | 'database' | 'all') => {
        if (!confirm(`Are you sure you want to clear ${type} logs?`)) return;
        try {
            const response = await fetch(`/api/admin/system/logs?type=${type}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to clear logs');
            setSuccess(`${type} logs cleared successfully`);
            fetchLogs();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const createBackup = async () => {
        setCreating(true);
        setError('');
        try {
            const response = await fetch('/api/admin/system/backup', { method: 'POST' });
            if (!response.ok) throw new Error('Failed to create backup');
            const data = await response.json();
            setSuccess(`Backup created: ${data.filename}`);
            fetchBackups();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setCreating(false);
        }
    };

    const deleteBackup = async (filename: string) => {
        if (!confirm(`Delete backup ${filename}?`)) return;
        try {
            const response = await fetch(`/api/admin/system/backup?filename=${filename}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete backup');
            setSuccess('Backup deleted');
            fetchBackups();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const downloadBackup = (filename: string) => {
        window.open(`/api/admin/system/backup?action=download&filename=${filename}`, '_blank');
    };

    const restoreBackup = async (filename: string) => {
        if (!confirm(`⚠️ WARNING: This will replace the current database with ${filename}. A backup will be created first. Continue?`)) return;
        setRestoring(true);
        setError('');
        try {
            const response = await fetch('/api/admin/system/restore', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename })
            });
            if (!response.ok) throw new Error('Failed to restore backup');
            const data = await response.json();
            setSuccess(data.message);
            fetchBackups();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setRestoring(false);
        }
    };

    const resetDatabase = async () => {
        if (!confirm('⚠️ DANGER: This will delete ALL daily entries and powder purchases. This action cannot be undone. Are you sure?')) return;
        if (!confirm('Please confirm again. This is irreversible. Ideally, you should download a backup first.')) return;

        setResetting(true);
        setError('');
        try {
            const response = await fetch('/api/admin/system/reset', { method: 'POST' });
            if (!response.ok) throw new Error('Failed to reset database');
            const data = await response.json();
            setSuccess(data.message);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setResetting(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!confirm(`⚠️ WARNING: This will replace the current database. A backup will be created first. Continue?`)) {
            e.target.value = '';
            return;
        }
        setRestoring(true);
        setError('');
        try {
            const formData = new FormData();
            formData.append('file', file);
            const response = await fetch('/api/admin/system/restore', { method: 'POST', body: formData });
            if (!response.ok) throw new Error('Failed to restore from file');
            const data = await response.json();
            setSuccess(data.message);
            fetchBackups();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setRestoring(false);
            e.target.value = '';
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    };

    const getLevelBadgeClass = (level: string) => {
        switch (level) {
            case 'ERROR': return 'badge-error';
            case 'WARN': return 'badge-warning';
            case 'INFO': return 'badge-info';
            default: return 'badge-info';
        }
    };

    const currentLogs = logType === 'system' ? systemLogs : databaseLogs;

    return (
        <div>
            <div className="mb-2xl">
                <h1>⚙️ System Administration</h1>
                <p className="text-muted">Manage system logs and database backups</p>
            </div>

            {error && (
                <div className="badge badge-error mb-lg w-full" style={{ padding: 'var(--spacing-md)' }}>
                    {error}
                    <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                </div>
            )}

            {success && (
                <div className="badge badge-success mb-lg w-full" style={{ padding: 'var(--spacing-md)' }}>
                    {success}
                    <button onClick={() => setSuccess('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer' }}>✕</button>
                </div>
            )}

            {/* Tab Navigation */}
            <div className="flex gap-sm mb-xl">
                <button
                    className={`btn ${activeTab === 'logs' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('logs')}
                >
                    📋 Logs
                </button>
                <button
                    className={`btn ${activeTab === 'backup' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('backup')}
                >
                    💾 Backup & Restore
                </button>
                <button
                    className={`btn ${activeTab === 'data' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setActiveTab('data' as any)}
                >
                    🗄️ Data Management
                </button>
            </div>

            {/* Logs Tab */}
            {activeTab === 'logs' && (
                <div className="card">
                    <div className="flex justify-between items-center mb-lg">
                        <div className="flex gap-sm">
                            <button
                                className={`btn ${logType === 'system' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setLogType('system')}
                            >
                                System Logs ({systemLogs.length})
                            </button>
                            <button
                                className={`btn ${logType === 'database' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setLogType('database')}
                            >
                                Database Logs ({databaseLogs.length})
                            </button>
                        </div>
                        <div className="flex gap-sm">
                            <button className="btn btn-secondary" onClick={fetchLogs} disabled={loading}>
                                🔄 Refresh
                            </button>
                            <button className="btn btn-danger" onClick={() => clearLogs(logType)}>
                                🗑️ Clear {logType}
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center">
                            <div className="spinner" style={{ margin: '0 auto' }} />
                            <p className="text-muted mt-md">Loading logs...</p>
                        </div>
                    ) : currentLogs.length === 0 ? (
                        <p className="text-muted text-center">No logs found</p>
                    ) : (
                        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '180px' }}>Timestamp</th>
                                        <th style={{ width: '80px' }}>Level</th>
                                        <th>Message</th>
                                        <th>Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentLogs.map((log, index) => (
                                        <tr key={index}>
                                            <td className="text-dim" style={{ fontSize: '0.75rem' }}>
                                                {new Date(log.timestamp).toLocaleString()}
                                            </td>
                                            <td>
                                                <span className={`badge ${getLevelBadgeClass(log.level)}`}>
                                                    {log.level}
                                                </span>
                                            </td>
                                            <td>{log.message}</td>
                                            <td className="text-dim">{log.details || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Backup Tab */}
            {activeTab === 'backup' && (
                <div className="grid gap-xl">
                    {/* Create Backup */}
                    <div className="card">
                        <h3 className="mb-lg">💾 Create Backup</h3>
                        <p className="text-muted mb-lg">Create a backup of the current database state.</p>
                        <button className="btn btn-success" onClick={createBackup} disabled={creating}>
                            {creating ? <span className="spinner" /> : '📦 Create Backup Now'}
                        </button>
                    </div>

                    {/* Restore from File */}
                    <div className="card">
                        <h3 className="mb-lg">📤 Restore from File</h3>
                        <p className="text-muted mb-lg">Upload a database file to restore. A backup of current database will be created first.</p>
                        <label className="btn btn-warning" style={{ cursor: 'pointer' }}>
                            {restoring ? <span className="spinner" /> : '📁 Upload Database File'}
                            <input
                                type="file"
                                accept=".db"
                                onChange={handleFileUpload}
                                style={{ display: 'none' }}
                                disabled={restoring}
                            />
                        </label>
                    </div>

                    {/* Backups List */}
                    <div className="card">
                        <div className="flex justify-between items-center mb-lg">
                            <h3>📚 Available Backups ({backups.length})</h3>
                            <button className="btn btn-secondary" onClick={fetchBackups} disabled={loading}>
                                🔄 Refresh
                            </button>
                        </div>

                        {loading ? (
                            <div className="text-center">
                                <div className="spinner" style={{ margin: '0 auto' }} />
                                <p className="text-muted mt-md">Loading backups...</p>
                            </div>
                        ) : backups.length === 0 ? (
                            <p className="text-muted text-center">No backups found. Create one to get started.</p>
                        ) : (
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Filename</th>
                                            <th>Size</th>
                                            <th>Created</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {backups.map((backup) => (
                                            <tr key={backup.filename}>
                                                <td><strong>{backup.filename}</strong></td>
                                                <td className="text-muted">{formatBytes(backup.size)}</td>
                                                <td className="text-muted">
                                                    {new Date(backup.created).toLocaleString()}
                                                </td>
                                                <td>
                                                    <div className="flex gap-sm">
                                                        <button
                                                            className="btn btn-secondary"
                                                            style={{ padding: 'var(--spacing-xs) var(--spacing-sm)' }}
                                                            onClick={() => downloadBackup(backup.filename)}
                                                            title="Download"
                                                        >
                                                            ⬇️
                                                        </button>
                                                        <button
                                                            className="btn btn-warning"
                                                            style={{ padding: 'var(--spacing-xs) var(--spacing-sm)' }}
                                                            onClick={() => restoreBackup(backup.filename)}
                                                            disabled={restoring}
                                                            title="Restore"
                                                        >
                                                            🔄
                                                        </button>
                                                        <button
                                                            className="btn btn-danger"
                                                            style={{ padding: 'var(--spacing-xs) var(--spacing-sm)' }}
                                                            onClick={() => deleteBackup(backup.filename)}
                                                            title="Delete"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Data Management Tab */}
            {activeTab === 'data' && (
                <div className="card border-error">
                    <h3 className="mb-lg text-error">⚠️ Danger Zone</h3>
                    <p className="mb-lg">
                        Actions here can cause permanent data loss. Please proceed with caution.
                    </p>

                    <div className="p-lg rounded" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <h4 className="mb-md text-error">Reset Database</h4>
                        <p className="mb-md text-muted">
                            This will clear <strong>ALL</strong> daily entries, powder purchases, and transaction history.
                            Users and system settings will be preserved.
                        </p>
                        <button
                            className="btn btn-danger"
                            onClick={resetDatabase}
                            disabled={resetting}
                        >
                            {resetting ? <span className="spinner" /> : '🗑️ Clear All Entries'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

