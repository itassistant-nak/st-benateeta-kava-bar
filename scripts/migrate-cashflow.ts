/**
 * Migration script to add powder_purchases table to existing databases
 * This script is safe to run multiple times (idempotent)
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(process.cwd(), 'database', 'kava-bar.db');

function runMigration() {
    console.log('Starting cashflow migration...');

    // Check if database exists
    if (!fs.existsSync(DB_PATH)) {
        console.error('Database not found at:', DB_PATH);
        console.log('Please run the application first to create the database.');
        process.exit(1);
    }

    const db = new Database(DB_PATH);

    try {
        // Check if powder_purchases table already exists
        const tableExists = db.prepare(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name='powder_purchases'
        `).get();

        if (tableExists) {
            console.log('✓ powder_purchases table already exists. No migration needed.');
            db.close();
            return;
        }

        console.log('Creating powder_purchases table...');

        // Create powder_purchases table
        db.exec(`
            CREATE TABLE IF NOT EXISTS powder_purchases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                purchase_date DATE NOT NULL,
                supplier_name TEXT,
                packets_purchased INTEGER NOT NULL DEFAULT 0,
                cost_per_packet REAL NOT NULL DEFAULT 63,
                total_cost REAL NOT NULL,
                payment_method TEXT CHECK(payment_method IN ('cash', 'credit', 'bank_transfer')),
                invoice_number TEXT,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        `);

        console.log('✓ Created powder_purchases table');

        // Create indexes
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_powder_purchases_date 
                ON powder_purchases(purchase_date DESC);
            CREATE INDEX IF NOT EXISTS idx_powder_purchases_user 
                ON powder_purchases(user_id, purchase_date DESC);
        `);

        console.log('✓ Created indexes');

        console.log('\n✅ Migration completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        db.close();
    }
}

// Run migration
runMigration();
