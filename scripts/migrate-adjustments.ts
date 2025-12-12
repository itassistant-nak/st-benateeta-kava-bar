const Database = require('better-sqlite3');
const path = require('path');

function runMigration() {
    const dbPath = path.join(process.cwd(), 'database', 'kava-bar.db');
    const db = new Database(dbPath);

    console.log('Running migration: Create adjustments table...');

    try {
        db.prepare(`
            CREATE TABLE IF NOT EXISTS adjustments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                date DATE NOT NULL,
                type TEXT CHECK(type IN ('cash', 'powder')) NOT NULL,
                amount REAL NOT NULL,
                notes TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `).run();

        console.log('Successfully created adjustments table.');

    } catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    } finally {
        db.close();
    }

    console.log('Migration complete.');
}

runMigration();

export { };
