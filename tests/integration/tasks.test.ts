import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { DatabaseSync } from 'node:sqlite';
import { runMigrations } from '../../src/server/database/migrator.ts';
import { ContactService } from '../../src/server/services/contactService.ts';
import { OrganizationService } from '../../src/server/services/organizationService.ts';
import { InteractionService } from '../../src/server/services/interactionService.ts';
import { TaskService } from '../../src/server/services/taskService.ts';
import { DashboardService } from '../../src/server/services/dashboardService.ts';

describe('Follow-up Lifecycle & Dashboard Metrics (Scenario D)', () => {
  let db: DatabaseSync;
  let contactService: ContactService;
  let orgService: OrganizationService;
  let interactionService: InteractionService;
  let taskService: TaskService;
  let dashboardService: DashboardService;

  beforeEach(() => {
    db = new DatabaseSync(':memory:');
    db.exec('PRAGMA foreign_keys = ON;');
    runMigrations(db);
    contactService = new ContactService(db);
    orgService = new OrganizationService(db);
    interactionService = new InteractionService(db);
    taskService = new TaskService(db);
    dashboardService = new DashboardService(db);
  });

  it('Scenario D: follows full task lifecycle from creation to completion, history, and reopening', () => {
    // 1. Create a contact
    const { contact } = contactService.createContact({
      first_name: 'Arthur',
      last_name: 'Dent',
      primary_email: 'arthur@earth.galaxy',
    });

    const todayStr = new Date().toISOString().slice(0, 10);

    // 2. Create a follow-up linked to contact with due date
    const task = taskService.createTask({
      title: 'Send Towel and Hitchhiker Guide',
      description: 'Ensure he has travel essentials ready',
      due_date: todayStr,
      priority: 'high',
      contact_id: contact.id,
    });

    assert.ok(task.id);
    assert.strictEqual(task.status, 'open');
    assert.strictEqual(task.contact_name, 'Arthur Dent');

    // 3. Verify it appears in "open" and "today" views
    const openTasks = taskService.listTasks({ view: 'open' });
    assert.strictEqual(openTasks.total, 1);
    assert.strictEqual(openTasks.tasks[0].id, task.id);

    const todayTasks = taskService.listTasks({ view: 'today' });
    assert.strictEqual(todayTasks.total, 1);
    assert.strictEqual(todayTasks.tasks[0].id, task.id);

    // 4. Complete the task
    const completed = taskService.completeTask(task.id);
    assert.strictEqual(completed.status, 'completed');
    assert.ok(completed.completed_at);

    // 5. Verify it no longer appears in open tasks
    const openAfter = taskService.listTasks({ view: 'open' });
    assert.strictEqual(openAfter.total, 0);

    // 6. Verify it remains available in completed history
    const completedList = taskService.listTasks({ view: 'completed' });
    assert.strictEqual(completedList.total, 1);
    assert.strictEqual(completedList.tasks[0].id, task.id);
    assert.strictEqual(completedList.tasks[0].status, 'completed');

    // 7. Reopen the task and verify the transition works
    const reopened = taskService.reopenTask(task.id);
    assert.strictEqual(reopened.status, 'open');
    assert.strictEqual(reopened.completed_at, null);

    const openAfterReopen = taskService.listTasks({ view: 'open' });
    assert.strictEqual(openAfterReopen.total, 1);
    assert.strictEqual(openAfterReopen.tasks[0].id, task.id);
  });

  it('accurately calculates overdue tasks and upcoming tasks', () => {
    // Past due date
    const overdueTask = taskService.createTask({
      title: 'Overdue task from yesterday',
      due_date: '2020-01-01',
      priority: 'normal',
    });

    // Future due date
    const upcomingTask = taskService.createTask({
      title: 'Future planning session',
      due_date: '2030-12-31',
      priority: 'low',
    });

    // Check overdue view
    const overdueList = taskService.listTasks({ view: 'overdue' });
    assert.strictEqual(overdueList.total, 1);
    assert.strictEqual(overdueList.tasks[0].id, overdueTask.id);
    assert.strictEqual(overdueList.tasks[0].is_overdue, true);

    // Check upcoming view
    const upcomingList = taskService.listTasks({ view: 'upcoming' });
    assert.strictEqual(upcomingList.total, 1);
    assert.strictEqual(upcomingList.tasks[0].id, upcomingTask.id);
    assert.strictEqual(upcomingList.tasks[0].is_overdue, false);
  });

  it('calculates dashboard metrics strictly from persisted records', () => {
    // Seed database
    const org = orgService.createOrganization({ name: 'Cyberdyne Systems' });
    const { contact: c1 } = contactService.createContact({ first_name: 'John', last_name: 'Connor' });
    const { contact: c2 } = contactService.createContact({ first_name: 'Kyle', last_name: 'Reese' });

    // Interaction only for c1
    interactionService.createInteraction({
      contact_id: c1.id,
      organization_id: org.id,
      interaction_type: 'meeting',
      title: 'Tactical Briefing',
      occurred_at: '2026-10-17T12:00:00Z',
    });

    const todayStr = new Date().toISOString().slice(0, 10);

    // Overdue task
    taskService.createTask({
      title: 'Old Follow-up',
      due_date: '2020-01-01',
      status: 'open',
    });

    // Today task
    taskService.createTask({
      title: 'Immediate Follow-up',
      due_date: todayStr,
      status: 'open',
    });

    // Future task
    taskService.createTask({
      title: 'Future Milestone',
      due_date: '2030-01-01',
      status: 'open',
    });

    const stats = dashboardService.getDashboardStats();

    assert.strictEqual(stats.activeContactsCount, 2);
    assert.strictEqual(stats.activeOrganizationsCount, 1);
    assert.strictEqual(stats.tasksDueTodayCount, 1);
    assert.strictEqual(stats.tasksOverdueCount, 1);
    assert.strictEqual(stats.tasksUpcomingCount, 1);
    // c2 has no interactions, while c1 has 1
    assert.strictEqual(stats.contactsWithoutInteractionsCount, 1);
    assert.strictEqual(stats.recentInteractions.length, 1);
    assert.strictEqual(stats.todayTasks.length, 1);
    assert.strictEqual(stats.overdueTasks.length, 1);
  });
});
