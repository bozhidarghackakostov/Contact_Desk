import type { DatabaseSync } from 'node:sqlite';
import { generateCsv } from './csvUtils.ts';

export class ExportService {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  public exportContactsCsv(includeArchived: boolean = true): string {
    const statusCondition = includeArchived ? '' : "WHERE c.status != 'archived'";

    const contacts = this.db
      .prepare(`
        SELECT
          c.id,
          c.first_name,
          c.last_name,
          c.display_name,
          c.nickname,
          c.job_title,
          c.primary_email,
          c.primary_phone,
          c.website,
          c.address,
          c.birthday,
          c.notes,
          c.status,
          c.created_at,
          c.updated_at,
          (
            SELECT o.name
            FROM contact_organizations co
            JOIN organizations o ON o.id = co.organization_id
            WHERE co.contact_id = c.id
            ORDER BY co.is_primary DESC, co.created_at ASC
            LIMIT 1
          ) as organization_name,
          (
            SELECT co.job_title
            FROM contact_organizations co
            WHERE co.contact_id = c.id
            ORDER BY co.is_primary DESC, co.created_at ASC
            LIMIT 1
          ) as organization_role,
          (
            SELECT co.department
            FROM contact_organizations co
            WHERE co.contact_id = c.id
            ORDER BY co.is_primary DESC, co.created_at ASC
            LIMIT 1
          ) as organization_dept,
          (
            SELECT GROUP_CONCAT(t.name, '; ')
            FROM contact_tags ct
            JOIN tags t ON t.id = ct.tag_id
            WHERE ct.contact_id = c.id
          ) as tags
        FROM contacts c
        ${statusCondition}
        ORDER BY c.last_name ASC, c.first_name ASC
      `)
      .all() as any[];

    const headers = [
      'First Name',
      'Last Name',
      'Display Name',
      'Nickname',
      'Job Title',
      'Primary Email',
      'Primary Phone',
      'Website',
      'Address',
      'Birthday',
      'Organization',
      'Organization Role',
      'Department',
      'Tags',
      'Notes',
      'Status',
      'Created At',
      'Updated At',
    ];

    const rows = contacts.map((c) => [
      c.first_name,
      c.last_name,
      c.display_name,
      c.nickname,
      c.job_title,
      c.primary_email,
      c.primary_phone,
      c.website,
      c.address,
      c.birthday,
      c.organization_name,
      c.organization_role,
      c.organization_dept,
      c.tags,
      c.notes,
      c.status,
      c.created_at,
      c.updated_at,
    ]);

    return generateCsv(headers, rows, true);
  }

  public exportOrganizationsCsv(includeArchived: boolean = true): string {
    const statusCondition = includeArchived ? '' : "WHERE status != 'archived'";

    const orgs = this.db
      .prepare(`
        SELECT
          name,
          organization_type,
          industry,
          website,
          email,
          phone,
          address,
          description,
          notes,
          status,
          created_at,
          updated_at
        FROM organizations
        ${statusCondition}
        ORDER BY name ASC
      `)
      .all() as any[];

    const headers = [
      'Name',
      'Type',
      'Industry',
      'Website',
      'Email',
      'Phone',
      'Address',
      'Description',
      'Notes',
      'Status',
      'Created At',
      'Updated At',
    ];

    const rows = orgs.map((o) => [
      o.name,
      o.organization_type,
      o.industry,
      o.website,
      o.email,
      o.phone,
      o.address,
      o.description,
      o.notes,
      o.status,
      o.created_at,
      o.updated_at,
    ]);

    return generateCsv(headers, rows, true);
  }

  public exportInteractionsCsv(): string {
    const interactions = this.db
      .prepare(`
        SELECT
          i.occurred_at,
          i.interaction_type,
          i.title,
          i.summary,
          i.details,
          i.location,
          c.display_name as contact_name,
          c.primary_email as contact_email,
          o.name as organization_name
        FROM interactions i
        LEFT JOIN contacts c ON c.id = i.contact_id
        LEFT JOIN organizations o ON o.id = i.organization_id
        WHERE i.deleted_at IS NULL
        ORDER BY i.occurred_at DESC
      `)
      .all() as any[];

    const headers = [
      'Date & Time',
      'Type',
      'Title',
      'Summary',
      'Details',
      'Location',
      'Contact Name',
      'Contact Email',
      'Organization',
    ];

    const rows = interactions.map((i) => [
      i.occurred_at,
      i.interaction_type,
      i.title,
      i.summary,
      i.details,
      i.location,
      i.contact_name,
      i.contact_email,
      i.organization_name,
    ]);

    return generateCsv(headers, rows, true);
  }

  public exportTasksCsv(): string {
    const tasks = this.db
      .prepare(`
        SELECT
          t.title,
          t.description,
          t.due_date,
          t.due_time,
          t.priority,
          t.status,
          c.display_name as contact_name,
          o.name as organization_name,
          t.completed_at,
          t.created_at
        FROM tasks t
        LEFT JOIN contacts c ON c.id = t.contact_id
        LEFT JOIN organizations o ON o.id = t.organization_id
        WHERE t.deleted_at IS NULL
        ORDER BY t.due_date ASC
      `)
      .all() as any[];

    const headers = [
      'Title',
      'Description',
      'Due Date',
      'Due Time',
      'Priority',
      'Status',
      'Contact',
      'Organization',
      'Completed At',
      'Created At',
    ];

    const rows = tasks.map((t) => [
      t.title,
      t.description,
      t.due_date,
      t.due_time,
      t.priority,
      t.status,
      t.contact_name,
      t.organization_name,
      t.completed_at,
      t.created_at,
    ]);

    return generateCsv(headers, rows, true);
  }

  public exportJsonDump(): Record<string, any> {
    const contacts = this.db.prepare('SELECT * FROM contacts WHERE deleted_at IS NULL').all();
    const contactMethods = this.db.prepare('SELECT * FROM contact_methods').all();
    const organizations = this.db.prepare('SELECT * FROM organizations WHERE deleted_at IS NULL').all();
    const contactOrganizations = this.db.prepare('SELECT * FROM contact_organizations').all();
    const interactions = this.db.prepare('SELECT * FROM interactions WHERE deleted_at IS NULL').all();
    const tasks = this.db.prepare('SELECT * FROM tasks WHERE deleted_at IS NULL').all();
    const tags = this.db.prepare('SELECT * FROM tags').all();
    const contactTags = this.db.prepare('SELECT * FROM contact_tags').all();

    return {
      metadata: {
        app: 'ContactDesk',
        version: 1,
        exported_at: new Date().toISOString(),
      },
      contacts,
      contact_methods: contactMethods,
      organizations,
      contact_organizations: contactOrganizations,
      interactions,
      tasks,
      tags,
      contact_tags: contactTags,
    };
  }
}
