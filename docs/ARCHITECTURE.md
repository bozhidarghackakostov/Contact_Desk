# ContactDesk — System Architecture

## 1. System Overview

ContactDesk is architected as a **modular monolith** running locally on the user's workstation. It combines a local Node.js HTTP server and an in-process SQLite database engine with a modern Single Page Application (SPA) frontend delivered to the user's browser.

```
+-------------------------------------------------------------------------+
|                              Web Browser                                |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  |                           React SPA                               |  |
|  |  (Pages / Components / Forms / Modals / Tables / Local State)     |  |
|  +---------------------------------+---------------------------------+  |
|                                    |                                    |
|                                    | HTTP JSON (Local Loopback Only)    |
+------------------------------------|------------------------------------+
                                     v
+------------------------------------+------------------------------------+
|                   Node.js Local Server (127.0.0.1)                      |
|                                                                         |
|  +-------------------------------------------------------------------+  |
|  | Express HTTP Layer & Security Middleware                          |  |
|  | - Loopback verification (127.0.0.1 only)                          |  |
|  | - Strict Origin / Host header validation (Anti-rebinding)         |  |
|  | - Content Security Policy (No CDNs, no external scripts)          |  |
|  | - Input Validation & Sanitization                                 |  |
|  +---------------------------------+---------------------------------+  |
|                                    |                                    |
|  +---------------------------------v---------------------------------+  |
|  | Business Service Layer                                            |  |
|  | - Contacts, Organizations, Relationships, Interactions, Tasks     |  |
|  | - Search, Dashboard Summaries, Tags, Import/Export, Backups       |  |
|  +---------------------------------+---------------------------------+  |
|                                    |                                    |
|  +---------------------------------v---------------------------------+  |
|  | Repository & Data Access Layer                                    |  |
|  | - Parameterized SQL queries                                       |  |
|  | - Database transaction boundaries                                 |  |
|  | - Schema migration engine                                         |  |
|  +---------------------------------+---------------------------------+  |
|                                    |                                    |
|  +---------------------------------v---------------------------------+  |
|  | SQLite Database Engine (node:sqlite)                             |  |
|  | - Single-file database (`data/contactdesk.db`)                   |  |
|  | - Foreign keys enabled (`PRAGMA foreign_keys = ON`)               |  |
|  | - WAL mode for performance & concurrency (`PRAGMA journal_mode`)   |  |
|  +-------------------------------------------------------------------+  |
+-------------------------------------------------------------------------+
```

---

## 2. Technology Stack Selection & Rationale

| Layer | Technology | Rationale |
|---|---|---|
| **Frontend Runtime & UI** | React 19, TypeScript, Vite | Industry standard, fast compilation, component reusability, zero remote runtime overhead. |
| **Styling & Assets** | CSS Modules / Modern CSS, Lucide React (local) | Clean, responsive, desktop-friendly layout with zero external CDN dependencies or web fonts. |
| **Backend Runtime** | Node.js (v20+ / v26) | Cross-platform, mature ecosystem, local file handling capabilities. |
| **HTTP Framework** | Express with TypeScript | Lightweight, predictable routing, robust middleware pipeline, simple loopback binding. |
| **Database Engine** | SQLite (via Node's built-in `node:sqlite`) | Zero native compilation dependencies, ACID-compliant, reliable foreign keys and transactions, rock-solid persistence. |
| **Testing** | Vitest, Supertest, React Testing Library | Fast, integrated test runner for unit, API, integration, and UI component tests. |

---

## 3. Data Flow & Architectural Layers

The architecture enforces strict separation of concerns:

```
Browser UI ──> Frontend API Client ──> Local HTTP API ──> Business Services ──> Repositories ──> SQLite
```

### 3.1 Frontend Layer (`src/client/`)
- **Components & Pages**: Renders views, layouts, tables, timelines, dialogs, and navigation.
- **State & Forms**: Manages form inputs, local state, interactive filters, and client-side validation hints.
- **API Client**: Strongly typed wrapper around standard `fetch`, directing requests to `/api/*` endpoints with predictable error handling.
- **Rule**: Presentation only. Never computes or asserts business rules that dictate database state.

### 3.2 API Layer (`src/server/routes/`, `middleware/`, `validators/`)
- **Routing**: Maps clean REST endpoints (`/api/contacts`, `/api/tasks`, etc.).
- **Security & Validation**: Validates all incoming payloads using schema validators. Rejects unvalidated input before reaching services.
- **HTTP Negotiation**: Returns standardized JSON structures with standard HTTP status codes (`200`, `201`, `400`, `404`, `409`, `500`).
- **Rule**: Thin controllers. No raw SQL or complex business orchestration inside route handlers.

### 3.3 Business Service Layer (`src/server/services/`)
- Encapsulates domain logic:
  - Computing display names and duplicate warnings.
  - Determining task urgency (overdue, due today, upcoming).
  - Calculating dashboard metrics and relationship timelines.
  - Managing contact-organization associations and primary designations.
  - Orchestrating CSV import validation, duplicate detection, and backup snapshots.
- **Rule**: Independent of Express request/response objects. Methods accept and return domain data.

### 3.4 Repository Layer (`src/server/repositories/`)
- Manages persistence operations using parameterized SQL queries.
- Enforces relational constraints, handles transactions (`BEGIN`, `COMMIT`, `ROLLBACK`), and encapsulates table mapping.
- **Rule**: No SQL queries leak into services or controllers.

---

## 4. API Response Contract

All endpoints adhere to a standardized JSON response envelope:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 100
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "First name or last name is required",
    "details": [
      { "field": "first_name", "message": "Required" }
    ]
  }
}
```

---

## 5. Security & Network Boundary

1. **Host Binding**: Server explicitly binds to IPv4 loopback `127.0.0.1` (or optionally `::1` loopback), preventing network exposure on LAN or public interfaces.
2. **Host & Origin Validation**: Middlewares verify incoming `Host` and `Origin` headers to protect against DNS rebinding and cross-site requests originating from external browser tabs.
3. **Content Security Policy (CSP)**:
   ```http
   Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self';
   ```
4. **No External Assets**: Fonts use system font stacks (`system-ui`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `Roboto`). Icons are bundled locally via SVG/Lucide.
5. **Path Traversal Protection**: File operations (backups, imports, exports) are strictly sandboxed within designated paths and validate all filenames against path traversal attacks.

---

## 6. Database & Migration Strategy

- **Location**: Database stored in a dedicated local directory (`data/contactdesk.db`).
- **Schema Migrations**: Linear, versioned migration files in `database/migrations/` (e.g., `001_initial_schema.sql`, `002_add_fts.sql`). A `schema_migrations` table records applied migrations.
- **Integrity**: `PRAGMA foreign_keys = ON;` is executed on every database connection.
- **Transactions**: Multi-table updates (such as contact creation with organizations and tags, or CSV import batches) execute within atomic SQLite transactions.
- **Concurrency**: Write-Ahead Logging (`PRAGMA journal_mode = WAL;`) provides optimal read/write concurrency.

---

## 7. Backup and Recovery Architecture

- **Manual Backups**: Copies the SQLite database file safely using SQLite's online vacuum/backup mechanism into `data/backups/contactdesk_backup_YYYYMMDD_HHMMSS.db`.
- **Pre-Restoration Safeguards**:
  1. Inspect and test-open the selected backup file.
  2. Verify database schema integrity (`PRAGMA integrity_check`).
  3. Create an automated safety snapshot of the active database before overwriting.
  4. Perform atomic replacement of the database file.
  5. If restoration fails, revert automatically to the pre-restore snapshot.
