import type { DatabaseSync } from 'node:sqlite';
import { parseCsv } from './csvUtils.ts';
import { ContactRepository } from '../repositories/contactRepository.ts';
import { OrganizationRepository } from '../repositories/organizationRepository.ts';
import { ContactOrganizationRepository } from '../repositories/contactOrganizationRepository.ts';
import { TagRepository } from '../repositories/tagRepository.ts';
import type { ContactCreateInput } from '../../shared/types/index.ts';

export interface ImportPreviewRow {
  rowNumber: number;
  data: Record<string, string>;
  parsedContact: {
    first_name: string;
    last_name: string;
    display_name: string;
    primary_email: string;
    primary_phone: string;
    job_title: string;
    organization: string;
    department: string;
    tags: string[];
    notes: string;
    address: string;
    website: string;
    birthday: string;
  };
  isValid: boolean;
  validationError?: string;
  hasDuplicate: boolean;
  duplicateReason?: string;
  existingContact?: { id: string; name: string };
}

export interface ImportPreviewResult {
  totalRows: number;
  validRowsCount: number;
  invalidRowsCount: number;
  duplicateCount: number;
  headers: string[];
  detectedMapping: Record<string, string>;
  previewRows: ImportPreviewRow[];
}

export interface CommitImportOptions {
  csvText: string;
  columnMapping?: Record<string, string>; // CSV Header -> Standard Field
  duplicateStrategy?: 'skip' | 'update' | 'import_anyway';
  tagAsImported?: boolean;
  customTag?: string;
}

export interface CommitImportResult {
  totalProcessed: number;
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
}

export class ImportService {
  private db: DatabaseSync;
  private contactRepo: ContactRepository;
  private orgRepo: OrganizationRepository;
  private contactOrgRepo: ContactOrganizationRepository;
  private tagRepo: TagRepository;

  constructor(db: DatabaseSync) {
    this.db = db;
    this.contactRepo = new ContactRepository(db);
    this.orgRepo = new OrganizationRepository(db);
    this.contactOrgRepo = new ContactOrganizationRepository(db);
    this.tagRepo = new TagRepository(db);
  }

  public detectColumn(header: string): string | null {
    const clean = header.trim().toLowerCase();
    if (/^first.*name$|^given.*name$|^fname$/i.test(clean)) return 'first_name';
    if (/^last.*name$|^surname$|^family.*name$|^lname$/i.test(clean)) return 'last_name';
    if (/^display.*name$|^full.*name$|^name$/i.test(clean)) return 'display_name';
    if (/^nick.*name$/i.test(clean)) return 'nickname';
    if (/email|e-mail|mail/i.test(clean)) return 'primary_email';
    if (/phone|mobile|cell|telephone/i.test(clean)) return 'primary_phone';
    if (/company|organization|org|employer|workplace/i.test(clean)) return 'organization';
    if (/job.*title|title|role|position|occupation/i.test(clean)) return 'job_title';
    if (/dept|department|division/i.test(clean)) return 'department';
    if (/notes?|comments?|bio|summary|description/i.test(clean)) return 'notes';
    if (/tags?|labels?|categories/i.test(clean)) return 'tags';
    if (/address|location|street/i.test(clean)) return 'address';
    if (/website|url|web|link/i.test(clean)) return 'website';
    if (/birth.*day|dob|born/i.test(clean)) return 'birthday';
    return null;
  }

  public previewContactsCsv(csvText: string): ImportPreviewResult {
    const rawRows = parseCsv(csvText);
    if (rawRows.length === 0) {
      return {
        totalRows: 0,
        validRowsCount: 0,
        invalidRowsCount: 0,
        duplicateCount: 0,
        headers: [],
        detectedMapping: {},
        previewRows: [],
      };
    }

    const headers = rawRows[0].map((h) => h.trim());
    const detectedMapping: Record<string, string> = {};
    headers.forEach((h) => {
      const field = this.detectColumn(h);
      if (field) detectedMapping[h] = field;
    });

    const dataRows = rawRows.slice(1).filter((r) => r.some((cell) => cell.trim().length > 0));
    const previewRows: ImportPreviewRow[] = [];
    let validRowsCount = 0;
    let invalidRowsCount = 0;
    let duplicateCount = 0;

    dataRows.forEach((row, idx) => {
      const rowData: Record<string, string> = {};
      headers.forEach((h, colIdx) => {
        rowData[h] = row[colIdx] ? row[colIdx].trim() : '';
      });

      // Map to parsedContact
      const parsed: ImportPreviewRow['parsedContact'] = {
        first_name: '',
        last_name: '',
        display_name: '',
        primary_email: '',
        primary_phone: '',
        job_title: '',
        organization: '',
        department: '',
        tags: [],
        notes: '',
        address: '',
        website: '',
        birthday: '',
      };

      for (const [header, field] of Object.entries(detectedMapping)) {
        const val = rowData[header] || '';
        if (field === 'tags') {
          parsed.tags = val
            .split(/[;,]/)
            .map((t) => t.trim())
            .filter(Boolean);
        } else {
          (parsed as any)[field] = val;
        }
      }

      // If full name was provided without separate first and last name, split intelligently
      if (!parsed.first_name && !parsed.last_name && parsed.display_name) {
        const parts = parsed.display_name.trim().split(/\s+/);
        if (parts.length === 1) {
          parsed.first_name = parts[0];
        } else {
          parsed.first_name = parts[0];
          parsed.last_name = parts.slice(1).join(' ');
        }
      }

      // Validate: must have at least name, email, or notes
      const hasName = parsed.first_name || parsed.last_name || parsed.display_name;
      const hasEmail = parsed.primary_email;
      const hasNotes = parsed.notes;
      const isValid = Boolean(hasName || hasEmail || hasNotes);

      let hasDuplicate = false;
      let duplicateReason: string | undefined;
      let existingContact: { id: string; name: string } | undefined;

      if (isValid) {
        validRowsCount++;
        // Check duplicate
        const dups = this.contactRepo.findPotentialDuplicates(
          parsed.first_name,
          parsed.last_name,
          parsed.primary_email
        );
        if (dups.length > 0) {
          hasDuplicate = true;
          duplicateCount++;
          const match = dups[0];
          existingContact = { id: match.id, name: match.display_name };
          if (
            parsed.primary_email &&
            match.primary_email?.toLowerCase() === parsed.primary_email.toLowerCase()
          ) {
            duplicateReason = `Matches existing email (${match.primary_email})`;
          } else {
            duplicateReason = `Matches existing contact name (${match.display_name})`;
          }
        }
      } else {
        invalidRowsCount++;
      }

      const item: ImportPreviewRow = {
        rowNumber: idx + 2, // 1-indexed, skipping header
        data: rowData,
        parsedContact: parsed,
        isValid,
        validationError: isValid ? undefined : 'Row contains no name, email, or notes',
        hasDuplicate,
        duplicateReason,
        existingContact,
      };

      // Store up to 25 rows for UI preview display
      if (previewRows.length < 25) {
        previewRows.push(item);
      }
    });

    return {
      totalRows: dataRows.length,
      validRowsCount,
      invalidRowsCount,
      duplicateCount,
      headers,
      detectedMapping,
      previewRows,
    };
  }

  public commitContactsImport(options: CommitImportOptions): CommitImportResult {
    const {
      csvText,
      columnMapping,
      duplicateStrategy = 'skip',
      tagAsImported = true,
      customTag,
    } = options;

    const rawRows = parseCsv(csvText);
    if (rawRows.length < 2) {
      return { totalProcessed: 0, importedCount: 0, updatedCount: 0, skippedCount: 0 };
    }

    const headers = rawRows[0].map((h) => h.trim());
    const mapping = columnMapping || {};

    // If no manual mapping provided, auto-detect
    if (Object.keys(mapping).length === 0) {
      headers.forEach((h) => {
        const field = this.detectColumn(h);
        if (field) mapping[h] = field;
      });
    }

    const dataRows = rawRows.slice(1).filter((r) => r.some((cell) => cell.trim().length > 0));
    const todayStr = new Date().toISOString().slice(0, 10);
    const defaultImportTag = customTag || `Imported ${todayStr}`;

    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    this.db.exec('BEGIN TRANSACTION;');
    try {
      for (const row of dataRows) {
        const rowData: Record<string, string> = {};
        headers.forEach((h, colIdx) => {
          rowData[h] = row[colIdx] ? row[colIdx].trim() : '';
        });

        const parsed: Record<string, any> = {
          first_name: '',
          last_name: '',
          display_name: '',
          nickname: '',
          primary_email: '',
          primary_phone: '',
          job_title: '',
          organization: '',
          department: '',
          tags: [] as string[],
          notes: '',
          address: '',
          website: '',
          birthday: '',
        };

        for (const [header, field] of Object.entries(mapping)) {
          const val = rowData[header] || '';
          if (field === 'tags') {
            parsed.tags = val
              .split(/[;,]/)
              .map((t: string) => t.trim())
              .filter(Boolean);
          } else {
            parsed[field] = val;
          }
        }

        // Name heuristics
        if (!parsed.first_name && !parsed.last_name && parsed.display_name) {
          const parts = parsed.display_name.trim().split(/\s+/);
          if (parts.length === 1) {
            parsed.first_name = parts[0];
          } else {
            parsed.first_name = parts[0];
            parsed.last_name = parts.slice(1).join(' ');
          }
        }

        // Validity check
        const hasName = parsed.first_name || parsed.last_name || parsed.display_name;
        const hasEmail = parsed.primary_email;
        const hasNotes = parsed.notes;
        if (!hasName && !hasEmail && !hasNotes) {
          skippedCount++;
          continue;
        }

        // Duplicate check
        const duplicates = this.contactRepo.findPotentialDuplicates(
          parsed.first_name,
          parsed.last_name,
          parsed.primary_email
        );

        if (duplicates.length > 0) {
          if (duplicateStrategy === 'skip') {
            skippedCount++;
            continue;
          } else if (duplicateStrategy === 'update') {
            const existing = duplicates[0];
            const updates: Partial<ContactCreateInput> = {};
            if (parsed.job_title && !existing.job_title) updates.job_title = parsed.job_title;
            if (parsed.primary_phone && !existing.primary_phone) updates.primary_phone = parsed.primary_phone;
            if (parsed.website && !existing.website) updates.website = parsed.website;
            if (parsed.address && !existing.address) updates.address = parsed.address;
            if (parsed.birthday && !existing.birthday) updates.birthday = parsed.birthday;
            if (parsed.notes) {
              updates.notes = existing.notes
                ? `${existing.notes}\n\n[Imported Notes]: ${parsed.notes}`
                : parsed.notes;
            }

            if (Object.keys(updates).length > 0) {
              this.contactRepo.update(existing.id, updates);
            }

            // Organization link
            if (parsed.organization) {
              let org = this.orgRepo.findByName(parsed.organization);
              if (!org) {
                org = this.orgRepo.create({ name: parsed.organization });
              }
              const links = this.contactOrgRepo.getOrganizationsForContact(existing.id);
              if (!links.some((l) => l.organization_id === org!.id)) {
                this.contactOrgRepo.link({
                  contact_id: existing.id,
                  organization_id: org.id,
                  job_title: parsed.job_title || null,
                  department: parsed.department || null,
                  is_primary: links.length === 0 ? 1 : 0,
                });
              }
            }

            // Tags
            const tagSet = new Set((existing.tags || []).map((t) => t.name));
            if (tagAsImported) tagSet.add(defaultImportTag);
            parsed.tags.forEach((t: string) => tagSet.add(t));
            this.tagRepo.setContactTags(existing.id, Array.from(tagSet));

            updatedCount++;
            continue;
          }
          // If 'import_anyway', fall through to insert
        }

        // Insert new contact
        const created = this.contactRepo.create({
          first_name: parsed.first_name,
          last_name: parsed.last_name,
          display_name: parsed.display_name,
          nickname: parsed.nickname,
          job_title: parsed.job_title,
          primary_email: parsed.primary_email,
          primary_phone: parsed.primary_phone,
          website: parsed.website,
          address: parsed.address,
          birthday: parsed.birthday,
          notes: parsed.notes,
        });

        // Organization link
        if (parsed.organization) {
          let org = this.orgRepo.findByName(parsed.organization);
          if (!org) {
            org = this.orgRepo.create({ name: parsed.organization });
          }
          this.contactOrgRepo.link({
            contact_id: created.id,
            organization_id: org.id,
            job_title: parsed.job_title || null,
            department: parsed.department || null,
            is_primary: 1,
          });
        }

        // Tags
        const tagsToApply = new Set<string>(parsed.tags);
        if (tagAsImported) {
          tagsToApply.add(defaultImportTag);
        }
        if (tagsToApply.size > 0) {
          this.tagRepo.setContactTags(created.id, Array.from(tagsToApply));
        }

        importedCount++;
      }

      this.db.exec('COMMIT;');
      return {
        totalProcessed: dataRows.length,
        importedCount,
        updatedCount,
        skippedCount,
      };
    } catch (err) {
      this.db.exec('ROLLBACK;');
      throw err;
    }
  }
}
