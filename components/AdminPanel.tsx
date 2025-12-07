'use client';

import { useState, useEffect } from 'react';

type UserRole = 'admin' | 'manager' | 'user';

interface Feature {
    id: number;
    name: string;
    description: string;
}

interface User {
    id: number;
    username: string;
    role: UserRole;
    created_at: string;
    features?: Feature[];
}

export default function AdminPanel() {
    const [users, setUsers] = useState<User[]>([]);
    const [features, setFeatures] = useState<Feature[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingUserId, setEditingUserId] = useState<number | null>(null);
    const [selectedFeatures, setSelectedFeatures] = useState<number[]>([]);
    const [savingFeatures, setSavingFeatures] = useState(false);

    // Add user form state
    const [newUsername, setNewUsername] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newRole, setNewRole] = useState<UserRole>('user');
    const [addLoading, setAddLoading] = useState(false);

    const fetchUsers = async () => {
        try {
            const response = await fetch('/api/admin/users?includeFeatures=true');
            if (!response.ok) throw new Error('Failed to fetch users');
            const data = await response.json();
            setUsers(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchFeatures = async () => {
        try {
            const response = await fetch('/api/admin/features');
            if (!response.ok) throw new Error('Failed to fetch features');
            const data = await response.json();
            setFeatures(data);
        } catch (err: any) {
            setError(err.message);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchFeatures();
    }, []);

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddLoading(true);
        setError('');

        try {
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: newUsername,
                    password: newPassword,
                    role: newRole,
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create user');
            }

            // Reset form and refresh users
            setNewUsername('');
            setNewPassword('');
            setNewRole('user');
            setShowAddForm(false);
            await fetchUsers();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setAddLoading(false);
        }
    };

    const handleDeleteUser = async (userId: number) => {
        if (!confirm('Are you sure you want to delete this user?')) return;

        try {
            const response = await fetch(`/api/admin/users/${userId}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to delete user');
            }

            await fetchUsers();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleEditFeatures = (user: User) => {
        setEditingUserId(user.id);
        setSelectedFeatures(user.features?.map(f => f.id) || []);
    };

    const handleFeatureToggle = (featureId: number) => {
        setSelectedFeatures(prev =>
            prev.includes(featureId)
                ? prev.filter(id => id !== featureId)
                : [...prev, featureId]
        );
    };

    const handleSaveFeatures = async () => {
        if (!editingUserId) return;
        setSavingFeatures(true);
        setError('');

        try {
            const response = await fetch(`/api/admin/users/${editingUserId}/features`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ featureIds: selectedFeatures }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update features');
            }

            setEditingUserId(null);
            await fetchUsers();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setSavingFeatures(false);
        }
    };

    const getRoleBadgeClass = (role: UserRole) => {
        switch (role) {
            case 'admin': return 'badge-warning';
            case 'manager': return 'badge-success';
            default: return 'badge-info';
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-xl">
                <h2>User Management</h2>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowAddForm(!showAddForm)}
                >
                    {showAddForm ? 'Cancel' : '+ Add User'}
                </button>
            </div>

            {error && (
                <div className="badge badge-error mb-lg w-full" style={{ padding: 'var(--spacing-md)' }}>
                    {error}
                </div>
            )}

            {/* Add User Form */}
            {showAddForm && (
                <form onSubmit={handleAddUser} className="card mb-xl">
                    <h3 className="mb-lg">Add New User</h3>

                    <div className="grid grid-2">
                        <div className="form-group">
                            <label className="form-label">Username</label>
                            <input
                                type="text"
                                className="input"
                                value={newUsername}
                                onChange={(e) => setNewUsername(e.target.value)}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                                type="password"
                                className="input"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Role</label>
                            <select
                                className="select"
                                value={newRole}
                                onChange={(e) => setNewRole(e.target.value as UserRole)}
                            >
                                <option value="user">User</option>
                                <option value="manager">Manager</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                    </div>

                    <button type="submit" className="btn btn-success" disabled={addLoading}>
                        {addLoading ? <span className="spinner" /> : 'Create User'}
                    </button>
                </form>
            )}

            {/* Feature Assignment Modal */}
            {editingUserId && (
                <div className="card mb-xl" style={{ border: '2px solid var(--color-primary)' }}>
                    <h3 className="mb-lg">
                        Assign Features to: {users.find(u => u.id === editingUserId)?.username}
                    </h3>

                    <div className="grid grid-2 mb-lg">
                        {features.map((feature) => (
                            <label
                                key={feature.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--spacing-sm)',
                                    padding: 'var(--spacing-sm)',
                                    background: selectedFeatures.includes(feature.id) ? 'var(--color-bg-elevated)' : 'transparent',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer'
                                }}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedFeatures.includes(feature.id)}
                                    onChange={() => handleFeatureToggle(feature.id)}
                                    style={{ width: '18px', height: '18px' }}
                                />
                                <div>
                                    <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{feature.name}</div>
                                    <div className="text-dim" style={{ fontSize: '0.75rem' }}>{feature.description}</div>
                                </div>
                            </label>
                        ))}
                    </div>

                    <div className="flex gap-sm">
                        <button
                            className="btn btn-success"
                            onClick={handleSaveFeatures}
                            disabled={savingFeatures}
                        >
                            {savingFeatures ? <span className="spinner" /> : 'Save Features'}
                        </button>
                        <button
                            className="btn btn-secondary"
                            onClick={() => setEditingUserId(null)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Users List */}
            {loading ? (
                <div className="card text-center">
                    <div className="spinner" style={{ margin: '0 auto' }} />
                    <p className="text-muted mt-md">Loading users...</p>
                </div>
            ) : (
                <div className="card">
                    <h3 className="mb-lg">All Users ({users.length})</h3>

                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Username</th>
                                    <th>Role</th>
                                    <th>Features</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id}>
                                        <td>{user.id}</td>
                                        <td><strong>{user.username}</strong></td>
                                        <td>
                                            <span className={`badge ${getRoleBadgeClass(user.role)}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td>
                                            {user.features && user.features.length > 0 ? (
                                                <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                                                    {user.features.map((feature) => (
                                                        <span
                                                            key={feature.id}
                                                            className="badge badge-info"
                                                            style={{ fontSize: '0.7rem', textTransform: 'capitalize' }}
                                                        >
                                                            {feature.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-dim" style={{ fontSize: '0.75rem' }}>
                                                    No features
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-muted">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td>
                                            <div className="flex gap-sm">
                                                {user.id !== 1 && (
                                                    <>
                                                        <button
                                                            className="btn btn-secondary"
                                                            style={{ padding: 'var(--spacing-xs) var(--spacing-sm)' }}
                                                            onClick={() => handleEditFeatures(user)}
                                                            title="Assign Features"
                                                        >
                                                            ⚙️
                                                        </button>
                                                        <button
                                                            className="btn btn-danger"
                                                            style={{ padding: 'var(--spacing-xs) var(--spacing-sm)' }}
                                                            onClick={() => handleDeleteUser(user.id)}
                                                            title="Delete User"
                                                        >
                                                            🗑️
                                                        </button>
                                                    </>
                                                )}
                                                {user.id === 1 && (
                                                    <span className="text-dim" style={{ fontSize: '0.75rem' }}>
                                                        Default Admin
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
