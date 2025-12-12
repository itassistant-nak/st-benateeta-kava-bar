
const db = require('better-sqlite3')('database/kava-bar.db');

console.log('Running migration: Add opening_notes to daily_entries...');

try {
    // Check if column exists
    const tableInfo = db.prepare("PRAGMA table_info(daily_entries)").all();
    const hasColumn = tableInfo.some((col: any) => col.name === 'opening_notes');

    if (hasColumn) {
        console.log('Column opening_notes already exists. Skipping.');
    } else {
        db.prepare("ALTER TABLE daily_entries ADD COLUMN opening_notes TEXT").run();
        console.log('Successfully added opening_notes column.');
    }

} catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
}

console.log('Migration complete.');
