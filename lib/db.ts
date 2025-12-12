import initSqlJs, { Database } from 'sql.js';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logDbInfo, logDbError, logSystemInfo, logSystemError } from './logger';

const DB_PATH = join(process.cwd(), 'database', 'kava-bar.db');
let db: Database | null = null;

// Run migrations for existing databases
function runMigrations(database: Database) {
    // Migration 1: Update users table to support 'manager' role
    // Check the current CHECK constraint by looking at table schema
    const schemaResult = database.exec("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'");
    if (schemaResult.length > 0 && schemaResult[0].values.length > 0) {
        const createSql = schemaResult[0].values[0][0] as string;
        // If the constraint doesn't include 'manager', we need to recreate the table
        if (createSql && !createSql.includes("'manager'")) {
            console.log('Running migration: Updating users table to support manager role...');

            // SQLite doesn't support ALTER TABLE to modify constraints
            // We need to recreate the table
            database.exec(`
                CREATE TABLE IF NOT EXISTS users_new (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL CHECK(role IN ('admin', 'manager', 'user')),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Copy existing data
            database.exec(`
                INSERT INTO users_new (id, username, password_hash, role, created_at)
                SELECT id, username, password_hash, role, created_at FROM users
            `);

            // Drop old table and rename new one
            database.exec(`DROP TABLE users`);
            database.exec(`ALTER TABLE users_new RENAME TO users`);

            console.log('Migration completed: users table updated.');
        }
    }

    // Migration 2: Create features and user_features tables
    const tablesResult = database.exec("SELECT name FROM sqlite_master WHERE type='table' AND name='features'");
    if (tablesResult.length === 0 || tablesResult[0].values.length === 0) {
        console.log('Running migration: Creating features and user_features tables...');

        // Create features table
        database.exec(`
            CREATE TABLE IF NOT EXISTS features (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Create user_features table
        database.exec(`
            CREATE TABLE IF NOT EXISTS user_features (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                feature_id INTEGER NOT NULL,
                granted_by INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (feature_id) REFERENCES features(id) ON DELETE CASCADE,
                FOREIGN KEY (granted_by) REFERENCES users(id),
                UNIQUE(user_id, feature_id)
            )
        `);

        // Insert default features
        database.exec(`
            INSERT OR IGNORE INTO features (id, name, description) VALUES
                (1, 'dashboard', 'Access to daily dashboard and entry creation'),
                (2, 'reports', 'Access to reports and analytics'),
                (3, 'print', 'Ability to print daily entries'),
                (4, 'admin', 'Access to admin panel')
        `);

        console.log('Migration completed: features and user_features tables created.');
    }

    // Migration 3: Add opening balance columns to daily_entries
    const dailyEntriesSchema = database.exec("PRAGMA table_info(daily_entries)");
    if (dailyEntriesSchema.length > 0) {
        const columns = dailyEntriesSchema[0].values.map((row: any) => row[1]);

        if (!columns.includes('opening_cash')) {
            console.log('Running migration: Adding opening balance columns to daily_entries...');

            database.exec(`ALTER TABLE daily_entries ADD COLUMN opening_cash REAL DEFAULT 0`);
            database.exec(`ALTER TABLE daily_entries ADD COLUMN opening_packets INTEGER DEFAULT 0`);
            database.exec(`ALTER TABLE daily_entries ADD COLUMN opening_cups INTEGER DEFAULT 0`);
            database.exec(`ALTER TABLE daily_entries ADD COLUMN opening_notes TEXT`);

            console.log('Migration completed: Opening balance columns added.');
        }

        // Migration 4: Add credit_entries, bookkeeper_name, waiter_name, servers_names, additional_payments columns
        if (!columns.includes('credit_entries')) {
            console.log('Running migration: Adding credit and staff columns to daily_entries...');

            database.exec(`ALTER TABLE daily_entries ADD COLUMN credit_entries TEXT DEFAULT '[]'`);
            database.exec(`ALTER TABLE daily_entries ADD COLUMN bookkeeper_name TEXT`);
            database.exec(`ALTER TABLE daily_entries ADD COLUMN waiter_name TEXT`);
            database.exec(`ALTER TABLE daily_entries ADD COLUMN servers_names TEXT DEFAULT '[]'`);
            database.exec(`ALTER TABLE daily_entries ADD COLUMN additional_payments TEXT DEFAULT '[]'`);

            console.log('Migration completed: Credit and staff columns added.');
        }
    }
}

export async function getDatabase(): Promise<Database> {
    if (db) return db;

    const SQL = await initSqlJs({
        locateFile: (file: string) => join(process.cwd(), 'public', file)
    });

    // Load existing database or create new one
    if (existsSync(DB_PATH)) {
        const buffer = readFileSync(DB_PATH);
        db = new SQL.Database(buffer);
        logDbInfo('Database loaded', DB_PATH);

        // Run migrations for existing database
        runMigrations(db);
        saveDatabase();
    } else {
        db = new SQL.Database();
        logDbInfo('New database created', DB_PATH);

        // Initialize schema
        const schema = readFileSync(join(process.cwd(), 'database', 'schema.sql'), 'utf8');
        db.exec(schema);
        logDbInfo('Database schema initialized');

        // Save initial database
        saveDatabase();
    }

    logSystemInfo('Application started', 'Database connection established');
    return db;
}

export function saveDatabase() {
    if (!db) return;
    const data = db.export();
    const buffer = Buffer.from(data);
    writeFileSync(DB_PATH, buffer);
}

// Helper function to convert BigInt to number in objects
function convertBigIntToNumber(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj === 'bigint') return Number(obj);
    if (Array.isArray(obj)) return obj.map(convertBigIntToNumber);
    if (typeof obj === 'object') {
        const converted: any = {};
        for (const key in obj) {
            converted[key] = convertBigIntToNumber(obj[key]);
        }
        return converted;
    }
    return obj;
}

// Helper function to run queries
export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const database = await getDatabase();
    const stmt = database.prepare(sql);
    stmt.bind(params);

    const results: T[] = [];
    while (stmt.step()) {
        const row = stmt.getAsObject();
        results.push(convertBigIntToNumber(row) as T);
    }
    stmt.free();

    return results;
}

// Helper function to run insert/update/delete
export async function execute(sql: string, params: any[] = []): Promise<void> {
    const database = await getDatabase();
    const stmt = database.prepare(sql);
    stmt.bind(params);
    stmt.step();
    stmt.free();
    saveDatabase();
}

// Get last insert ID
export async function getLastInsertId(): Promise<number> {
    const database = await getDatabase();
    const result = database.exec('SELECT last_insert_rowid() as id');
    const id = result[0]?.values[0]?.[0];
    // Convert BigInt to number if needed
    return typeof id === 'bigint' ? Number(id) : (id as number || 0);
}
