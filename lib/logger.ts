import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const LOGS_DIR = join(process.cwd(), 'logs');
const SYSTEM_LOG_PATH = join(LOGS_DIR, 'system.log');
const DATABASE_LOG_PATH = join(LOGS_DIR, 'database.log');
const MAX_LOG_LINES = 500;

// Ensure logs directory exists
function ensureLogsDir() {
    if (!existsSync(LOGS_DIR)) {
        mkdirSync(LOGS_DIR, { recursive: true });
    }
}

export type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';

export interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    details?: string;
}

function formatLogEntry(level: LogLevel, message: string, details?: string): string {
    const timestamp = new Date().toISOString();
    const detailsPart = details ? ` | ${details}` : '';
    return `[${timestamp}] [${level}] ${message}${detailsPart}\n`;
}

function appendToLog(filePath: string, entry: string) {
    ensureLogsDir();
    appendFileSync(filePath, entry, 'utf8');
    
    // Trim log file if it gets too large
    trimLogFile(filePath);
}

function trimLogFile(filePath: string) {
    if (!existsSync(filePath)) return;
    
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length > MAX_LOG_LINES) {
        const trimmedLines = lines.slice(-MAX_LOG_LINES);
        writeFileSync(filePath, trimmedLines.join('\n') + '\n', 'utf8');
    }
}

// System logging functions
export function logSystem(level: LogLevel, message: string, details?: string) {
    const entry = formatLogEntry(level, message, details);
    appendToLog(SYSTEM_LOG_PATH, entry);
    
    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
        console.log(`[SYSTEM] ${entry.trim()}`);
    }
}

export function logSystemInfo(message: string, details?: string) {
    logSystem('INFO', message, details);
}

export function logSystemWarn(message: string, details?: string) {
    logSystem('WARN', message, details);
}

export function logSystemError(message: string, details?: string) {
    logSystem('ERROR', message, details);
}

// Database logging functions
export function logDatabase(level: LogLevel, message: string, details?: string) {
    const entry = formatLogEntry(level, message, details);
    appendToLog(DATABASE_LOG_PATH, entry);
    
    // Also log to console in development
    if (process.env.NODE_ENV !== 'production') {
        console.log(`[DATABASE] ${entry.trim()}`);
    }
}

export function logDbInfo(message: string, details?: string) {
    logDatabase('INFO', message, details);
}

export function logDbWarn(message: string, details?: string) {
    logDatabase('WARN', message, details);
}

export function logDbError(message: string, details?: string) {
    logDatabase('ERROR', message, details);
}

// Read log files
export function readSystemLogs(): LogEntry[] {
    return parseLogFile(SYSTEM_LOG_PATH);
}

export function readDatabaseLogs(): LogEntry[] {
    return parseLogFile(DATABASE_LOG_PATH);
}

function parseLogFile(filePath: string): LogEntry[] {
    if (!existsSync(filePath)) return [];
    
    const content = readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter(line => line.trim());
    
    return lines.map(line => {
        const match = line.match(/^\[([^\]]+)\] \[([^\]]+)\] (.+)$/);
        if (match) {
            const [, timestamp, level, rest] = match;
            const [message, details] = rest.split(' | ');
            return {
                timestamp,
                level: level as LogLevel,
                message,
                details
            };
        }
        return {
            timestamp: new Date().toISOString(),
            level: 'INFO' as LogLevel,
            message: line
        };
    }).reverse(); // Most recent first
}

export function clearSystemLogs() {
    ensureLogsDir();
    writeFileSync(SYSTEM_LOG_PATH, '', 'utf8');
    logSystemInfo('System logs cleared');
}

export function clearDatabaseLogs() {
    ensureLogsDir();
    writeFileSync(DATABASE_LOG_PATH, '', 'utf8');
    logDbInfo('Database logs cleared');
}

