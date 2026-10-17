import type { DatabaseSync } from 'node:sqlite';
import { TaskRepository } from '../repositories/taskRepository.ts';
import type {
  TaskCreateInput,
  TaskUpdateInput,
  TaskFilterOptions,
} from '../repositories/taskRepository.ts';
import { AppError } from '../middleware/errorHandler.ts';
import type { Task } from '../../shared/types/index.ts';

export class TaskService {
  private db: DatabaseSync;
  private taskRepo: TaskRepository;

  constructor(db: DatabaseSync) {
    this.db = db;
    this.taskRepo = new TaskRepository(db);
  }

  public createTask(data: TaskCreateInput): Task {
    if (!data.title || data.title.trim().length === 0) {
      throw new AppError('Task title is required', 400, 'VALIDATION_ERROR', [
        { field: 'title', message: 'Title is required' },
      ]);
    }

    if (!data.due_date || data.due_date.trim().length === 0) {
      throw new AppError('Due date is required', 400, 'VALIDATION_ERROR', [
        { field: 'due_date', message: 'Due date is required' },
      ]);
    }

    return this.taskRepo.create(data);
  }

  public getTask(id: string): Task {
    const task = this.taskRepo.findById(id);
    if (!task) {
      throw new AppError(`Task with id ${id} not found`, 404, 'NOT_FOUND');
    }
    return task;
  }

  public listTasks(options: TaskFilterOptions = {}) {
    return this.taskRepo.list(options);
  }

  public updateTask(id: string, data: TaskUpdateInput): Task {
    this.getTask(id);
    return this.taskRepo.update(id, data);
  }

  public completeTask(id: string): Task {
    this.getTask(id);
    return this.taskRepo.complete(id);
  }

  public reopenTask(id: string): Task {
    this.getTask(id);
    return this.taskRepo.reopen(id);
  }

  public deleteTask(id: string): boolean {
    this.getTask(id);
    return this.taskRepo.delete(id);
  }
}
