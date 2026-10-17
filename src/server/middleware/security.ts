import type { Request, Response, NextFunction } from 'express';

/**
 * Validates that requests come only from local loopback origins and hosts.
 * Protects against DNS rebinding and cross-site requests from external websites.
 */
export function loopbackSecurityMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const origin = req.headers.origin;
  const host = req.headers.host;

  // Verify host header is localhost or 127.0.0.1
  if (host) {
    const isLocalHost =
      host.startsWith('localhost:') ||
      host.startsWith('127.0.0.1:') ||
      host === 'localhost' ||
      host === '127.0.0.1';
    if (!isLocalHost) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_HOST',
          message: 'Access denied: Host header must be localhost or 127.0.0.1',
        },
      });
      return;
    }
  }

  // If origin is present, ensure it is from loopback
  if (origin) {
    const isLocalOrigin =
      origin.startsWith('http://localhost:') ||
      origin.startsWith('http://127.0.0.1:') ||
      origin === 'http://localhost' ||
      origin === 'http://127.0.0.1';
    if (!isLocalOrigin) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN_ORIGIN',
          message: 'Access denied: Cross-origin requests from external origins are prohibited',
        },
      });
      return;
    }

    // Set CORS headers strictly for this verified local origin
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  // Handle pre-flight OPTIONS request
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }

  // Rigid Content Security Policy and anti-clickjacking
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' http://127.0.0.1:* http://localhost:*; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';"
  );
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  next();
}
