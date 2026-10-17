import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Star,
  Edit2,
  Archive,
  RotateCcw,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  Building2,
  Plus,
  Save,
  MessageSquarePlus,
  X,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient.ts';
import type { Contact, Interaction } from '../../../shared/types/index.ts';
import { InteractionTimeline } from '../interactions/InteractionTimeline.tsx';
import { InteractionFormModal } from '../interactions/InteractionFormModal.tsx';
import { ContactFormModal } from './ContactFormModal.tsx';

interface ContactProfileProps {
  contactId: string;
  onBack: () => void;
  onSelectOrg?: (orgId: string) => void;
}

export const ContactProfile: React.FC<ContactProfileProps> = ({
  contactId,
  onBack,
  onSelectOrg,
}) => {
  const [contact, setContact] = useState<Contact | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [notesText, setNotesText] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [notesSavedSuccess, setNotesSavedSuccess] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

  // Modals
  const [isEditContactModalOpen, setIsEditContactModalOpen] = useState(false);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [editingInteraction, setEditingInteraction] = useState<Interaction | null>(null);

  // Interaction filter
  const [interactionTypeFilter, setInteractionTypeFilter] = useState('all');

  const loadData = useCallback(async () => {
    try {
      const contactRes = await apiClient.getContact(contactId);
      setContact(contactRes.data);
      setNotesText(contactRes.data.notes || '');

      const timelineRes = await apiClient.listInteractions({
        contactId,
        type: interactionTypeFilter === 'all' ? undefined : (interactionTypeFilter as any),
        sort: 'occurred_at',
        order: 'desc',
        limit: 50,
      });
      setInteractions(timelineRes.data);
    } catch (err) {
      console.error('Failed to load contact profile:', err);
    }
  }, [contactId, interactionTypeFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!contact) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading contact profile...</p>
      </div>
    );
  }

  const handleToggleFavorite = async () => {
    try {
      const newStatus = contact.is_favorite ? 0 : 1;
      await apiClient.updateContact(contact.id, { is_favorite: newStatus as any });
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleArchiveRestore = async () => {
    try {
      if (contact.status === 'active') {
        if (confirm(`Archive ${contact.display_name}?`)) {
          await apiClient.archiveContact(contact.id);
          loadData();
        }
      } else {
        await apiClient.restoreContact(contact.id);
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveNotes = async () => {
    setIsSavingNotes(true);
    try {
      await apiClient.updateContact(contact.id, { notes: notesText });
      setNotesSavedSuccess(true);
      setTimeout(() => setNotesSavedSuccess(false), 2000);
      loadData();
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleAddTag = async () => {
    if (!newTagInput.trim() || !contact) return;
    try {
      const currentTagNames = (contact.tags || []).map((t) => t.name);
      if (!currentTagNames.includes(newTagInput.trim())) {
        const updatedTags = [...currentTagNames, newTagInput.trim()];
        await apiClient.setContactTags(contact.id, updatedTags);
        setNewTagInput('');
        setIsAddingTag(false);
        loadData();
      } else {
        setIsAddingTag(false);
        setNewTagInput('');
      }
    } catch (err) {
      console.error('Failed to add tag:', err);
    }
  };

  const handleRemoveTag = async (tagName: string) => {
    if (!contact) return;
    try {
      const remaining = (contact.tags || [])
        .map((t) => t.name)
        .filter((name) => name !== tagName);
      await apiClient.setContactTags(contact.id, remaining);
      loadData();
    } catch (err) {
      console.error('Failed to remove tag:', err);
    }
  };

  const getInitials = (c: Contact) => {
    if (c.first_name || c.last_name) {
      return `${c.first_name?.[0] || ''}${c.last_name?.[0] || ''}`.toUpperCase();
    }
    return c.display_name.slice(0, 2).toUpperCase();
  };

  return (
    <div style={styles.profileContainer}>
      {/* Navigation Top Bar */}
      <div style={styles.topNav}>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={14} />
          <span>Back to Contacts</span>
        </button>

        <div style={styles.topActions}>
          <button
            className={`btn ${contact.is_favorite ? 'btn-secondary' : 'btn-secondary'} btn-sm`}
            onClick={handleToggleFavorite}
            title={contact.is_favorite ? 'Favorited' : 'Add to favorites'}
          >
            <Star
              size={14}
              fill={contact.is_favorite ? 'var(--warning)' : 'none'}
              color={contact.is_favorite ? 'var(--warning)' : 'var(--text-muted)'}
            />
            <span>{contact.is_favorite ? 'Favorite' : 'Add Favorite'}</span>
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={handleArchiveRestore}
          >
            {contact.status === 'active' ? (
              <>
                <Archive size={14} />
                <span>Archive</span>
              </>
            ) : (
              <>
                <RotateCcw size={14} />
                <span>Restore</span>
              </>
            )}
          </button>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setIsEditContactModalOpen(true)}
          >
            <Edit2 size={14} />
            <span>Edit Profile</span>
          </button>
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="card" style={styles.headerCard}>
        <div style={styles.headerRow}>
          <div style={styles.avatarLarge}>{getInitials(contact)}</div>
          <div style={{ flex: 1 }}>
            <div style={styles.titleRow}>
              <h2 style={styles.contactName}>{contact.display_name}</h2>
              {contact.nickname && (
                <span style={styles.nicknameTag}>"{contact.nickname}"</span>
              )}
              {contact.status === 'archived' && (
                <span className="badge badge-warning">Archived</span>
              )}
            </div>

            {contact.job_title && (
              <div style={styles.contactTitle}>{contact.job_title}</div>
            )}

            {/* Organizations chips */}
            {contact.organizations && contact.organizations.length > 0 && (
              <div style={styles.orgList}>
                {contact.organizations.map((org) => (
                  <button
                    key={org.id}
                    style={styles.orgChip}
                    onClick={() => onSelectOrg && onSelectOrg(org.organization_id)}
                    title="View Organization Profile"
                  >
                    <Building2 size={13} color="var(--primary)" />
                    <span style={{ fontWeight: 600 }}>{org.organization_name}</span>
                    {org.job_title && (
                      <span style={{ color: 'var(--text-muted)' }}>• {org.job_title}</span>
                    )}
                    {org.department && (
                      <span style={{ color: 'var(--text-light)', fontSize: '0.7rem' }}>
                        ({org.department})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingInteraction(null);
              setIsInteractionModalOpen(true);
            }}
          >
            <MessageSquarePlus size={16} />
            <span>Record Interaction</span>
          </button>
        </div>
      </div>

      {/* Two Column Layout: Left Details, Right Timeline */}
      <div style={styles.columnsLayout}>
        {/* Left Column: Details & General Notes */}
        <div style={styles.leftColumn}>
          {/* Contact Details Card */}
          <div className="card" style={styles.infoCard}>
            <h4 style={styles.cardSectionTitle}>Contact Details</h4>
            <div style={styles.detailsList}>
              <div style={styles.infoItem}>
                <Mail size={15} color="var(--text-muted)" />
                <div>
                  <div style={styles.infoLabel}>Primary Email</div>
                  {contact.primary_email ? (
                    <a href={`mailto:${contact.primary_email}`} style={styles.infoValueLink}>
                      {contact.primary_email}
                    </a>
                  ) : (
                    <span style={styles.infoEmpty}>Not provided</span>
                  )}
                </div>
              </div>

              <div style={styles.infoItem}>
                <Phone size={15} color="var(--text-muted)" />
                <div>
                  <div style={styles.infoLabel}>Primary Phone</div>
                  {contact.primary_phone ? (
                    <a href={`tel:${contact.primary_phone}`} style={styles.infoValueLink}>
                      {contact.primary_phone}
                    </a>
                  ) : (
                    <span style={styles.infoEmpty}>Not provided</span>
                  )}
                </div>
              </div>

              <div style={styles.infoItem}>
                <Globe size={15} color="var(--text-muted)" />
                <div>
                  <div style={styles.infoLabel}>Website / Profile</div>
                  {contact.website ? (
                    <a
                      href={contact.website.startsWith('http') ? contact.website : `https://${contact.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.infoValueLink}
                    >
                      {contact.website.replace(/^https?:\/\//, '')}
                    </a>
                  ) : (
                    <span style={styles.infoEmpty}>Not provided</span>
                  )}
                </div>
              </div>

              <div style={styles.infoItem}>
                <Calendar size={15} color="var(--text-muted)" />
                <div>
                  <div style={styles.infoLabel}>Birthday</div>
                  <span style={contact.birthday ? styles.infoValue : styles.infoEmpty}>
                    {contact.birthday || 'Not provided'}
                  </span>
                </div>
              </div>

              <div style={styles.infoItem}>
                <MapPin size={15} color="var(--text-muted)" />
                <div>
                  <div style={styles.infoLabel}>Address / Location</div>
                  <span style={contact.address ? styles.infoValue : styles.infoEmpty}>
                    {contact.address || 'Not provided'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tags Card */}
          <div className="card" style={styles.infoCard}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '0.75rem',
              }}
            >
              <h4 style={styles.cardSectionTitle}>Tags</h4>
              {!isAddingTag && (
                <button
                  className="btn btn-secondary btn-sm"
                  style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                  onClick={() => setIsAddingTag(true)}
                >
                  <Plus size={12} />
                  <span>Add Tag</span>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
              {contact.tags && contact.tags.length > 0 ? (
                contact.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="badge badge-primary"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      padding: '0.25rem 0.55rem',
                    }}
                  >
                    <span>#{tag.name}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag.name)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: 0,
                      }}
                      title={`Remove tag ${tag.name}`}
                    >
                      <X size={12} color="var(--primary)" />
                    </button>
                  </span>
                ))
              ) : (
                <span style={styles.infoEmpty}>No tags assigned</span>
              )}
            </div>

            {isAddingTag && (
              <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="New tag name..."
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTag();
                    else if (e.key === 'Escape') setIsAddingTag(false);
                  }}
                  autoFocus
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.6rem' }}
                />
                <button className="btn btn-primary btn-sm" onClick={handleAddTag}>
                  Save
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => {
                    setIsAddingTag(false);
                    setNewTagInput('');
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          {/* General Notes Card */}
          <div className="card" style={styles.infoCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h4 style={styles.cardSectionTitle}>Background Notes</h4>
              {notesSavedSuccess && (
                <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>
                  ✓ Saved
                </span>
              )}
            </div>
            <textarea
              className="textarea"
              rows={5}
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              placeholder="Background context, meeting origins, key personal or professional details..."
              style={{ marginTop: '0.5rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleSaveNotes}
                disabled={isSavingNotes || notesText === contact.notes}
              >
                <Save size={13} />
                <span>{isSavingNotes ? 'Saving...' : 'Save Notes'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Interaction History Timeline */}
        <div style={styles.rightColumn}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={styles.timelineHeader}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Interaction History</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Reverse chronological record of touchpoints
                </span>
              </div>

              {/* Type Filter */}
              <select
                className="select"
                value={interactionTypeFilter}
                onChange={(e) => setInteractionTypeFilter(e.target.value)}
                style={{ width: 'auto', minWidth: '130px', fontSize: '0.75rem' }}
              >
                <option value="all">All Types</option>
                <option value="meeting">Meetings</option>
                <option value="phone_call">Phone Calls</option>
                <option value="email">Emails</option>
                <option value="message">Messages</option>
                <option value="in_person">In-Person</option>
                <option value="note">Notes</option>
              </select>
            </div>

            <InteractionTimeline
              interactions={interactions}
              onRefresh={loadData}
              onEditInteraction={(int) => {
                setEditingInteraction(int);
                setIsInteractionModalOpen(true);
              }}
              onSelectOrg={onSelectOrg}
            />
          </div>
        </div>
      </div>

      {/* Edit Contact Modal */}
      <ContactFormModal
        isOpen={isEditContactModalOpen}
        onClose={() => setIsEditContactModalOpen(false)}
        initialContact={contact}
        onSaved={() => loadData()}
      />

      {/* Record Interaction Modal */}
      <InteractionFormModal
        isOpen={isInteractionModalOpen}
        onClose={() => setIsInteractionModalOpen(false)}
        initialInteraction={editingInteraction}
        defaultContactId={contact.id}
        defaultOrgId={contact.organizations?.[0]?.organization_id}
        onSaved={() => loadData()}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  profileContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  topNav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  headerCard: {
    padding: '1.5rem',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    flexWrap: 'wrap',
  },
  avatarLarge: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-subtle)',
    color: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.25rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    flexWrap: 'wrap',
  },
  contactName: {
    fontSize: '1.375rem',
    fontWeight: 700,
    color: 'var(--text-main)',
    letterSpacing: '-0.01em',
  },
  nicknameTag: {
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
  },
  contactTitle: {
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
    marginTop: '0.125rem',
  },
  orgList: {
    display: 'flex',
    gap: '0.5rem',
    marginTop: '0.5rem',
    flexWrap: 'wrap',
  },
  orgChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.2rem 0.6rem',
    backgroundColor: '#f8fafc',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.75rem',
    cursor: 'pointer',
  },
  columnsLayout: {
    display: 'grid',
    gridTemplateColumns: '320px 1fr',
    gap: '1rem',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  rightColumn: {
    display: 'flex',
    flexDirection: 'column',
  },
  infoCard: {
    padding: '1.25rem',
  },
  cardSectionTitle: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: 'var(--text-main)',
  },
  detailsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    marginTop: '0.75rem',
  },
  infoItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
  },
  infoLabel: {
    fontSize: '0.7rem',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  infoValue: {
    fontSize: '0.8125rem',
    color: 'var(--text-main)',
  },
  infoValueLink: {
    fontSize: '0.8125rem',
    color: 'var(--primary)',
    wordBreak: 'break-all',
  },
  infoEmpty: {
    fontSize: '0.8125rem',
    color: 'var(--text-light)',
    fontStyle: 'italic',
  },
  timelineHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '1rem',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '0.75rem',
  },
};
