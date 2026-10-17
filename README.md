# ContactDesk

> **Private Offline Personal CRM & Relationship Manager**

ContactDesk is a local-first relationship manager designed to run entirely on your personal computer. It provides a clean, fast desktop productivity interface for managing people, organizations, conversation history, and follow-ups without cloud dependencies, external trackers, or recurring subscriptions.

---

## Key Features

- **People-First Profiles**: Detailed contact profiles with background notes, contact methods, tags, and organizational relationships.
- **Organization Directory**: Manage companies, institutions, and groups with associated team members and notes.
- **Chronological Interactions**: Log meetings, calls, messages, and conversations in an accurate reverse-chronological timeline.
- **Actionable Follow-ups**: Schedule tasks tied to contacts or organizations with overdue, today, and upcoming views.
- **Global Search & Filter**: Search across people, companies, notes, emails, phone numbers, and follow-ups.
- **Data Sovereignty & Portability**:
  - Full CSV imports with interactive column mapping, validation, and duplicate preview.
  - CSV exports for contacts, organizations, interactions, and tasks.
  - Complete JSON database export.
  - One-click SQLite verified backup and atomic restore with rollback protection.
- **100% Offline & Private**:
  - Binds strictly to loopback (`127.0.0.1`).
  - Zero external CDN dependencies (bundled local SVG icons, system fonts).
  - Zero analytics, telemetry, or third-party network pings.

---

## Technical Stack

- **Frontend**: React 19, TypeScript, Vite, CSS Modules, Lucide React (local SVG icons)
- **Backend**: Node.js, Express, TypeScript
- **Database**: SQLite via Node's native `node:sqlite` (ACID transactions, foreign keys enabled, WAL mode)
- **Testing**: Vitest, React Testing Library, Supertest

---

## Project Structure

```text
contactdesk/
├── docs/                     # Architectural specs, data model, security & test plans
│   ├── PROJECT_VISION.md
│   ├── ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── PRIVACY_AND_SECURITY.md
│   ├── IMPLEMENTATION_PLAN.md
│   └── TEST_PLAN.md
├── src/
│   ├── client/               # React frontend (SPA)
│   ├── server/               # Node/Express API, services, repositories, validators
│   └── shared/               # Shared TypeScript types, constants, and schemas
├── database/
│   └── migrations/           # Versioned SQL migration files
├── data/                     # Local SQLite database and backups (git-ignored)
│   └── backups/
└── tests/                    # Unit, API, and integration test suites
```

---

## Getting Started

### Prerequisites
- Node.js (v20+ or v26+)
- npm (v10+)

### Installation
```bash
# Install local dependencies
npm install
```

### Quick Start (macOS 1-Click Desktop Launcher)

You can launch ContactDesk immediately by double-clicking:
- **`ContactDesk.command`** (or **`start.command`**)

This launcher automatically detects your Node.js runtime, installs dependencies if needed, starts the local server on loopback (`http://127.0.0.1:3000`), and opens the web application directly in your default browser.

### Terminal Commands

```bash
# Start development mode (concurrent backend and frontend with live reload)
npm run dev

# Or build and start production server:
npm run build
npm start
```
Once started, open your web browser to `http://127.0.0.1:3000` (or the configured local port).

---

## Database & Backups Location

- **Active Database**: `data/contactdesk.db`
- **Backups Directory**: `data/backups/`

*Note: Database files and backups contain your private relationship data and are strictly excluded from source control via `.gitignore`.*

---

## Running Tests

```bash
# Run all automated tests
npm test

# Run tests in watch mode
npm run test:watch
```

---

## Privacy & Security Guarantees

- Binds exclusively to `127.0.0.1`.
- Rigid Content Security Policy (`default-src 'self'`).
- Validates Host and Origin headers to protect against DNS rebinding and cross-origin attacks.
- Neutralizes CSV formula triggers in exported spreadsheets.
