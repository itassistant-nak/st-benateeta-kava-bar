
import { execute, query } from '../lib/db';

async function migrate() {
    console.log('Starting migration: add opening balance columns...');

    try {
        // Check if columns exist
        const tableInfo = await query<any>("PRAGMA table_info(daily_entries)");
        const columns = tableInfo.map((col: any) => col.name);

        if (!columns.includes('opening_cash')) {
            await execute("ALTER TABLE daily_entries ADD COLUMN opening_cash REAL DEFAULT 0");
            console.log('Added opening_cash column');
        } else {
            console.log('opening_cash column already exists');
        }

        if (!columns.includes('opening_packets')) {
            await execute("ALTER TABLE daily_entries ADD COLUMN opening_packets INTEGER DEFAULT 0");
            console.log('Added opening_packets column');
        } else {
            console.log('opening_packets column already exists');
        }

        if (!columns.includes('opening_cups')) {
            await execute("ALTER TABLE daily_entries ADD COLUMN opening_cups INTEGER DEFAULT 0");
            console.log('Added opening_cups column');
        } else {
            console.log('opening_cups column already exists');
        }

        console.log('Migration completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
}

migrate();
