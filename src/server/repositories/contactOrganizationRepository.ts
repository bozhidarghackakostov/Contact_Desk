import type { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import type { ContactOrganization } from '../../shared/types/index.ts';

export interface LinkContactOrgInput {
  contact_id: string;
  organization_id: string;
  job_title?: string | null;
  department?: string | null;
  role_description?: string | null;
  is_primary?: number;
  start_date?: string | null;
  end_date?: string | null;
}

export class ContactOrganizationRepository {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  public link(input: LinkContactOrgInput): ContactOrganization {
    const id = randomUUID();
    const now = new Date().toISOString();
    const isPrimary = input.is_primary ? 1 : 0;

    // If marked primary, unset any other primary for this contact
    if (isPrimary === 1) {
      this.db
        .prepare('UPDATE contact_organizations SET is_primary = 0 WHERE contact_id = ?')
        .run(input.contact_id);
    }

    const stmt = this.db.prepare(`
      INSERT INTO contact_organizations (
        id, contact_id, organization_id, job_title, department,
        role_description, is_primary, start_date, end_date, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?
      )
      ON CONFLICT(contact_id, organization_id) DO UPDATE SET
        job_title = excluded.job_title,
        department = excluded.department,
        role_description = excluded.role_description,
        is_primary = excluded.is_primary,
        start_date = excluded.start_date,
        end_date = excluded.end_date,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      id,
      input.contact_id,
      input.organization_id,
      input.job_title || null,
      input.department || null,
      input.role_description || null,
      isPrimary,
      input.start_date || null,
      input.end_date || null,
      now,
      now
    );

    return this.find(input.contact_id, input.organization_id)!;
  }

  public find(contactId: string, orgId: string): ContactOrganization | null {
    const row = this.db
      .prepare(
        'SELECT * FROM contact_organizations WHERE contact_id = ? AND organization_id = ?'
      )
      .get(contactId, orgId) as any;

    if (!row) return null;
    return {
      ...row,
      is_primary: Number(row.is_primary),
    };
  }

  public update(
    id: string,
    input: Partial<Omit<LinkContactOrgInput, 'contact_id' | 'organization_id'>>
  ): ContactOrganization {
    const existing = this.db
      .prepare('SELECT * FROM contact_organizations WHERE id = ?')
      .get(id) as any;

    if (!existing) {
      throw new Error(`Relationship with id ${id} not found.`);
    }

    const now = new Date().toISOString();
    const isPrimary =
      input.is_primary !== undefined ? (input.is_primary ? 1 : 0) : existing.is_primary;

    if (isPrimary === 1) {
      this.db
        .prepare(
          'UPDATE contact_organizations SET is_primary = 0 WHERE contact_id = ? AND id != ?'
        )
        .run(existing.contact_id, id);
    }

    const stmt = this.db.prepare(`
      UPDATE contact_organizations SET
        job_title = ?,
        department = ?,
        role_description = ?,
        is_primary = ?,
        start_date = ?,
        end_date = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      input.job_title !== undefined ? input.job_title : existing.job_title,
      input.department !== undefined ? input.department : existing.department,
      input.role_description !== undefined
        ? input.role_description
        : existing.role_description,
      isPrimary,
      input.start_date !== undefined ? input.start_date : existing.start_date,
      input.end_date !== undefined ? input.end_date : existing.end_date,
      now,
      id
    );

    const updated = this.db
      .prepare('SELECT * FROM contact_organizations WHERE id = ?')
      .get(id) as any;
    return {
      ...updated,
      is_primary: Number(updated.is_primary),
    };
  }

  public unlink(id: string): boolean {
    const res = this.db
      .prepare('DELETE FROM contact_organizations WHERE id = ?')
      .run(id);
    return (res as any).changes > 0;
  }
}
