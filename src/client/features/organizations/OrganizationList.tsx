import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Plus,
  Archive,
  RotateCcw,
  Trash2,
  Building2,
  Globe,
  Mail,
  Phone,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient.ts';
import type { Organization, EntityStatus } from '../../../shared/types/index.ts';
import { OrganizationFormModal } from './OrganizationFormModal.tsx';

interface OrganizationListProps {
  onSelectOrganization?: (orgId: string) => void;
  externalSearch?: string;
}

export const OrganizationList: React.FC<OrganizationListProps> = ({
  onSelectOrganization,
  externalSearch = '',
}) => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [search, setSearch] = useState(externalSearch);
  const [status, setStatus] = useState<EntityStatus | 'all'>('active');
  const [sort, setSort] = useState('name');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);

  const fetchOrganizations = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.listOrganizations({
        search: search.trim() || undefined,
        status,
        sort,
        order,
        page,
        limit,
      });
      setOrganizations(res.data);
      if (res.meta) {
        setTotal(res.meta.total);
      }
    } catch (err) {
      console.error('Failed to load organizations:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, status, sort, order, page, limit]);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  useEffect(() => {
    if (externalSearch !== search) {
      setSearch(externalSearch);
      setPage(1);
    }
  }, [externalSearch]);

  const handleArchiveRestore = async (e: React.MouseEvent, org: Organization) => {
    e.stopPropagation();
    try {
      if (org.status === 'active') {
        if (confirm(`Archive ${org.name}? Associated contacts will remain intact.`)) {
          await apiClient.archiveOrganization(org.id);
          fetchOrganizations();
        }
      } else {
        await apiClient.restoreOrganization(org.id);
        fetchOrganizations();
      }
    } catch (err) {
      console.error('Failed to archive/restore organization:', err);
    }
  };

  const handleDelete = async (e: React.MouseEvent, org: Organization) => {
    e.stopPropagation();
    if (
      confirm(
        `Are you sure you want to permanently delete ${org.name}? Contacts associated with it will remain, but relationship links will be removed.`
      )
    ) {
      try {
        await apiClient.deleteOrganization(org.id);
        fetchOrganizations();
      } catch (err) {
        console.error('Failed to delete organization:', err);
      }
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div style={styles.container}>
      {/* Control / Filter Bar */}
      <div style={styles.controlBar}>
        <div style={styles.filterRow}>
          <div style={styles.searchBox}>
            <Search size={15} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search companies, industry, notes..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={styles.filterInput}
            />
          </div>

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
            <option value="all">All Organizations</option>
          </select>

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
            <option value="created_at-desc">Created Date (Newest)</option>
            <option value="updated_at-desc">Updated Date (Newest)</option>
          </select>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingOrg(null);
            setIsModalOpen(true);
          }}
        >
          <Plus size={16} />
          <span>Add Organization</span>
        </button>
      </div>

      {/* Table / List */}
      {organizations.length === 0 && !isLoading ? (
        <div className="card" style={styles.emptyState}>
          <div style={styles.emptyIconCircle}>
            <Building2 size={32} color="var(--primary)" />
          </div>
          <h4 style={{ fontSize: '1.125rem', fontWeight: 600, marginTop: '0.75rem' }}>
            {search || status !== 'active'
              ? 'No matching organizations found'
              : 'No organizations yet'}
          </h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {search || status !== 'active'
              ? 'Try adjusting your search criteria.'
              : 'Add companies, institutions, or groups affiliated with your contacts.'}
          </p>
          <button
            className="btn btn-primary"
            style={{ marginTop: '1rem' }}
            onClick={() => {
              if (search || status !== 'active') {
                setSearch('');
                setStatus('active');
                setPage(1);
              } else {
                setEditingOrg(null);
                setIsModalOpen(true);
              }
            }}
          >
            {search || status !== 'active' ? 'Reset Filters' : 'Add First Organization'}
          </button>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Organization Name</th>
                <th>Type & Industry</th>
                <th>Contacts</th>
                <th>Contact Details</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {organizations.map((org) => (
                <tr
                  key={org.id}
                  onClick={() => onSelectOrganization && onSelectOrganization(org.id)}
                  style={{ cursor: onSelectOrganization ? 'pointer' : 'default' }}
                >
                  {/* Name */}
                  <td>
                    <div style={styles.nameCell}>
                      <div style={styles.avatar}>
                        <Building2 size={16} />
                      </div>
                      <div>
                        <div style={styles.orgName}>
                          {org.name}
                          {org.status === 'archived' && (
                            <span className="badge badge-warning" style={{ marginLeft: 6 }}>
                              Archived
                            </span>
                          )}
                        </div>
                        {org.description && (
                          <div style={styles.orgDesc}>{org.description}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Type & Industry */}
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.8125rem', fontWeight: 500 }}>
                        {org.organization_type || 'Company'}
                      </span>
                      {org.industry && (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {org.industry}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Contacts Count */}
                  <td>
                    <span className="badge badge-primary">
                      <Users size={12} />
                      <span>{org.contacts_count || 0} affiliated</span>
                    </span>
                  </td>

                  {/* Details */}
                  <td>
                    <div style={styles.contactDetailsCell}>
                      {org.website && (
                        <div style={styles.detailItem}>
                          <Globe size={12} color="var(--text-muted)" />
                          <a
                            href={org.website.startsWith('http') ? org.website : `https://${org.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: 'var(--primary)' }}
                          >
                            {org.website.replace(/^https?:\/\//, '')}
                          </a>
                        </div>
                      )}
                      {org.email && (
                        <div style={styles.detailItem}>
                          <Mail size={12} color="var(--text-muted)" />
                          <a
                            href={`mailto:${org.email}`}
                            onClick={(e) => e.stopPropagation()}
                            style={{ color: 'var(--primary)' }}
                          >
                            {org.email}
                          </a>
                        </div>
                      )}
                      {org.phone && (
                        <div style={styles.detailItem}>
                          <Phone size={12} color="var(--text-muted)" />
                          <span>{org.phone}</span>
                        </div>
                      )}
                      {!org.website && !org.email && !org.phone && (
                        <span style={{ color: 'var(--text-light)', fontSize: '0.8125rem' }}>—</span>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td style={{ textAlign: 'right' }}>
                    <div style={styles.actionButtons}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingOrg(org);
                          setIsModalOpen(true);
                        }}
                        title="Edit Organization"
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={(e) => handleArchiveRestore(e, org)}
                        title={org.status === 'active' ? 'Archive' : 'Restore'}
                      >
                        {org.status === 'active' ? <Archive size={13} /> : <RotateCcw size={13} />}
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={(e) => handleDelete(e, org)}
                        title="Delete Organization"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer */}
      {total > 0 && (
        <div style={styles.paginationBar}>
          <span style={styles.paginationText}>
            Showing {(page - 1) * limit + 1} - {Math.min(page * limit, total)} of {total} organizations
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

      {/* Organization Form Modal */}
      <OrganizationFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialOrg={editingOrg}
        onSaved={() => {
          fetchOrganizations();
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
    borderRadius: '6px',
    backgroundColor: '#f1f5f9',
    color: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  orgName: {
    fontWeight: 600,
    fontSize: '0.875rem',
    color: 'var(--text-main)',
  },
  orgDesc: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    maxWidth: '300px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
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
