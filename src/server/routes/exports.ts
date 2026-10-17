import type { Request, Response } from 'express';
import { getDatabase } from '../database/connection.ts';
import { ExportService } from '../services/exportService.ts';

function getService(): ExportService {
  return new ExportService(getDatabase());
}

export function handleExportContactsCsv(req: Request, res: Response): void {
  const service = getService();
  const includeArchived = req.query.includeArchived === 'true' || req.query.includeArchived === '1';
  const csv = service.exportContactsCsv(includeArchived);
  const dateStr = new Date().toISOString().slice(0, 10);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="contactdesk_contacts_${dateStr}.csv"`);
  res.status(200).send(csv);
}

export function handleExportOrganizationsCsv(req: Request, res: Response): void {
  const service = getService();
  const includeArchived = req.query.includeArchived === 'true' || req.query.includeArchived === '1';
  const csv = service.exportOrganizationsCsv(includeArchived);
  const dateStr = new Date().toISOString().slice(0, 10);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="contactdesk_organizations_${dateStr}.csv"`);
  res.status(200).send(csv);
}

export function handleExportInteractionsCsv(_req: Request, res: Response): void {
  const service = getService();
  const csv = service.exportInteractionsCsv();
  const dateStr = new Date().toISOString().slice(0, 10);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="contactdesk_interactions_${dateStr}.csv"`);
  res.status(200).send(csv);
}

export function handleExportTasksCsv(_req: Request, res: Response): void {
  const service = getService();
  const csv = service.exportTasksCsv();
  const dateStr = new Date().toISOString().slice(0, 10);

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="contactdesk_tasks_${dateStr}.csv"`);
  res.status(200).send(csv);
}

export function handleExportJsonDump(_req: Request, res: Response): void {
  const service = getService();
  const dump = service.exportJsonDump();
  const dateStr = new Date().toISOString().slice(0, 10);

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="contactdesk_full_backup_${dateStr}.json"`);
  res.status(200).json(dump);
}
