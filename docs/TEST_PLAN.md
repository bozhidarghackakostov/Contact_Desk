# ContactDesk — Test Plan & Acceptance Scenarios

## 1. Testing Philosophy & Stack

ContactDesk prioritizes dependable data integrity, business logic correctness, and workflow reliability over purely visual snapshot testing.

### Tooling
- **Test Runner**: Vitest (fast, native TypeScript and ESM support).
- **API & Integration Tests**: Supertest with an isolated in-memory or temporary SQLite database instance per test suite.
- **Component & UI Tests**: React Testing Library with `@testing-library/jest-dom`.

---

## 2. Testing Tiers & Coverage Targets

### Tier 1: Unit Tests (`tests/unit/`)
- **Domain & Utilities**:
  - Display name generation rules (fallback to nickname, email, or "Unnamed Contact").
  - Date and time calculation functions (overdue detection, due today, upcoming).
  - CSV parsing and formula injection neutralization.
  - Search query tokenization and sanitization.
  - Metric aggregations (active contacts count, contacts with zero interactions).

### Tier 2: API & Integration Tests (`tests/api/` & `tests/integration/`)
- **Database Migrations**: Running migrations up on clean database, verifying schema integrity.
- **Contact CRUD**: Creating, reading, updating, archiving, and restoring contacts.
- **Organizations & Relationships**: Linking contacts to organizations, primary organization toggling, and cascading updates.
- **Interactions**: Chronological ordering, multi-entity linking, notes preservation.
- **Tasks / Follow-ups**: Transitions between open, in_progress, completed, and cancelled states; due date validation.
- **Tags**: Creation, uniqueness enforcement, tag association with contacts.
- **Search**: Multi-entity search across contacts, organizations, interactions, notes, and tasks.
- **Backup & Restore**: Snapshot creation, integrity check validation, atomic restoration, rollback on corrupt files.
- **CSV Import/Export**: Column mapping, duplicate warnings, batch transactions, CSV and JSON serialization.

### Tier 3: Component & UI Workflow Tests (`tests/ui/`)
- Rendering navigation shell and route transitions.
- Form inputs, validation messages, and submission triggers.
- Empty states and onboarding actions.
- Confirmation dialogs for destructive actions (e.g. archiving or restoring).

---

## 3. Mandatory Acceptance Scenarios

### Scenario A — Contact Management
1. Create a contact with first name, last name, email, phone, and background notes.
2. Verify contact is returned in the contacts list.
3. Reload/re-query the database to verify persistence.
4. Edit the contact (update job title and notes).
5. Verify updated details persist.

### Scenario B — Organization Relationships
1. Create an organization ("Acme Corp").
2. Create two contacts ("Alice Smith", "Bob Jones").
3. Link both contacts to Acme Corp with distinct job titles ("Engineering Director", "Product Lead").
4. Query the organization profile and verify both contacts appear with their respective job titles.
5. Query each contact profile and verify Acme Corp appears as their affiliated organization.

### Scenario C — Interaction History
1. Create a contact ("Charlie Brown").
2. Add multiple interactions with distinct dates (e.g. 2026-09-01 Phone Call, 2026-10-01 In-Person Meeting, 2026-10-15 Email).
3. Query the contact's interaction timeline.
4. Verify chronological reverse ordering (latest interaction first: Oct 15 -> Oct 01 -> Sep 01).
5. Edit the middle interaction and verify the updated summary is reflected immediately.

### Scenario D — Follow-up Lifecycle
1. Create a follow-up task linked to a contact with a specific due date.
2. Verify it appears in the "Open" and appropriate date view ("Today" / "Upcoming" / "Overdue").
3. Mark the task as completed.
4. Verify it no longer appears in "Open" tasks, but appears in "Completed" history with `completed_at` timestamp.
5. Reopen the task and verify it transitions back to "Open".

### Scenario E — Search
1. Create contacts with varying names, companies, emails, and notes (e.g. "Maya Lin", company "Design Studio", email "maya@arch.org", note "Met at Tokyo Conference").
2. Execute searches for "Maya", "Design Studio", "arch.org", and "Tokyo".
3. Verify that the correct contact record is found across all search dimensions.
4. Archive the contact and verify documented search filtering behavior.

### Scenario F — Import Safety
1. Supply a test CSV containing valid rows, invalid rows (missing names), and rows that match existing contacts.
2. Trigger the import preview endpoint.
3. Verify that the preview detects column mappings, flags invalid rows, and issues duplicate warnings.
4. Confirm the import of valid records.
5. Verify valid records are inserted while existing contacts are preserved without silent overwrites.

### Scenario G — Backup and Restoration
1. Populate a database with contacts, organizations, interactions, tasks, and tags.
2. Execute the backup command to generate a backup snapshot in `data/backups/`.
3. Create a secondary test environment and restore the backup file into it.
4. Verify all records, relationships, and tags are intact.
5. Provide a corrupt file to the restore endpoint.
6. Verify the restore engine aborts with an integrity error and leaves the active database completely unmodified.
