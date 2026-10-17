import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from '../../src/server/database/migrator.ts';
import { ContactService } from '../../src/server/services/contactService.ts';
import { OrganizationService } from '../../src/server/services/organizationService.ts';

describe('Organization Management & Scenario B', () => {
  let db: DatabaseSync;
  let contactService: ContactService;
  let orgService: OrganizationService;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON;');
    runMigrations(db);
    contactService = new ContactService(db);
    orgService = new OrganizationService(db);
  });

  it('Scenario B: links multiple contacts with distinct job titles and verifies bilateral navigation', () => {
    // 1. Create an organization
    const org = orgService.createOrganization({
      name: 'Acme Corp',
      industry: 'Software & Technology',
      website: 'https://acmecorp.example',
      notes: 'Strategic local partnership',
    });
    assert.ok(org.id);
    assert.strictEqual(org.name, 'Acme Corp');

    // 2. Create two contacts
    const { contact: alice } = contactService.createContact({
      first_name: 'Alice',
      last_name: 'Smith',
      primary_email: 'alice@acmecorp.example',
    });

    const { contact: bob } = contactService.createContact({
      first_name: 'Bob',
      last_name: 'Jones',
      primary_email: 'bob@acmecorp.example',
    });

    // 3. Link each contact with a distinct job title
    contactService.linkOrganization({
      contact_id: alice.id,
      organization_id: org.id,
      job_title: 'Engineering Director',
      department: 'Infrastructure',
      is_primary: 1,
    });

    contactService.linkOrganization({
      contact_id: bob.id,
      organization_id: org.id,
      job_title: 'Product Lead',
      department: 'Growth',
      is_primary: 1,
    });

    // 4. Open the organization profile and verify both contacts appear with their job titles
    const loadedOrg = orgService.getOrganization(org.id);
    assert.strictEqual(loadedOrg.contacts_count, 2);
    assert.ok(loadedOrg.contacts);
    assert.strictEqual(loadedOrg.contacts.length, 2);

    const aliceEntry = loadedOrg.contacts.find((c) => c.contact_id === alice.id);
    assert.ok(aliceEntry);
    assert.strictEqual(aliceEntry.job_title, 'Engineering Director');
    assert.strictEqual(aliceEntry.department, 'Infrastructure');

    const bobEntry = loadedOrg.contacts.find((c) => c.contact_id === bob.id);
    assert.ok(bobEntry);
    assert.strictEqual(bobEntry.job_title, 'Product Lead');
    assert.strictEqual(bobEntry.department, 'Growth');

    // 5. Open each contact profile and verify Acme Corp appears as their affiliated organization
    const loadedAlice = contactService.getContact(alice.id);
    assert.ok(loadedAlice.organizations);
    assert.strictEqual(loadedAlice.organizations.length, 1);
    assert.strictEqual(loadedAlice.organizations[0].organization_name, 'Acme Corp');
    assert.strictEqual(loadedAlice.organizations[0].job_title, 'Engineering Director');

    const loadedBob = contactService.getContact(bob.id);
    assert.ok(loadedBob.organizations);
    assert.strictEqual(loadedBob.organizations.length, 1);
    assert.strictEqual(loadedBob.organizations[0].organization_name, 'Acme Corp');
    assert.strictEqual(loadedBob.organizations[0].job_title, 'Product Lead');
  });

  it('archives, restores, and searches organizations', () => {
    const org = orgService.createOrganization({
      name: 'Starlight Design Studio',
      industry: 'Design',
      notes: 'Branding and typography agency',
    });

    // Search matches
    const searchRes = orgService.listOrganizations({ search: 'typography' });
    assert.strictEqual(searchRes.total, 1);
    assert.strictEqual(searchRes.organizations[0].id, org.id);

    // Archive
    const archived = orgService.archiveOrganization(org.id);
    assert.strictEqual(archived.status, 'archived');

    // Active list excludes it
    const activeList = orgService.listOrganizations({ status: 'active' });
    assert.strictEqual(activeList.organizations.some((o) => o.id === org.id), false);

    // Restore
    const restored = orgService.restoreOrganization(org.id);
    assert.strictEqual(restored.status, 'active');
  });
});
