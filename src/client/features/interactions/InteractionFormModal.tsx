import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { apiClient } from '../../services/apiClient.ts';
import type {
  Interaction,
  InteractionType,
  Contact,
  Organization,
} from '../../../shared/types/index.ts';

interface InteractionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (interaction: Interaction) => void;
  initialInteraction?: Interaction | null;
  defaultContactId?: string;
  defaultOrgId?: string;
}

export const InteractionFormModal: React.FC<InteractionFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialInteraction,
  defaultContactId,
  defaultOrgId,
}) => {
  const isEditing = Boolean(initialInteraction);

  const [interactionType, setInteractionType] = useState<InteractionType>('meeting');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [details, setDetails] = useState('');
  const [location, setLocation] = useState('');
  const [occurredAt, setOccurredAt] = useState('');
  const [contactId, setContactId] = useState('');
  const [organizationId, setOrganizationId] = useState('');

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Format ISO date to local input format YYYY-MM-DDTHH:mm
  const toLocalInputFormat = (isoString?: string) => {
    const d = isoString ? new Date(isoString) : new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
      d.getHours()
    )}:${pad(d.getMinutes())}`;
  };

  useEffect(() => {
    if (isOpen) {
      // Load contacts & orgs for pickers
      apiClient
        .listContacts({ limit: 100 })
        .then((res) => setContacts(res.data))
        .catch(console.error);

      apiClient
        .listOrganizations({ limit: 100 })
        .then((res) => setOrganizations(res.data))
        .catch(console.error);

      if (initialInteraction) {
        setInteractionType(initialInteraction.interaction_type);
        setTitle(initialInteraction.title || '');
        setSummary(initialInteraction.summary || '');
        setDetails(initialInteraction.details || '');
        setLocation(initialInteraction.location || '');
        setOccurredAt(toLocalInputFormat(initialInteraction.occurred_at));
        setContactId(initialInteraction.contact_id || '');
        setOrganizationId(initialInteraction.organization_id || '');
      } else {
        setInteractionType('meeting');
        setTitle('');
        setSummary('');
        setDetails('');
        setLocation('');
        setOccurredAt(toLocalInputFormat());
        setContactId(defaultContactId || '');
        setOrganizationId(defaultOrgId || '');
      }
      setErrorMessage('');
    }
  }, [isOpen, initialInteraction, defaultContactId, defaultOrgId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Title or subject is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload: any = {
        interaction_type: interactionType,
        title: title.trim(),
        summary: summary.trim() || null,
        details: details.trim(),
        location: location.trim() || null,
        occurred_at: new Date(occurredAt).toISOString(),
        contact_id: contactId || null,
        organization_id: organizationId || null,
      };

      let saved: Interaction;
      if (isEditing && initialInteraction) {
        const res = await apiClient.updateInteraction(initialInteraction.id, payload);
        saved = res.data;
      } else {
        const res = await apiClient.createInteraction(payload);
        saved = res.data;
      }

      onSaved(saved);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record interaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>
            {isEditing ? 'Edit Interaction' : 'Record Interaction'}
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
            <div style={{ flex: 1 }}>
              <label className="label">Interaction Type *</label>
              <select
                className="select"
                value={interactionType}
                onChange={(e) => setInteractionType(e.target.value as any)}
              >
                <option value="meeting">Meeting</option>
                <option value="phone_call">Phone Call</option>
                <option value="email">Email</option>
                <option value="message">Message / Chat</option>
                <option value="in_person">In-Person Conversation</option>
                <option value="note">Quick Note</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div style={{ flex: 1.5 }}>
              <label className="label">Date & Time *</label>
              <input
                type="datetime-local"
                className="input"
                value={occurredAt}
                onChange={(e) => setOccurredAt(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label className="label">Title / Topic *</label>
            <input
              type="text"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q3 Architecture Review, Quick Catch-up"
              required
            />
          </div>

          <div style={styles.formRow}>
            <div style={styles.formCol}>
              <label className="label">Contact Person</label>
              <select
                className="select"
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
              >
                <option value="">-- No Contact Linked --</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.display_name}
                  </option>
                ))}
              </select>
            </div>
            <div style={styles.formCol}>
              <label className="label">Organization</label>
              <select
                className="select"
                value={organizationId}
                onChange={(e) => setOrganizationId(e.target.value)}
              >
                <option value="">-- No Organization Linked --</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={styles.formGroup}>
            <label className="label">Location / Platform (Optional)</label>
            <input
              type="text"
              className="input"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Coffee Shop, Zoom, Office"
            />
          </div>

          <div style={styles.formGroup}>
            <label className="label">Summary (Short Takeaway)</label>
            <input
              type="text"
              className="input"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Brief headline of what was agreed or discussed..."
            />
          </div>

          <div style={styles.formGroup}>
            <label className="label">Detailed Conversation Notes</label>
            <textarea
              className="textarea"
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Specific points, questions raised, key background details..."
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
                ? 'Update Record'
                : 'Save Interaction'}
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
