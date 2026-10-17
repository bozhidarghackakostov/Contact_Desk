import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from '../../src/server/database/migrator.ts';
import path from 'node:path';

describe('Database Connection & Migration Engine', () => {
  let db: DatabaseSync;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON;');
  });

  afterEach(() => {
    db.close();
  });

  it('runs initial migrations and creates all required tables', () => {
    const migrationsDir = path.resolve(process.cwd(), 'database/migrations');
    const applied = runMigrations(db, migrationsDir);

    assert.ok(applied.length > 0);
    assert.strictEqual(applied[0].name, 'initial_schema');

    // Verify schema_migrations table
    const migrations = db.prepare('SELECT * FROM schema_migrations').all() as any[];
    assert.strictEqual(migrations.length, applied.length);
    assert.strictEqual(migrations[0].version, 1);

    // Verify all primary tables exist
    const tables = db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      )
      .all() as Array<{ name: string }>;
    const tableNames = tables.map((t) => t.name);

    assert.ok(tableNames.includes('contacts'));
    assert.ok(tableNames.includes('contact_methods'));
    assert.ok(tableNames.includes('organizations'));
    assert.ok(tableNames.includes('contact_organizations'));
    assert.ok(tableNames.includes('interactions'));
    assert.ok(tableNames.includes('tasks'));
    assert.ok(tableNames.includes('tags'));
    assert.ok(tableNames.includes('contact_tags'));
    assert.ok(tableNames.includes('schema_migrations'));
  });

  it('does not re-apply already applied migrations', () => {
    const migrationsDir = path.resolve(process.cwd(), 'database/migrations');
    runMigrations(db, migrationsDir);

    // Second run should apply 0 migrations
    const secondRun = runMigrations(db, migrationsDir);
    assert.strictEqual(secondRun.length, 0);
  });

  it('enforces foreign key constraints', () => {
    const migrationsDir = path.resolve(process.cwd(), 'database/migrations');
    runMigrations(db, migrationsDir);

    // Attempt to insert contact_organizations with non-existent contact_id
    assert.throws(
      () => {
        db.prepare(`
          INSERT INTO contact_organizations (
            id, contact_id, organization_id, job_title, department,
            role_description, is_primary, start_date, end_date, created_at, updated_at
          ) VALUES (
            'co_1', 'non_existent_contact', 'non_existent_org', 'Title', 'Dept',
            NULL, 0, NULL, NULL, '2026-10-17T00:00:00Z', '2026-10-17T00:00:00Z'
          )
        `).run();
      },
      /FOREIGN KEY constraint failed/
    );
  });
});
