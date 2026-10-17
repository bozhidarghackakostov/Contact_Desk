import type { DatabaseSync } from 'node:sqlite';
import type { GlobalSearchResult, SearchResultItem } from '../../shared/types/index.ts';

export interface SearchOptions {
  includeArchived?: boolean;
  limit?: number;
}

export class SearchService {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  private extractSnippet(text: string | null | undefined, query: string, maxLength: number = 80): string | undefined {
    if (!text || !query) return undefined;
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();
    const idx = lowerText.indexOf(lowerQuery);
    if (idx === -1) return undefined;

    const start = Math.max(0, idx - 20);
    const end = Math.min(text.length, idx + query.length + (maxLength - 20));
    let snippet = text.slice(start, end).replace(/\s+/g, ' ').trim();
    if (start > 0) snippet = '...' + snippet;
    if (end < text.length) snippet = snippet + '...';
    return snippet;
  }

  public globalSearch(query: string, options: SearchOptions = {}): GlobalSearchResult {
    const trimmed = (query || '').trim();
    if (!trimmed) {
      return {
        contacts: [],
        organizations: [],
        interactions: [],
        tasks: [],
        total: 0,
      };
    }

    const term = `%${trimmed}%`;
    const includeArchived = options.includeArchived ? 1 : 0;
    const limit = Math.max(1, Math.min(50, options.limit || 15));

    // 1. Search Contacts
    const contactRows = this.db
      .prepare(`
        SELECT
          c.id,
          c.display_name,
          c.first_name,
          c.last_name,
          c.job_title,
          c.primary_email,
          c.primary_phone,
          c.notes,
          c.status,
          c.archived_at
        FROM contacts c
        WHERE (
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
        )
        AND (c.deleted_at IS NULL)
        AND (? = 1 OR c.status != 'archived')
        ORDER BY c.updated_at DESC
        LIMIT ?
      `)
      .all(
        term, term, term, term, term, term, term, term, term, term, term,
        includeArchived,
        limit
      ) as any[];

    const contacts: SearchResultItem[] = contactRows.map((c) => ({
      id: c.id,
      type: 'contact',
      title: c.display_name || `${c.first_name} ${c.last_name}`.trim(),
      subtitle: [c.job_title, c.primary_email, c.primary_phone].filter(Boolean).join(' • ') || undefined,
      matchSnippet: this.extractSnippet(c.notes, trimmed),
      status: c.status,
      archived: c.status === 'archived',
      url: `/contacts/${c.id}`,
    }));

    // 2. Search Organizations
    const orgRows = this.db
      .prepare(`
        SELECT
          o.id,
          o.name,
          o.industry,
          o.organization_type,
          o.description,
          o.notes,
          o.website,
          o.email,
          o.status,
          o.archived_at
        FROM organizations o
        WHERE (
          o.name LIKE ? OR
          o.industry LIKE ? OR
          o.description LIKE ? OR
          o.notes LIKE ? OR
          o.website LIKE ? OR
          o.email LIKE ?
        )
        AND (o.deleted_at IS NULL)
        AND (? = 1 OR o.status != 'archived')
        ORDER BY o.updated_at DESC
        LIMIT ?
      `)
      .all(term, term, term, term, term, term, includeArchived, limit) as any[];

    const organizations: SearchResultItem[] = orgRows.map((o) => ({
      id: o.id,
      type: 'organization',
      title: o.name,
      subtitle: [o.industry, o.organization_type].filter(Boolean).join(' • ') || undefined,
      matchSnippet: this.extractSnippet(o.description || o.notes, trimmed),
      status: o.status,
      archived: o.status === 'archived',
      url: `/organizations/${o.id}`,
    }));

    // 3. Search Interactions
    const interactionRows = this.db
      .prepare(`
        SELECT
          i.id,
          i.interaction_type,
          i.title,
          i.summary,
          i.details,
          i.occurred_at,
          i.contact_id,
          i.organization_id,
          c.display_name as contact_name,
          o.name as organization_name
        FROM interactions i
        LEFT JOIN contacts c ON c.id = i.contact_id
        LEFT JOIN organizations o ON o.id = i.organization_id
        WHERE (
          i.title LIKE ? OR
          i.summary LIKE ? OR
          i.details LIKE ?
        )
        AND (i.deleted_at IS NULL)
        AND (? = 1 OR (
          (c.status IS NULL OR c.status != 'archived') AND
          (o.status IS NULL OR o.status != 'archived')
        ))
        ORDER BY i.occurred_at DESC
        LIMIT ?
      `)
      .all(term, term, term, includeArchived, limit) as any[];

    const interactions: SearchResultItem[] = interactionRows.map((i) => {
      const parts = [i.interaction_type];
      if (i.occurred_at) parts.push(i.occurred_at.slice(0, 10));
      if (i.contact_name) parts.push(`with ${i.contact_name}`);
      else if (i.organization_name) parts.push(`with ${i.organization_name}`);

      return {
        id: i.id,
        type: 'interaction',
        title: i.title,
        subtitle: parts.join(' • '),
        matchSnippet: this.extractSnippet(i.details || i.summary, trimmed),
        url: i.contact_id ? `/contacts/${i.contact_id}` : (i.organization_id ? `/organizations/${i.organization_id}` : '/interactions'),
      };
    });

    // 4. Search Tasks
    const taskRows = this.db
      .prepare(`
        SELECT
          t.id,
          t.title,
          t.description,
          t.due_date,
          t.priority,
          t.status,
          t.contact_id,
          c.display_name as contact_name,
          o.name as organization_name
        FROM tasks t
        LEFT JOIN contacts c ON c.id = t.contact_id
        LEFT JOIN organizations o ON o.id = t.organization_id
        WHERE (
          t.title LIKE ? OR
          t.description LIKE ?
        )
        AND (t.deleted_at IS NULL)
        ORDER BY t.due_date ASC
        LIMIT ?
      `)
      .all(term, term, limit) as any[];

    const tasks: SearchResultItem[] = taskRows.map((t) => {
      const parts = [`Due: ${t.due_date}`, `Status: ${t.status}`];
      if (t.contact_name) parts.push(`For: ${t.contact_name}`);
      return {
        id: t.id,
        type: 'task',
        title: t.title,
        subtitle: parts.join(' • '),
        matchSnippet: this.extractSnippet(t.description, trimmed),
        status: t.status,
        url: '/follow-ups',
      };
    });

    const total = contacts.length + organizations.length + interactions.length + tasks.length;

    return {
      contacts,
      organizations,
      interactions,
      tasks,
      total,
    };
  }
}
