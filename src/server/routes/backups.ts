import type { Request, Response } from 'express';
import { BackupService } from '../services/backupService.ts';
import { AppError } from '../middleware/errorHandler.ts';

function getService(): BackupService {
  return new BackupService();
}

export function handleListBackups(_req: Request, res: Response): void {
  const service = getService();
  const backups = service.listBackups();
  res.json({
    success: true,
    data: backups,
  });
}

export function handleCreateBackup(req: Request, res: Response): void {
  const service = getService();
  const label = req.body?.label ? String(req.body.label) : undefined;
  const backup = service.createBackup(label);
  res.status(201).json({
    success: true,
    data: backup,
  });
}

export function handleRestoreBackup(req: Request, res: Response): void {
  const service = getService();
  const filename = req.body?.filename;

  if (!filename || typeof filename !== 'string' || filename.trim().length === 0) {
    throw new AppError('Filename of backup to restore is required', 400, 'VALIDATION_ERROR', [
      { field: 'filename', message: 'Backup filename is required' },
    ]);
  }

  const result = service.restoreBackup(filename.trim());
  res.json({
    success: true,
    data: result,
  });
}
