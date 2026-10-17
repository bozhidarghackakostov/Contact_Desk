import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from '../../src/server/database/migrator.ts';
import { ContactService } from '../../src/server/services/contactService.ts';
import { OrganizationService } from '../../src/server/services/organizationService.ts';
import { InteractionService } from '../../src/server/services/interactionService.ts';
import { TaskService } from '../../src/server/services/taskService.ts';
import { TagService } from '../../src/server/services/tagService.ts';
import { SearchService } from '../../src/server/services/searchService.ts';

describe('Search & Tag Management (Scenario E)', () => {
  let db: DatabaseSync;
  let contactService: ContactService;
  let orgService: OrganizationService;
  let interactionService: InteractionService;
  let taskService: TaskService;
  let tagService: TagService;
  let searchService: SearchService;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON;');
    runMigrations(db);

    contactService = new ContactService(db);
    orgService = new OrganizationService(db);
    interactionService = new InteractionService(db);
    taskService = new TaskService(db);
    tagService = new TagService(db);
    searchService = new SearchService(db);
  });

  it('Scenario E: search accuracy across names, company, email, notes, and archived safety', () => {
    // 1. Setup organization
    const org = orgService.createOrganization({
      name: 'Hill House Investigations',
      industry: 'Parapsychology Research',
      description: 'Historic estates investigation and paranormal research firm',
    });

    // 2. Setup contacts
    const { contact: eleanor } = contactService.createContact({
      first_name: 'Eleanor',
      last_name: 'Vance',
      primary_email: 'eleanor@hillhouse.org',
      notes: 'Expert in architectural anomalies and paranormal acoustics',
    });

    const { contact: theodora } = contactService.createContact(
      {
        first_name: 'Theodora',
        last_name: 'Crain',
        primary_email: 'theodora@crain.art',
        notes: 'Sensitive to vibrational changes and psychic resonance',
      },
      {
        organization_id: org.id,
        job_title: 'Telepathic Specialist',
      }
    );

    // Contact 3: Archived contact
    const { contact: luke } = contactService.createContact({
      first_name: 'Luke',
      last_name: 'Sanderson',
      primary_email: 'luke@sanderson.com',
      notes: 'Heir to Hill House estate',
    });
    contactService.archiveContact(luke.id);

    // 3. Assign tags
    tagService.setContactTags(eleanor.id, ['Paranormal', 'Acoustics']);
    tagService.setContactTags(theodora.id, ['Paranormal']);

    // 4. Setup interaction
    const interaction = interactionService.createInteraction({
      contact_id: eleanor.id,
      organization_id: org.id,
      interaction_type: 'in_person',
      title: 'Midnight Library Exploration',
      summary: 'Inspected the library for hidden corridors',
      details: 'Discovered hidden doorway behind bookcase in the library with Eleanor and Theodora',
      occurred_at: '2026-10-16T23:30:00Z',
    });

    // 5. Setup task
    const task = taskService.createTask({
      title: 'Draft Architectural Analysis Report',
      description: 'Review Eleanor notes on hallway dimensions',
      due_date: '2026-10-25',
      contact_id: eleanor.id,
    });

    // --- Search Verifications ---

    // A. Search by Name
    const nameResults = searchService.globalSearch('Eleanor');
    assert.strictEqual(nameResults.contacts.length, 1);
    assert.strictEqual(nameResults.contacts[0].id, eleanor.id);
    assert.strictEqual(nameResults.contacts[0].title, 'Eleanor Vance');

    // B. Search by Company Name -> matches Organization AND affiliated contact Theodora
    const companyResults = searchService.globalSearch('Hill House Investigations');
    assert.ok(companyResults.organizations.some((o) => o.id === org.id));
    assert.ok(companyResults.contacts.some((c) => c.id === theodora.id));

    // C. Search by Email
    const emailResults = searchService.globalSearch('theodora@crain.art');
    assert.strictEqual(emailResults.contacts.length, 1);
    assert.strictEqual(emailResults.contacts[0].id, theodora.id);

    // D. Search by Notes Keyword -> matches Contact Eleanor and Task
    const notesResults = searchService.globalSearch('architectural');
    assert.ok(notesResults.contacts.some((c) => c.id === eleanor.id));
    assert.ok(notesResults.tasks.some((t) => t.id === task.id));
    // Verify snippet extraction
    assert.ok(notesResults.contacts[0].matchSnippet?.includes('architectural'));

    // E. Search by Interaction Details Keyword -> matches Interaction
    const detailsResults = searchService.globalSearch('bookcase');
    assert.strictEqual(detailsResults.interactions.length, 1);
    assert.strictEqual(detailsResults.interactions[0].id, interaction.id);
    assert.ok(detailsResults.interactions[0].matchSnippet?.includes('bookcase'));

    // F. Archived Records Exclusion Safety:
    // Searching for 'Sanderson' or 'Luke' should NOT return Luke in default active search
    const activeSearch = searchService.globalSearch('Sanderson', { includeArchived: false });
    assert.strictEqual(activeSearch.contacts.length, 0);

    // With includeArchived: true, Luke should be found with archived flag set
    const archivedSearch = searchService.globalSearch('Sanderson', { includeArchived: true });
    assert.strictEqual(archivedSearch.contacts.length, 1);
    assert.strictEqual(archivedSearch.contacts[0].id, luke.id);
    assert.strictEqual(archivedSearch.contacts[0].archived, true);

    // G. Contact List Repository Tag Filtering:
    const paranormalTag = tagService.listTags().find((t) => t.name === 'Paranormal');
    assert.ok(paranormalTag);

    const filteredByTag = contactService.listContacts({ tagId: paranormalTag.id });
    assert.strictEqual(filteredByTag.total, 2);
    const tagContactIds = filteredByTag.contacts.map((c) => c.id);
    assert.ok(tagContactIds.includes(eleanor.id));
    assert.ok(tagContactIds.includes(theodora.id));
    assert.ok(!tagContactIds.includes(luke.id));

    // Tag filtering with specific tag 'Acoustics' -> only Eleanor
    const acousticsTag = tagService.listTags().find((t) => t.name === 'Acoustics');
    assert.ok(acousticsTag);
    const acousticsContacts = contactService.listContacts({ tagId: acousticsTag.id });
    assert.strictEqual(acousticsContacts.total, 1);
    assert.strictEqual(acousticsContacts.contacts[0].id, eleanor.id);
  });

  it('manages tag creation, updating, contacts counts, and removal', () => {
    // 1. Create a tag
    const tag = tagService.createTag('VIP Client');
    assert.ok(tag.id);
    assert.strictEqual(tag.name, 'VIP Client');

    // 2. Assign to contacts
    const { contact: c1 } = contactService.createContact({ first_name: 'Alice', last_name: 'Smith' });
    const { contact: c2 } = contactService.createContact({ first_name: 'Bob', last_name: 'Jones' });

    tagService.setContactTags(c1.id, ['VIP Client', 'Investor']);
    tagService.setContactTags(c2.id, ['VIP Client']);

    // 3. Verify tag contacts count
    const updatedTag = tagService.getTag(tag.id);
    assert.strictEqual(updatedTag.contacts_count, 2);

    // 4. Update tag name
    const renamed = tagService.updateTag(tag.id, 'Ultra VIP');
    assert.strictEqual(renamed.name, 'Ultra VIP');

    const c1Tags = tagService.getTagsForContact(c1.id);
    assert.ok(c1Tags.some((t) => t.name === 'Ultra VIP'));

    // 5. Remove tag from contact
    tagService.setContactTags(c1.id, ['Investor']);
    const c1TagsAfter = tagService.getTagsForContact(c1.id);
    assert.strictEqual(c1TagsAfter.length, 1);
    assert.strictEqual(c1TagsAfter[0].name, 'Investor');

    // 6. Delete tag
    const deleted = tagService.deleteTag(tag.id);
    assert.strictEqual(deleted, true);

    const allTags = tagService.listTags();
    assert.ok(!allTags.some((t) => t.id === tag.id));
  });
});
