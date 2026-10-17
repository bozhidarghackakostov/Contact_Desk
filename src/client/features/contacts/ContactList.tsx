import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Star,
  Archive,
  RotateCcw,
  Trash2,
  Building2,
  Mail,
  Phone,
  Calendar,
  ChevronLeft,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient.ts';
import type { Contact, EntityStatus, Tag } from '../../../shared/types/index.ts';
import { ContactFormModal } from './ContactFormModal.tsx';

interface ContactListProps {
  onSelectContact?: (contactId: string) => void;
  externalSearch?: string;
}

export const ContactList: React.FC<ContactListProps> = ({
  onSelectContact,
  externalSearch = '',
}) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState(externalSearch);
  const [status, setStatus] = useState<EntityStatus | 'all'>('active');
  const [selectedTagId, setSelectedTagId] = useState<string>('');
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [sort, setSort] = useState('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  useEffect(() => {
    apiClient.listTags().then((res) => setAvailableTags(res.data)).catch(console.error);
  }, []);

  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.listContacts({
        search: search.trim() || undefined,
        status,
        tagId: selectedTagId || undefined,
        isFavorite: isFavorite ? true : undefined,
        sort,
        order,
        page,
        limit,
      });
      setContacts(res.data);
      if (res.meta) {
        setTotal(res.meta.total);
      }
    } catch (err) {
      console.error('Failed to load contacts:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, status, selectedTagId, isFavorite, sort, order, page, limit]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    if (externalSearch !== search) {
      setSearch(externalSearch);
      setPage(1);
    }
  }, [externalSearch]);

  const handleToggleFavorite = async (e: React.MouseEvent, contact: Contact) => {
    e.stopPropagation();
    try {
      const newStatus = contact.is_favorite ? 0 : 1;
      await apiClient.updateContact(contact.id, { is_favorite: newStatus as any });
      fetchContacts();
    } catch (err) {
      console.error('Failed to update favorite status:', err);
    }
  };

  const handleArchiveRestore = async (e: React.MouseEvent, contact: Contact) => {
    e.stopPropagation();
    try {
      if (contact.status === 'active') {
        if (confirm(`Archive ${contact.display_name}?`)) {
          await apiClient.archiveContact(contact.id);
          fetchContacts();
        }
      } else {
        await apiClient.restoreContact(contact.id);
        fetchContacts();
      }
    } catch (err) {
      console.error('Failed to archive/restore contact:', err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, contact: Contact) => {
    e.stopPropagation();
    if (
      confirm(
        `Are you sure you want to permanently delete ${contact.display_name}? This cannot be undone.`
      )
    ) {
      try {
        await apiClient.deleteContact(contact.id);
        fetchContacts();
      } catch (err) {
        console.error('Failed to delete contact:', err);
      }
    }
  };

  const getInitials = (contact: Contact) => {
    if (contact.first_name || contact.last_name) {
      return `${contact.first_name?.[0] || ''}${contact.last_name?.[0] || ''}`.toUpperCase();
    }
    return contact.display_name.slice(0, 2).toUpperCase();
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div style={styles.container}>
      {/* Control / Filter Bar */}
      <div style={styles.controlBar}>
        <div style={styles.filterRow}>
          {/* Search Box */}
          <div style={styles.searchBox}>
            <Search size={15} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Filter by name, email, company, notes..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={styles.filterInput}
            />
          </div>

          {/* Status Filter */}
          <select
            className="select"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as any);
              setPage(1);
            }}
            style={{ width: 'auto', minWidth: '110px' }}
          >
            <option value="active">Active</option>
            <option value="archived">Archived</option>
            <option value="all">All Contacts</option>
          </select>

          {/* Tag Filter */}
          <select
            className="select"
            value={selectedTagId}
            onChange={(e) => {
              setSelectedTagId(e.target.value);
              setPage(1);
            }}
            style={{ width: 'auto', minWidth: '120px' }}
          >
            <option value="">All Tags</option>
            {availableTags.map((t) => (
              <option key={t.id} value={t.id}>
                #{t.name} ({t.contacts_count ?? 0})
              </option>
            ))}
          </select>

          {/* Favorite Toggle Button */}
          <button
            className={`btn ${isFavorite ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            onClick={() => {
              setIsFavorite(!isFavorite);
              setPage(1);
            }}
            title="Filter Favorites"
          >
            <Star size={14} fill={isFavorite ? '#ffffff' : 'none'} />
            <span>Favorites</span>
          </button>

          {/* Sort Selector */}
          <select
            className="select"
            value={`${sort}-${order}`}
            onChange={(e) => {
              const [newSort, newOrder] = e.target.value.split('-');
              setSort(newSort);
              setOrder(newOrder as any);
            }}
            style={{ width: 'auto', minWidth: '150px' }}
          >
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="last_interaction-desc">Last Interaction (Newest)</option>
            <option value="created_at-desc">Created Date (Newest)</option>
            <option value="updated_at-desc">Updated Date (Newest)</option>
          </select>
        </div>

        {/* Create Contact Action */}
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingContact(null);
            setIsModalOpen(true);
          }}
        >
          <Plus size={16} />
          <span>Add Contact</span>
        </button>
      </div>

      {/* Contact Table / View */}
      {contacts.length === 0 && !isLoading ? (
        <div className="card" style={styles.emptyState}>
          <div style={styles.emptyIconCircle}>
            <UserCheck size={32} color="var(--primary)" />
          </div>
          <h4 style={{ fontSize: '1.125rem', fontWeight: 600, marginTop: '0.75rem' }}>
            {search || isFavorite || status !== 'active'
              ? 'No matching contacts found'
              : 'No contacts yet'}
          </h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {search || isFavorite || status !== 'active'
              ? 'Try modifying or clearing your filters.'
              : 'Start building your private relationship directory.'}
          </p>
          <button
            className="btn btn-primary"
            style={{ marginTop: '1rem' }}
            onClick={() => {
              if (search || isFavorite || status !== 'active') {
                setSearch('');
                setIsFavorite(false);
                setStatus('active');
                setPage(1);
              } else {
                setEditingContact(null);
                setIsModalOpen(true);
              }
            }}
          >
            {search || isFavorite || status !== 'active' ? 'Reset Filters' : 'Add First Contact'}
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th style={{ width: '36px' }}></th>
                <th>Name & Title</th>
                <th>Organization</th>
                <th>Email & Phone</th>
                <th>Tags</th>
                <th>Last Interaction</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => {
                const primaryOrg = contact.organizations?.[0];
                return (
                  <tr
                    key={contact.id}
                    onClick={() => onSelectContact && onSelectContact(contact.id)}
                    style={{ cursor: onSelectContact ? 'pointer' : 'default' }}
                  >
                    {/* Favorite Star */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={(e) => handleToggleFavorite(e, contact)}
                        style={{ cursor: 'pointer', background: 'none' }}
                        title={contact.is_favorite ? 'Favorited' : 'Add to favorites'}
                      >
                        <Star
                          size={16}
                          fill={contact.is_favorite ? 'var(--warning)' : 'none'}
                          color={contact.is_favorite ? 'var(--warning)' : '#cbd5e1'}
                        />
                      </button>
                    </td>

                    {/* Name & Title */}
                    <td>
                      <div style={styles.nameCell}>
                        <div style={styles.avatar}>{getInitials(contact)}</div>
                        <div>
                          <div style={styles.contactName}>
                            {contact.display_name}
                            {contact.nickname && (
                              <span style={styles.nickname}> ({contact.nickname})</span>
                            )}
                            {contact.status === 'archived' && (
                              <span className="badge badge-warning" style={{ marginLeft: 6 }}>
                                Archived
                              </span>
                            )}
                          </div>
                          {contact.job_title && (
                            <div style={styles.jobTitle}>{contact.job_title}</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Organization */}
                    <td>
                      {primaryOrg ? (
                        <div style={styles.orgCell}>
                          <Building2 size={13} color="var(--text-muted)" />
                          <span>{primaryOrg.organization_name}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-light)', fontSize: '0.8125rem' }}>—</span>
                      )}
                    </td>

                    {/* Email & Phone */}
                    <td>
                      <div style={styles.contactDetailsCell}>
                        {contact.primary_email && (
                          <div style={styles.detailItem}>
                            <Mail size={12} color="var(--text-muted)" />
                            <a
                              href={`mailto:${contact.primary_email}`}
                              onClick={(e) => e.stopPropagation()}
                              style={{ color: 'var(--primary)' }}
                            >
                              {contact.primary_email}
                            </a>
                          </div>
                        )}
                        {contact.primary_phone && (
                          <div style={styles.detailItem}>
                            <Phone size={12} color="var(--text-muted)" />
                            <span>{contact.primary_phone}</span>
                          </div>
                        )}
                        {!contact.primary_email && !contact.primary_phone && (
                          <span style={{ color: 'var(--text-light)', fontSize: '0.8125rem' }}>—</span>
                        )}
                      </div>
                    </td>

                    {/* Tags */}
                    <td>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {contact.tags && contact.tags.length > 0 ? (
                          contact.tags.map((tag) => (
                            <span key={tag.id} className="badge badge-primary">
                              {tag.name}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: 'var(--text-light)', fontSize: '0.8125rem' }}>—</span>
                        )}
                      </div>
                    </td>

                    {/* Last Interaction */}
                    <td>
                      {contact.last_interaction_at ? (
                        <div style={styles.dateCell}>
                          <Calendar size={13} color="var(--text-muted)" />
                          <span>{contact.last_interaction_at.slice(0, 10)}</span>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-light)', fontSize: '0.8125rem' }}>
                          No interactions
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={styles.actionButtons}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingContact(contact);
                            setIsModalOpen(true);
                          }}
                          title="Edit Contact"
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={(e) => handleArchiveRestore(e, contact)}
                          title={contact.status === 'active' ? 'Archive Contact' : 'Restore Contact'}
                        >
                          {contact.status === 'active' ? (
                            <Archive size={13} />
                          ) : (
                            <RotateCcw size={13} />
                          )}
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={(e) => handleDelete(e, contact)}
                          title="Delete Contact"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {total > 0 && (
        <div style={styles.paginationBar}>
          <span style={styles.paginationText}>
            Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total} contacts
          </span>
          <div style={styles.paginationButtons}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <span style={styles.pageIndicator}>
              Page {page} of {totalPages}
            </span>
            <button
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Contact Form Modal */}
      <ContactFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialContact={editingContact}
        onSaved={() => {
          fetchContacts();
        }}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  controlBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  filterRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    flexWrap: 'wrap',
    flex: 1,
  },
  searchBox: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    minWidth: '240px',
    flex: 1,
  },
  searchIcon: {
    position: 'absolute',
    left: '0.75rem',
    color: 'var(--text-light)',
    pointerEvents: 'none',
  },
  filterInput: {
    width: '100%',
    padding: '0.45rem 0.75rem 0.45rem 2.25rem',
    backgroundColor: 'var(--bg-surface)',
    border: '1px solid var(--border-strong)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.8125rem',
  },
  emptyState: {
    textAlign: 'center',
    padding: '3rem 1.5rem',
  },
  emptyIconCircle: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
  },
  nameCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  avatar: {
    width: '34px',
    height: '34px',
    borderRadius: '50%',
    backgroundColor: '#e2e8f0',
    color: '#334155',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 600,
    flexShrink: 0,
  },
  contactName: {
    fontWeight: 600,
    fontSize: '0.875rem',
    color: 'var(--text-main)',
  },
  nickname: {
    fontWeight: 400,
    color: 'var(--text-muted)',
    fontSize: '0.8125rem',
  },
  jobTitle: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  orgCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.8125rem',
  },
  contactDetailsCell: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
    fontSize: '0.75rem',
  },
  detailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
  },
  dateCell: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.8125rem',
    color: 'var(--text-muted)',
  },
  actionButtons: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.375rem',
  },
  paginationBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.5rem 0',
  },
  paginationText: {
    fontSize: '0.8125rem',
    color: 'var(--text-muted)',
  },
  paginationButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  pageIndicator: {
    fontSize: '0.8125rem',
    color: 'var(--text-muted)',
    padding: '0 0.5rem',
  },
};
