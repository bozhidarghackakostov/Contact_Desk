import type { DatabaseSync } from 'node:sqlite';
import { TagRepository } from '../repositories/tagRepository.ts';
import { AppError } from '../middleware/errorHandler.ts';
import type { Tag } from '../../shared/types/index.ts';

export class TagService {
  private tagRepo: TagRepository;

  constructor(db: DatabaseSync) {
    this.tagRepo = new TagRepository(db);
  }

  public createTag(name: string): Tag {
    if (!name || name.trim().length === 0) {
      throw new AppError('Tag name is required', 400, 'VALIDATION_ERROR', [
        { field: 'name', message: 'Name is required' },
      ]);
    }
    return this.tagRepo.create(name.trim());
  }

  public listTags(): Tag[] {
    return this.tagRepo.list();
  }

  public getTag(id: string): Tag {
    const tag = this.tagRepo.findById(id);
    if (!tag) {
      throw new AppError(`Tag with id ${id} not found`, 404, 'NOT_FOUND');
    }
    return tag;
  }

  public updateTag(id: string, name: string): Tag {
    if (!name || name.trim().length === 0) {
      throw new AppError('Tag name cannot be empty', 400, 'VALIDATION_ERROR');
    }
    this.getTag(id);
    return this.tagRepo.update(id, name.trim());
  }

  public deleteTag(id: string): boolean {
    this.getTag(id);
    return this.tagRepo.delete(id);
  }

  public setContactTags(contactId: string, tagNamesOrIds: string[]): Tag[] {
    return this.tagRepo.setContactTags(contactId, tagNamesOrIds);
  }

  public getTagsForContact(contactId: string): Tag[] {
    return this.tagRepo.getTagsForContact(contactId);
  }
}
