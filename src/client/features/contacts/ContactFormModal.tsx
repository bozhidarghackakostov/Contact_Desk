import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Building2, Star } from 'lucide-react';
import { apiClient } from '../../services/apiClient.ts';
import type { Contact, Organization } from '../../../shared/types/index.ts';

interface ContactFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (contact: Contact) => void;
  initialContact?: Contact | null;
}

export const ContactFormModal: React.FC<ContactFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialContact,
}) => {
  const isEditing = Boolean(initialContact);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [nickname, setNickname] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [primaryEmail, setPrimaryEmail] = useState('');
  const [primaryPhone, setPrimaryPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [address, setAddress] = useState('');
  const [birthday, setBirthday] = useState('');
  const [notes, setNotes] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);

  // Organization affiliation state
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [orgJobTitle, setOrgJobTitle] = useState('');
  const [orgDepartment, setOrgDepartment] = useState('');

  // Duplicates warning state
  const [duplicateWarning, setDuplicateWarning] = useState<Contact[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Load available organizations for selection
      apiClient
        .listOrganizations({ limit: 100 })
        .then((res) => setOrganizations(res.data))
        .catch(console.error);

      if (initialContact) {
        setFirstName(initialContact.first_name || '');
        setLastName(initialContact.last_name || '');
        setDisplayName(initialContact.display_name || '');
        setNickname(initialContact.nickname || '');
        setJobTitle(initialContact.job_title || '');
        setPrimaryEmail(initialContact.primary_email || '');
        setPrimaryPhone(initialContact.primary_phone || '');
        setWebsite(initialContact.website || '');
        setAddress(initialContact.address || '');
        setBirthday(initialContact.birthday || '');
        setNotes(initialContact.notes || '');
        setIsFavorite(Boolean(initialContact.is_favorite));

        // If primary organization exists
        const primaryOrg = initialContact.organizations?.find((o) => o.is_primary === 1);
        if (primaryOrg) {
          setSelectedOrgId(primaryOrg.organization_id);
          setOrgJobTitle(primaryOrg.job_title || '');
          setOrgDepartment(primaryOrg.department || '');
        } else {
          setSelectedOrgId('');
          setOrgJobTitle('');
          setOrgDepartment('');
        }
      } else {
        // Reset form
        setFirstName('');
        setLastName('');
        setDisplayName('');
        setNickname('');
        setJobTitle('');
        setPrimaryEmail('');
        setPrimaryPhone('');
        setWebsite('');
        setAddress('');
        setBirthday('');
        setNotes('');
        setIsFavorite(false);
        setSelectedOrgId('');
        setOrgJobTitle('');
        setOrgDepartment('');
      }
      setDuplicateWarning([]);
      setErrorMessage('');
    }
  }, [isOpen, initialContact]);

  // Check for duplicates when name or email changes
  const checkDuplicates = async () => {
    if (!firstName && !lastName && !primaryEmail) return;
    try {
      const res = await apiClient.checkDuplicates(
        firstName,
        lastName,
        primaryEmail
      );
      // Filter out the contact being edited
      const filtered = initialContact
        ? res.data.filter((c) => c.id !== initialContact.id)
        : res.data;
      setDuplicateWarning(filtered);
    } catch {
      // Ignore background duplicate check errors
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload: any = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        display_name: displayName.trim(),
        nickname: nickname.trim() || null,
        job_title: jobTitle.trim() || null,
        primary_email: primaryEmail.trim() || null,
        primary_phone: primaryPhone.trim() || null,
        website: website.trim() || null,
        address: address.trim() || null,
        birthday: birthday || null,
        notes: notes.trim(),
        is_favorite: isFavorite ? 1 : 0,
      };

      if (!isEditing && selectedOrgId) {
        payload.organizationLink = {
          organization_id: selectedOrgId,
          job_title: orgJobTitle.trim() || jobTitle.trim() || null,
          department: orgDepartment.trim() || null,
          is_primary: 1,
        };
      }

      let saved: Contact;
      if (isEditing && initialContact) {
        const res = await apiClient.updateContact(initialContact.id, payload);
        saved = res.data;

        // If organization selection changed while editing
        if (selectedOrgId) {
          await apiClient.linkOrganization(initialContact.id, {
            organization_id: selectedOrgId,
            job_title: orgJobTitle.trim() || jobTitle.trim() || null,
            department: orgDepartment.trim() || null,
            is_primary: 1,
          });
          const refreshed = await apiClient.getContact(initialContact.id);
          saved = refreshed.data;
        }
      } else {
        const res = await apiClient.createContact(payload);
        saved = res.data;
      }

      onSaved(saved);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save contact');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>{isEditing ? 'Edit Contact' : 'New Contact'}</h3>
          <button style={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {errorMessage && (
          <div style={styles.errorBanner}>
            <AlertTriangle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {duplicateWarning.length > 0 && (
          <div style={styles.warningBanner}>
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            <div>
              <strong>Duplicate Warning:</strong> Similar contact(s) already exist:
              <ul style={{ marginTop: '0.25rem', paddingLeft: '1.25rem' }}>
                {duplicateWarning.map((c) => (
                  <li key={c.id}>
                    {c.display_name} {c.primary_email ? `(${c.primary_email})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formRow}>
            <div style={styles.formCol}>
              <label className="label">First Name</label>
              <input
                type="text"
                className="input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                onBlur={checkDuplicates}
                placeholder="Jane"
              />
            </div>
            <div style={styles.formCol}>
              <label className="label">Last Name</label>
              <input
                type="text"
                className="input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                onBlur={checkDuplicates}
                placeholder="Doe"
              />
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formCol}>
              <label className="label">Display Name Override (Optional)</label>
              <input
                type="text"
                className="input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Leave blank for automatic name"
              />
            </div>
            <div style={styles.formCol}>
              <label className="label">Nickname</label>
              <input
                type="text"
                className="input"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Janie"
              />
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formCol}>
              <label className="label">Primary Email</label>
              <input
                type="email"
                className="input"
                value={primaryEmail}
                onChange={(e) => setPrimaryEmail(e.target.value)}
                onBlur={checkDuplicates}
                placeholder="jane@example.com"
              />
            </div>
            <div style={styles.formCol}>
              <label className="label">Primary Phone</label>
              <input
                type="tel"
                className="input"
                value={primaryPhone}
                onChange={(e) => setPrimaryPhone(e.target.value)}
                placeholder="+1 555-0100"
              />
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formCol}>
              <label className="label">Job Title</label>
              <input
                type="text"
                className="input"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="VP of Engineering"
              />
            </div>
            <div style={styles.formCol}>
              <label className="label">Birthday</label>
              <input
                type="date"
                className="input"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
              />
            </div>
          </div>

          {/* Organization Association Section */}
          <div style={styles.sectionDivider}>
            <Building2 size={16} style={{ color: 'var(--primary)' }} />
            <span style={styles.sectionTitle}>Organization Affiliation</span>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formCol}>
              <label className="label">Organization</label>
              <select
                className="select"
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
              >
                <option value="">-- No Organization --</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.formCol}>
              <label className="label">Department / Unit</label>
              <input
                type="text"
                className="input"
                value={orgDepartment}
                onChange={(e) => setOrgDepartment(e.target.value)}
                placeholder="e.g. Platform Team"
                disabled={!selectedOrgId}
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label className="label">Website / Profile URL</label>
            <input
              type="url"
              className="input"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://janedoe.com"
            />
          </div>

          <div style={styles.formGroup}>
            <label className="label">Address / Location</label>
            <input
              type="text"
              className="input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="City, State or Full Address"
            />
          </div>

          <div style={styles.formGroup}>
            <label className="label">Notes & Background Context</label>
            <textarea
              className="textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How you met, personal details, interests, conversation topics..."
            />
          </div>

          <div style={styles.checkboxRow}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={isFavorite}
                onChange={(e) => setIsFavorite(e.target.checked)}
                style={{ marginRight: '0.5rem' }}
              />
              <Star
                size={14}
                fill={isFavorite ? 'var(--warning)' : 'none'}
                color={isFavorite ? 'var(--warning)' : 'var(--text-muted)'}
              />
              <span>Mark as Favorite Contact</span>
            </label>
          </div>

          <div style={styles.footer}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Contact' : 'Create Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: 'var(--radius-lg)',
    width: '100%',
    maxWidth: '640px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.2)',
    overflow: 'hidden',
  },
  header: {
    padding: '1rem 1.25rem',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: '1.125rem',
    fontWeight: 600,
  },
  closeBtn: {
    color: 'var(--text-muted)',
    padding: '0.25rem',
    borderRadius: '4px',
  },
  form: {
    padding: '1.25rem',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.875rem',
  },
  formRow: {
    display: 'flex',
    gap: '0.75rem',
  },
  formCol: {
    flex: 1,
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  sectionDivider: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 0',
    borderBottom: '1px solid var(--border-subtle)',
    marginTop: '0.5rem',
  },
  sectionTitle: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--text-main)',
  },
  checkboxRow: {
    display: 'flex',
    alignItems: 'center',
  },
  checkboxLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontSize: '0.875rem',
    cursor: 'pointer',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid var(--border-subtle)',
  },
  errorBanner: {
    margin: '1rem 1.25rem 0',
    padding: '0.75rem',
    backgroundColor: 'var(--danger-subtle)',
    color: 'var(--danger)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
  },
  warningBanner: {
    margin: '1rem 1.25rem 0',
    padding: '0.75rem',
    backgroundColor: 'var(--warning-subtle)',
    color: 'var(--warning)',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem',
    fontSize: '0.8125rem',
  },
};
