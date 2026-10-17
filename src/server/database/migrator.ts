import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export interface MigrationResult {
  version: number;
  name: string;
  appliedAt: string;
}

/**
 * Runs pending schema migrations located in the migrations directory.
 */
export function runMigrations(
  db: DatabaseSync,
  migrationsDir?: string
): MigrationResult[] {
  const dir =
    migrationsDir || path.resolve(process.cwd(), 'database/migrations');

  if (!fs.existsSync(dir)) {
    return [];
  }

  // Create schema_migrations table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  // Query already applied versions
  const appliedRows = db
    .prepare('SELECT version FROM schema_migrations')
    .all() as Array<{ version: number }>;
  const appliedSet = new Set(appliedRows.map((r) => r.version));

  // Read and sort migration files
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const newlyApplied: MigrationResult[] = [];

  for (const file of files) {
    const match = file.match(/^(\d+)_(.*)\.sql$/);
    if (!match) continue;

    const version = parseInt(match[1], 10);
    const name = match[2];

    if (appliedSet.has(version)) {
      continue;
    }

    const filePath = path.join(dir, file);
    const sqlContent = fs.readFileSync(filePath, 'utf-8');
    const now = new Date().toISOString();

    // Execute migration inside a transaction
    db.exec('BEGIN TRANSACTION;');
    try {
      db.exec(sqlContent);
      const insertStmt = db.prepare(
        'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)'
      );
      insertStmt.run(version, name, now);
      db.exec('COMMIT;');

      newlyApplied.push({ version, name, appliedAt: now });
    } catch (err) {
      db.exec('ROLLBACK;');
      throw new Error(`Failed to apply migration ${file}: ${(err as Error).message}`);
    }
  }

  return newlyApplied;
}
