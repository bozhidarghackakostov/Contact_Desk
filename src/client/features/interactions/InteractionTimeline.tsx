import React, { useState } from 'react';
import {
  Users,
  Phone,
  Mail,
  MessageSquare,
  UserCheck,
  FileText,
  Sparkles,
  MapPin,
  Calendar,
  Building2,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { Interaction, InteractionType } from '../../../shared/types/index.ts';
import { apiClient } from '../../services/apiClient.ts';

interface InteractionTimelineProps {
  interactions: Interaction[];
  onRefresh: () => void;
  onEditInteraction: (interaction: Interaction) => void;
  onSelectContact?: (contactId: string) => void;
  onSelectOrg?: (orgId: string) => void;
}

export const InteractionTimeline: React.FC<InteractionTimelineProps> = ({
  interactions,
  onRefresh,
  onEditInteraction,
  onSelectContact,
  onSelectOrg,
}) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async (interaction: Interaction) => {
    if (confirm(`Delete interaction "${interaction.title}"?`)) {
      try {
        await apiClient.deleteInteraction(interaction.id);
        onRefresh();
      } catch (err) {
        console.error('Failed to delete interaction:', err);
      }
    }
  };

  const getInteractionIcon = (type: InteractionType) => {
    switch (type) {
      case 'meeting':
        return <Users size={16} color="var(--primary)" />;
      case 'phone_call':
        return <Phone size={16} color="#0284c7" />;
      case 'email':
        return <Mail size={16} color="#7c3aed" />;
      case 'message':
        return <MessageSquare size={16} color="#059669" />;
      case 'in_person':
        return <UserCheck size={16} color="#d97706" />;
      case 'note':
        return <FileText size={16} color="#475569" />;
      default:
        return <Sparkles size={16} color="#6366f1" />;
    }
  };

  const getTypeLabel = (type: InteractionType) => {
    switch (type) {
      case 'meeting':
        return 'Meeting';
      case 'phone_call':
        return 'Phone Call';
      case 'email':
        return 'Email';
      case 'message':
        return 'Message';
      case 'in_person':
        return 'In-Person';
      case 'note':
        return 'Note';
      default:
        return 'Other';
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  if (interactions.length === 0) {
    return (
      <div className="card" style={styles.emptyCard}>
        <Calendar size={28} color="var(--text-light)" />
        <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          No recorded interactions yet.
        </p>
      </div>
    );
  }

  return (
    <div style={styles.timeline}>
      {interactions.map((item, index) => {
        const isExpanded = expandedIds.has(item.id);
        const hasDetails = item.details && item.details.trim().length > 0;

        return (
          <div key={item.id} style={styles.timelineItem}>
            {/* Timeline Line & Node */}
            <div style={styles.nodeColumn}>
              <div style={styles.iconCircle}>{getInteractionIcon(item.interaction_type)}</div>
              {index < interactions.length - 1 && <div style={styles.verticalLine} />}
            </div>

            {/* Content Card */}
            <div style={styles.contentCard}>
              <div style={styles.itemHeader}>
                <div style={styles.headerLeft}>
                  <span className="badge badge-primary">
                    {getTypeLabel(item.interaction_type)}
                  </span>
                  <span style={styles.dateText}>{formatDate(item.occurred_at)}</span>
                  {item.location && (
                    <span style={styles.locationTag}>
                      <MapPin size={12} />
                      <span>{item.location}</span>
                    </span>
                  )}
                </div>

                <div style={styles.actions}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onEditInteraction(item)}
                    title="Edit Record"
                  >
                    <Edit2 size={12} />
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(item)}
                    title="Delete Record"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <h4 style={styles.itemTitle}>{item.title}</h4>

              {item.summary && <p style={styles.itemSummary}>{item.summary}</p>}

              {/* Linked references */}
              <div style={styles.relationsRow}>
                {item.contact_name && item.contact_id && (
                  <button
                    style={styles.relationTag}
                    onClick={() => onSelectContact && onSelectContact(item.contact_id!)}
                  >
                    <Users size={12} />
                    <span>{item.contact_name}</span>
                  </button>
                )}
                {item.organization_name && item.organization_id && (
                  <button
                    style={styles.relationTag}
                    onClick={() => onSelectOrg && onSelectOrg(item.organization_id!)}
                  >
                    <Building2 size={12} />
                    <span>{item.organization_name}</span>
                  </button>
                )}
              </div>

              {/* Detailed Notes Toggle */}
              {hasDetails && (
                <div style={styles.detailsContainer}>
                  <button
                    style={styles.detailsToggle}
                    onClick={() => toggleExpand(item.id)}
                  >
                    <span>{isExpanded ? 'Hide conversation notes' : 'View conversation notes'}</span>
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>

                  {isExpanded && (
                    <div style={styles.detailsText}>
                      {item.details}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    position: 'relative',
    marginTop: '0.5rem',
  },
  timelineItem: {
    display: 'flex',
    gap: '1rem',
    position: 'relative',
  },
  nodeColumn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '36px',
    flexShrink: 0,
  },
  iconCircle: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    border: '2px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    boxShadow: 'var(--shadow-sm)',
  },
  verticalLine: {
    flex: 1,
    width: '2px',
    backgroundColor: 'var(--border-subtle)',
    margin: '4px 0',
  },
  contentCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    padding: '0.875rem 1rem',
    marginBottom: '1rem',
    boxShadow: 'var(--shadow-sm)',
  },
  itemHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.5rem',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.625rem',
    flexWrap: 'wrap',
  },
  dateText: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  locationTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
  },
  itemTitle: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: 'var(--text-main)',
    marginTop: '0.375rem',
  },
  itemSummary: {
    fontSize: '0.8125rem',
    color: 'var(--text-muted)',
    marginTop: '0.25rem',
    lineHeight: 1.4,
  },
  relationsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    marginTop: '0.5rem',
    flexWrap: 'wrap',
  },
  relationTag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.15rem 0.5rem',
    backgroundColor: '#f1f5f9',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.75rem',
    color: 'var(--text-main)',
    cursor: 'pointer',
    border: '1px solid var(--border-subtle)',
  },
  detailsContainer: {
    marginTop: '0.625rem',
    borderTop: '1px dashed var(--border-subtle)',
    paddingTop: '0.5rem',
  },
  detailsToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontSize: '0.75rem',
    color: 'var(--primary)',
    cursor: 'pointer',
    fontWeight: 500,
  },
  detailsText: {
    fontSize: '0.8125rem',
    color: 'var(--text-main)',
    marginTop: '0.5rem',
    padding: '0.625rem',
    backgroundColor: '#f8fafc',
    borderRadius: 'var(--radius-sm)',
    whiteSpace: 'pre-wrap',
    lineHeight: 1.5,
  },
  emptyCard: {
    textAlign: 'center',
    padding: '2rem 1rem',
  },
};
