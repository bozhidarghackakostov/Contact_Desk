import type { Request, Response } from 'express';
import { getDatabase } from '../database/connection.ts';
import { DashboardService } from '../services/dashboardService.ts';

function getService(): DashboardService {
  return new DashboardService(getDatabase());
}

export function handleGetDashboard(_req: Request, res: Response): void {
  const service = getService();
  const stats = service.getDashboardStats();
  res.json({ success: true, data: stats });
}
