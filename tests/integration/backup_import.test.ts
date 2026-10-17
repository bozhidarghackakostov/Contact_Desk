import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { runMigrations } from '../../src/server/database/migrator.ts';
import { ContactService } from '../../src/server/services/contactService.ts';
import { OrganizationService } from '../../src/server/services/organizationService.ts';
import { ImportService } from '../../src/server/services/importService.ts';
import { ExportService } from '../../src/server/services/exportService.ts';
import { BackupService } from '../../src/server/services/backupService.ts';
import { getDatabase, closeDatabase } from '../../src/server/database/connection.ts';
import { sanitizeForFormulaInjection, parseCsv, generateCsv } from '../../src/server/services/csvUtils.ts';

describe('Import, Export, Backup & Restore (Scenarios F & G)', () => {
  const testDbDir = path.resolve(process.cwd(), 'data/test_db');
  const testBackupDir = path.resolve(process.cwd(), 'data/test_backups');
  const activeDbPath = path.resolve(testDbDir, 'test_contactdesk.db');

  beforeEach(() => {
    closeDatabase();
    // Ensure clean directories
    if (fs.existsSync(testDbDir)) fs.rmSync(testDbDir, { recursive: true, force: true });
    if (fs.existsSync(testBackupDir)) fs.rmSync(testBackupDir, { recursive: true, force: true });

    fs.mkdirSync(testDbDir, { recursive: true });
    fs.mkdirSync(testBackupDir, { recursive: true });

    process.env.DATABASE_PATH = activeDbPath;
    const db = getDatabase({ dbPath: activeDbPath });
    runMigrations(db);
  });

  afterEach(() => {
    closeDatabase();
    if (fs.existsSync(testDbDir)) fs.rmSync(testDbDir, { recursive: true, force: true });
    if (fs.existsSync(testBackupDir)) fs.rmSync(testBackupDir, { recursive: true, force: true });
  });

  it('CSV Utils: mitigates formula injection and handles complex quotes and newlines', () => {
    // Formula injection sanitization
    assert.strictEqual(sanitizeForFormulaInjection('=SUM(1+1)'), "'=SUM(1+1)");
    assert.strictEqual(sanitizeForFormulaInjection('+cmd|/c calc'), "'+cmd|/c calc");
    assert.strictEqual(sanitizeForFormulaInjection('-2+3'), "'-2+3");
    assert.strictEqual(sanitizeForFormulaInjection('@HYPERLINK("http://evil.com")'), "'@HYPERLINK(\"http://evil.com\")");
    assert.strictEqual(sanitizeForFormulaInjection('Standard Text'), 'Standard Text');

    // Multi-line and quoted CSV roundtrip
    const headers = ['Name', 'Formula', 'Notes'];
    const rows = [
      ['Alice', '=1+1', 'Line 1\nLine 2 with "quotes"'],
      ['Bob, Jr.', 'Safe', 'Simple note'],
    ];

    const csvOutput = generateCsv(headers, rows, true);
    assert.ok(csvOutput.includes("'=1+1"));
    assert.ok(csvOutput.includes('"Line 1\nLine 2 with ""quotes"""'));

    const parsed = parseCsv(csvOutput);
    assert.strictEqual(parsed.length, 3);
    assert.strictEqual(parsed[1][0], 'Alice');
    assert.strictEqual(parsed[1][1], "'=1+1");
    assert.strictEqual(parsed[1][2], 'Line 1\nLine 2 with "quotes"');
    assert.strictEqual(parsed[2][0], 'Bob, Jr.');
  });

  it('Scenario F: Import safety with preview, column detection, duplicate handling, and tagging', () => {
    const db = getDatabase();
    const contactService = new ContactService(db);
    const importService = new ImportService(db);

    // 1. Seed an existing contact to test duplicate detection
    const { contact: existing } = contactService.createContact({
      first_name: 'Existing',
      last_name: 'Person',
      primary_email: 'existing.person@example.com',
      notes: 'Initial background note',
    });

    // 2. Generate a 22-row CSV containing varied records, duplicates, and 1 invalid row
    const lines = [
      'First Name,Last Name,Email,Phone,Company,Job Title,Notes,Tags',
      // Duplicate email conflict
      'Existing,Person,existing.person@example.com,555-0100,Cyberdyne,Engineer,Updated info,Tech',
    ];

    // Generate 20 unique contacts
    for (let i = 1; i <= 20; i++) {
      const company = i % 2 === 0 ? 'Acme Corp' : 'Initech';
      const tags = i % 3 === 0 ? 'VIP; Partner' : 'Client';
      lines.push(
        `Contact${i},Surname${i},contact${i}@example.com,555-01${i < 10 ? '0' + i : i},${company},Specialist ${i},Note for contact ${i},${tags}`
      );
    }

    // Add 1 invalid row (phone only, no name, email, or notes)
    lines.push(',,,555-0000,,,,,');

    const csvContent = lines.join('\n');

    // 3. Test Preview
    const preview = importService.previewContactsCsv(csvContent);
    assert.strictEqual(preview.totalRows, 22);
    assert.strictEqual(preview.validRowsCount, 21);
    assert.strictEqual(preview.invalidRowsCount, 1);
    assert.strictEqual(preview.duplicateCount, 1);
    assert.strictEqual(preview.detectedMapping['First Name'], 'first_name');
    assert.strictEqual(preview.detectedMapping['Company'], 'organization');

    const dupRow = preview.previewRows.find((r) => r.hasDuplicate);
    assert.ok(dupRow);
    assert.strictEqual(dupRow.existingContact?.id, existing.id);

    // 4. Test Commit with duplicateStrategy: 'skip'
    const commitResult = importService.commitContactsImport({
      csvText: csvContent,
      duplicateStrategy: 'skip',
      tagAsImported: true,
      customTag: 'Batch Import 2026',
    });

    assert.strictEqual(commitResult.importedCount, 20);
    assert.strictEqual(commitResult.skippedCount, 2); // 1 duplicate skipped + 1 invalid row skipped
    assert.strictEqual(commitResult.updatedCount, 0);

    // Verify database contacts count: 1 original + 20 imported = 21
    const list = contactService.listContacts({ limit: 100 });
    assert.strictEqual(list.total, 21);

    // Verify organization auto-creation and linking
    const orgService = new OrganizationService(db);
    const orgResult = orgService.listOrganizations();
    assert.ok(orgResult.organizations.some((o) => o.name === 'Acme Corp'));
    assert.ok(orgResult.organizations.some((o) => o.name === 'Initech'));

    // Verify custom tag applied
    const sampleImported = list.contacts.find((c) => c.primary_email === 'contact1@example.com');
    assert.ok(sampleImported);
    assert.ok(sampleImported.tags?.some((t) => t.name === 'Batch Import 2026'));

    // 5. Test Commit with duplicateStrategy: 'update' on the duplicate
    const updateResult = importService.commitContactsImport({
      csvText: [
        'First Name,Last Name,Email,Phone,Job Title,Notes',
        'Existing,Person,existing.person@example.com,555-9999,Lead Architect,New appended notes',
      ].join('\n'),
      duplicateStrategy: 'update',
      tagAsImported: false,
    });

    assert.strictEqual(updateResult.updatedCount, 1);
    const updatedExisting = contactService.getContact(existing.id);
    assert.strictEqual(updatedExisting.job_title, 'Lead Architect');
    assert.strictEqual(updatedExisting.primary_phone, '555-9999');
    assert.ok(updatedExisting.notes?.includes('New appended notes'));
  });

  it('Export Service: exports contacts, organizations, interactions, tasks and JSON dump', () => {
    const db = getDatabase();
    const contactService = new ContactService(db);
    const orgService = new OrganizationService(db);
    const exportService = new ExportService(db);

    const org = orgService.createOrganization({ name: 'Weyland-Yutani', industry: 'Aerospace' });
    contactService.createContact(
      {
        first_name: 'Ellen',
        last_name: 'Ripley',
        primary_email: 'ripley@weyland.com',
        notes: 'Warrant officer on Nostromo',
      },
      {
        organization_id: org.id,
        job_title: 'Warrant Officer',
      }
    );

    // CSV Exports
    const contactsCsv = exportService.exportContactsCsv();
    assert.ok(contactsCsv.includes('Ellen'));
    assert.ok(contactsCsv.includes('Ripley'));
    assert.ok(contactsCsv.includes('Weyland-Yutani'));

    const orgsCsv = exportService.exportOrganizationsCsv();
    assert.ok(orgsCsv.includes('Weyland-Yutani'));
    assert.ok(orgsCsv.includes('Aerospace'));

    // JSON Dump
    const jsonDump = exportService.exportJsonDump();
    assert.strictEqual(jsonDump.metadata.app, 'ContactDesk');
    assert.strictEqual(jsonDump.contacts.length, 1);
    assert.strictEqual(jsonDump.organizations.length, 1);
  });

  it('Scenario G: Backup, restore, and failed restore rollback', () => {
    const backupService = new BackupService(testBackupDir);
    const db = getDatabase();
    const contactService = new ContactService(db);

    // 1. Create a baseline record
    const { contact: originalContact } = contactService.createContact({
      first_name: 'Thomas',
      last_name: 'Anderson',
      primary_email: 'neo@matrix.io',
      notes: 'The One',
    });

    // 2. Create an atomic SQLite backup
    const backupMeta = backupService.createBackup('baseline');
    assert.ok(backupMeta.filename.includes('baseline'));
    assert.ok(backupMeta.sizeBytes > 0);
    assert.strictEqual(backupMeta.isIntegrityOk, true);

    // Verify backup file exists on disk
    const backupFilePath = path.resolve(testBackupDir, backupMeta.filename);
    assert.ok(fs.existsSync(backupFilePath));

    // Verify listBackups returns the backup
    const backupsList = backupService.listBackups();
    assert.ok(backupsList.some((b) => b.filename === backupMeta.filename));

    // 3. Mutate active database (delete contact and add someone else)
    contactService.deleteContact(originalContact.id, true);
    contactService.createContact({
      first_name: 'Agent',
      last_name: 'Smith',
      primary_email: 'smith@matrix.io',
    });

    // Verify active database no longer has Thomas Anderson
    const contactsAfterDeletion = contactService.listContacts({ limit: 10 });
    assert.strictEqual(contactsAfterDeletion.total, 1);
    assert.strictEqual(contactsAfterDeletion.contacts[0].first_name, 'Agent');

    // 4. Restore from the baseline backup
    const restoreResult = backupService.restoreBackup(backupMeta.filename);
    assert.strictEqual(restoreResult.success, true);
    assert.strictEqual(restoreResult.restoredFilename, backupMeta.filename);
    assert.ok(restoreResult.safetyBackupFilename);

    // Re-query database: Thomas Anderson should be fully restored, Agent Smith absent
    const restoredDb = getDatabase();
    const restoredContactService = new ContactService(restoredDb);
    const restoredList = restoredContactService.listContacts({ limit: 10 });
    assert.strictEqual(restoredList.total, 1);
    assert.strictEqual(restoredList.contacts[0].id, originalContact.id);
    assert.strictEqual(restoredList.contacts[0].first_name, 'Thomas');

    // 5. Test Corrupted Backup Rejection & Safety Rollback
    const corruptedFilename = 'backup_corrupted_test.db';
    const corruptedPath = path.resolve(testBackupDir, corruptedFilename);
    fs.writeFileSync(corruptedPath, 'NOT A VALID SQLITE DATABASE FILE HEADER GARBAGE CONTENT');

    assert.throws(
      () => {
        backupService.restoreBackup(corruptedFilename);
      },
      (err: any) => {
        return err.code === 'CORRUPTED_BACKUP';
      }
    );

    // Verify active database was untouched and still contains Thomas Anderson
    const activeDbAfterFailedRestore = getDatabase();
    const activeContactService = new ContactService(activeDbAfterFailedRestore);
    const intactList = activeContactService.listContacts({ limit: 10 });
    assert.strictEqual(intactList.total, 1);
    assert.strictEqual(intactList.contacts[0].first_name, 'Thomas');
  });
});
