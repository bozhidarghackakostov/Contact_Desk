import express from 'express';
import type { Express } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { loopbackSecurityMiddleware } from './middleware/security.ts';
import { errorHandler } from './middleware/errorHandler.ts';
import { handleHealthCheck } from './routes/health.ts';
import {
  handleListContacts,
  handleCreateContact,
  handleGetContact,
  handleUpdateContact,
  handleArchiveContact,
  handleRestoreContact,
  handleDeleteContact,
  handleCheckDuplicates,
  handleLinkOrganization,
} from './routes/contacts.ts';
import {
  handleListOrganizations,
  handleCreateOrganization,
  handleGetOrganization,
  handleUpdateOrganization,
  handleArchiveOrganization,
  handleRestoreOrganization,
  handleDeleteOrganization,
  handleUnlinkRelationship,
} from './routes/organizations.ts';
import {
  handleListInteractions,
  handleCreateInteraction,
  handleGetInteraction,
  handleUpdateInteraction,
  handleDeleteInteraction,
} from './routes/interactions.ts';
import {
  handleListTasks,
  handleCreateTask,
  handleGetTask,
  handleUpdateTask,
  handleCompleteTask,
  handleReopenTask,
  handleDeleteTask,
} from './routes/tasks.ts';
import { handleGetDashboard } from './routes/dashboard.ts';
import {
  handleListTags,
  handleCreateTag,
  handleGetTag,
  handleUpdateTag,
  handleDeleteTag,
  handleGetContactTags,
  handleSetContactTags,
} from './routes/tags.ts';
import { handleGlobalSearch } from './routes/search.ts';
import {
  handleExportContactsCsv,
  handleExportOrganizationsCsv,
  handleExportInteractionsCsv,
  handleExportTasksCsv,
  handleExportJsonDump,
} from './routes/exports.ts';
import { handlePreviewImport, handleCommitImport } from './routes/imports.ts';
import {
  handleListBackups,
  handleCreateBackup,
  handleRestoreBackup,
} from './routes/backups.ts';

export function createApp(): Express {
  const app = express();

  // Parse JSON payloads with a safe limit
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Enforce loopback and CSP security
  app.use(loopbackSecurityMiddleware);

  // Health endpoint
  app.get('/api/health', handleHealthCheck);

  // Dashboard endpoint
  app.get('/api/dashboard', handleGetDashboard);

  // Contacts endpoints
  app.get('/api/contacts', handleListContacts);
  app.post('/api/contacts', handleCreateContact);
  app.get('/api/contacts/check-duplicate', handleCheckDuplicates);
  app.get('/api/contacts/:id', handleGetContact);
  app.patch('/api/contacts/:id', handleUpdateContact);
  app.post('/api/contacts/:id/archive', handleArchiveContact);
  app.post('/api/contacts/:id/restore', handleRestoreContact);
  app.delete('/api/contacts/:id', handleDeleteContact);
  app.post('/api/contacts/:id/organizations', handleLinkOrganization);

  // Organizations endpoints
  app.get('/api/organizations', handleListOrganizations);
  app.post('/api/organizations', handleCreateOrganization);
  app.get('/api/organizations/:id', handleGetOrganization);
  app.patch('/api/organizations/:id', handleUpdateOrganization);
  app.post('/api/organizations/:id/archive', handleArchiveOrganization);
  app.post('/api/organizations/:id/restore', handleRestoreOrganization);
  app.delete('/api/organizations/:id', handleDeleteOrganization);
  app.delete('/api/relationships/:id', handleUnlinkRelationship);

  // Interactions endpoints
  app.get('/api/interactions', handleListInteractions);
  app.post('/api/interactions', handleCreateInteraction);
  app.get('/api/interactions/:id', handleGetInteraction);
  app.patch('/api/interactions/:id', handleUpdateInteraction);
  app.delete('/api/interactions/:id', handleDeleteInteraction);

  // Tasks / Follow-ups endpoints
  app.get('/api/tasks', handleListTasks);
  app.post('/api/tasks', handleCreateTask);
  app.get('/api/tasks/:id', handleGetTask);
  app.patch('/api/tasks/:id', handleUpdateTask);
  app.post('/api/tasks/:id/complete', handleCompleteTask);
  app.post('/api/tasks/:id/reopen', handleReopenTask);
  app.delete('/api/tasks/:id', handleDeleteTask);

  // Tags endpoints
  app.get('/api/tags', handleListTags);
  app.post('/api/tags', handleCreateTag);
  app.get('/api/tags/:id', handleGetTag);
  app.patch('/api/tags/:id', handleUpdateTag);
  app.delete('/api/tags/:id', handleDeleteTag);
  app.get('/api/contacts/:id/tags', handleGetContactTags);
  app.post('/api/contacts/:id/tags', handleSetContactTags);

  // Global search endpoint
  app.get('/api/search', handleGlobalSearch);

  // Data Export endpoints
  app.get('/api/export/contacts.csv', handleExportContactsCsv);
  app.get('/api/export/organizations.csv', handleExportOrganizationsCsv);
  app.get('/api/export/interactions.csv', handleExportInteractionsCsv);
  app.get('/api/export/tasks.csv', handleExportTasksCsv);
  app.get('/api/export/all.json', handleExportJsonDump);

  // CSV Import endpoints
  app.post('/api/imports/contacts/preview', handlePreviewImport);
  app.post('/api/imports/contacts/commit', handleCommitImport);

  // Backup & Restore endpoints
  app.get('/api/backups', handleListBackups);
  app.post('/api/backups', handleCreateBackup);
  app.post('/api/backups/restore', handleRestoreBackup);

  // In production, serve the built frontend assets from dist/client or dist
  const clientDist = fs.existsSync(path.resolve(process.cwd(), 'dist/client'))
    ? path.resolve(process.cwd(), 'dist/client')
    : path.resolve(process.cwd(), 'dist');

  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
