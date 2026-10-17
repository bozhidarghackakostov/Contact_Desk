import type { DatabaseSync } from 'node:sqlite';
import { InteractionRepository } from '../repositories/interactionRepository.ts';
import type {
  InteractionCreateInput,
  InteractionUpdateInput,
  InteractionFilterOptions,
} from '../repositories/interactionRepository.ts';
import { AppError } from '../middleware/errorHandler.ts';
import type { Interaction } from '../../shared/types/index.ts';

export class InteractionService {
  private db: DatabaseSync;
  private interactionRepo: InteractionRepository;

  constructor(db: DatabaseSync) {
    this.db = db;
    this.interactionRepo = new InteractionRepository(db);
  }

  public createInteraction(data: InteractionCreateInput): Interaction {
    if (!data.title || data.title.trim().length === 0) {
      throw new AppError(
        'Interaction title is required',
        400,
        'VALIDATION_ERROR',
        [{ field: 'title', message: 'Title is required' }]
      );
    }

    if (!data.interaction_type) {
      throw new AppError(
        'Interaction type is required',
        400,
        'VALIDATION_ERROR',
        [{ field: 'interaction_type', message: 'Type is required' }]
      );
    }

    return this.interactionRepo.create(data);
  }

  public getInteraction(id: string): Interaction {
    const interaction = this.interactionRepo.findById(id);
    if (!interaction) {
      throw new AppError(`Interaction with id ${id} not found`, 404, 'NOT_FOUND');
    }
    return interaction;
  }

  public listInteractions(options: InteractionFilterOptions = {}) {
    return this.interactionRepo.list(options);
  }

  public updateInteraction(id: string, data: InteractionUpdateInput): Interaction {
    this.getInteraction(id);
    return this.interactionRepo.update(id, data);
  }

  public deleteInteraction(id: string): boolean {
    this.getInteraction(id);
    return this.interactionRepo.delete(id);
  }
}
