import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Building2,
  Calendar,
  AlertTriangle,
  Clock,
  UserX,
  Plus,
  MessageSquarePlus,
  CheckSquare,
  ArrowRight,
  CheckCircle2,
  Square,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient.ts';
import type { DashboardStats, Task } from '../../../shared/types/index.ts';

interface DashboardViewProps {
  onNavigateToContacts: () => void;
  onNavigateToOrgs: () => void;
  onNavigateToInteractions: () => void;
  onNavigateToFollowups: (view?: string) => void;
  onSelectContact: (contactId: string) => void;
  onSelectOrg: (orgId: string) => void;
  onOpenNewContact: () => void;
  onOpenNewInteraction: () => void;
  onOpenNewTask: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToContacts,
  onNavigateToOrgs,
  onNavigateToInteractions,
  onNavigateToFollowups,
  onSelectContact,
  onSelectOrg,
  onOpenNewContact,
  onOpenNewInteraction,
  onOpenNewTask,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.getDashboard();
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleToggleTaskComplete = async (task: Task) => {
    try {
      if (task.status === 'completed') {
        await apiClient.reopenTask(task.id);
      } else {
        await apiClient.completeTask(task.id);
      }
      loadDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  if (!stats && isLoading) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading relationship dashboard...
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div style={styles.container}>
      {/* Quick Action Banner */}
      <div style={styles.quickBar}>
        <div style={styles.welcomeText}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Relationship Overview</h3>
          <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            All metrics calculated directly from your local SQLite database
          </span>
        </div>
        <div style={styles.quickButtons}>
          <button className="btn btn-primary btn-sm" onClick={onOpenNewContact}>
            <Plus size={14} /> New Contact
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onOpenNewInteraction}>
            <MessageSquarePlus size={14} /> Log Conversation
          </button>
          <button className="btn btn-secondary btn-sm" onClick={onOpenNewTask}>
            <CheckSquare size={14} /> Add Follow-up
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div style={styles.metricsGrid}>
        {/* Active Contacts */}
        <div
          className="card"
          style={styles.metricCard}
          onClick={onNavigateToContacts}
          role="button"
        >
          <div style={styles.metricHeader}>
            <span style={styles.metricLabel}>Active Contacts</span>
            <div style={{ ...styles.metricIcon, backgroundColor: 'var(--primary-subtle)', color: 'var(--primary)' }}>
              <Users size={18} />
            </div>
          </div>
          <div style={styles.metricValue}>{stats.activeContactsCount}</div>
          <div style={styles.metricSub}>Click to view directory →</div>
        </div>

        {/* Active Organizations */}
        <div
          className="card"
          style={styles.metricCard}
          onClick={onNavigateToOrgs}
          role="button"
        >
          <div style={styles.metricHeader}>
            <span style={styles.metricLabel}>Organizations</span>
            <div style={{ ...styles.metricIcon, backgroundColor: '#f1f5f9', color: '#334155' }}>
              <Building2 size={18} />
            </div>
          </div>
          <div style={styles.metricValue}>{stats.activeOrganizationsCount}</div>
          <div style={styles.metricSub}>Affiliated companies & groups →</div>
        </div>

        {/* Due Today */}
        <div
          className="card"
          style={{
            ...styles.metricCard,
            borderLeft: stats.tasksDueTodayCount > 0 ? '4px solid var(--primary)' : '1px solid var(--border-subtle)',
          }}
          onClick={() => onNavigateToFollowups('today')}
          role="button"
        >
          <div style={styles.metricHeader}>
            <span style={styles.metricLabel}>Tasks Due Today</span>
            <div style={{ ...styles.metricIcon, backgroundColor: 'var(--primary-subtle)', color: 'var(--primary)' }}>
              <Calendar size={18} />
            </div>
          </div>
          <div style={styles.metricValue}>{stats.tasksDueTodayCount}</div>
          <div style={styles.metricSub}>Scheduled for today →</div>
        </div>

        {/* Overdue Tasks */}
        <div
          className="card"
          style={{
            ...styles.metricCard,
            borderLeft: stats.tasksOverdueCount > 0 ? '4px solid var(--danger)' : '1px solid var(--border-subtle)',
          }}
          onClick={() => onNavigateToFollowups('overdue')}
          role="button"
        >
          <div style={styles.metricHeader}>
            <span style={styles.metricLabel}>Overdue Tasks</span>
            <div
              style={{
                ...styles.metricIcon,
                backgroundColor: stats.tasksOverdueCount > 0 ? 'var(--danger-subtle)' : '#f8fafc',
                color: stats.tasksOverdueCount > 0 ? 'var(--danger)' : 'var(--text-light)',
              }}
            >
              <AlertTriangle size={18} />
            </div>
          </div>
          <div
            style={{
              ...styles.metricValue,
              color: stats.tasksOverdueCount > 0 ? 'var(--danger)' : 'var(--text-main)',
            }}
          >
            {stats.tasksOverdueCount}
          </div>
          <div style={styles.metricSub}>Requires attention →</div>
        </div>

        {/* Upcoming Tasks */}
        <div
          className="card"
          style={styles.metricCard}
          onClick={() => onNavigateToFollowups('upcoming')}
          role="button"
        >
          <div style={styles.metricHeader}>
            <span style={styles.metricLabel}>Upcoming Tasks</span>
            <div style={{ ...styles.metricIcon, backgroundColor: '#f0fdf4', color: 'var(--success)' }}>
              <Clock size={18} />
            </div>
          </div>
          <div style={styles.metricValue}>{stats.tasksUpcomingCount}</div>
          <div style={styles.metricSub}>Future commitments →</div>
        </div>

        {/* Contacts without interactions */}
        <div
          className="card"
          style={styles.metricCard}
          onClick={onNavigateToContacts}
          role="button"
        >
          <div style={styles.metricHeader}>
            <span style={styles.metricLabel}>No Interactions</span>
            <div style={{ ...styles.metricIcon, backgroundColor: '#fffbeb', color: 'var(--warning)' }}>
              <UserX size={18} />
            </div>
          </div>
          <div style={styles.metricValue}>{stats.contactsWithoutInteractionsCount}</div>
          <div style={styles.metricSub}>Contacts never contacted →</div>
        </div>
      </div>

      {/* Main 2-Column Section */}
      <div style={styles.mainGrid}>
        {/* Left: Actions Due Today & Overdue Commitments */}
        <div style={styles.column}>
          {/* Overdue Section (only rendered if overdue tasks exist) */}
          {stats.overdueTasks.length > 0 && (
            <div className="card" style={{ ...styles.actionCard, borderLeft: '4px solid var(--danger)' }}>
              <div style={styles.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <AlertTriangle size={16} color="var(--danger)" />
                  <h4 style={styles.cardTitle}>Overdue Follow-ups ({stats.overdueTasks.length})</h4>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onNavigateToFollowups('overdue')}
                >
                  View All <ArrowRight size={12} />
                </button>
              </div>

              <div style={styles.itemList}>
                {stats.overdueTasks.map((task) => (
                  <div key={task.id} style={styles.taskItem}>
                    <button
                      style={{ cursor: 'pointer', padding: 0 }}
                      onClick={() => handleToggleTaskComplete(task)}
                      title="Mark Complete"
                    >
                      <Square size={16} color="var(--danger)" />
                    </button>
                    <div style={{ flex: 1 }}>
                      <div style={styles.taskItemTitle}>{task.title}</div>
                      <div style={styles.taskItemMeta}>
                        <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                          Due {task.due_date}
                        </span>
                        {task.contact_name && (
                          <span
                            style={styles.clickableLink}
                            onClick={() => onSelectContact(task.contact_id!)}
                          >
                            • {task.contact_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today Tasks Section */}
          <div className="card" style={styles.actionCard}>
            <div style={styles.cardHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckSquare size={16} color="var(--primary)" />
                <h4 style={styles.cardTitle}>Tasks Due Today ({stats.todayTasks.length})</h4>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onNavigateToFollowups('today')}
              >
                View Tasks <ArrowRight size={12} />
              </button>
            </div>

            {stats.todayTasks.length === 0 ? (
              <div style={styles.emptyInline}>
                <CheckCircle2 size={24} color="var(--success)" />
                <span>No follow-ups due today. You are all caught up!</span>
              </div>
            ) : (
              <div style={styles.itemList}>
                {stats.todayTasks.map((task) => (
                  <div key={task.id} style={styles.taskItem}>
                    <button
                      style={{ cursor: 'pointer', padding: 0 }}
                      onClick={() => handleToggleTaskComplete(task)}
                      title="Mark Complete"
                    >
                      <Square size={16} color="var(--text-light)" />
                    </button>
                    <div style={{ flex: 1 }}>
                      <div style={styles.taskItemTitle}>{task.title}</div>
                      <div style={styles.taskItemMeta}>
                        <span>{task.due_time || 'Today'}</span>
                        {task.contact_name && (
                          <span
                            style={styles.clickableLink}
                            onClick={() => onSelectContact(task.contact_id!)}
                          >
                            • {task.contact_name}
                          </span>
                        )}
                        {task.organization_name && (
                          <span
                            style={styles.clickableLink}
                            onClick={() => onSelectOrg(task.organization_id!)}
                          >
                            • {task.organization_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Recent Conversations & Contacts */}
        <div style={styles.column}>
          {/* Recent Interactions */}
          <div className="card" style={styles.actionCard}>
            <div style={styles.cardHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={16} color="var(--primary)" />
                <h4 style={styles.cardTitle}>Recent Interactions</h4>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={onNavigateToInteractions}
              >
                Full History <ArrowRight size={12} />
              </button>
            </div>

            {stats.recentInteractions.length === 0 ? (
              <div style={styles.emptyInline}>
                <span>No recorded conversations yet. Log your first conversation!</span>
              </div>
            ) : (
              <div style={styles.itemList}>
                {stats.recentInteractions.map((int) => (
                  <div key={int.id} style={styles.interactionItem}>
                    <div style={{ flex: 1 }}>
                      <div style={styles.taskItemTitle}>{int.title}</div>
                      {int.summary && (
                        <div style={styles.interactionSummary}>{int.summary}</div>
                      )}
                      <div style={styles.taskItemMeta}>
                        <span>{int.occurred_at.slice(0, 10)}</span>
                        {int.contact_name && (
                          <span
                            style={styles.clickableLink}
                            onClick={() => onSelectContact(int.contact_id!)}
                          >
                            • {int.contact_name}
                          </span>
                        )}
                        {int.organization_name && (
                          <span
                            style={styles.clickableLink}
                            onClick={() => onSelectOrg(int.organization_id!)}
                          >
                            • {int.organization_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recently Added / Updated Contacts */}
          <div className="card" style={styles.actionCard}>
            <div style={styles.cardHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Users size={16} color="var(--primary)" />
                <h4 style={styles.cardTitle}>Recently Updated Contacts</h4>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={onNavigateToContacts}
              >
                All Contacts <ArrowRight size={12} />
              </button>
            </div>

            <div style={styles.itemList}>
              {stats.recentContacts.map((c) => (
                <div
                  key={c.id}
                  style={styles.contactItem}
                  onClick={() => onSelectContact(c.id)}
                >
                  <div style={styles.contactAvatar}>
                    {c.first_name?.[0] || c.display_name[0]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={styles.taskItemTitle}>{c.display_name}</div>
                    <div style={styles.taskItemMeta}>
                      <span>{c.job_title || 'Contact'}</span>
                      {c.organizations?.[0] && (
                        <span> • {c.organizations[0].organization_name}</span>
                      )}
                    </div>
                  </div>
                  <ArrowRight size={14} color="var(--text-light)" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  quickBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-lg)',
    padding: '1rem 1.25rem',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  welcomeText: {
    display: 'flex',
    flexDirection: 'column',
  },
  quickButtons: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    flexWrap: 'wrap',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '0.875rem',
  },
  metricCard: {
    padding: '1.125rem',
    cursor: 'pointer',
    transition: 'transform 0.1s ease, box-shadow 0.1s ease',
  },
  metricHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  metricIcon: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: {
    fontSize: '1.75rem',
    fontWeight: 700,
    color: 'var(--text-main)',
    marginTop: '0.5rem',
    lineHeight: 1,
  },
  metricSub: {
    fontSize: '0.75rem',
    color: 'var(--text-light)',
    marginTop: '0.5rem',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
    gap: '1rem',
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  actionCard: {
    padding: '1.25rem',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '0.875rem',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '0.625rem',
  },
  cardTitle: {
    fontSize: '0.9375rem',
    fontWeight: 600,
  },
  itemList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.625rem',
  },
  taskItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    padding: '0.5rem 0.625rem',
    backgroundColor: '#f8fafc',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-subtle)',
  },
  taskItemTitle: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--text-main)',
  },
  taskItemMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '0.125rem',
  },
  interactionItem: {
    padding: '0.5rem 0.625rem',
    backgroundColor: '#f8fafc',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-subtle)',
  },
  interactionSummary: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
    marginTop: '0.15rem',
  },
  contactItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 0.625rem',
    backgroundColor: '#f8fafc',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--border-subtle)',
    cursor: 'pointer',
  },
  contactAvatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: '#e2e8f0',
    color: '#334155',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 600,
  },
  clickableLink: {
    color: 'var(--primary)',
    cursor: 'pointer',
  },
  emptyInline: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '1.25rem 0.5rem',
    fontSize: '0.8125rem',
    color: 'var(--text-muted)',
  },
};
