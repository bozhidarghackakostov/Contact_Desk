import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { handleHealthCheck } from '../../src/server/routes/health.ts';
import { loopbackSecurityMiddleware } from '../../src/server/middleware/security.ts';
import { getDatabase } from '../../src/server/database/connection.ts';
import { runMigrations } from '../../src/server/database/migrator.ts';

describe('Health & Security Endpoints', () => {
  before(() => {
    // Initialize in-memory test database
    process.env.DATABASE_PATH = ':memory:';
    const db = getDatabase({ dbPath: ':memory:' });
    runMigrations(db);
  });

  it('handleHealthCheck returns status ok and database connection', () => {
    let statusCode = 200;
    let jsonResult: any = null;

    const mockRes: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        jsonResult = data;
        return this;
      },
    };

    handleHealthCheck({} as any, mockRes);

    assert.strictEqual(statusCode, 200);
    assert.strictEqual(jsonResult.success, true);
    assert.strictEqual(jsonResult.data.status, 'ok');
    assert.strictEqual(jsonResult.data.dbConnected, true);
  });

  it('allows valid local loopback origin and sets security headers', () => {
    let nextCalled = false;
    const headersSet: Record<string, string> = {};

    const mockReq: any = {
      headers: {
        host: '127.0.0.1:3000',
        origin: 'http://127.0.0.1:3000',
      },
      method: 'GET',
    };

    const mockRes: any = {
      setHeader(name: string, value: string) {
        headersSet[name.toLowerCase()] = value;
      },
    };

    loopbackSecurityMiddleware(mockReq, mockRes, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, true);
    assert.strictEqual(headersSet['access-control-allow-origin'], 'http://127.0.0.1:3000');
    assert.ok(headersSet['content-security-policy']);
    assert.strictEqual(headersSet['x-frame-options'], 'DENY');
  });

  it('rejects external cross-origin requests with 403 Forbidden', () => {
    let statusCode = 200;
    let jsonResult: any = null;
    let nextCalled = false;

    const mockReq: any = {
      headers: {
        host: '127.0.0.1:3000',
        origin: 'https://malicious-site.example.com',
      },
      method: 'GET',
    };

    const mockRes: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        jsonResult = data;
        return this;
      },
    };

    loopbackSecurityMiddleware(mockReq, mockRes, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(statusCode, 403);
    assert.strictEqual(jsonResult.success, false);
    assert.strictEqual(jsonResult.error.code, 'FORBIDDEN_ORIGIN');
  });

  it('rejects external host header requests with 403 Forbidden', () => {
    let statusCode = 200;
    let jsonResult: any = null;
    let nextCalled = false;

    const mockReq: any = {
      headers: {
        host: 'evil.attacker.com',
      },
      method: 'GET',
    };

    const mockRes: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        jsonResult = data;
        return this;
      },
    };

    loopbackSecurityMiddleware(mockReq, mockRes, () => {
      nextCalled = true;
    });

    assert.strictEqual(nextCalled, false);
    assert.strictEqual(statusCode, 403);
    assert.strictEqual(jsonResult.success, false);
    assert.strictEqual(jsonResult.error.code, 'FORBIDDEN_HOST');
  });
});
