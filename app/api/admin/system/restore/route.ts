import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logDbInfo, logDbError, logDbWarn } from '@/lib/logger';

const DB_PATH = join(process.cwd(), 'database', 'kava-bar.db');
const BACKUPS_DIR = join(process.cwd(), 'database', 'backups');

// POST - Restore from backup
export async function POST(request: NextRequest) {
    try {
        await requireAdmin();
        
        const contentType = request.headers.get('content-type') || '';
        
        // Handle restore from existing backup file
        if (contentType.includes('application/json')) {
            const { filename } = await request.json();
            
            if (!filename) {
                return NextResponse.json({ error: 'Filename required' }, { status: 400 });
            }
            
            // Security: prevent path traversal
            const safeName = filename.replace(/[^a-zA-Z0-9_\-\.]/g, '');
            const backupPath = join(BACKUPS_DIR, safeName);
            
            if (!existsSync(backupPath)) {
                return NextResponse.json({ error: 'Backup file not found' }, { status: 404 });
            }
            
            // Create a backup of current database before restoring
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const preRestoreBackup = `pre-restore-${timestamp}.db`;
            if (existsSync(DB_PATH)) {
                const currentDb = readFileSync(DB_PATH);
                writeFileSync(join(BACKUPS_DIR, preRestoreBackup), currentDb);
                logDbWarn('Pre-restore backup created', preRestoreBackup);
            }
            
            // Restore the backup
            const backupData = readFileSync(backupPath);
            writeFileSync(DB_PATH, backupData);
            
            logDbInfo('Database restored from backup', safeName);
            
            return NextResponse.json({ 
                success: true, 
                message: `Database restored from ${safeName}. A pre-restore backup was saved as ${preRestoreBackup}. Please restart the server.`,
                preRestoreBackup
            });
        }
        
        // Handle restore from uploaded file
        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const file = formData.get('file') as File;
            
            if (!file) {
                return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
            }
            
            // Validate file
            if (!file.name.endsWith('.db')) {
                return NextResponse.json({ error: 'Invalid file type. Must be a .db file' }, { status: 400 });
            }
            
            // Create a backup of current database before restoring
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const preRestoreBackup = `pre-restore-${timestamp}.db`;
            if (existsSync(DB_PATH)) {
                const currentDb = readFileSync(DB_PATH);
                writeFileSync(join(BACKUPS_DIR, preRestoreBackup), currentDb);
                logDbWarn('Pre-restore backup created', preRestoreBackup);
            }
            
            // Write uploaded file to database path
            const arrayBuffer = await file.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            writeFileSync(DB_PATH, buffer);
            
            logDbInfo('Database restored from uploaded file', file.name);
            
            return NextResponse.json({ 
                success: true, 
                message: `Database restored from uploaded file. A pre-restore backup was saved as ${preRestoreBackup}. Please restart the server.`,
                preRestoreBackup
            });
        }
        
        return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    } catch (error: any) {
        logDbError('Database restore error', error.message);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message.includes('Forbidden') ? 403 : error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}

