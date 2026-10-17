import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Calendar } from 'lucide-react';
import { apiClient } from '../../services/apiClient.ts';
import type { Task, TaskPriority, Contact, Organization } from '../../../shared/types/index.ts';

interface TaskFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (task: Task) => void;
  initialTask?: Task | null;
  defaultContactId?: string;
  defaultOrgId?: string;
}

export const TaskFormModal: React.FC<TaskFormModalProps> = ({
  isOpen,
  onClose,
  onSaved,
  initialTask,
  defaultContactId,
  defaultOrgId,
}) => {
  const isEditing = Boolean(initialTask);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('normal');
  const [contactId, setContactId] = useState('');
  const [organizationId, setOrganizationId] = useState('');

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const getTodayDateString = () => new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (isOpen) {
      apiClient
        .listContacts({ limit: 100 })
        .then((res) => setContacts(res.data))
        .catch(console.error);

      apiClient
        .listOrganizations({ limit: 100 })
        .then((res) => setOrganizations(res.data))
        .catch(console.error);

      if (initialTask) {
        setTitle(initialTask.title || '');
        setDescription(initialTask.description || '');
        setDueDate(initialTask.due_date || getTodayDateString());
        setDueTime(initialTask.due_time || '');
        setPriority(initialTask.priority || 'normal');
        setContactId(initialTask.contact_id || '');
        setOrganizationId(initialTask.organization_id || '');
      } else {
        setTitle('');
        setDescription('');
        setDueDate(getTodayDateString());
        setDueTime('');
        setPriority('normal');
        setContactId(defaultContactId || '');
        setOrganizationId(defaultOrgId || '');
      }
      setErrorMessage('');
    }
  }, [isOpen, initialTask, defaultContactId, defaultOrgId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Task title is required');
      return;
    }
    if (!dueDate) {
      setErrorMessage('Due date is required');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim(),
        due_date: dueDate,
        due_time: dueTime || null,
        priority,
        contact_id: contactId || null,
        organization_id: organizationId || null,
      };

      let saved: Task;
      if (isEditing && initialTask) {
        const res = await apiClient.updateTask(initialTask.id, payload);
        saved = res.data;
      } else {
        const res = await apiClient.createTask(payload);
        saved = res.data;
      }

      onSaved(saved);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <div style={styles.header}>
          <h3 style={styles.title}>{isEditing ? 'Edit Follow-up' : 'New Follow-up Task'}</h3>
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
          <div style={styles.formGroup}>
            <label className="label">Task Title / Commitment *</label>
            <input
              type="text"
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Call back regarding architecture proposal"
              required
            />
          </div>

          <div style={styles.formRow}>
            <div style={{ flex: 1.5 }}>
              <label className="label">Due Date *</label>
              <input
                type="date"
                className="input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Due Time (Optional)</label>
              <input
                type="time"
                className="input"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Priority</label>
              <select
                className="select"
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div style={styles.formRow}>
            <div style={styles.formCol}>
              <label className="label">Link to Contact</label>
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
              <label className="label">Link to Organization</label>
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
            <label className="label">Task Notes / Description</label>
            <textarea
              className="textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Context, promised deliverables, contact details or reference notes..."
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
              {isSubmitting ? 'Saving...' : isEditing ? 'Update Task' : 'Create Follow-up'}
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
    maxWidth: '560px',
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
