# ContactDesk — Privacy & Security Plan

## 1. Threat Model & Principles

ContactDesk is designed for a single user managing private, sensitive relationship information on their personal computer. The primary threat landscape includes:

1. **Unintended Network Exposure**: The local server accidentally exposing contact data to other machines on the local network (LAN) or public interfaces.
2. **Drive-By Browser Attacks (CSRF / DNS Rebinding / Cross-Origin Attacks)**: Malicious websites running in the user's browser attempting to send requests to `http://localhost:PORT` to exfiltrate contact records.
3. **Malicious Content Injection (XSS & Script Injection)**: Injected malicious payloads inside contact notes, CSV imports, or URLs executing scripts in the local origin.
4. **CSV Injection (Formula Injection)**: Exported CSV files containing formulas (`=`, `+`, `-`, `@`) that execute arbitrary commands when opened in desktop spreadsheet tools (Excel, LibreOffice).
5. **Path Traversal / Local File Overwrite**: Malicious API requests attempting to read or overwrite arbitrary operating system files during backup or restore operations.
6. **Data Leakage via Source Control**: Accidentally committing real contact databases, backups, or exports into public or private Git repositories.

---

## 2. Network & Boundary Protections

### 2.1 Loopback Interface Binding
The HTTP server binds strictly and exclusively to `127.0.0.1` (IPv4 loopback). It must never bind to `0.0.0.0` or public network adapters.

### 2.2 Host & Origin Header Verification
To prevent DNS rebinding attacks and cross-origin exfiltration from external websites:
- Requests must have a valid `Host` header matching `localhost:PORT` or `127.0.0.1:PORT`.
- Cross-origin requests (`Origin` header set to an external web domain) are rejected with `403 Forbidden`.
- CORS headers are strictly constrained to local dev/production origins; no wildcard `Access-Control-Allow-Origin: *`.

### 2.3 Content Security Policy (CSP)
A strict Content Security Policy is delivered with all HTML responses:
```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none';
```
- Disallows all external script tags, stylesheets, and fonts.
- Prevents loading of remote iframes or plugins.
- Prevents framing ContactDesk in external pages (`frame-ancestors 'none'`).

### 2.4 Offline Guarantee
All frontend dependencies, fonts, and icon assets are packaged and served locally from the application bundle. The application operates identically with all network interfaces physically disabled.

---

## 3. Filesystem & Data Protections

### 3.1 Controlled Storage Boundaries
- The database is stored at `data/contactdesk.db`.
- Backups are stored in `data/backups/`.
- Temporary import previews are handled in-memory or in isolated temporary buffers.
- All file operations validate target paths to ensure they reside strictly within the authorized directories. Arbitrary paths such as `../../etc/passwd` or absolute OS paths are rejected.

### 3.2 Git & Version Control Safeguards
- `.gitignore` explicitly excludes:
  - `data/*.db`
  - `data/*.db-wal`
  - `data/*.db-shm`
  - `data/backups/`
  - `*.sqlite`
  - Exported CSV/JSON files
- Only schema migrations (`database/migrations/*.sql`) and application source code are tracked in Git.

### 3.3 CSV Formula Injection Prevention
When generating CSV exports, any cell value that starts with formula triggers (`=`, `+`, `-`, `@`, `\t`, `\r`) is prefixed with a single quote (`'`) to neutralize automatic formula execution in spreadsheet software.

---

## 4. Telemetry & Analytics Policy

- **Zero Telemetry**: ContactDesk contains zero tracking scripts, telemetry collectors, beacon requests, or remote crash reporters.
- **Zero Remote Dependencies**: The application never dials out to check for updates, verify licenses, or fetch external avatars.
- **No Third-Party Authentication**: No Google, Apple, or OAuth sign-ins. ContactDesk operates under the user's local workstation account.

---

## 5. Backup & Restore Safety Protocol

1. **Pre-flight Integrity Verification**: Before restoring any backup, the target file is examined with `PRAGMA integrity_check` in SQLite. Corrupt or invalid files are rejected immediately.
2. **Safety Snapshot**: Prior to overwriting the active database, a temporary snapshot (`contactdesk_pre_restore_safety.db`) is created.
3. **Atomic Replacement**: Database restoration replaces files safely. If any error occurs, the safety snapshot is restored.
