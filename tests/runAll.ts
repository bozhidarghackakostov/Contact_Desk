// Master test suite runner executing all tests in a unified process
import './integration/database.test.ts';
import './api/health.test.ts';
import './integration/contacts.test.ts';
import './integration/organizations.test.ts';
import './integration/interactions.test.ts';
import './integration/tasks.test.ts';
import './integration/search.test.ts';
import './integration/backup_import.test.ts';
