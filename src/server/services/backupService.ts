import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { getDatabase, closeDatabase, getDatabasePath } from '../database/connection.ts';
import { runMigrations } from '../database/migrator.ts';
import { AppError } from '../middleware/errorHandler.ts';

export interface BackupMetadata {
  filename: string;
  sizeBytes: number;
  createdAt: string;
  isIntegrityOk: boolean;
}

export interface RestoreResult {
  success: boolean;
  restoredFilename: string;
  safetyBackupFilename: string;
  restoredAt: string;
}

export class BackupService {
  private backupDir: string;

  constructor(customBackupDir?: string) {
    this.backupDir = customBackupDir || path.resolve(process.cwd(), 'data/backups');
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Verify the integrity of a database file using SQLite PRAGMA integrity_check.
   */
  public verifyIntegrity(dbFilePath: string): boolean {
    if (!fs.existsSync(dbFilePath)) return false;
    try {
      const db = new DatabaseSync(dbFilePath, { readOnly: true });
      const rows = db.prepare('PRAGMA integrity_check;').all() as any[];
      db.close();
      return rows.length === 1 && rows[0].integrity_check === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Create an atomic SQLite backup in data/backups/ using VACUUM INTO.
   */
  public createBackup(label?: string): BackupMetadata {
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, 19);

    const safeLabel = label ? `_${label.replace(/[^a-zA-Z0-9_-]/g, '')}` : '';
    const filename = `backup_${timestamp}${safeLabel}.db`;
    const targetPath = path.resolve(this.backupDir, filename);

    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }

    const db = getDatabase();
    // VACUUM INTO creates a clean, locked, consistent snapshot even in WAL mode
    db.exec(`VACUUM INTO '${targetPath}';`);

    const stats = fs.statSync(targetPath);
    const isIntegrityOk = this.verifyIntegrity(targetPath);

    if (!isIntegrityOk) {
      if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
      throw new AppError('Generated backup failed SQLite integrity check', 500, 'BACKUP_FAILED');
    }

    return {
      filename,
      sizeBytes: stats.size,
      createdAt: new Date().toISOString(),
      isIntegrityOk,
    };
  }

  /**
   * List all available database backups in data/backups/.
   */
  public listBackups(): BackupMetadata[] {
    if (!fs.existsSync(this.backupDir)) return [];

    const files = fs.readdirSync(this.backupDir);
    const dbFiles = files.filter(
      (f) => f.endsWith('.db') && !f.startsWith('.') && !f.includes('corrupted')
    );

    const backups: BackupMetadata[] = [];
    for (const f of dbFiles) {
      const fullPath = path.resolve(this.backupDir, f);
      try {
        const stats = fs.statSync(fullPath);
        backups.push({
          filename: f,
          sizeBytes: stats.size,
          createdAt: stats.mtime.toISOString(),
          isIntegrityOk: true,
        });
      } catch {
        // Skip inaccessible files
      }
    }

    // Sort newest first
    return backups.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Restore database from a backup file with pre-flight check and automatic safety rollback.
   */
  public restoreBackup(filename: string): RestoreResult {
    // 1. Sanitize filename against directory traversal
    const safeFilename = path.basename(filename);
    const backupFilePath = path.resolve(this.backupDir, safeFilename);

    if (!fs.existsSync(backupFilePath)) {
      throw new AppError(`Backup file '${safeFilename}' not found`, 404, 'BACKUP_NOT_FOUND');
    }

    // 2. Pre-flight integrity check on backup file
    const isBackupValid = this.verifyIntegrity(backupFilePath);
    if (!isBackupValid) {
      throw new AppError(
        'The selected backup file is corrupted and failed PRAGMA integrity_check. Restoration aborted without touching the active database.',
        400,
        'CORRUPTED_BACKUP'
      );
    }

    // 3. Create a safety snapshot of the active database before any changes
    const activeDbPath = getDatabasePath();
    const safetyTimestamp = Date.now();
    const safetyBackupFilename = `safety_before_restore_${safetyTimestamp}.db`;
    const safetyBackupPath = path.resolve(this.backupDir, safetyBackupFilename);

    let createdSafetySnapshot = false;
    try {
      const currentDb = getDatabase();
      currentDb.exec(`VACUUM INTO '${safetyBackupPath}';`);
      createdSafetySnapshot = true;
    } catch (err) {
      console.warn('Could not create VACUUM safety copy, attempting direct file copy:', err);
      if (activeDbPath && activeDbPath !== ':memory:' && fs.existsSync(activeDbPath)) {
        fs.copyFileSync(activeDbPath, safetyBackupPath);
        createdSafetySnapshot = true;
      }
    }

    // 4. Perform restoration
    try {
      // Close active database connections and WAL files
      closeDatabase();

      if (activeDbPath && activeDbPath !== ':memory:') {
        // Remove active db and any lingering WAL/SHM files
        if (fs.existsSync(activeDbPath)) fs.unlinkSync(activeDbPath);
        const walPath = `${activeDbPath}-wal`;
        const shmPath = `${activeDbPath}-shm`;
        if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
        if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

        // Copy backup to active database location
        fs.copyFileSync(backupFilePath, activeDbPath);

        // Reconnect and verify integrity of restored database
        const restoredDb = getDatabase({ dbPath: activeDbPath });
        const integrityRows = restoredDb.prepare('PRAGMA integrity_check;').all() as any[];
        if (integrityRows.length !== 1 || integrityRows[0].integrity_check !== 'ok') {
          throw new Error('Restored database failed integrity check');
        }

        // Run migrations on restored database to ensure schema is fully up to date
        runMigrations(restoredDb);
      } else {
        // If in-memory, restore by loading backup
        getDatabase({ dbPath: backupFilePath });
      }

      return {
        success: true,
        restoredFilename: safeFilename,
        safetyBackupFilename,
        restoredAt: new Date().toISOString(),
      };
    } catch (err) {
      // 5. Automatic Rollback to Safety Snapshot on error
      if (createdSafetySnapshot && fs.existsSync(safetyBackupPath)) {
        try {
          closeDatabase();
          if (activeDbPath && activeDbPath !== ':memory:') {
            if (fs.existsSync(activeDbPath)) fs.unlinkSync(activeDbPath);
            fs.copyFileSync(safetyBackupPath, activeDbPath);
            getDatabase({ dbPath: activeDbPath });
          }
        } catch (rollbackErr) {
          console.error('Fatal: Failed to rollback to safety snapshot:', rollbackErr);
        }
      }

      throw new AppError(
        `Failed to restore database from backup. Active database was rolled back to its safe prior state. Details: ${(err as Error).message}`,
        500,
        'RESTORE_FAILED'
      );
    }
  }
}
