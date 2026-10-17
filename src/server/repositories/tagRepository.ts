import type { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import type { Tag } from '../../shared/types/index.ts';

export class TagRepository {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  public create(name: string): Tag {
    const trimmed = name.trim();
    const existing = this.findByName(trimmed);
    if (existing) {
      return existing;
    }

    const id = randomUUID();
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      INSERT INTO tags (id, name, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(id, trimmed, now, now);

    return this.findById(id)!;
  }

  public findById(id: string): Tag | null {
    const row = this.db
      .prepare(`
        SELECT
          t.*,
          (
            SELECT COUNT(*)
            FROM contact_tags ct
            WHERE ct.tag_id = t.id
          ) as contacts_count
        FROM tags t
        WHERE t.id = ?
      `)
      .get(id) as any;

    if (!row) return null;
    return {
      ...row,
      contacts_count: Number(row.contacts_count || 0),
    };
  }

  public findByName(name: string): Tag | null {
    const row = this.db
      .prepare('SELECT * FROM tags WHERE LOWER(name) = LOWER(?)')
      .get(name.trim()) as any;
    if (!row) return null;
    return this.findById(row.id);
  }

  public list(): Tag[] {
    const rows = this.db
      .prepare(`
        SELECT
          t.*,
          (
            SELECT COUNT(*)
            FROM contact_tags ct
            WHERE ct.tag_id = t.id
          ) as contacts_count
        FROM tags t
        ORDER BY t.name ASC
      `)
      .all() as any[];

    return rows.map((r) => ({
      ...r,
      contacts_count: Number(r.contacts_count || 0),
    }));
  }

  public update(id: string, name: string): Tag {
    const trimmed = name.trim();
    const now = new Date().toISOString();
    this.db
      .prepare('UPDATE tags SET name = ?, updated_at = ? WHERE id = ?')
      .run(trimmed, now, id);
    return this.findById(id)!;
  }

  public delete(id: string): boolean {
    const res = this.db.prepare('DELETE FROM tags WHERE id = ?').run(id);
    return (res as any).changes > 0;
  }

  public setContactTags(contactId: string, tagNamesOrIds: string[]): Tag[] {
    this.db.exec('SAVEPOINT set_tags_sp;');
    try {
      // Clear existing tags
      this.db.prepare('DELETE FROM contact_tags WHERE contact_id = ?').run(contactId);

      const now = new Date().toISOString();
      const insertStmt = this.db.prepare(`
        INSERT OR IGNORE INTO contact_tags (contact_id, tag_id, created_at)
        VALUES (?, ?, ?)
      `);

      for (const item of tagNamesOrIds) {
        if (!item || !item.trim()) continue;
        let tag = this.findById(item) || this.findByName(item);
        if (!tag) {
          tag = this.create(item);
        }
        insertStmt.run(contactId, tag.id, now);
      }

      this.db.exec('RELEASE set_tags_sp;');
      return this.getTagsForContact(contactId);
    } catch (err) {
      this.db.exec('ROLLBACK TO set_tags_sp;');
      throw err;
    }
  }

  public getTagsForContact(contactId: string): Tag[] {
    const rows = this.db
      .prepare(`
        SELECT t.id, t.name, t.created_at, t.updated_at
        FROM tags t
        JOIN contact_tags ct ON ct.tag_id = t.id
        WHERE ct.contact_id = ?
        ORDER BY t.name ASC
      `)
      .all(contactId) as any[];

    return rows;
  }
}
