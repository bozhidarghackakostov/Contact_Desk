import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { apiClient } from '../../services/apiClient.ts';
import type { Organization } from '../../../shared/types/index.ts';

interface OrganizationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (org: Organization) => void;
  initialOrg?: Organization | null;
}

export const OrganizationFormModal: React.FC<OrganizationFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialOrg,
}) => {
  const isEditing = Boolean(initialOrg);

  const [name, setName] = useState('');
  const [organizationType, setOrganizationType] = useState('Company');
  const [industry, setIndustry] = useState('');
  const [website, setWebsite] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (initialOrg) {
        setName(initialOrg.name || '');
        setOrganizationType(initialOrg.organization_type || 'Company');
        setIndustry(initialOrg.industry || '');
        setWebsite(initialOrg.website || '');
        setEmail(initialOrg.email || '');
        setPhone(initialOrg.phone || '');
        setAddress(initialOrg.address || '');
        setDescription(initialOrg.description || '');
        setNotes(initialOrg.notes || '');
      } else {
        setName('');
        setOrganizationType('Company');
        setIndustry('');
        setWebsite('');
        setEmail('');
        setPhone('');
        setAddress('');
        setDescription('');
        setNotes('');
      }
      setErrorMessage('');
    }
  }, [isOpen, initialOrg]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Organization name is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload: any = {
        name: name.trim(),
        organization_type: organizationType || null,
        industry: industry.trim() || null,
        website: website.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        description: description.trim() || null,
        notes: notes.trim(),
      };

      let saved: Organization;
      if (isEditing && initialOrg) {
        const res = await apiClient.updateOrganization(initialOrg.id, payload);
        saved = res.data;
      } else {
        const res = await apiClient.createOrganization(payload);
        saved = res.data;
      }

      onSaved(saved);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save organization');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>
            {isEditing ? 'Edit Organization' : 'New Organization'}
          </h3>
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

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.formRow}>
            <div style={{ flex: 2 }}>
              <label className="label">Organization Name *</label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Corp"
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Type</label>
              <select
                className="select"
                value={organizationType}
                onChange={(e) => setOrganizationType(e.target.value)}
              >
                <option value="Company">Company</option>
                <option value="Non-Profit">Non-Profit</option>
                <option value="Institution">Institution</option>
                <option value="Group">Group</option>
                <option value="Supplier">Supplier</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formCol}>
              <label className="label">Industry / Sector</label>
              <input
                type="text"
                className="input"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="Software & IT, Health, Finance..."
              />
            </div>
            <div style={styles.formCol}>
              <label className="label">Website</label>
              <input
                type="url"
                className="input"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formCol}>
              <label className="label">Main Email</label>
              <input
                type="email"
                className="input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="info@example.com"
              />
            </div>
            <div style={styles.formCol}>
              <label className="label">Main Phone</label>
              <input
                type="tel"
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555-0200"
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label className="label">Address / Office Location</label>
            <input
              type="text"
              className="input"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="City, State, Country"
            />
          </div>

          <div style={styles.formGroup}>
            <label className="label">Short Description</label>
            <input
              type="text"
              className="input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this organization does..."
            />
          </div>

          <div style={styles.formGroup}>
            <label className="label">Internal Notes</label>
            <textarea
              className="textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Background, relationship history, account managers..."
            />
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
              {isSubmitting
                ? 'Saving...'
                : isEditing
                ? 'Update Organization'
                : 'Create Organization'}
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
    maxWidth: '600px',
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
};
