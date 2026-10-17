import type { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import type { Task, TaskPriority, TaskStatus } from '../../shared/types/index.ts';

export type TaskView = 'today' | 'upcoming' | 'overdue' | 'open' | 'completed' | 'all';

export interface TaskFilterOptions {
  view?: TaskView;
  contactId?: string;
  organizationId?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  sort?: 'due_date' | 'priority' | 'created_at';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface TaskCreateInput {
  title: string;
  description?: string;
  due_date: string; // YYYY-MM-DD
  due_time?: string | null; // HH:MM
  priority?: TaskPriority;
  status?: TaskStatus;
  contact_id?: string | null;
  organization_id?: string | null;
  interaction_id?: string | null;
  reminder_at?: string | null;
}

export interface TaskUpdateInput extends Partial<TaskCreateInput> {}

export class TaskRepository {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  public create(input: TaskCreateInput): Task {
    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO tasks (
        id, title, description, due_date, due_time,
        priority, status, contact_id, organization_id,
        interaction_id, reminder_at, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `);

    stmt.run(
      id,
      input.title.trim(),
      input.description ? input.description.trim() : '',
      input.due_date,
      input.due_time || null,
      input.priority || 'normal',
      input.status || 'open',
      input.contact_id || null,
      input.organization_id || null,
      input.interaction_id || null,
      input.reminder_at || null,
      now,
      now
    );

    return this.findById(id)!;
  }

  public findById(id: string): Task | null {
    const row = this.db
      .prepare(`
        SELECT
          t.*,
          c.display_name as contact_name,
          o.name as organization_name
        FROM tasks t
        LEFT JOIN contacts c ON c.id = t.contact_id
        LEFT JOIN organizations o ON o.id = t.organization_id
        WHERE t.id = ? AND t.deleted_at IS NULL
      `)
      .get(id) as any;

    if (!row) return null;
    return this.mapTask(row);
  }

  public list(options: TaskFilterOptions = {}): {
    tasks: Task[];
    total: number;
    page: number;
    limit: number;
  } {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 50));
    const offset = (page - 1) * limit;

    const conditions: string[] = ['t.deleted_at IS NULL'];
    const params: any[] = [];

    // Current date in YYYY-MM-DD
    const todayStr = new Date().toISOString().slice(0, 10);
    const nowTimeStr = new Date().toTimeString().slice(0, 5);

    // View filter logic
    if (options.view === 'today') {
      conditions.push("t.status IN ('open', 'in_progress') AND t.due_date = ?");
      params.push(todayStr);
    } else if (options.view === 'upcoming') {
      conditions.push("t.status IN ('open', 'in_progress') AND t.due_date > ?");
      params.push(todayStr);
    } else if (options.view === 'overdue') {
      conditions.push(`
        t.status IN ('open', 'in_progress') AND (
          t.due_date < ? OR (
            t.due_date = ? AND t.due_time IS NOT NULL AND t.due_time < ?
          )
        )
      `);
      params.push(todayStr, todayStr, nowTimeStr);
    } else if (options.view === 'open') {
      conditions.push("t.status IN ('open', 'in_progress')");
    } else if (options.view === 'completed') {
      conditions.push("t.status = 'completed'");
    }

    // Direct status filter if provided
    if (options.status) {
      conditions.push('t.status = ?');
      params.push(options.status);
    }

    if (options.priority) {
      conditions.push('t.priority = ?');
      params.push(options.priority);
    }

    if (options.contactId) {
      conditions.push('t.contact_id = ?');
      params.push(options.contactId);
    }

    if (options.organizationId) {
      conditions.push('t.organization_id = ?');
      params.push(options.organizationId);
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;

    const countSql = `
      SELECT COUNT(*) as count
      FROM tasks t
      ${whereClause}
    `;
    const totalRow = this.db.prepare(countSql).get(...params) as { count: number };
    const total = totalRow?.count || 0;

    // Sorting
    let orderBy = 't.due_date ASC, t.due_time ASC';
    const sortDir = options.order?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    if (options.sort === 'created_at') {
      orderBy = `t.created_at ${sortDir}`;
    } else if (options.sort === 'priority') {
      orderBy = `
        CASE t.priority
          WHEN 'high' THEN 1
          WHEN 'normal' THEN 2
          WHEN 'low' THEN 3
        END ${sortDir}, t.due_date ASC
      `;
    }

    const selectSql = `
      SELECT
        t.*,
        c.display_name as contact_name,
        o.name as organization_name
      FROM tasks t
      LEFT JOIN contacts c ON c.id = t.contact_id
      LEFT JOIN organizations o ON o.id = t.organization_id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT ? OFFSET ?
    `;

    const rows = this.db.prepare(selectSql).all(...params, limit, offset) as any[];

    return {
      tasks: rows.map((r) => this.mapTask(r)),
      total,
      page,
      limit,
    };
  }

  public update(id: string, input: TaskUpdateInput): Task {
    const existing = this.findById(id);
    if (!existing) {
      throw new Error(`Task with id ${id} not found.`);
    }

    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      UPDATE tasks SET
        title = ?,
        description = ?,
        due_date = ?,
        due_time = ?,
        priority = ?,
        status = ?,
        contact_id = ?,
        organization_id = ?,
        interaction_id = ?,
        reminder_at = ?,
        updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      input.title !== undefined ? input.title.trim() : existing.title,
      input.description !== undefined ? input.description.trim() : existing.description,
      input.due_date !== undefined ? input.due_date : existing.due_date,
      input.due_time !== undefined ? input.due_time : existing.due_time,
      input.priority !== undefined ? input.priority : existing.priority,
      input.status !== undefined ? input.status : existing.status,
      input.contact_id !== undefined ? input.contact_id : existing.contact_id,
      input.organization_id !== undefined ? input.organization_id : existing.organization_id,
      input.interaction_id !== undefined ? input.interaction_id : existing.interaction_id,
      input.reminder_at !== undefined ? input.reminder_at : existing.reminder_at,
      now,
      id
    );

    return this.findById(id)!;
  }

  public complete(id: string): Task {
    const now = new Date().toISOString();
    this.db
      .prepare(`
        UPDATE tasks SET
          status = 'completed',
          completed_at = ?,
          updated_at = ?
        WHERE id = ?
      `)
      .run(now, now, id);
    return this.findById(id)!;
  }

  public reopen(id: string): Task {
    const now = new Date().toISOString();
    this.db
      .prepare(`
        UPDATE tasks SET
          status = 'open',
          completed_at = NULL,
          updated_at = ?
        WHERE id = ?
      `)
      .run(now, id);
    return this.findById(id)!;
  }

  public delete(id: string): boolean {
    const now = new Date().toISOString();
    const res = this.db
      .prepare('UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ?')
      .run(now, now, id);
    return (res as any).changes > 0;
  }

  private mapTask(row: any): Task {
    const todayStr = new Date().toISOString().slice(0, 10);
    const nowTimeStr = new Date().toTimeString().slice(0, 5);

    const isOverdue =
      (row.status === 'open' || row.status === 'in_progress') &&
      (row.due_date < todayStr ||
        (row.due_date === todayStr && row.due_time && row.due_time < nowTimeStr));

    return {
      ...row,
      is_overdue: Boolean(isOverdue),
    };
  }
}
