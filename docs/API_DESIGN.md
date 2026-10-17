# ContactDesk — Local API Design Specification

## 1. Overview & Conventions

The ContactDesk API is a RESTful JSON HTTP API served exclusively on local loopback (`http://127.0.0.1:3000/api`).

- **Transport**: HTTP/1.1 over local loopback (`127.0.0.1`).
- **Content-Type**: `application/json; charset=utf-8` (except for CSV/JSON binary/file exports).
- **Authentication**: None required (single-user workstation boundary with strict Host & Origin verification).
- **Date Format**: ISO 8601 UTC strings (`YYYY-MM-DDTHH:mm:ss.sssZ` or `YYYY-MM-DD`).

### Standard Response Envelope
All API endpoints return JSON matching this envelope:

**Success**:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 120
  }
}
```

**Error**:
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND | VALIDATION_ERROR | CONFLICT | INTEGRITY_ERROR | INTERNAL_ERROR",
    "message": "Human-readable summary",
    "details": [
      { "field": "primary_email", "message": "Invalid email address format" }
    ]
  }
}
```

---

## 2. API Endpoints

### 2.1 System & Health
- `GET /api/health`
  - Returns: `{ "status": "ok", "version": "1.0.0", "dbConnected": true }`

---

### 2.2 Dashboard
- `GET /api/dashboard`
  - Returns real aggregated relationship intelligence:
  ```json
  {
    "activeContactsCount": 42,
    "activeOrganizationsCount": 15,
    "tasksDueTodayCount": 3,
    "tasksOverdueCount": 1,
    "tasksUpcomingCount": 7,
    "contactsWithoutInteractionsCount": 8,
    "recentInteractions": [ ... ],
    "recentContacts": [ ... ],
    "overdueTasks": [ ... ],
    "todayTasks": [ ... ]
  }
  ```

---

### 2.3 Contacts
- `GET /api/contacts`
  - Query params:
    - `search`: string (matches name, email, phone, notes)
    - `status`: `'active'` (default), `'archived'`, `'all'`
    - `organizationId`: string
    - `tagId`: string
    - `isFavorite`: boolean (`0` or `1`)
    - `hasInteractions`: boolean (`0` or `1`)
    - `sort`: `'name'` (default), `'created_at'`, `'updated_at'`, `'last_interaction'`
    - `order`: `'asc'` | `'desc'`
    - `page`: number (default 1)
    - `limit`: number (default 25)
- `POST /api/contacts`
  - Request body:
    ```json
    {
      "first_name": "Jane",
      "last_name": "Doe",
      "display_name": "",
      "nickname": "Janie",
      "job_title": "Senior Architect",
      "primary_email": "jane@example.com",
      "primary_phone": "+1-555-0199",
      "website": "https://janedoe.me",
      "address": "123 Market St, San Francisco, CA",
      "birthday": "1988-06-15",
      "notes": "Met at Open Source Summit",
      "is_favorite": 1,
      "tag_ids": ["tag_1", "tag_2"],
      "organization_ids": [
        { "organization_id": "org_1", "job_title": "Principal Architect", "is_primary": 1 }
      ]
    }
    ```
- `GET /api/contacts/:id`
  - Returns full profile including associated organizations, contact methods, tags, recent interactions, and linked tasks.
- `PATCH /api/contacts/:id`
  - Updates contact fields.
- `POST /api/contacts/:id/archive`
  - Marks contact as `archived` (`archived_at = CURRENT_TIMESTAMP`).
- `POST /api/contacts/:id/restore`
  - Restores contact to `active` (`archived_at = NULL`).
- `DELETE /api/contacts/:id`
  - Permanent deletion (requires explicit confirmation flag `?confirm=true`).

---

### 2.4 Organizations
- `GET /api/organizations`
  - Query params: `search`, `status`, `sort`, `page`, `limit`.
- `POST /api/organizations`
  - Body: `{ name, organization_type, industry, website, email, phone, address, description, notes }`
- `GET /api/organizations/:id`
  - Returns organization profile, affiliated contacts with their titles, recent interactions, and tasks.
- `PATCH /api/organizations/:id`
- `POST /api/organizations/:id/archive`
- `POST /api/organizations/:id/restore`
- `DELETE /api/organizations/:id`

---

### 2.5 Contact-Organization Affiliations
- `POST /api/contacts/:id/organizations`
  - Links contact to organization with `{ organization_id, job_title, department, role_description, is_primary, start_date, end_date }`.
- `PATCH /api/relationships/:id`
  - Updates title, department, dates, or primary status.
- `DELETE /api/relationships/:id`
  - Unlinks relationship without deleting either contact or organization.

---

### 2.6 Interactions
- `GET /api/interactions`
  - Query params: `contactId`, `organizationId`, `type`, `startDate`, `endDate`, `sort`, `page`, `limit`.
- `POST /api/interactions`
  - Body:
    ```json
    {
      "interaction_type": "meeting",
      "title": "Quarterly Strategy Review",
      "summary": "Discussed roadmap and upcoming project deadlines",
      "details": "Agreed to follow up on architecture draft by next Friday.",
      "location": "Coffee Shop / Video Call",
      "occurred_at": "2026-10-15T14:30:00Z",
      "contact_id": "contact_123",
      "organization_id": "org_456"
    }
    ```
- `GET /api/interactions/:id`
- `PATCH /api/interactions/:id`
- `DELETE /api/interactions/:id`

---

### 2.7 Tasks / Follow-ups
- `GET /api/tasks`
  - Query params:
    - `view`: `'today'` | `'upcoming'` | `'overdue'` | `'open'` | `'completed'` | `'all'`
    - `contactId`: string
    - `organizationId`: string
    - `priority`: `'low'` | `'normal'` | `'high'`
    - `sort`: `'due_date'` | `'priority'` | `'created_at'`
- `POST /api/tasks`
  - Body:
    ```json
    {
      "title": "Send updated proposal",
      "description": "Include revised budget numbers",
      "due_date": "2026-10-20",
      "due_time": "15:00",
      "priority": "high",
      "contact_id": "contact_123",
      "organization_id": "org_456",
      "interaction_id": "int_789"
    }
    ```
- `GET /api/tasks/:id`
- `PATCH /api/tasks/:id`
- `POST /api/tasks/:id/complete`
  - Marks task completed (`status = 'completed'`, `completed_at = CURRENT_TIMESTAMP`).
- `POST /api/tasks/:id/reopen`
  - Reopens task (`status = 'open'`, `completed_at = NULL`).
- `DELETE /api/tasks/:id`

---

### 2.8 Tags
- `GET /api/tags`
  - List all tags with usage counts.
- `POST /api/tags`
  - Body: `{ "name": "Networking" }`
- `PATCH /api/tags/:id`
  - Rename tag.
- `DELETE /api/tags/:id`
  - Deletes tag and removes associations from `contact_tags`.

---

### 2.9 Global Search
- `GET /api/search?q=query`
  - Performs cross-entity search returning grouped results:
    - `contacts`: matching name, email, phone, notes, job title
    - `organizations`: matching name, description, notes
    - `interactions`: matching title, summary, details
    - `tasks`: matching title, description
    - `tags`: matching tag name

---

### 2.10 Imports & Exports
- `POST /api/imports/contacts/preview`
  - Accepts raw CSV string or file upload. Parses headers, returns first rows, column mapping candidates, and duplicate warnings.
- `POST /api/imports/contacts/commit`
  - Accepts validated mapped rows and resolutions. Imports rows within an atomic SQLite transaction.
- `GET /api/export/contacts.csv`
- `GET /api/export/organizations.csv`
- `GET /api/export/interactions.csv`
- `GET /api/export/tasks.csv`
- `GET /api/export/all.json`

---

### 2.11 Backup & Recovery
- `POST /api/backup`
  - Creates timestamped backup snapshot in `data/backups/`.
- `GET /api/backup/list`
  - Returns list of existing backup files with file sizes and creation timestamps.
- `POST /api/backup/restore`
  - Body: `{ "backupFilename": "contactdesk_backup_20261017_200000.db" }`
  - Validates integrity, creates rollback snapshot, safely replaces database, reconnects DB.
