# ContactDesk — Implementation Roadmap

This roadmap defines the sequenced execution phases for ContactDesk. Each phase builds upon verified previous deliverables and produces a runnable, testable release.

---

## Phase 0: Requirements, Architecture & Foundation Specs (Current)
- **Goal**: Establish comprehensive specifications, data models, architectural blueprints, and security guidelines.
- **Deliverables**:
  - `docs/PROJECT_VISION.md`
  - `docs/ARCHITECTURE.md`
  - `docs/DATA_MODEL.md`
  - `docs/PRIVACY_AND_SECURITY.md`
  - `docs/IMPLEMENTATION_PLAN.md`
  - `docs/TEST_PLAN.md`
  - Root `.gitignore` and `README.md`
- **Acceptance Criteria**: All documents complete, clear, and aligned with non-negotiable requirements.

---

## Phase 1: Project Foundation & Core Shell
- **Goal**: Initialize runnable local project with Node.js/Express backend, SQLite database integration with schema migrations, Vite/React frontend, and shared types.
- **Deliverables**:
  - `package.json` with local scripts and dependencies (Express, React, Vite, TypeScript, Vitest, Lucide).
  - TypeScript configurations (`tsconfig.json`, `tsconfig.node.json`).
  - Database connection manager (`src/server/database/connection.ts`) utilizing `node:sqlite`.
  - Migration runner (`src/server/database/migrator.ts`) and initial migration `001_initial_schema.sql`.
  - Express app server with loopback binding (`127.0.0.1`), health check endpoint (`/api/health`), and security middleware.
  - React application shell with responsive sidebar navigation (Dashboard, Contacts, Organizations, Interactions, Follow-ups, Settings).
  - Strongly-typed frontend API client (`src/client/services/apiClient.ts`).
  - Automated tests verifying health endpoint and migration runner.
- **Acceptance Criteria**: Application runs locally via `npm run dev` or `npm start`, connects to local SQLite database, and successfully runs automated health tests.

---

## Phase 2: Contacts & Organizations Management
- **Goal**: Implement full CRUD for Contacts and Organizations, including the many-to-many relationship junction table, listing, pagination, sorting, and duplicate warnings.
- **Deliverables**:
  - Repositories: `ContactRepository`, `OrganizationRepository`, `ContactOrganizationRepository`.
  - Services: `ContactService`, `OrganizationService`.
  - API Routes: `/api/contacts`, `/api/organizations`, `/api/contacts/:id/organizations`.
  - Frontend Views: Contacts list, Organizations list, Contact creation/edit modal, Organization modal.
  - Sorting (name, created_at, updated_at), pagination, active/archived filters.
  - Duplicate contact warnings based on matching first/last name or email.
  - Unit and API integration tests covering CRUD operations.
- **Acceptance Criteria**: Contacts and organizations can be created, edited, archived, restored, and linked with titles and departments; changes persist across restarts.

---

## Phase 3: Contact Profiles & Interaction History
- **Goal**: Build rich detail profiles and the chronological interaction timeline.
- **Deliverables**:
  - Contact Profile page (`/contacts/:id`) with overview, notes, organization badges, and action buttons.
  - Organization Profile page (`/organizations/:id`) with affiliated people and notes.
  - Repositories & Services: `InteractionRepository`, `InteractionService`.
  - API Routes: `/api/interactions` (list, create, update, delete).
  - Interaction creation modal with interaction types (meeting, phone call, email, message, in-person, note, other).
  - Reverse chronological timeline view with type badges and date filters.
  - Unit and integration tests for interaction ordering and relationship linking.
- **Acceptance Criteria**: Interactions logged from a contact or organization profile appear instantly in reverse chronological order and persist accurately.

---

## Phase 4: Follow-ups & Dynamic Dashboard
- **Goal**: Implement task and commitment tracking and the live metrics dashboard.
- **Deliverables**:
  - Repositories & Services: `TaskRepository`, `TaskService`, `DashboardService`.
  - API Routes: `/api/tasks` (CRUD, complete, reopen), `/api/dashboard` (aggregated stats).
  - Follow-up views: Today, Upcoming, Overdue, Open, Completed.
  - Quick action to complete or reschedule a task directly from the contact profile or task list.
  - Dashboard view showing:
    - Active contacts and organizations count.
    - Tasks due today, upcoming tasks, overdue tasks.
    - Recent interactions.
    - Contacts with no interactions.
  - Unit tests for date calculations (due today, overdue) and dashboard metric calculations.
- **Acceptance Criteria**: Task transitions update immediately, overdue tasks are accurately computed based on local date/time, and all dashboard metrics reflect real persisted data.

---

## Phase 5: Search, Tags & Usability
- **Goal**: Global multi-entity search, tag taxonomy, advanced filters, and accessible UI polish.
- **Deliverables**:
  - Repositories & Services: `TagRepository`, `SearchService`.
  - API Routes: `/api/tags`, `/api/search`.
  - Global Search bar in header searching contacts, organizations, notes, interactions, tasks, and tags.
  - Tag management view in Settings or modal; tag assignment chips on contacts.
  - Filter bar enhancements: combine tags, status, favorites, and search query.
  - Clear empty states with call-to-action buttons for clean onboarding.
  - Unit and integration tests for global search and tagging operations.
- **Acceptance Criteria**: Search returns grouped results across all entities in real time; tags can be created, assigned, and filtered seamlessly.

---

## Phase 6: Import, Export, Backup & Restore
- **Goal**: Complete data portability and safety via CSV import/export, JSON backup, and verified SQLite restore.
- **Deliverables**:
  - CSV contact import engine with file parsing, column mapping, preview table, validation errors, and duplicate detection.
  - Export endpoints: `/api/export/contacts.csv`, `/api/export/organizations.csv`, `/api/export/interactions.csv`, `/api/export/tasks.csv`, `/api/export/all.json`.
  - Backup endpoint: `/api/backup` creating verified snapshots in `data/backups/`.
  - Restore endpoint: `/api/backup/restore` with integrity pre-check and safety rollback snapshot.
  - Settings page UI for import, export, and backup/restore management.
  - Tests covering CSV parsing, formula neutralization, export serialization, and backup/restore workflows.
- **Acceptance Criteria**: Users can import CSVs safely with preview, export full CSVs/JSON, and perform verified backups and restorations.

---

## Phase 7: Privacy, Reliability & Final QA
- **Goal**: Enforce local security headers, loopback constraints, offline validation, and comprehensive regression test execution.
- **Deliverables**:
  - Security audit: Verify CSP headers, host header check, and loopback binding.
  - Offline testing: Confirm zero external asset fetches and full functionality with disconnected network.
  - Full end-to-end regression test suite execution (Vitest).
  - Setup and operation documentation in `README.md`.
- **Acceptance Criteria**: All acceptance scenarios (A through G) pass without error, zero external network requests occur, and documentation is complete.
