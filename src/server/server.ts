import { createApp } from './app.ts';
import { getDatabase } from './database/connection.ts';
import { runMigrations } from './database/migrator.ts';

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '127.0.0.1'; // Non-negotiable loopback binding

async function startServer() {
  try {
    console.log('[ContactDesk] Initializing database...');
    const db = getDatabase();

    console.log('[ContactDesk] Running schema migrations...');
    const applied = runMigrations(db);
    if (applied.length > 0) {
      console.log(`[ContactDesk] Applied ${applied.length} migration(s):`, applied.map((m) => m.name).join(', '));
    } else {
      console.log('[ContactDesk] Database schema is up to date.');
    }

    const app = createApp();
    const server = app.listen(PORT, HOST, () => {
      console.log(`[ContactDesk] Server running locally at http://${HOST}:${PORT}`);
      console.log('[ContactDesk] Private offline mode active. Bound exclusively to loopback.');
    });

    const shutdown = () => {
      console.log('[ContactDesk] Gracefully shutting down...');
      server.close(() => {
        console.log('[ContactDesk] Server stopped.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('[ContactDesk] Failed to start server:', error);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
