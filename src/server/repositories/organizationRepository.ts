import type { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import type { Organization, EntityStatus } from '../../shared/types/index.ts';

export interface OrganizationFilterOptions {
  search?: string;
  status?: EntityStatus | 'all';
  sort?: 'name' | 'created_at' | 'updated_at';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface OrganizationCreateInput {
  name: string;
  organization_type?: string | null;
  industry?: string | null;
  website?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  description?: string | null;
  notes?: string;
}

export interface OrganizationUpdateInput extends Partial<OrganizationCreateInput> {
  status?: EntityStatus;
}

export class OrganizationRepository {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  public create(input: OrganizationCreateInput): Organization {
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO organizations (
        id, name, organization_type, industry, website,
        email, phone, address, description, notes,
        status, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        'active', ?, ?
      )
    `);

    stmt.run(
      id,
      input.name.trim(),
      input.organization_type || null,
      input.industry || null,
      input.website || null,
      input.email || null,
      input.phone || null,
      input.address || null,
      input.description || null,
      input.notes || '',
      now,
      now
    );

    return this.findById(id)!;
  }

  public findById(id: string): Organization | null {
    const orgRow = this.db
      .prepare('SELECT * FROM organizations WHERE id = ?')
      .get(id) as any;

    if (!orgRow) return null;

    // Fetch affiliated contacts
    const contacts = this.db
      .prepare(`
        SELECT
          co.id,
          co.contact_id,
          c.first_name,
          c.last_name,
          c.display_name,
          co.job_title,
          co.department,
          co.is_primary
        FROM contact_organizations co
        JOIN contacts c ON c.id = co.contact_id
        WHERE co.organization_id = ?
        ORDER BY co.is_primary DESC, c.last_name ASC, c.first_name ASC
      `)
      .all(id) as any[];

    return {
      ...orgRow,
      contacts_count: contacts.length,
      contacts: contacts,
    };
  }

  public findByName(name: string): Organization | null {
    if (!name || !name.trim()) return null;
    const row = this.db
      .prepare('SELECT id FROM organizations WHERE LOWER(name) = LOWER(?) AND deleted_at IS NULL')
      .get(name.trim()) as any;
    if (!row) return null;
    return this.findById(row.id);
  }

  public list(options: OrganizationFilterOptions = {}): {
    organizations: Organization[];
    total: number;
    page: number;
    limit: number;
  } {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 25));
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const params: any[] = [];

    // Filter by status
    if (options.status && options.status !== 'all') {
      conditions.push('o.status = ?');
      params.push(options.status);
    } else if (!options.status) {
      conditions.push('o.status = ?');
      params.push('active');
    }

    // Search query
    if (options.search && options.search.trim().length > 0) {
      const term = `%${options.search.trim()}%`;
      conditions.push(`(
        o.name LIKE ? OR
        o.organization_type LIKE ? OR
        o.industry LIKE ? OR
        o.description LIKE ? OR
        o.notes LIKE ? OR
        o.email LIKE ? OR
        o.phone LIKE ?
      )`);
      params.push(term, term, term, term, term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count
    const countSql = `SELECT COUNT(*) as count FROM organizations o ${whereClause}`;
    const totalRow = this.db.prepare(countSql).get(...params) as { count: number };
    const total = totalRow?.count || 0;

    // Sorting
    let orderBy = 'o.name ASC';
    const sortDir = options.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    if (options.sort === 'created_at') {
      orderBy = `o.created_at ${sortDir}`;
    } else if (options.sort === 'updated_at') {
      orderBy = `o.updated_at ${sortDir}`;
    } else if (options.sort === 'name') {
      orderBy = `o.name ${sortDir}`;
    }

    const selectSql = `
      SELECT
        o.*,
        (
          SELECT COUNT(*)
          FROM contact_organizations co
          WHERE co.organization_id = o.id
        ) as contacts_count
      FROM organizations o
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const rows = this.db.prepare(selectSql).all(...params, limit, offset) as any[];

    return {
      organizations: rows,
      total,
      page,
      limit,
    };
  }

  public update(id: string, input: OrganizationUpdateInput): Organization {
    const existing = this.findById(id);
    if (!existing) {
      throw new Error(`Organization with id ${id} not found.`);
    }

    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      UPDATE organizations SET
        name = ?,
        organization_type = ?,
        industry = ?,
        website = ?,
        email = ?,
        phone = ?,
        address = ?,
        description = ?,
        notes = ?,
        status = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      input.name !== undefined ? input.name.trim() : existing.name,
      input.organization_type !== undefined ? input.organization_type : existing.organization_type,
      input.industry !== undefined ? input.industry : existing.industry,
      input.website !== undefined ? input.website : existing.website,
      input.email !== undefined ? input.email : existing.email,
      input.phone !== undefined ? input.phone : existing.phone,
      input.address !== undefined ? input.address : existing.address,
      input.description !== undefined ? input.description : existing.description,
      input.notes !== undefined ? input.notes : existing.notes,
      input.status !== undefined ? input.status : existing.status,
      now,
      id
    );

    return this.findById(id)!;
  }

  public archive(id: string): Organization {
    const now = new Date().toISOString();
    this.db
      .prepare('UPDATE organizations SET status = ?, archived_at = ?, updated_at = ? WHERE id = ?')
      .run('archived', now, now, id);
    return this.findById(id)!;
  }

  public restore(id: string): Organization {
    const now = new Date().toISOString();
    this.db
      .prepare('UPDATE organizations SET status = ?, archived_at = NULL, updated_at = ? WHERE id = ?')
      .run('active', now, id);
    return this.findById(id)!;
  }

  public delete(id: string): boolean {
    const res = this.db.prepare('DELETE FROM organizations WHERE id = ?').run(id);
    return (res as any).changes > 0;
  }
}
