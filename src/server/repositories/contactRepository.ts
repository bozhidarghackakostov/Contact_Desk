import type { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import type { Contact, EntityStatus } from '../../shared/types/index.ts';

export interface ContactFilterOptions {
  search?: string;
  status?: EntityStatus | 'all';
  organizationId?: string;
  tagId?: string;
  isFavorite?: boolean;
  hasNoInteractions?: boolean;
  sort?: 'name' | 'created_at' | 'updated_at' | 'last_interaction';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface ContactCreateInput {
  first_name?: string;
  last_name?: string;
  display_name?: string;
  nickname?: string | null;
  job_title?: string | null;
  primary_email?: string | null;
  primary_phone?: string | null;
  website?: string | null;
  address?: string | null;
  birthday?: string | null;
  notes?: string;
  is_favorite?: number;
}

export interface ContactUpdateInput extends Partial<ContactCreateInput> {
  status?: EntityStatus;
}

export class ContactRepository {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  public computeDisplayName(
    firstName?: string,
    lastName?: string,
    providedDisplayName?: string,
    nickname?: string | null,
    email?: string | null
  ): string {
    if (providedDisplayName && providedDisplayName.trim().length > 0) {
      return providedDisplayName.trim();
    }
    const full = `${firstName || ''} ${lastName || ''}`.trim();
    if (full.length > 0) return full;
    if (nickname && nickname.trim().length > 0) return nickname.trim();
    if (email && email.trim().length > 0) return email.trim();
    return 'Unnamed Contact';
  }

  public create(input: ContactCreateInput): Contact {
    const id = randomUUID();
    const now = new Date().toISOString();
    const displayName = this.computeDisplayName(
      input.first_name,
      input.last_name,
      input.display_name,
      input.nickname,
      input.primary_email
    );

    const stmt = this.db.prepare(`
      INSERT INTO contacts (
        id, first_name, last_name, display_name, nickname,
        job_title, primary_email, primary_phone, website, address,
        birthday, notes, is_favorite, status, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, 'active', ?, ?
      )
    `);

    stmt.run(
      id,
      input.first_name || '',
      input.last_name || '',
      displayName,
      input.nickname || null,
      input.job_title || null,
      input.primary_email || null,
      input.primary_phone || null,
      input.website || null,
      input.address || null,
      input.birthday || null,
      input.notes || '',
      input.is_favorite ? 1 : 0,
      now,
      now
    );

    return this.findById(id)!;
  }

  public findById(id: string): Contact | null {
    const contactRow = this.db
      .prepare('SELECT * FROM contacts WHERE id = ?')
      .get(id) as any;

    if (!contactRow) return null;

    // Fetch affiliated organizations
    const orgs = this.db
      .prepare(`
        SELECT
          co.id,
          co.organization_id,
          o.name as organization_name,
          co.job_title,
          co.department,
          co.is_primary,
          co.start_date,
          co.end_date
        FROM contact_organizations co
        JOIN organizations o ON o.id = co.organization_id
        WHERE co.contact_id = ?
        ORDER BY co.is_primary DESC, o.name ASC
      `)
      .all(id) as any[];

    // Fetch tags
    const tags = this.db
      .prepare(`
        SELECT t.id, t.name, t.created_at, t.updated_at
        FROM tags t
        JOIN contact_tags ct ON ct.tag_id = t.id
        WHERE ct.contact_id = ?
        ORDER BY t.name ASC
      `)
      .all(id) as any[];

    // Fetch latest interaction date
    const lastInteraction = this.db
      .prepare(`
        SELECT MAX(occurred_at) as last_interaction_at
        FROM interactions
        WHERE contact_id = ? AND deleted_at IS NULL
      `)
      .get(id) as any;

    // Fetch next upcoming open task
    const nextTask = this.db
      .prepare(`
        SELECT MIN(due_date) as next_task_at
        FROM tasks
        WHERE contact_id = ? AND status IN ('open', 'in_progress')
      `)
      .get(id) as any;

    return {
      ...contactRow,
      is_favorite: Number(contactRow.is_favorite),
      organizations: orgs,
      tags: tags,
      last_interaction_at: lastInteraction?.last_interaction_at || null,
      next_task_at: nextTask?.next_task_at || null,
    };
  }

  public list(options: ContactFilterOptions = {}): {
    contacts: Contact[];
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
      conditions.push('c.status = ?');
      params.push(options.status);
    } else if (!options.status) {
      // Default to active
      conditions.push('c.status = ?');
      params.push('active');
    }

    // Favorite filter
    if (options.isFavorite !== undefined) {
      conditions.push('c.is_favorite = ?');
      params.push(options.isFavorite ? 1 : 0);
    }

    // Filter by organization
    if (options.organizationId) {
      conditions.push(`
        c.id IN (
          SELECT contact_id FROM contact_organizations WHERE organization_id = ?
        )
      `);
      params.push(options.organizationId);
    }

    // Filter by tag
    if (options.tagId) {
      conditions.push(`
        c.id IN (
          SELECT contact_id FROM contact_tags WHERE tag_id = ?
        )
      `);
      params.push(options.tagId);
    }

    // Filter by contacts with no interactions
    if (options.hasNoInteractions) {
      conditions.push(`
        c.id NOT IN (
          SELECT DISTINCT contact_id FROM interactions WHERE contact_id IS NOT NULL AND deleted_at IS NULL
        )
      `);
    }

    // Search query
    if (options.search && options.search.trim().length > 0) {
      const term = `%${options.search.trim()}%`;
      conditions.push(`(
        c.first_name LIKE ? OR
        c.last_name LIKE ? OR
        c.display_name LIKE ? OR
        c.nickname LIKE ? OR
        c.job_title LIKE ? OR
        c.primary_email LIKE ? OR
        c.primary_phone LIKE ? OR
        c.notes LIKE ? OR
        c.id IN (
          SELECT co.contact_id
          FROM contact_organizations co
          JOIN organizations o ON o.id = co.organization_id
          WHERE o.name LIKE ?
        ) OR
        c.id IN (
          SELECT ct.contact_id
          FROM contact_tags ct
          JOIN tags t ON t.id = ct.tag_id
          WHERE t.name LIKE ?
        ) OR
        c.id IN (
          SELECT cm.contact_id
          FROM contact_methods cm
          WHERE cm.value LIKE ?
        )
      )`);
      params.push(term, term, term, term, term, term, term, term, term, term, term);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Total count query
    const countSql = `SELECT COUNT(*) as count FROM contacts c ${whereClause}`;
    const totalRow = this.db.prepare(countSql).get(...params) as { count: number };
    const total = totalRow?.count || 0;

    // Sorting
    let orderBy = 'c.last_name ASC, c.first_name ASC';
    const sortDir = options.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    if (options.sort === 'created_at') {
      orderBy = `c.created_at ${sortDir}`;
    } else if (options.sort === 'updated_at') {
      orderBy = `c.updated_at ${sortDir}`;
    } else if (options.sort === 'name') {
      orderBy = `c.display_name ${sortDir}`;
    } else if (options.sort === 'last_interaction') {
      orderBy = `last_interaction_at ${sortDir} NULLS LAST`;
    }

    const selectSql = `
      SELECT
        c.*,
        (
          SELECT MAX(i.occurred_at)
          FROM interactions i
          WHERE i.contact_id = c.id AND i.deleted_at IS NULL
        ) as last_interaction_at,
        (
          SELECT MIN(t.due_date)
          FROM tasks t
          WHERE t.contact_id = c.id AND t.status IN ('open', 'in_progress')
        ) as next_task_at
      FROM contacts c
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const rows = this.db.prepare(selectSql).all(...params, limit, offset) as any[];

    // Populate organizations and tags for list items
    const contacts: Contact[] = rows.map((row) => {
      const orgs = this.db
        .prepare(`
          SELECT
            co.id,
            co.organization_id,
            o.name as organization_name,
            co.job_title,
            co.department,
            co.is_primary
          FROM contact_organizations co
          JOIN organizations o ON o.id = co.organization_id
          WHERE co.contact_id = ?
          ORDER BY co.is_primary DESC
        `)
        .all(row.id) as any[];

      const tags = this.db
        .prepare(`
          SELECT t.id, t.name
          FROM tags t
          JOIN contact_tags ct ON ct.tag_id = t.id
          WHERE ct.contact_id = ?
        `)
        .all(row.id) as any[];

      return {
        ...row,
        is_favorite: Number(row.is_favorite),
        organizations: orgs,
        tags: tags,
      };
    });

    return { contacts, total, page, limit };
  }

  public update(id: string, input: ContactUpdateInput): Contact {
    const existing = this.findById(id);
    if (!existing) {
      throw new Error(`Contact with id ${id} not found.`);
    }

    const now = new Date().toISOString();
    const firstName = input.first_name !== undefined ? input.first_name : existing.first_name;
    const lastName = input.last_name !== undefined ? input.last_name : existing.last_name;
    const nickname = input.nickname !== undefined ? input.nickname : existing.nickname;
    const email = input.primary_email !== undefined ? input.primary_email : existing.primary_email;

    const displayName =
      input.display_name !== undefined && input.display_name.trim().length > 0
        ? input.display_name.trim()
        : this.computeDisplayName(firstName, lastName, undefined, nickname, email);

    const stmt = this.db.prepare(`
      UPDATE contacts SET
        first_name = ?,
        last_name = ?,
        display_name = ?,
        nickname = ?,
        job_title = ?,
        primary_email = ?,
        primary_phone = ?,
        website = ?,
        address = ?,
        birthday = ?,
        notes = ?,
        is_favorite = ?,
        status = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      firstName,
      lastName,
      displayName,
      nickname,
      input.job_title !== undefined ? input.job_title : existing.job_title,
      email,
      input.primary_phone !== undefined ? input.primary_phone : existing.primary_phone,
      input.website !== undefined ? input.website : existing.website,
      input.address !== undefined ? input.address : existing.address,
      input.birthday !== undefined ? input.birthday : existing.birthday,
      input.notes !== undefined ? input.notes : existing.notes,
      input.is_favorite !== undefined ? (input.is_favorite ? 1 : 0) : existing.is_favorite,
      input.status !== undefined ? input.status : existing.status,
      now,
      id
    );

    return this.findById(id)!;
  }

  public archive(id: string): Contact {
    const now = new Date().toISOString();
    this.db
      .prepare('UPDATE contacts SET status = ?, archived_at = ?, updated_at = ? WHERE id = ?')
      .run('archived', now, now, id);
    return this.findById(id)!;
  }

  public restore(id: string): Contact {
    const now = new Date().toISOString();
    this.db
      .prepare('UPDATE contacts SET status = ?, archived_at = NULL, updated_at = ? WHERE id = ?')
      .run('active', now, id);
    return this.findById(id)!;
  }

  public delete(id: string): boolean {
    const res = this.db.prepare('DELETE FROM contacts WHERE id = ?').run(id);
    return (res as any).changes > 0;
  }

  public findPotentialDuplicates(
    firstName?: string,
    lastName?: string,
    email?: string | null,
    excludeId?: string
  ): Contact[] {
    const conditions: string[] = [];
    const params: any[] = [];

    if (excludeId) {
      conditions.push('id != ?');
      params.push(excludeId);
    }

    const subConditions: string[] = [];

    // Exact name match
    if (firstName && lastName && firstName.trim() && lastName.trim()) {
      subConditions.push('(LOWER(first_name) = ? AND LOWER(last_name) = ?)');
      params.push(firstName.trim().toLowerCase(), lastName.trim().toLowerCase());
    }

    // Exact email match
    if (email && email.trim()) {
      subConditions.push('LOWER(primary_email) = ?');
      params.push(email.trim().toLowerCase());
    }

    if (subConditions.length === 0) return [];

    conditions.push(`(${subConditions.join(' OR ')})`);
    const sql = `SELECT * FROM contacts WHERE ${conditions.join(' AND ')} LIMIT 5`;
    const rows = this.db.prepare(sql).all(...params) as any[];

    return rows.map((r) => ({
      ...r,
      is_favorite: Number(r.is_favorite),
    }));
  }
}
