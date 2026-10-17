import type { DatabaseSync } from 'node:sqlite';
import { ContactRepository } from '../repositories/contactRepository.ts';
import { OrganizationRepository } from '../repositories/organizationRepository.ts';
import { InteractionRepository } from '../repositories/interactionRepository.ts';
import { TaskRepository } from '../repositories/taskRepository.ts';
import type { DashboardStats } from '../../shared/types/index.ts';

export class DashboardService {
  private db: DatabaseSync;
  private contactRepo: ContactRepository;
  private orgRepo: OrganizationRepository;
  private interactionRepo: InteractionRepository;
  private taskRepo: TaskRepository;

  constructor(db: DatabaseSync) {
    this.db = db;
    this.contactRepo = new ContactRepository(db);
    this.orgRepo = new OrganizationRepository(db);
    this.interactionRepo = new InteractionRepository(db);
    this.taskRepo = new TaskRepository(db);
  }

  public getDashboardStats(): DashboardStats {
    const todayStr = new Date().toISOString().slice(0, 10);
    const nowTimeStr = new Date().toTimeString().slice(0, 5);

    // Active Contacts Count
    const contactsCountRow = this.db
      .prepare("SELECT COUNT(*) as count FROM contacts WHERE status = 'active' AND deleted_at IS NULL")
      .get() as { count: number };
    const activeContactsCount = contactsCountRow?.count || 0;

    // Active Organizations Count
    const orgsCountRow = this.db
      .prepare("SELECT COUNT(*) as count FROM organizations WHERE status = 'active' AND deleted_at IS NULL")
      .get() as { count: number };
    const activeOrganizationsCount = orgsCountRow?.count || 0;

    // Tasks Due Today Count
    const todayCountRow = this.db
      .prepare(
        "SELECT COUNT(*) as count FROM tasks WHERE status IN ('open', 'in_progress') AND due_date = ? AND deleted_at IS NULL"
      )
      .get(todayStr) as { count: number };
    const tasksDueTodayCount = todayCountRow?.count || 0;

    // Tasks Overdue Count
    const overdueCountRow = this.db
      .prepare(`
        SELECT COUNT(*) as count
        FROM tasks
        WHERE status IN ('open', 'in_progress')
          AND (due_date < ? OR (due_date = ? AND due_time IS NOT NULL AND due_time < ?))
          AND deleted_at IS NULL
      `)
      .get(todayStr, todayStr, nowTimeStr) as { count: number };
    const tasksOverdueCount = overdueCountRow?.count || 0;

    // Tasks Upcoming Count
    const upcomingCountRow = this.db
      .prepare(
        "SELECT COUNT(*) as count FROM tasks WHERE status IN ('open', 'in_progress') AND due_date > ? AND deleted_at IS NULL"
      )
      .get(todayStr) as { count: number };
    const tasksUpcomingCount = upcomingCountRow?.count || 0;

    // Contacts without any recorded interaction
    const noInteractionsCountRow = this.db
      .prepare(`
        SELECT COUNT(*) as count
        FROM contacts
        WHERE status = 'active'
          AND deleted_at IS NULL
          AND id NOT IN (
            SELECT DISTINCT contact_id
            FROM interactions
            WHERE contact_id IS NOT NULL AND deleted_at IS NULL
          )
      `)
      .get() as { count: number };
    const contactsWithoutInteractionsCount = noInteractionsCountRow?.count || 0;

    // Recent 5 Interactions
    const recentInteractionsRes = this.interactionRepo.list({
      sort: 'occurred_at',
      order: 'desc',
      limit: 5,
    });

    // Recent 5 Contacts
    const recentContactsRes = this.contactRepo.list({
      sort: 'updated_at',
      order: 'desc',
      limit: 5,
    });

    // Today Tasks (up to 10)
    const todayTasksRes = this.taskRepo.list({
      view: 'today',
      limit: 10,
    });

    // Overdue Tasks (up to 10)
    const overdueTasksRes = this.taskRepo.list({
      view: 'overdue',
      limit: 10,
    });

    return {
      activeContactsCount,
      activeOrganizationsCount,
      tasksDueTodayCount,
      tasksOverdueCount,
      tasksUpcomingCount,
      contactsWithoutInteractionsCount,
      recentInteractions: recentInteractionsRes.interactions,
      recentContacts: recentContactsRes.contacts,
      todayTasks: todayTasksRes.tasks,
      overdueTasks: overdueTasksRes.tasks,
    };
  }
}
