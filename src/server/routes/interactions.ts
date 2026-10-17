import type { Request, Response } from 'express';
import { getDatabase } from '../database/connection.ts';
import { InteractionService } from '../services/interactionService.ts';

function getService(): InteractionService {
  return new InteractionService(getDatabase());
}

export function handleListInteractions(req: Request, res: Response): void {
  const service = getService();
  const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 25;

  const result = service.listInteractions({
    contactId: req.query.contactId ? String(req.query.contactId) : undefined,
    organizationId: req.query.organizationId ? String(req.query.organizationId) : undefined,
    type: (req.query.type as any) || undefined,
    startDate: req.query.startDate ? String(req.query.startDate) : undefined,
    endDate: req.query.endDate ? String(req.query.endDate) : undefined,
    search: req.query.search ? String(req.query.search) : undefined,
    sort: (req.query.sort as any) || 'occurred_at',
    order: (req.query.order as any) || 'desc',
    page,
    limit,
  });

  res.json({
    success: true,
    data: result.interactions,
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / result.limit),
    },
  });
}

export function handleCreateInteraction(req: Request, res: Response): void {
  const service = getService();
  const interaction = service.createInteraction(req.body || {});
  res.status(201).json({ success: true, data: interaction });
}

export function handleGetInteraction(req: Request, res: Response): void {
  const service = getService();
  const interaction = service.getInteraction(req.params.id);
  res.json({ success: true, data: interaction });
}

export function handleUpdateInteraction(req: Request, res: Response): void {
  const service = getService();
  const updated = service.updateInteraction(req.params.id, req.body || {});
  res.json({ success: true, data: updated });
}

export function handleDeleteInteraction(req: Request, res: Response): void {
  const service = getService();
  const deleted = service.deleteInteraction(req.params.id);
  res.json({ success: true, data: { deleted } });
}
