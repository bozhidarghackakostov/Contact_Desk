import type { DatabaseSync } from 'node:sqlite';
import { OrganizationRepository } from '../repositories/organizationRepository.ts';
import type {
  OrganizationCreateInput,
  OrganizationUpdateInput,
  OrganizationFilterOptions,
} from '../repositories/organizationRepository.ts';
import { ContactOrganizationRepository } from '../repositories/contactOrganizationRepository.ts';
import { AppError } from '../middleware/errorHandler.ts';
import type { Organization } from '../../shared/types/index.ts';

export class OrganizationService {
  private db: DatabaseSync;
  private orgRepo: OrganizationRepository;
  private contactOrgRepo: ContactOrganizationRepository;

  constructor(db: DatabaseSync) {
    this.db = db;
    this.orgRepo = new OrganizationRepository(db);
    this.contactOrgRepo = new ContactOrganizationRepository(db);
  }

  public createOrganization(data: OrganizationCreateInput): Organization {
    if (!data.name || data.name.trim().length === 0) {
      throw new AppError(
        'Organization name is required',
        400,
        'VALIDATION_ERROR',
        [{ field: 'name', message: 'Name is required' }]
      );
    }
    return this.orgRepo.create(data);
  }

  public getOrganization(id: string): Organization {
    const org = this.orgRepo.findById(id);
    if (!org) {
      throw new AppError(`Organization with id ${id} not found`, 404, 'NOT_FOUND');
    }
    return org;
  }

  public listOrganizations(options: OrganizationFilterOptions = {}) {
    return this.orgRepo.list(options);
  }

  public updateOrganization(id: string, data: OrganizationUpdateInput): Organization {
    this.getOrganization(id);
    return this.orgRepo.update(id, data);
  }

  public archiveOrganization(id: string): Organization {
    this.getOrganization(id);
    return this.orgRepo.archive(id);
  }

  public restoreOrganization(id: string): Organization {
    this.getOrganization(id);
    return this.orgRepo.restore(id);
  }

  public deleteOrganization(id: string, confirm: boolean): boolean {
    if (!confirm) {
      throw new AppError(
        'Deletion requires explicit confirmation flag',
        400,
        'CONFIRMATION_REQUIRED'
      );
    }
    this.getOrganization(id);
    return this.orgRepo.delete(id);
  }

  public unlinkContact(relationshipId: string): boolean {
    return this.contactOrgRepo.unlink(relationshipId);
  }
}
