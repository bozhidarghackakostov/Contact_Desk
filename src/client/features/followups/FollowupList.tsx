import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Calendar,
  Clock,
  AlertCircle,
  Building2,
  Users,
  Edit2,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient.ts';
import type { Task, TaskPriority } from '../../../shared/types/index.ts';
import { TaskFormModal } from './TaskFormModal.tsx';

type TaskViewType = 'today' | 'upcoming' | 'overdue' | 'open' | 'completed' | 'all';

interface FollowupListProps {
  initialView?: TaskViewType;
  onSelectContact?: (contactId: string) => void;
  onSelectOrg?: (orgId: string) => void;
}

export const FollowupList: React.FC<FollowupListProps> = ({
  initialView = 'today',
  onSelectContact,
  onSelectOrg,
}) => {
  const [view, setView] = useState<TaskViewType>(initialView);
  const [priorityFilter, setPriorityFilter] = useState<'all' | TaskPriority>('all');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.listTasks({
        view,
        priority: priorityFilter === 'all' ? undefined : priorityFilter,
        sort: 'due_date',
        order: 'asc',
        limit: 100,
      });
      setTasks(res.data);
      if (res.meta) {
        setTotal(res.meta.total);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [view, priorityFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleToggleComplete = async (task: Task) => {
    try {
      if (task.status === 'completed') {
        await apiClient.reopenTask(task.id);
      } else {
        await apiClient.completeTask(task.id);
      }
      fetchTasks();
    } catch (err) {
      console.error('Failed to toggle task completion:', err);
    }
  };

  const handleDelete = async (task: Task) => {
    if (confirm(`Delete task "${task.title}"?`)) {
      try {
        await apiClient.deleteTask(task.id);
        fetchTasks();
      } catch (err) {
        console.error('Failed to delete task:', err);
      }
    }
  };

  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'high':
        return <span className="badge badge-danger">High Priority</span>;
      case 'low':
        return <span className="badge" style={{ backgroundColor: '#f1f5f9' }}>Low</span>;
      default:
        return <span className="badge badge-primary">Normal</span>;
    }
  };

  return (
    <div style={styles.container}>
      {/* View Switcher & Action Bar */}
      <div style={styles.topBar}>
        <div style={styles.tabGroup}>
          <button
            style={{
              ...styles.tabButton,
              ...(view === 'today' ? styles.tabButtonActive : {}),
            }}
            onClick={() => setView('today')}
          >
            Due Today
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(view === 'overdue' ? styles.tabButtonActive : {}),
            }}
            onClick={() => setView('overdue')}
          >
            Overdue
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(view === 'upcoming' ? styles.tabButtonActive : {}),
            }}
            onClick={() => setView('upcoming')}
          >
            Upcoming
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(view === 'open' ? styles.tabButtonActive : {}),
            }}
            onClick={() => setView('open')}
          >
            All Open
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(view === 'completed' ? styles.tabButtonActive : {}),
            }}
            onClick={() => setView('completed')}
          >
            Completed
          </button>
          <button
            style={{
              ...styles.tabButton,
              ...(view === 'all' ? styles.tabButtonActive : {}),
            }}
            onClick={() => setView('all')}
          >
            All History
          </button>
        </div>

        <div style={styles.actionsRight}>
          <select
            className="select"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            style={{ width: 'auto', minWidth: '120px', fontSize: '0.8125rem' }}
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>

          <button
            className="btn btn-primary btn-sm"
            onClick={() => {
              setEditingTask(null);
              setIsModalOpen(true);
            }}
          >
            <Plus size={14} />
            <span>Add Follow-up</span>
          </button>
        </div>
      </div>

      {/* Task List Content */}
      {tasks.length === 0 && !isLoading ? (
        <div className="card" style={styles.emptyCard}>
          <CheckCircle2 size={36} color="var(--success)" />
          <h4 style={{ fontSize: '1.125rem', fontWeight: 600, marginTop: '0.75rem' }}>
            {view === 'today'
              ? 'No follow-ups due today!'
              : view === 'overdue'
              ? 'All caught up! No overdue tasks.'
              : 'No tasks found.'}
          </h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
            {view === 'today'
              ? 'Enjoy your day or check upcoming tasks.'
              : 'Create a new follow-up to stay organized.'}
          </p>
          <button
            className="btn btn-primary btn-sm"
            style={{ marginTop: '1rem' }}
            onClick={() => {
              setEditingTask(null);
              setIsModalOpen(true);
            }}
          >
            <Plus size={14} />
            <span>Schedule Follow-up</span>
          </button>
        </div>
      ) : (
        <div style={styles.taskList}>
          {tasks.map((task) => {
            const isCompleted = task.status === 'completed';

            return (
              <div
                key={task.id}
                className="card"
                style={{
                  ...styles.taskCard,
                  borderLeft: task.is_overdue
                    ? '4px solid var(--danger)'
                    : isCompleted
                    ? '4px solid var(--success)'
                    : task.priority === 'high'
                    ? '4px solid var(--warning)'
                    : '1px solid var(--border-subtle)',
                }}
              >
                {/* 1-Click Checkbox */}
                <button
                  style={styles.checkboxBtn}
                  onClick={() => handleToggleComplete(task)}
                  title={isCompleted ? 'Reopen Task' : 'Mark as Completed'}
                >
                  {isCompleted ? (
                    <CheckSquare size={20} color="var(--success)" />
                  ) : (
                    <Square size={20} color="var(--text-light)" />
                  )}
                </button>

                {/* Task Details */}
                <div style={styles.taskBody}>
                  <div style={styles.taskTitleRow}>
                    <span
                      style={{
                        ...styles.taskTitle,
                        textDecoration: isCompleted ? 'line-through' : 'none',
                        color: isCompleted ? 'var(--text-muted)' : 'var(--text-main)',
                      }}
                    >
                      {task.title}
                    </span>

                    <div style={styles.badgeRow}>
                      {getPriorityBadge(task.priority)}
                      {task.is_overdue && (
                        <span className="badge badge-danger">
                          <AlertCircle size={11} /> Overdue
                        </span>
                      )}
                    </div>
                  </div>

                  {task.description && (
                    <p style={styles.taskDescription}>{task.description}</p>
                  )}

                  {/* Metadata Row */}
                  <div style={styles.metaRow}>
                    <div style={styles.metaItem}>
                      <Calendar size={13} color="var(--text-muted)" />
                      <span
                        style={{
                          fontWeight: task.is_overdue ? 600 : 400,
                          color: task.is_overdue ? 'var(--danger)' : 'var(--text-muted)',
                        }}
                      >
                        Due: {task.due_date}
                      </span>
                    </div>

                    {task.due_time && (
                      <div style={styles.metaItem}>
                        <Clock size={13} color="var(--text-muted)" />
                        <span>{task.due_time}</span>
                      </div>
                    )}

                    {task.contact_name && task.contact_id && (
                      <button
                        style={styles.linkPill}
                        onClick={() => onSelectContact && onSelectContact(task.contact_id!)}
                        title="View Contact Profile"
                      >
                        <Users size={12} color="var(--primary)" />
                        <span>{task.contact_name}</span>
                      </button>
                    )}

                    {task.organization_name && task.organization_id && (
                      <button
                        style={styles.linkPill}
                        onClick={() => onSelectOrg && onSelectOrg(task.organization_id!)}
                        title="View Organization Profile"
                      >
                        <Building2 size={12} color="var(--primary)" />
                        <span>{task.organization_name}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={styles.taskActions}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => {
                      setEditingTask(task);
                      setIsModalOpen(true);
                    }}
                    title="Edit Task"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(task)}
                    title="Delete Task"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Modal */}
      <TaskFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialTask={editingTask}
        onSaved={fetchTasks}
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
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  tabGroup: {
    display: 'flex',
    backgroundColor: '#ffffff',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    padding: '0.2rem',
    gap: '0.2rem',
    flexWrap: 'wrap',
  },
  tabButton: {
    padding: '0.35rem 0.75rem',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: 'var(--text-muted)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'background-color 0.15s ease, color 0.15s ease',
  },
  tabButtonActive: {
    backgroundColor: 'var(--primary)',
    color: '#ffffff',
  },
  actionsRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  emptyCard: {
    textAlign: 'center',
    padding: '3rem 1.5rem',
  },
  taskList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.625rem',
  },
  taskCard: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.875rem',
    padding: '1rem 1.25rem',
  },
  checkboxBtn: {
    marginTop: '0.125rem',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
  },
  taskBody: {
    flex: 1,
  },
  taskTitleRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  taskTitle: {
    fontSize: '0.9375rem',
    fontWeight: 600,
  },
  badgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
  },
  taskDescription: {
    fontSize: '0.8125rem',
    color: 'var(--text-muted)',
    marginTop: '0.25rem',
    lineHeight: 1.4,
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.875rem',
    marginTop: '0.5rem',
    flexWrap: 'wrap',
  },
  metaItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontSize: '0.75rem',
  },
  linkPill: {
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
  taskActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.25rem',
  },
};
