import type { Request, Response } from 'express';
import { getDatabase } from '../database/connection.ts';

export function handleHealthCheck(_req: Request, res: Response): void {
  try {
    const db = getDatabase();
    // Test a basic pragma query
    const row = db.prepare('SELECT 1 as alive').get() as { alive: number };

    res.json({
      success: true,
      data: {
        status: 'ok',
        version: '1.0.0',
        dbConnected: row?.alive === 1,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Database check failed: ' + (error as Error).message,
      },
    });
  }
}
