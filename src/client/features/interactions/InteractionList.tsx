import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus } from 'lucide-react';
import { apiClient } from '../../services/apiClient.ts';
import type { Interaction } from '../../../shared/types/index.ts';
import { InteractionTimeline } from './InteractionTimeline.tsx';
import { InteractionFormModal } from './InteractionFormModal.tsx';

interface InteractionListProps {
  onSelectContact?: (contactId: string) => void;
  onSelectOrg?: (orgId: string) => void;
  externalSearch?: string;
}

export const InteractionList: React.FC<InteractionListProps> = ({
  onSelectContact,
  onSelectOrg,
  externalSearch = '',
}) => {
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [search, setSearch] = useState(externalSearch);
  const [typeFilter, setTypeFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInteraction, setEditingInteraction] = useState<Interaction | null>(null);

  const fetchInteractions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.listInteractions({
        search: search.trim() || undefined,
        type: typeFilter === 'all' ? undefined : (typeFilter as any),
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        sort: 'occurred_at',
        order: 'desc',
        limit: 100,
      });
      setInteractions(res.data);
    } catch (err) {
      console.error('Failed to load interactions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [search, typeFilter, startDate, endDate]);

  useEffect(() => {
    fetchInteractions();
  }, [fetchInteractions]);

  useEffect(() => {
    if (externalSearch !== search) {
      setSearch(externalSearch);
    }
  }, [externalSearch]);

  return (
    <div style={styles.container}>
      {/* Control Bar */}
      <div style={styles.controlBar}>
        <div style={styles.filterRow}>
          <div style={styles.searchBox}>
            <Search size={15} style={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search conversations, notes, people, companies..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={styles.filterInput}
            />
          </div>

          <select
            className="select"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ width: 'auto', minWidth: '130px' }}
          >
            <option value="all">All Types</option>
            <option value="meeting">Meetings</option>
            <option value="phone_call">Phone Calls</option>
            <option value="email">Emails</option>
            <option value="message">Messages</option>
            <option value="in_person">In-Person</option>
            <option value="note">Notes</option>
            <option value="other">Other</option>
          </select>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>From:</span>
            <input
              type="date"
              className="input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{ width: 'auto', padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>To:</span>
            <input
              type="date"
              className="input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{ width: 'auto', padding: '0.35rem 0.5rem', fontSize: '0.75rem' }}
            />
          </div>
        </div>

        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingInteraction(null);
            setIsModalOpen(true);
          }}
        >
          <Plus size={16} />
          <span>Record Interaction</span>
        </button>
      </div>

      {/* Timeline */}
      <div className="card" style={{ padding: '1.25rem' }}>
        <InteractionTimeline
          interactions={interactions}
          onRefresh={fetchInteractions}
          onEditInteraction={(int) => {
            setEditingInteraction(int);
            setIsModalOpen(true);
          }}
          onSelectContact={onSelectContact}
          onSelectOrg={onSelectOrg}
        />
      </div>

      {/* Record / Edit Interaction Modal */}
      <InteractionFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialInteraction={editingInteraction}
        onSaved={fetchInteractions}
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
};
