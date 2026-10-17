import type { Request, Response } from 'express';
import { getDatabase } from '../database/connection.ts';
import { OrganizationService } from '../services/organizationService.ts';

function getService(): OrganizationService {
  return new OrganizationService(getDatabase());
}

export function handleListOrganizations(req: Request, res: Response): void {
  const service = getService();
  const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 25;

  const result = service.listOrganizations({
    search: req.query.search ? String(req.query.search) : undefined,
    status: (req.query.status as any) || undefined,
    sort: (req.query.sort as any) || 'name',
    order: (req.query.order as any) || 'asc',
    page,
    limit,
  });

  res.json({
    success: true,
    data: result.organizations,
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / result.limit),
    },
  });
}

export function handleCreateOrganization(req: Request, res: Response): void {
  const service = getService();
  const organization = service.createOrganization(req.body || {});
  res.status(201).json({ success: true, data: organization });
}

export function handleGetOrganization(req: Request, res: Response): void {
  const service = getService();
  const organization = service.getOrganization(req.params.id);
  res.json({ success: true, data: organization });
}

export function handleUpdateOrganization(req: Request, res: Response): void {
  const service = getService();
  const updated = service.updateOrganization(req.params.id, req.body || {});
  res.json({ success: true, data: updated });
}

export function handleArchiveOrganization(req: Request, res: Response): void {
  const service = getService();
  const archived = service.archiveOrganization(req.params.id);
  res.json({ success: true, data: archived });
}

export function handleRestoreOrganization(req: Request, res: Response): void {
  const service = getService();
  const restored = service.restoreOrganization(req.params.id);
  res.json({ success: true, data: restored });
}

export function handleDeleteOrganization(req: Request, res: Response): void {
  const service = getService();
  const confirm = req.query.confirm === 'true';
  const deleted = service.deleteOrganization(req.params.id, confirm);
  res.json({ success: true, data: { deleted } });
}

export function handleUnlinkRelationship(req: Request, res: Response): void {
  const service = getService();
  const unlinked = service.unlinkContact(req.params.id);
  res.json({ success: true, data: { unlinked } });
}
