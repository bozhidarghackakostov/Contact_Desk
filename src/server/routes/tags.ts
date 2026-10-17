import type { Request, Response } from 'express';
import { getDatabase } from '../database/connection.ts';
import { TagService } from '../services/tagService.ts';

function getService(): TagService {
  return new TagService(getDatabase());
}

export function handleListTags(_req: Request, res: Response): void {
  const service = getService();
  const tags = service.listTags();
  res.json({
    success: true,
    data: tags,
  });
}

export function handleCreateTag(req: Request, res: Response): void {
  const service = getService();
  const tag = service.createTag(req.body?.name);
  res.status(201).json({
    success: true,
    data: tag,
  });
}

export function handleGetTag(req: Request, res: Response): void {
  const service = getService();
  const tag = service.getTag(req.params.id);
  res.json({
    success: true,
    data: tag,
  });
}

export function handleUpdateTag(req: Request, res: Response): void {
  const service = getService();
  const tag = service.updateTag(req.params.id, req.body?.name);
  res.json({
    success: true,
    data: tag,
  });
}

export function handleDeleteTag(req: Request, res: Response): void {
  const service = getService();
  service.deleteTag(req.params.id);
  res.json({
    success: true,
    data: { deleted: true },
  });
}

export function handleGetContactTags(req: Request, res: Response): void {
  const service = getService();
  const tags = service.getTagsForContact(req.params.id);
  res.json({
    success: true,
    data: tags,
  });
}

export function handleSetContactTags(req: Request, res: Response): void {
  const service = getService();
  const tags = service.setContactTags(req.params.id, req.body?.tags || []);
  res.json({
    success: true,
    data: tags,
  });
}
