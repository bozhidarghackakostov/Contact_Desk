-- Migration 001: Initial Schema for ContactDesk

-- 1. Contacts
CREATE TABLE IF NOT EXISTS contacts (
    id TEXT PRIMARY KEY,
    first_name TEXT NOT NULL DEFAULT '',
    last_name TEXT NOT NULL DEFAULT '',
    display_name TEXT NOT NULL DEFAULT '',
    nickname TEXT,
    job_title TEXT,
    primary_email TEXT,
    primary_phone TEXT,
    website TEXT,
    address TEXT,
    birthday TEXT,
    notes TEXT NOT NULL DEFAULT '',
    is_favorite INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    archived_at TEXT,
    deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_favorite ON contacts(is_favorite);
CREATE INDEX IF NOT EXISTS idx_contacts_updated_at ON contacts(updated_at);
CREATE INDEX IF NOT EXISTS idx_contacts_last_name ON contacts(last_name, first_name);

-- 2. Contact Methods
CREATE TABLE IF NOT EXISTS contact_methods (
    id TEXT PRIMARY KEY,
    contact_id TEXT NOT NULL,
    method_type TEXT NOT NULL,
    value TEXT NOT NULL,
    label TEXT,
    is_primary INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contact_methods_contact ON contact_methods(contact_id);

-- 3. Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    organization_type TEXT,
    industry TEXT,
    website TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    description TEXT,
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    archived_at TEXT,
    deleted_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
CREATE INDEX IF NOT EXISTS idx_organizations_name ON organizations(name);

-- 4. Contact Organizations (Junction)
CREATE TABLE IF NOT EXISTS contact_organizations (
    id TEXT PRIMARY KEY,
    contact_id TEXT NOT NULL,
    organization_id TEXT NOT NULL,
    job_title TEXT,
    department TEXT,
    role_description TEXT,
    is_primary INTEGER NOT NULL DEFAULT 0,
    start_date TEXT,
    end_date TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE,
    UNIQUE(contact_id, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_contact_org_contact ON contact_organizations(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_org_org ON contact_organizations(organization_id);

-- 5. Interactions
CREATE TABLE IF NOT EXISTS interactions (
    id TEXT PRIMARY KEY,
    interaction_type TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    details TEXT NOT NULL DEFAULT '',
    location TEXT,
    occurred_at TEXT NOT NULL,
    contact_id TEXT,
    organization_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_interactions_occurred ON interactions(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_contact ON interactions(contact_id);
CREATE INDEX IF NOT EXISTS idx_interactions_org ON interactions(organization_id);

-- 6. Tasks / Follow-ups
CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    due_date TEXT NOT NULL,
    due_time TEXT,
    priority TEXT NOT NULL DEFAULT 'normal',
    status TEXT NOT NULL DEFAULT 'open',
    contact_id TEXT,
    organization_id TEXT,
    interaction_id TEXT,
    reminder_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT,
    archived_at TEXT,
    deleted_at TEXT,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL,
    FOREIGN KEY (interaction_id) REFERENCES interactions(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_contact ON tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_tasks_org ON tasks(organization_id);

-- 7. Tags
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE COLLATE NOCASE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 8. Contact Tags (Junction)
CREATE TABLE IF NOT EXISTS contact_tags (
    contact_id TEXT NOT NULL,
    tag_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (contact_id, tag_id),
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_contact_tags_tag ON contact_tags(tag_id);
