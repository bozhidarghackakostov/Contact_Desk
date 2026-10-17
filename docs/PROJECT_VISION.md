# ContactDesk — Project Vision & Principles

## 1. Executive Summary

**ContactDesk** is a private, offline-first personal and professional Customer Relationship Management (CRM) and relationship manager. It runs entirely on the user's local workstation, accessed via a modern web interface, with all data persisted strictly in a local SQLite database.

ContactDesk is designed for a single individual who needs to cultivate personal and professional relationships, remember conversation histories, manage commitments, and ensure important follow-ups never fall through the cracks—without sacrificing personal privacy or handing sensitive contact networks over to cloud providers or third-party platforms.

---

## 2. Core Value Proposition

Modern CRMs are overwhelmingly built for enterprise sales teams: bloated with pipelines, quotas, automated outbound spam sequences, third-party trackers, and persistent cloud sync subscriptions. 

ContactDesk rejects this paradigm in favor of:
- **Privacy by Default**: Zero network transmissions, zero external analytics, zero cloud dependencies.
- **Data Sovereignty**: The user owns the SQLite database file directly on their filesystem and can export, back up, or inspect their records at any time.
- **Actionable Context**: Relationship intelligence focused on real conversations, human context, notes, and timely follow-ups rather than sales pipeline stages.
- **Reliability & Speed**: Instant local response times without network latency or external downtime risks.

---

## 3. Key Questions ContactDesk Answers

At any moment, a user should be able to answer these core relationship questions within seconds:

1. **Who is this person, and what do I know about them?**  
   Comprehensive profile with roles, background notes, contact details, tags, and organizational affiliations.
2. **Where did I meet or interact with them?**  
   Contextual notes and timeline records of origins, conferences, introductions, or initial meetings.
3. **When did we last talk?**  
   Clear, verifiable date and time of the most recent interaction, automatically computed from recorded logs.
4. **What did we discuss?**  
   Searchable chronological notes across all interactions (meetings, phone calls, messages, emails, informal conversations).
5. **Which company or organization are they associated with?**  
   Explicit relationship linking with current and past organizational affiliations, titles, and departments.
6. **What did I promise to do?**  
   Follow-up actions tied directly to the person or interaction with specific due dates, priorities, and descriptions.
7. **Who do I need to contact today?**  
   A dedicated dashboard and follow-up view highlighting tasks due today.
8. **Which follow-ups are overdue?**  
   Immediate visual indicators and categorized lists of past-due commitments.
9. **What happened during my last meeting with this person?**  
   Quick glance at the latest interaction summary and detailed conversation notes.
10. **Which contacts have I not interacted with recently?**  
    Filters and metrics identifying contacts with no recent interactions or no recorded interactions at all.
11. **What are the notes, history, and relevant details associated with an organization?**  
    Consolidated view of all people, conversations, and tasks linked to a company, institution, or group.

---

## 4. Product Principles

### 4.1 People First
Relationships are fundamentally with human beings. Contact profiles are the centerpiece of the application. Organizations, interactions, and follow-ups radiate around people.

### 4.2 History Matters
Memory fades, but records endure. Important interactions must remain accessible, searchable, and structured chronologically. An interaction represents something that genuinely occurred.

### 4.3 Actions Are Connected
To-do items and follow-ups are not floating sticky notes. They must be connected to the relevant person, organization, or interaction so that context is never lost when taking action.

### 4.4 Absolute Offline & Local Operation
The application must function completely offline after local installation. It must not rely on external CDNs for styles, scripts, fonts, or icons. The backend binds exclusively to `127.0.0.1`.

### 4.5 Minimal Friction
Creating a contact, logging a quick phone call, or scheduling a follow-up must take minimal clicks and keystrokes. Desktop keyboard accessibility and clean form workflows are paramount.

### 4.6 Zero Fake Functionality
All counts, lists, summaries, and metrics are derived strictly from persisted SQLite records. There are no synthetic engagement scores, arbitrary relationship health percentages, or placeholder statistics.

---

## 5. Non-Goals

To maintain clarity, focus, and security, ContactDesk explicitly excludes:
- **No Multi-User Teams / RBAC**: ContactDesk is an intentional single-user application for one person's computer.
- **No Cloud Synchronization**: No synchronization with external cloud backends, Firebase, AWS, or proprietary servers.
- **No Background Telemetry**: No tracking, analytics, crash-reporting pings, or marketing beacons.
- **No Automated Scraping / Unsolicited Background Integrations**: No direct IMAP/SMTP inbox scrapers or calendar hooks in the initial core, avoiding API credential leaks and complexity. Data is intentionally entered and controlled by the user.
- **No Artificial "Sales Funnels"**: No deal stages, lead scoring, quota calculations, or commission trackers.
