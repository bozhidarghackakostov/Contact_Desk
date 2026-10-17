import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

let dbInstance: DatabaseSync | null = null;
let currentDbPath: string = '';

export interface DatabaseConfig {
  dbPath?: string;
}

/**
 * Returns the active SQLite database instance, creating it if necessary.
 */
export function getDatabase(config?: DatabaseConfig): DatabaseSync {
  const targetPath =
    config?.dbPath ||
    process.env.DATABASE_PATH ||
    path.resolve(process.cwd(), 'data/contactdesk.db');

  if (dbInstance && currentDbPath === targetPath) {
    return dbInstance;
  }

  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }

  // Ensure directory exists if not an in-memory database
  if (targetPath !== ':memory:') {
    const dir = path.dirname(targetPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(targetPath);

  // Critical SQLite Pragmas
  db.exec('PRAGMA foreign_keys = ON;');

  if (targetPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA synchronous = NORMAL;');
  }

  dbInstance = db;
  currentDbPath = targetPath;
  return db;
}

/**
 * Closes the active database connection if open.
 */
export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
    currentDbPath = '';
  }
}

/**
 * Gets the current active database file path.
 */
export function getDatabasePath(): string {
  return currentDbPath;
}
