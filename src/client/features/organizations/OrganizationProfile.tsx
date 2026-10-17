import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft,
  Building2,
  Edit2,
  Archive,
  RotateCcw,
  Globe,
  Mail,
  Phone,
  MapPin,
  Users,
  MessageSquarePlus,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient.ts';
import type { Organization, Interaction } from '../../../shared/types/index.ts';
import { InteractionTimeline } from '../interactions/InteractionTimeline.tsx';
import { InteractionFormModal } from '../interactions/InteractionFormModal.tsx';
import { OrganizationFormModal } from './OrganizationFormModal.tsx';

interface OrganizationProfileProps {
  organizationId: string;
  onBack: () => void;
  onSelectContact?: (contactId: string) => void;
}

export const OrganizationProfile: React.FC<OrganizationProfileProps> = ({
  organizationId,
  onBack,
  onSelectContact,
}) => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [interactions, setInteractions] = useState<Interaction[]>([]);

  // Modals
  const [isEditOrgModalOpen, setIsEditOrgModalOpen] = useState(false);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [editingInteraction, setEditingInteraction] = useState<Interaction | null>(null);

  const loadData = useCallback(async () => {
    try {
      const orgRes = await apiClient.getOrganization(organizationId);
      setOrganization(orgRes.data);

      const timelineRes = await apiClient.listInteractions({
        organizationId,
        sort: 'occurred_at',
        order: 'desc',
        limit: 50,
      });
      setInteractions(timelineRes.data);
    } catch (err) {
      console.error('Failed to load organization profile:', err);
    }
  }, [organizationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!organization) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading organization profile...</p>
      </div>
    );
  }

  const handleArchiveRestore = async () => {
    try {
      if (organization.status === 'active') {
        if (confirm(`Archive ${organization.name}? Contacts will remain intact.`)) {
          await apiClient.archiveOrganization(organization.id);
          loadData();
        }
      } else {
        await apiClient.restoreOrganization(organization.id);
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={styles.profileContainer}>
      {/* Top Nav */}
      <div style={styles.topNav}>
        <button className="btn btn-secondary btn-sm" onClick={onBack}>
          <ArrowLeft size={14} />
          <span>Back to Organizations</span>
        </button>

        <div style={styles.topActions}>
          <button className="btn btn-secondary btn-sm" onClick={handleArchiveRestore}>
            {organization.status === 'active' ? (
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
            onClick={() => setIsEditOrgModalOpen(true)}
          >
            <Edit2 size={14} />
            <span>Edit Organization</span>
          </button>
        </div>
      </div>

      {/* Header Card */}
      <div className="card" style={styles.headerCard}>
        <div style={styles.headerRow}>
          <div style={styles.avatarLarge}>
            <Building2 size={28} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={styles.titleRow}>
              <h2 style={styles.orgName}>{organization.name}</h2>
              <span className="badge badge-primary">
                {organization.organization_type || 'Company'}
              </span>
              {organization.status === 'archived' && (
                <span className="badge badge-warning">Archived</span>
              )}
            </div>

            {organization.industry && (
              <div style={styles.orgIndustry}>{organization.industry}</div>
            )}
            {organization.description && (
              <p style={styles.orgDescription}>{organization.description}</p>
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

      {/* Columns: Left Details & Affiliated People, Right Timeline */}
      <div style={styles.columnsLayout}>
        <div style={styles.leftColumn}>
          {/* Details Card */}
          <div className="card" style={styles.infoCard}>
            <h4 style={styles.cardSectionTitle}>Organization Information</h4>
            <div style={styles.detailsList}>
              <div style={styles.infoItem}>
                <Globe size={15} color="var(--text-muted)" />
                <div>
                  <div style={styles.infoLabel}>Website</div>
                  {organization.website ? (
                    <a
                      href={organization.website.startsWith('http') ? organization.website : `https://${organization.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.infoValueLink}
                    >
                      {organization.website.replace(/^https?:\/\//, '')}
                    </a>
                  ) : (
                    <span style={styles.infoEmpty}>Not provided</span>
                  )}
                </div>
              </div>

              <div style={styles.infoItem}>
                <Mail size={15} color="var(--text-muted)" />
                <div>
                  <div style={styles.infoLabel}>Main Email</div>
                  {organization.email ? (
                    <a href={`mailto:${organization.email}`} style={styles.infoValueLink}>
                      {organization.email}
                    </a>
                  ) : (
                    <span style={styles.infoEmpty}>Not provided</span>
                  )}
                </div>
              </div>

              <div style={styles.infoItem}>
                <Phone size={15} color="var(--text-muted)" />
                <div>
                  <div style={styles.infoLabel}>Main Phone</div>
                  <span style={organization.phone ? styles.infoValue : styles.infoEmpty}>
                    {organization.phone || 'Not provided'}
                  </span>
                </div>
              </div>

              <div style={styles.infoItem}>
                <MapPin size={15} color="var(--text-muted)" />
                <div>
                  <div style={styles.infoLabel}>Office Address</div>
                  <span style={organization.address ? styles.infoValue : styles.infoEmpty}>
                    {organization.address || 'Not provided'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Affiliated Contacts Card */}
          <div className="card" style={styles.infoCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={16} color="var(--primary)" />
                <h4 style={styles.cardSectionTitle}>Associated People</h4>
              </div>
              <span className="badge badge-primary">
                {organization.contacts?.length || 0}
              </span>
            </div>

            {organization.contacts && organization.contacts.length > 0 ? (
              <div style={styles.contactList}>
                {organization.contacts.map((contact) => (
                  <div
                    key={contact.id}
                    style={styles.contactItem}
                    onClick={() => onSelectContact && onSelectContact(contact.contact_id)}
                  >
                    <div>
                      <div style={styles.contactPersonName}>{contact.display_name}</div>
                      <div style={styles.contactPersonTitle}>
                        {contact.job_title || 'No Title'}
                        {contact.department && ` • ${contact.department}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--text-light)', fontSize: '0.8125rem', fontStyle: 'italic' }}>
                No contacts affiliated with this organization yet.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Interaction Timeline */}
        <div style={styles.rightColumn}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={styles.timelineHeader}>
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Organization Timeline</h3>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Interactions and meetings involving {organization.name}
                </span>
              </div>
            </div>

            <InteractionTimeline
              interactions={interactions}
              onRefresh={loadData}
              onEditInteraction={(int) => {
                setEditingInteraction(int);
                setIsInteractionModalOpen(true);
              }}
              onSelectContact={onSelectContact}
            />
          </div>
        </div>
      </div>

      {/* Edit Org Modal */}
      <OrganizationFormModal
        isOpen={isEditOrgModalOpen}
        onClose={() => setIsEditOrgModalOpen(false)}
        initialOrg={organization}
        onSaved={() => loadData()}
      />

      {/* Record Interaction Modal */}
      <InteractionFormModal
        isOpen={isInteractionModalOpen}
        onClose={() => setIsInteractionModalOpen(false)}
        initialInteraction={editingInteraction}
        defaultOrgId={organization.id}
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
    borderRadius: '8px',
    backgroundColor: '#f1f5f9',
    color: 'var(--primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    flexWrap: 'wrap',
  },
  orgName: {
    fontSize: '1.375rem',
    fontWeight: 700,
    color: 'var(--text-main)',
    letterSpacing: '-0.01em',
  },
  orgIndustry: {
    fontSize: '0.875rem',
    color: 'var(--text-muted)',
    marginTop: '0.125rem',
  },
  orgDescription: {
    fontSize: '0.8125rem',
    color: 'var(--text-main)',
    marginTop: '0.5rem',
    lineHeight: 1.4,
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
  contactList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  contactItem: {
    padding: '0.5rem 0.75rem',
    backgroundColor: '#f8fafc',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-subtle)',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  contactPersonName: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--text-main)',
  },
  contactPersonTitle: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  timelineHeader: {
    marginBottom: '1rem',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '0.75rem',
  },
};
