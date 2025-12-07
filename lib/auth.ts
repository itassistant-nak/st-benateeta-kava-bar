import bcrypt from 'bcryptjs';
import { query, execute, getLastInsertId } from './db';

export type UserRole = 'admin' | 'manager' | 'user';

export interface User {
    id: number;
    username: string;
    password_hash: string;
    role: UserRole;
    created_at: string;
}

export interface Feature {
    id: number;
    name: string;
    description: string;
    created_at: string;
}

export interface UserFeature {
    id: number;
    user_id: number;
    feature_id: number;
    granted_by: number;
    created_at: string;
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export async function getUserByUsername(username: string): Promise<User | null> {
    const users = await query<User>('SELECT * FROM users WHERE username = ?', [username]);
    return users[0] || null;
}

export async function getUserById(id: number): Promise<User | null> {
    const users = await query<User>('SELECT * FROM users WHERE id = ?', [id]);
    return users[0] || null;
}

export async function createUser(username: string, password: string, role: UserRole = 'user'): Promise<number> {
    const passwordHash = await hashPassword(password);
    await execute(
        'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
        [username, passwordHash, role]
    );

    return getLastInsertId();
}

export async function deleteUser(id: number): Promise<void> {
    await execute('DELETE FROM users WHERE id = ?', [id]);
}

export async function getAllUsers(): Promise<Omit<User, 'password_hash'>[]> {
    const users = await query<User>('SELECT id, username, role, created_at FROM users');
    return users;
}

// Feature management functions
export async function getAllFeatures(): Promise<Feature[]> {
    return await query<Feature>('SELECT * FROM features ORDER BY id');
}

export async function getUserFeatures(userId: number): Promise<Feature[]> {
    return await query<Feature>(`
        SELECT f.* FROM features f
        INNER JOIN user_features uf ON f.id = uf.feature_id
        WHERE uf.user_id = ?
        ORDER BY f.id
    `, [userId]);
}

export async function getUsersWithFeatures(): Promise<(Omit<User, 'password_hash'> & { features: Feature[] })[]> {
    const users = await getAllUsers();
    const usersWithFeatures = await Promise.all(
        users.map(async (user) => {
            const features = await getUserFeatures(user.id);
            return { ...user, features };
        })
    );
    return usersWithFeatures;
}

export async function assignFeatureToUser(userId: number, featureId: number, grantedBy: number): Promise<void> {
    await execute(
        'INSERT OR IGNORE INTO user_features (user_id, feature_id, granted_by) VALUES (?, ?, ?)',
        [userId, featureId, grantedBy]
    );
}

export async function removeFeatureFromUser(userId: number, featureId: number): Promise<void> {
    await execute(
        'DELETE FROM user_features WHERE user_id = ? AND feature_id = ?',
        [userId, featureId]
    );
}

export async function setUserFeatures(userId: number, featureIds: number[], grantedBy: number): Promise<void> {
    // Remove all existing features
    await execute('DELETE FROM user_features WHERE user_id = ?', [userId]);

    // Add new features
    for (const featureId of featureIds) {
        await assignFeatureToUser(userId, featureId, grantedBy);
    }
}

export async function userHasFeature(userId: number, featureName: string): Promise<boolean> {
    const result = await query<{ count: number }>(`
        SELECT COUNT(*) as count FROM user_features uf
        INNER JOIN features f ON uf.feature_id = f.id
        WHERE uf.user_id = ? AND f.name = ?
    `, [userId, featureName]);
    return result[0]?.count > 0;
}
