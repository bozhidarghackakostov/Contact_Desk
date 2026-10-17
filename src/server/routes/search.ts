import type { Request, Response } from 'express';
import { getDatabase } from '../database/connection.ts';
import { SearchService } from '../services/searchService.ts';

function getService(): SearchService {
  return new SearchService(getDatabase());
}

export function handleGlobalSearch(req: Request, res: Response): void {
  const service = getService();
  const query = req.query.q ? String(req.query.q) : '';
  const includeArchived = req.query.includeArchived === '1' || req.query.includeArchived === 'true';
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 15;

  const results = service.globalSearch(query, {
    includeArchived,
    limit,
  });

  res.json({
    success: true,
    data: results,
  });
}
