import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { logDbInfo, logDbError } from '@/lib/logger';

const DB_PATH = join(process.cwd(), 'database', 'kava-bar.db');
const BACKUPS_DIR = join(process.cwd(), 'database', 'backups');

function ensureBackupsDir() {
    if (!existsSync(BACKUPS_DIR)) {
        mkdirSync(BACKUPS_DIR, { recursive: true });
    }
}

// GET - Download backup or list backups
export async function GET(request: NextRequest) {
    try {
        await requireAdmin();
        
        const { searchParams } = new URL(request.url);
        const action = searchParams.get('action') || 'list';
        const filename = searchParams.get('filename');
        
        ensureBackupsDir();
        
        if (action === 'list') {
            // List all backups
            const files = existsSync(BACKUPS_DIR) 
                ? readdirSync(BACKUPS_DIR)
                    .filter(f => f.endsWith('.db'))
                    .map(f => {
                        const filePath = join(BACKUPS_DIR, f);
                        const stats = require('fs').statSync(filePath);
                        return {
                            filename: f,
                            size: stats.size,
                            created: stats.mtime.toISOString()
                        };
                    })
                    .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
                : [];
            
            return NextResponse.json({ backups: files });
        }
        
        if (action === 'download') {
            if (!filename) {
                return NextResponse.json({ error: 'Filename required' }, { status: 400 });
            }
            
            // Security: prevent path traversal
            const safeName = filename.replace(/[^a-zA-Z0-9_\-\.]/g, '');
            const backupPath = join(BACKUPS_DIR, safeName);
            
            if (!existsSync(backupPath)) {
                return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
            }
            
            const buffer = readFileSync(backupPath);
            logDbInfo('Backup downloaded', safeName);
            
            return new NextResponse(buffer, {
                headers: {
                    'Content-Type': 'application/octet-stream',
                    'Content-Disposition': `attachment; filename="${safeName}"`
                }
            });
        }
        
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    } catch (error: any) {
        logDbError('Backup GET error', error.message);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message.includes('Forbidden') ? 403 : error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}

// POST - Create a new backup
export async function POST(request: NextRequest) {
    try {
        await requireAdmin();
        
        ensureBackupsDir();
        
        if (!existsSync(DB_PATH)) {
            return NextResponse.json({ error: 'Database not found' }, { status: 404 });
        }
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFilename = `kava-bar-backup-${timestamp}.db`;
        const backupPath = join(BACKUPS_DIR, backupFilename);
        
        const dbData = readFileSync(DB_PATH);
        writeFileSync(backupPath, dbData);
        
        logDbInfo('Database backup created', backupFilename);
        
        return NextResponse.json({ 
            success: true, 
            filename: backupFilename,
            size: dbData.length,
            message: 'Backup created successfully' 
        });
    } catch (error: any) {
        logDbError('Backup creation error', error.message);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message.includes('Forbidden') ? 403 : error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}

// DELETE - Delete a backup
export async function DELETE(request: NextRequest) {
    try {
        await requireAdmin();
        
        const { searchParams } = new URL(request.url);
        const filename = searchParams.get('filename');
        
        if (!filename) {
            return NextResponse.json({ error: 'Filename required' }, { status: 400 });
        }
        
        // Security: prevent path traversal
        const safeName = filename.replace(/[^a-zA-Z0-9_\-\.]/g, '');
        const backupPath = join(BACKUPS_DIR, safeName);
        
        if (!existsSync(backupPath)) {
            return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
        }
        
        unlinkSync(backupPath);
        logDbInfo('Backup deleted', safeName);
        
        return NextResponse.json({ success: true, message: 'Backup deleted' });
    } catch (error: any) {
        logDbError('Backup delete error', error.message);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: error.message.includes('Forbidden') ? 403 : error.message === 'Unauthorized' ? 401 : 500 }
        );
    }
}

