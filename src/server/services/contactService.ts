import type { DatabaseSync } from 'node:sqlite';
import { ContactRepository } from '../repositories/contactRepository.ts';
import type {
  ContactCreateInput,
  ContactUpdateInput,
  ContactFilterOptions,
} from '../repositories/contactRepository.ts';
import { ContactOrganizationRepository } from '../repositories/contactOrganizationRepository.ts';
import type { LinkContactOrgInput } from '../repositories/contactOrganizationRepository.ts';
import { AppError } from '../middleware/errorHandler.ts';
import type { Contact } from '../../shared/types/index.ts';

export class ContactService {
  private db: DatabaseSync;
  private contactRepo: ContactRepository;
  private contactOrgRepo: ContactOrganizationRepository;

  constructor(db: DatabaseSync) {
    this.db = db;
    this.contactRepo = new ContactRepository(db);
    this.contactOrgRepo = new ContactOrganizationRepository(db);
  }

  public createContact(
    data: ContactCreateInput,
    organizationLink?: {
      organization_id: string;
      job_title?: string | null;
      department?: string | null;
      is_primary?: number;
    }
  ): { contact: Contact; duplicateWarning?: Contact[] } {
    // Validation: at least one identifying property (first name, last name, nickname, email, or notes)
    const hasName =
      (data.first_name && data.first_name.trim().length > 0) ||
      (data.last_name && data.last_name.trim().length > 0) ||
      (data.display_name && data.display_name.trim().length > 0) ||
      (data.nickname && data.nickname.trim().length > 0);

    const hasEmail = data.primary_email && data.primary_email.trim().length > 0;
    const hasNotes = data.notes && data.notes.trim().length > 0;

    if (!hasName && !hasEmail && !hasNotes) {
      throw new AppError(
        'Please provide at least a name, email address, or note for the contact.',
        400,
        'VALIDATION_ERROR',
        [{ field: 'first_name', message: 'Name, email, or note is required' }]
      );
    }

    // Check potential duplicates for advisory warning
    const potentialDuplicates = this.contactRepo.findPotentialDuplicates(
      data.first_name,
      data.last_name,
      data.primary_email
    );

    // Run creation inside transaction if organization link is included
    this.db.exec('BEGIN TRANSACTION;');
    try {
      const contact = this.contactRepo.create(data);

      if (organizationLink && organizationLink.organization_id) {
        this.contactOrgRepo.link({
          contact_id: contact.id,
          organization_id: organizationLink.organization_id,
          job_title: organizationLink.job_title || data.job_title || null,
          department: organizationLink.department || null,
          is_primary: organizationLink.is_primary !== undefined ? organizationLink.is_primary : 1,
        });
      }

      this.db.exec('COMMIT;');
      const populated = this.contactRepo.findById(contact.id)!;

      return {
        contact: populated,
        duplicateWarning:
          potentialDuplicates.length > 0 ? potentialDuplicates : undefined,
      };
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }

  public getContact(id: string): Contact {
    const contact = this.contactRepo.findById(id);
    if (!contact) {
      throw new AppError(`Contact with id ${id} not found`, 404, 'NOT_FOUND');
    }
    return contact;
  }

  public listContacts(options: ContactFilterOptions = {}) {
    return this.contactRepo.list(options);
  }

  public updateContact(id: string, data: ContactUpdateInput): Contact {
    this.getContact(id); // Ensure exists
    return this.contactRepo.update(id, data);
  }

  public archiveContact(id: string): Contact {
    this.getContact(id);
    return this.contactRepo.archive(id);
  }

  public restoreContact(id: string): Contact {
    this.getContact(id);
    return this.contactRepo.restore(id);
  }

  public deleteContact(id: string, confirm: boolean): boolean {
    if (!confirm) {
      throw new AppError(
        'Deletion requires explicit confirmation flag',
        400,
        'CONFIRMATION_REQUIRED'
      );
    }
    this.getContact(id);
    return this.contactRepo.delete(id);
  }

  public checkDuplicates(
    firstName?: string,
    lastName?: string,
    email?: string,
    excludeId?: string
  ): Contact[] {
    return this.contactRepo.findPotentialDuplicates(
      firstName,
      lastName,
      email,
      excludeId
    );
  }

  public linkOrganization(input: LinkContactOrgInput) {
    this.getContact(input.contact_id);
    return this.contactOrgRepo.link(input);
  }
}
