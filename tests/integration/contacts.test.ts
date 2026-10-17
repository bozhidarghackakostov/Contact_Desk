import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from '../../src/server/database/migrator.ts';
import { ContactService } from '../../src/server/services/contactService.ts';

describe('Contact Management & Scenario A', () => {
  let db: DatabaseSync;
  let service: ContactService;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON;');
    runMigrations(db);
    service = new ContactService(db);
  });

  it('Scenario A: creates, queries, persists, and edits a contact', () => {
    // 1. Create a contact with name, email, and notes
    const { contact: created } = service.createContact({
      first_name: 'John',
      last_name: 'Doe',
      primary_email: 'john.doe@example.com',
      primary_phone: '+1-555-0100',
      notes: 'Met at the annual developer summit in Chicago.',
    });

    assert.ok(created.id);
    assert.strictEqual(created.first_name, 'John');
    assert.strictEqual(created.last_name, 'Doe');
    assert.strictEqual(created.display_name, 'John Doe');
    assert.strictEqual(created.primary_email, 'john.doe@example.com');
    assert.strictEqual(created.notes, 'Met at the annual developer summit in Chicago.');

    // 2. Query the contacts list and verify John is present
    const listRes = service.listContacts({ search: 'developer summit' });
    assert.strictEqual(listRes.total, 1);
    assert.strictEqual(listRes.contacts[0].id, created.id);

    // 3. Directly re-query database via fresh service instance to verify persistence
    const reloaded = new ContactService(db).getContact(created.id);
    assert.strictEqual(reloaded.id, created.id);
    assert.strictEqual(reloaded.display_name, 'John Doe');

    // 4. Edit the contact (update job title and notes)
    const updated = service.updateContact(created.id, {
      job_title: 'Staff Platform Engineer',
      notes: 'Met at annual developer summit. Promised to review open source CRM draft.',
    });

    // 5. Verify the update persists
    assert.strictEqual(updated.job_title, 'Staff Platform Engineer');
    assert.strictEqual(
      updated.notes,
      'Met at annual developer summit. Promised to review open source CRM draft.'
    );
    assert.strictEqual(updated.display_name, 'John Doe');
  });

  it('handles archive, restore, and soft status transitions', () => {
    const { contact } = service.createContact({
      first_name: 'Archived',
      last_name: 'User',
      primary_email: 'archived@example.com',
    });

    // Default status is active
    assert.strictEqual(contact.status, 'active');

    // Archive contact
    const archived = service.archiveContact(contact.id);
    assert.strictEqual(archived.status, 'archived');
    assert.ok(archived.archived_at);

    // Active list should not include archived contact by default
    const activeList = service.listContacts({ status: 'active' });
    assert.strictEqual(activeList.contacts.some((c) => c.id === contact.id), false);

    // Archived list should include it
    const archivedList = service.listContacts({ status: 'archived' });
    assert.strictEqual(archivedList.contacts.some((c) => c.id === contact.id), true);

    // Restore contact
    const restored = service.restoreContact(contact.id);
    assert.strictEqual(restored.status, 'active');
    assert.strictEqual(restored.archived_at, null);
  });

  it('detects potential duplicate contacts on similar name or email', () => {
    service.createContact({
      first_name: 'Sarah',
      last_name: 'Connor',
      primary_email: 'sarah@skynet-resistance.org',
    });

    // Create another contact with the same name
    const { duplicateWarning } = service.createContact({
      first_name: 'Sarah',
      last_name: 'Connor',
      primary_email: 'sarah.alt@domain.com',
    });

    assert.ok(duplicateWarning);
    assert.strictEqual(duplicateWarning.length, 1);
    assert.strictEqual(duplicateWarning[0].display_name, 'Sarah Connor');
  });

  it('validates contact requirements (requires at least name, email, or note)', () => {
    assert.throws(
      () => {
        service.createContact({});
      },
      (err: any) => err.code === 'VALIDATION_ERROR'
    );
  });
});
