import type { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import type { Interaction, InteractionType } from '../../shared/types/index.ts';

export interface InteractionFilterOptions {
  contactId?: string;
  organizationId?: string;
  type?: InteractionType | 'all';
  startDate?: string;
  endDate?: string;
  search?: string;
  sort?: 'occurred_at' | 'created_at';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface InteractionCreateInput {
  interaction_type: InteractionType;
  title: string;
  summary?: string | null;
  details?: string;
  location?: string | null;
  occurred_at?: string;
  contact_id?: string | null;
  organization_id?: string | null;
}

export interface InteractionUpdateInput extends Partial<InteractionCreateInput> {}

export class InteractionRepository {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  public create(input: InteractionCreateInput): Interaction {
    const id = randomUUID();
    const now = new Date().toISOString();
    const occurredAt = input.occurred_at || now;

    const stmt = this.db.prepare(`
      INSERT INTO interactions (
        id, interaction_type, title, summary, details,
        location, occurred_at, contact_id, organization_id,
        created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?
      )
    `);

    stmt.run(
      id,
      input.interaction_type,
      input.title.trim(),
      input.summary ? input.summary.trim() : null,
      input.details ? input.details.trim() : '',
      input.location ? input.location.trim() : null,
      occurredAt,
      input.contact_id || null,
      input.organization_id || null,
      now,
      now
    );

    return this.findById(id)!;
  }

  public findById(id: string): Interaction | null {
    const row = this.db
      .prepare(`
        SELECT
          i.*,
          c.display_name as contact_name,
          o.name as organization_name
        FROM interactions i
        LEFT JOIN contacts c ON c.id = i.contact_id
        LEFT JOIN organizations o ON o.id = i.organization_id
        WHERE i.id = ? AND i.deleted_at IS NULL
      `)
      .get(id) as any;

    if (!row) return null;
    return row;
  }

  public list(options: InteractionFilterOptions = {}): {
    interactions: Interaction[];
    total: number;
    page: number;
    limit: number;
  } {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 25));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['i.deleted_at IS NULL'];
    const params: any[] = [];

    if (options.contactId) {
      conditions.push('i.contact_id = ?');
      params.push(options.contactId);
    }

    if (options.organizationId) {
      conditions.push('i.organization_id = ?');
      params.push(options.organizationId);
    }

    if (options.type && options.type !== 'all') {
      conditions.push('i.interaction_type = ?');
      params.push(options.type);
    }

    if (options.startDate) {
      conditions.push('i.occurred_at >= ?');
      params.push(options.startDate);
    }

    if (options.endDate) {
      conditions.push('i.occurred_at <= ?');
      params.push(options.endDate);
    }

    if (options.search && options.search.trim().length > 0) {
      const term = `%${options.search.trim()}%`;
      conditions.push(`(
        i.title LIKE ? OR
        i.summary LIKE ? OR
        i.details LIKE ? OR
        i.location LIKE ? OR
        c.display_name LIKE ? OR
        o.name LIKE ?
      )`);
      params.push(term, term, term, term, term, term);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countSql = `
      SELECT COUNT(*) as count
      FROM interactions i
      LEFT JOIN contacts c ON c.id = i.contact_id
      LEFT JOIN organizations o ON o.id = i.organization_id
      ${whereClause}
    `;
    const totalRow = this.db.prepare(countSql).get(...params) as { count: number };
    const total = totalRow?.count || 0;

    // Default reverse chronological order by occurred_at
    const sortField = options.sort === 'created_at' ? 'i.created_at' : 'i.occurred_at';
    const sortDir = options.order?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const selectSql = `
      SELECT
        i.*,
        c.display_name as contact_name,
        o.name as organization_name
      FROM interactions i
      LEFT JOIN contacts c ON c.id = i.contact_id
      LEFT JOIN organizations o ON o.id = i.organization_id
      ${whereClause}
      ORDER BY ${sortField} ${sortDir}
      LIMIT ? OFFSET ?
    `;

    const rows = this.db.prepare(selectSql).all(...params, limit, offset) as any[];

    return {
      interactions: rows,
      total,
      page,
      limit,
    };
  }

  public update(id: string, input: InteractionUpdateInput): Interaction {
    const existing = this.findById(id);
    if (!existing) {
      throw new Error(`Interaction with id ${id} not found.`);
    }

    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      UPDATE interactions SET
        interaction_type = ?,
        title = ?,
        summary = ?,
        details = ?,
        location = ?,
        occurred_at = ?,
        contact_id = ?,
        organization_id = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      input.interaction_type !== undefined ? input.interaction_type : existing.interaction_type,
      input.title !== undefined ? input.title.trim() : existing.title,
      input.summary !== undefined ? (input.summary ? input.summary.trim() : null) : existing.summary,
      input.details !== undefined ? input.details.trim() : existing.details,
      input.location !== undefined ? (input.location ? input.location.trim() : null) : existing.location,
      input.occurred_at !== undefined ? input.occurred_at : existing.occurred_at,
      input.contact_id !== undefined ? input.contact_id : existing.contact_id,
      input.organization_id !== undefined ? input.organization_id : existing.organization_id,
      now,
      id
    );

    return this.findById(id)!;
  }

  public delete(id: string): boolean {
    const now = new Date().toISOString();
    // Soft delete to protect history
    const res = this.db
      .prepare('UPDATE interactions SET deleted_at = ?, updated_at = ? WHERE id = ?')
      .run(now, now, id);
    return (res as any).changes > 0;
  }
}
