import { EventEmitter } from 'node:events';
import { Readable, Writable } from 'node:stream';
import type { Express } from 'express';

export interface MockResponse {
  statusCode: number;
  headers: Record<string, string | string[]>;
  body: any;
  rawBody: string;
}

export function dispatch(
  app: Express,
  options: {
    method?: string;
    url?: string;
    headers?: Record<string, string>;
    body?: any;
  }
): Promise<MockResponse> {
  return new Promise((resolve, reject) => {
    const method = options.method || 'GET';
    const url = options.url || '/';
    const headers = {
      host: '127.0.0.1:3000',
      'content-type': 'application/json',
      ...options.headers,
    };

    // Create mock request (Readable stream)
    const req = new Readable({
      read() {
        if (options.body) {
          const payload =
            typeof options.body === 'string'
              ? options.body
              : JSON.stringify(options.body);
          this.push(payload);
        }
        this.push(null);
      },
    }) as any;

    req.method = method;
    req.url = url;
    req.headers = headers;
    req.connection = new EventEmitter();

    // Create mock response (Writable stream)
    const resHeaders: Record<string, string | string[]> = {};
    let statusCode = 200;
    let chunks: Buffer[] = [];

    const res = new Writable({
      write(chunk, _encoding, callback) {
        chunks.push(Buffer.from(chunk));
        callback();
      },
    }) as any;

    res.statusCode = 200;
    res.setHeader = (name: string, value: string | string[]) => {
      resHeaders[name.toLowerCase()] = value;
    };
    res.getHeader = (name: string) => resHeaders[name.toLowerCase()];
    res.removeHeader = (name: string) => {
      delete resHeaders[name.toLowerCase()];
    };

    res.status = (code: number) => {
      statusCode = code;
      res.statusCode = code;
      return res;
    };

    res.sendStatus = (code: number) => {
      statusCode = code;
      res.statusCode = code;
      res.end();
      return res;
    };

    res.json = (data: any) => {
      res.setHeader('content-type', 'application/json; charset=utf-8');
      const jsonStr = JSON.stringify(data);
      res.write(jsonStr);
      res.end();
      return res;
    };

    res.send = (data: any) => {
      if (typeof data === 'object') {
        return res.json(data);
      }
      res.write(String(data));
      res.end();
      return res;
    };

    res.on('finish', () => {
      const rawBody = Buffer.concat(chunks).toString('utf-8');
      let body: any = rawBody;
      try {
        body = JSON.parse(rawBody);
      } catch {
        // Leave as string if not json
      }

      resolve({
        statusCode,
        headers: resHeaders,
        body,
        rawBody,
      });
    });

    res.on('error', reject);

    try {
      app(req, res);
    } catch (err) {
      reject(err);
    }
  });
}
