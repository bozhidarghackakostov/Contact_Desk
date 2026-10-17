import type { Request, Response } from 'express';
import { getDatabase } from '../database/connection.ts';
import { ContactService } from '../services/contactService.ts';

function getService(): ContactService {
  return new ContactService(getDatabase());
}

export function handleListContacts(req: Request, res: Response): void {
  const service = getService();
  const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 25;

  const result = service.listContacts({
    search: req.query.search ? String(req.query.search) : undefined,
    status: (req.query.status as any) || undefined,
    organizationId: req.query.organizationId ? String(req.query.organizationId) : undefined,
    tagId: req.query.tagId ? String(req.query.tagId) : undefined,
    isFavorite: req.query.isFavorite !== undefined ? req.query.isFavorite === '1' || req.query.isFavorite === 'true' : undefined,
    hasNoInteractions: req.query.hasNoInteractions === '1' || req.query.hasNoInteractions === 'true',
    sort: (req.query.sort as any) || 'name',
    order: (req.query.order as any) || 'asc',
    page,
    limit,
  });

  res.json({
    success: true,
    data: result.contacts,
    meta: {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: Math.ceil(result.total / result.limit),
    },
  });
}

export function handleCreateContact(req: Request, res: Response): void {
  const service = getService();
  const { organizationLink, ...contactData } = req.body || {};
  const result = service.createContact(contactData, organizationLink);

  res.status(201).json({
    success: true,
    data: result.contact,
    meta: result.duplicateWarning
      ? ({ duplicateWarning: result.duplicateWarning } as any)
      : undefined,
  });
}

export function handleGetContact(req: Request, res: Response): void {
  const service = getService();
  const contact = service.getContact(req.params.id);
  res.json({ success: true, data: contact });
}

export function handleUpdateContact(req: Request, res: Response): void {
  const service = getService();
  const updated = service.updateContact(req.params.id, req.body || {});
  res.json({ success: true, data: updated });
}

export function handleArchiveContact(req: Request, res: Response): void {
  const service = getService();
  const archived = service.archiveContact(req.params.id);
  res.json({ success: true, data: archived });
}

export function handleRestoreContact(req: Request, res: Response): void {
  const service = getService();
  const restored = service.restoreContact(req.params.id);
  res.json({ success: true, data: restored });
}

export function handleDeleteContact(req: Request, res: Response): void {
  const service = getService();
  const confirm = req.query.confirm === 'true';
  const deleted = service.deleteContact(req.params.id, confirm);
  res.json({ success: true, data: { deleted } });
}

export function handleCheckDuplicates(req: Request, res: Response): void {
  const service = getService();
  const duplicates = service.checkDuplicates(
    req.query.firstName ? String(req.query.firstName) : undefined,
    req.query.lastName ? String(req.query.lastName) : undefined,
    req.query.email ? String(req.query.email) : undefined,
    req.query.excludeId ? String(req.query.excludeId) : undefined
  );
  res.json({ success: true, data: duplicates });
}

export function handleLinkOrganization(req: Request, res: Response): void {
  const service = getService();
  const link = service.linkOrganization({
    contact_id: req.params.id,
    organization_id: req.body.organization_id,
    job_title: req.body.job_title,
    department: req.body.department,
    role_description: req.body.role_description,
    is_primary: req.body.is_primary,
    start_date: req.body.start_date,
    end_date: req.body.end_date,
  });
  res.status(201).json({ success: true, data: link });
}
