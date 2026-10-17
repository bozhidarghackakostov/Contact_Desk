import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from '../../src/server/database/migrator.ts';
import { ContactService } from '../../src/server/services/contactService.ts';
import { OrganizationService } from '../../src/server/services/organizationService.ts';
import { InteractionService } from '../../src/server/services/interactionService.ts';

describe('Interaction Management & Scenario C', () => {
  let db: DatabaseSync;
  let contactService: ContactService;
  let orgService: OrganizationService;
  let interactionService: InteractionService;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON;');
    runMigrations(db);
    contactService = new ContactService(db);
    orgService = new OrganizationService(db);
    interactionService = new InteractionService(db);
  });

  it('Scenario C: records multiple interactions, enforces reverse chronological order, and propagates edits', () => {
    // 1. Create a contact
    const { contact: charlie } = contactService.createContact({
      first_name: 'Charlie',
      last_name: 'Brown',
      primary_email: 'charlie.brown@example.com',
    });

    // 2. Add multiple interactions on different dates
    const int1 = interactionService.createInteraction({
      contact_id: charlie.id,
      interaction_type: 'phone_call',
      title: 'Initial Discovery Call',
      summary: 'Discussed high-level goals and timeline',
      occurred_at: '2026-09-01T10:00:00Z',
    });

    const int2 = interactionService.createInteraction({
      contact_id: charlie.id,
      interaction_type: 'in_person',
      title: 'Coffee Catch-up in Downtown',
      summary: 'Reviewed preliminary design architecture',
      details: 'Met at Blue Bottle Coffee. Charlie showed interest in offline CRM sync.',
      occurred_at: '2026-10-01T14:30:00Z',
    });

    const int3 = interactionService.createInteraction({
      contact_id: charlie.id,
      interaction_type: 'email',
      title: 'Sent Technical Whitepaper',
      summary: 'Emailed the offline storage architecture specs',
      occurred_at: '2026-10-15T09:15:00Z',
    });

    // 3. Open the contact's timeline and verify reverse chronological ordering
    const timeline = interactionService.listInteractions({
      contactId: charlie.id,
      sort: 'occurred_at',
      order: 'desc',
    });

    assert.strictEqual(timeline.total, 3);
    assert.strictEqual(timeline.interactions.length, 3);

    // Latest first: int3 (Oct 15) -> int2 (Oct 01) -> int1 (Sep 01)
    assert.strictEqual(timeline.interactions[0].id, int3.id);
    assert.strictEqual(timeline.interactions[0].occurred_at, '2026-10-15T09:15:00Z');

    assert.strictEqual(timeline.interactions[1].id, int2.id);
    assert.strictEqual(timeline.interactions[1].occurred_at, '2026-10-01T14:30:00Z');

    assert.strictEqual(timeline.interactions[2].id, int1.id);
    assert.strictEqual(timeline.interactions[2].occurred_at, '2026-09-01T10:00:00Z');

    // 4. Contact profile should reflect the latest interaction date
    const charlieProfile = contactService.getContact(charlie.id);
    assert.strictEqual(charlieProfile.last_interaction_at, '2026-10-15T09:15:00Z');

    // 5. Edit one interaction (the middle one)
    const updatedInt2 = interactionService.updateInteraction(int2.id, {
      title: 'Coffee Catch-up & Project Handover',
      summary: 'Agreed on milestone deliverables for Q4',
    });

    assert.strictEqual(updatedInt2.title, 'Coffee Catch-up & Project Handover');
    assert.strictEqual(updatedInt2.summary, 'Agreed on milestone deliverables for Q4');

    // Verify update is reflected when querying the timeline
    const refreshedTimeline = interactionService.listInteractions({ contactId: charlie.id });
    const refreshedInt2 = refreshedTimeline.interactions.find((i) => i.id === int2.id);
    assert.ok(refreshedInt2);
    assert.strictEqual(refreshedInt2.title, 'Coffee Catch-up & Project Handover');
  });

  it('filters interactions by type and date range', () => {
    const { contact } = contactService.createContact({
      first_name: 'Diana',
      last_name: 'Prince',
    });

    interactionService.createInteraction({
      contact_id: contact.id,
      interaction_type: 'phone_call',
      title: 'Quick Call',
      occurred_at: '2026-05-10T12:00:00Z',
    });

    interactionService.createInteraction({
      contact_id: contact.id,
      interaction_type: 'meeting',
      title: 'Board Meeting',
      occurred_at: '2026-08-20T15:00:00Z',
    });

    // Filter by type 'meeting'
    const meetingOnly = interactionService.listInteractions({
      contactId: contact.id,
      type: 'meeting',
    });
    assert.strictEqual(meetingOnly.total, 1);
    assert.strictEqual(meetingOnly.interactions[0].title, 'Board Meeting');

    // Filter by date range
    const summerInteractions = interactionService.listInteractions({
      contactId: contact.id,
      startDate: '2026-06-01T00:00:00Z',
      endDate: '2026-08-31T23:59:59Z',
    });
    assert.strictEqual(summerInteractions.total, 1);
    assert.strictEqual(summerInteractions.interactions[0].title, 'Board Meeting');
  });

  it('deleting an interaction does not delete the contact or organization', () => {
    const org = orgService.createOrganization({ name: 'Wayne Enterprises' });
    const { contact } = contactService.createContact({
      first_name: 'Bruce',
      last_name: 'Wayne',
    });

    const interaction = interactionService.createInteraction({
      contact_id: contact.id,
      organization_id: org.id,
      interaction_type: 'meeting',
      title: 'Charity Gala Planning',
      occurred_at: '2026-10-10T19:00:00Z',
    });

    assert.ok(interaction.id);

    // Delete interaction
    const deleted = interactionService.deleteInteraction(interaction.id);
    assert.strictEqual(deleted, true);

    // Interaction should not appear in active queries
    const list = interactionService.listInteractions({ contactId: contact.id });
    assert.strictEqual(list.total, 0);

    // Contact and Organization remain completely intact
    const intactContact = contactService.getContact(contact.id);
    assert.ok(intactContact);
    assert.strictEqual(intactContact.display_name, 'Bruce Wayne');

    const intactOrg = orgService.getOrganization(org.id);
    assert.ok(intactOrg);
    assert.strictEqual(intactOrg.name, 'Wayne Enterprises');
  });
});
