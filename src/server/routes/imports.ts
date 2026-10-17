import type { Request, Response } from 'express';
import { getDatabase } from '../database/connection.ts';
import { ImportService } from '../services/importService.ts';
import { AppError } from '../middleware/errorHandler.ts';

function getService(): ImportService {
  return new ImportService(getDatabase());
}

export function handlePreviewImport(req: Request, res: Response): void {
  const service = getService();
  const csvText = typeof req.body === 'string' ? req.body : req.body?.csvText;

  if (!csvText || typeof csvText !== 'string' || csvText.trim().length === 0) {
    throw new AppError('No CSV content provided for preview', 400, 'VALIDATION_ERROR', [
      { field: 'csvText', message: 'CSV text is required' },
    ]);
  }

  const preview = service.previewContactsCsv(csvText);
  res.json({
    success: true,
    data: preview,
  });
}

export function handleCommitImport(req: Request, res: Response): void {
  const service = getService();
  const { csvText, columnMapping, duplicateStrategy, tagAsImported, customTag } = req.body || {};

  if (!csvText || typeof csvText !== 'string' || csvText.trim().length === 0) {
    throw new AppError('No CSV content provided to commit', 400, 'VALIDATION_ERROR', [
      { field: 'csvText', message: 'CSV text is required' },
    ]);
  }

  const result = service.commitContactsImport({
    csvText,
    columnMapping,
    duplicateStrategy,
    tagAsImported: tagAsImported !== false,
    customTag,
  });

  res.status(200).json({
    success: true,
    data: result,
  });
}
