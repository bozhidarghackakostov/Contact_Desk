import type { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public details?: Array<{ field?: string; message: string }>;

  constructor(
    message: string,
    statusCode: number = 400,
    code: string = 'BAD_REQUEST',
    details?: Array<{ field?: string; message: string }>
  ) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    });
    return;
  }

  // Handle SQLite constraint violations
  const errMsg = err.message || '';
  if (errMsg.includes('UNIQUE constraint failed')) {
    res.status(409).json({
      success: false,
      error: {
        code: 'CONFLICT',
        message: 'A record with these unique details already exists.',
      },
    });
    return;
  }

  if (errMsg.includes('FOREIGN KEY constraint failed')) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INTEGRITY_ERROR',
        message: 'Referenced entity does not exist.',
      },
    });
    return;
  }

  // Log server internal errors without leaking path info to the client
  console.error('[Internal Error]:', err);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal error occurred.',
    },
  });
}
