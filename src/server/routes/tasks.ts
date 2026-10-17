import type { Request, Response } from 'express';
import { getDatabase } from '../database/connection.ts';
import { TaskService } from '../services/taskService.ts';

function getService(): TaskService {
  return new TaskService(getDatabase());
}

export function handleListTasks(req: Request, res: Response): void {
  const service = getService();
  const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;

  const result = service.listTasks({
    view: (req.query.view as any) || undefined,
    contactId: req.query.contactId ? String(req.query.contactId) : undefined,
    organizationId: req.query.organizationId ? String(req.query.organizationId) : undefined,
    priority: (req.query.priority as any) || undefined,
    status: (req.query.status as any) || undefined,
    sort: (req.query.sort as any) || 'due_date',
    order: (req.query.order as any) || 'asc',
    page,
    limit,
  });

  res.json({
    success: true,
    data: result.tasks,
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / result.limit),
    },
  });
}

export function handleCreateTask(req: Request, res: Response): void {
  const service = getService();
  const task = service.createTask(req.body || {});
  res.status(201).json({ success: true, data: task });
}

export function handleGetTask(req: Request, res: Response): void {
  const service = getService();
  const task = service.getTask(req.params.id);
  res.json({ success: true, data: task });
}

export function handleUpdateTask(req: Request, res: Response): void {
  const service = getService();
  const updated = service.updateTask(req.params.id, req.body || {});
  res.json({ success: true, data: updated });
}

export function handleCompleteTask(req: Request, res: Response): void {
  const service = getService();
  const completed = service.completeTask(req.params.id);
  res.json({ success: true, data: completed });
}

export function handleReopenTask(req: Request, res: Response): void {
  const service = getService();
  const reopened = service.reopenTask(req.params.id);
  res.json({ success: true, data: reopened });
}

export function handleDeleteTask(req: Request, res: Response): void {
  const service = getService();
  const deleted = service.deleteTask(req.params.id);
  res.json({ success: true, data: { deleted } });
}
