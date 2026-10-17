import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Database,
  Circle,
  User,
  Building2,
  MessageSquare,
  CheckSquare,
  X,
  Loader2,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient.ts';
import type { GlobalSearchResult, SearchResultItem } from '../../../shared/types/index.ts';

interface HeaderProps {
  title: string;
  subtitle?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSelectResult?: (item: SearchResultItem) => void;
  isDbConnected?: boolean;
  actions?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  searchQuery = '',
  onSearchChange,
  onSelectResult,
  isDbConnected = true,
  actions,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<GlobalSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut '/' to focus search input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        setIsOpen(true);
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle clicking outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.globalSearch(trimmed);
        setResults(res.data);
        setIsOpen(true);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelect = (item: SearchResultItem) => {
    setIsOpen(false);
    if (onSelectResult) {
      onSelectResult(item);
    }
  };

  const hasAnyResults =
    results &&
    (results.contacts.length > 0 ||
      results.organizations.length > 0 ||
      results.interactions.length > 0 ||
      results.tasks.length > 0);

  return (
    <header style={styles.header}>
      <div style={styles.titleSection}>
        <h2 style={styles.title}>{title}</h2>
        {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
      </div>

      <div style={styles.centerSection} ref={containerRef}>
        {onSearchChange && (
          <div style={styles.searchContainer}>
            <Search size={16} style={styles.searchIcon} />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search contacts, notes, companies, tasks... ( / )"
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => {
                if (results && results.total > 0) setIsOpen(true);
              }}
              style={styles.searchInput}
            />
            {isLoading && (
              <Loader2 size={14} style={styles.spinnerIcon} className="animate-spin" />
            )}
            {searchQuery && !isLoading && (
              <button
                type="button"
                onClick={() => {
                  onSearchChange('');
                  setResults(null);
                  setIsOpen(false);
                }}
                style={styles.clearBtn}
                title="Clear search"
              >
                <X size={14} />
              </button>
            )}

            {/* Global Search Results Dropdown */}
            {isOpen && searchQuery.trim().length >= 2 && (
              <div style={styles.dropdown}>
                {isLoading && !results ? (
                  <div style={styles.emptyState}>Searching records...</div>
                ) : !hasAnyResults ? (
                  <div style={styles.emptyState}>
                    No results found for "{searchQuery}".
                  </div>
                ) : (
                  <div style={styles.resultsList}>
                    {/* Contacts Section */}
                    {results && results.contacts.length > 0 && (
                      <div style={styles.resultGroup}>
                        <div style={styles.groupHeader}>
                          <User size={12} />
                          <span>Contacts ({results.contacts.length})</span>
                        </div>
                        {results.contacts.map((c) => (
                          <div
                            key={c.id}
                            style={styles.resultRow}
                            onClick={() => handleSelect(c)}
                          >
                            <div style={styles.itemTitle}>{c.title}</div>
                            {c.subtitle && (
                              <div style={styles.itemSubtitle}>{c.subtitle}</div>
                            )}
                            {c.matchSnippet && (
                              <div style={styles.snippet}>"{c.matchSnippet}"</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Organizations Section */}
                    {results && results.organizations.length > 0 && (
                      <div style={styles.resultGroup}>
                        <div style={styles.groupHeader}>
                          <Building2 size={12} />
                          <span>Organizations ({results.organizations.length})</span>
                        </div>
                        {results.organizations.map((o) => (
                          <div
                            key={o.id}
                            style={styles.resultRow}
                            onClick={() => handleSelect(o)}
                          >
                            <div style={styles.itemTitle}>{o.title}</div>
                            {o.subtitle && (
                              <div style={styles.itemSubtitle}>{o.subtitle}</div>
                            )}
                            {o.matchSnippet && (
                              <div style={styles.snippet}>"{o.matchSnippet}"</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Interactions Section */}
                    {results && results.interactions.length > 0 && (
                      <div style={styles.resultGroup}>
                        <div style={styles.groupHeader}>
                          <MessageSquare size={12} />
                          <span>Interactions ({results.interactions.length})</span>
                        </div>
                        {results.interactions.map((i) => (
                          <div
                            key={i.id}
                            style={styles.resultRow}
                            onClick={() => handleSelect(i)}
                          >
                            <div style={styles.itemTitle}>{i.title}</div>
                            {i.subtitle && (
                              <div style={styles.itemSubtitle}>{i.subtitle}</div>
                            )}
                            {i.matchSnippet && (
                              <div style={styles.snippet}>"{i.matchSnippet}"</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Tasks Section */}
                    {results && results.tasks.length > 0 && (
                      <div style={styles.resultGroup}>
                        <div style={styles.groupHeader}>
                          <CheckSquare size={12} />
                          <span>Follow-ups ({results.tasks.length})</span>
                        </div>
                        {results.tasks.map((t) => (
                          <div
                            key={t.id}
                            style={styles.resultRow}
                            onClick={() => handleSelect(t)}
                          >
                            <div style={styles.itemTitle}>{t.title}</div>
                            {t.subtitle && (
                              <div style={styles.itemSubtitle}>{t.subtitle}</div>
                            )}
                            {t.matchSnippet && (
                              <div style={styles.snippet}>"{t.matchSnippet}"</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div style={styles.actionsSection}>
        {/* DB Connection Indicator */}
        <div
          style={styles.dbStatus}
          title={isDbConnected ? 'Local SQLite connected' : 'Database disconnected'}
        >
          <Database
            size={14}
            style={{ color: isDbConnected ? 'var(--success)' : 'var(--danger)' }}
          />
          <Circle
            size={8}
            fill={isDbConnected ? 'var(--success)' : 'var(--danger)'}
            style={{ color: isDbConnected ? 'var(--success)' : 'var(--danger)' }}
          />
        </div>

        {actions}
      </div>
    </header>
  );
};

const styles: Record<string, React.CSSProperties> = {
  header: {
    height: '64px',
    backgroundColor: 'var(--bg-surface)',
    borderBottom: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 1.5rem',
    gap: '1rem',
    flexShrink: 0,
    position: 'relative',
    zIndex: 40,
  },
  titleSection: {
    minWidth: '200px',
  },
  title: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: 'var(--text-main)',
    letterSpacing: '-0.01em',
  },
  subtitle: {
    fontSize: '0.75rem',
    color: 'var(--text-muted)',
  },
  centerSection: {
    flex: 1,
    maxWidth: '520px',
    position: 'relative',
  },
  searchContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
  },
  searchIcon: {
    position: 'absolute',
    left: '0.75rem',
    color: 'var(--text-light)',
    pointerEvents: 'none',
  },
  spinnerIcon: {
    position: 'absolute',
    right: '0.75rem',
    color: 'var(--text-light)',
  },
  clearBtn: {
    position: 'absolute',
    right: '0.75rem',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: 'var(--text-light)',
    padding: '0.2rem',
    display: 'flex',
    alignItems: 'center',
  },
  searchInput: {
    width: '100%',
    padding: '0.45rem 2.25rem 0.45rem 2.25rem',
    backgroundColor: '#f8fafc',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.8125rem',
    color: 'var(--text-main)',
    outline: 'none',
    transition: 'border-color 0.15s ease',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: '0.35rem',
    backgroundColor: '#ffffff',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    maxHeight: '380px',
    overflowY: 'auto',
    zIndex: 100,
  },
  emptyState: {
    padding: '1rem',
    fontSize: '0.8125rem',
    color: 'var(--text-muted)',
    textAlign: 'center',
  },
  resultsList: {
    padding: '0.5rem 0',
  },
  resultGroup: {
    marginBottom: '0.5rem',
  },
  groupHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.7rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    color: 'var(--text-light)',
    padding: '0.35rem 0.85rem',
    backgroundColor: '#f8fafc',
    borderBottom: '1px solid var(--border-subtle)',
  },
  resultRow: {
    padding: '0.5rem 0.85rem',
    cursor: 'pointer',
    borderBottom: '1px solid #f1f5f9',
    transition: 'background-color 0.1s ease',
  },
  itemTitle: {
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--text-main)',
  },
  itemSubtitle: {
    fontSize: '0.72rem',
    color: 'var(--text-muted)',
    marginTop: '0.1rem',
  },
  snippet: {
    fontSize: '0.7rem',
    color: 'var(--primary)',
    backgroundColor: '#f0f9ff',
    padding: '0.15rem 0.35rem',
    borderRadius: '3px',
    marginTop: '0.2rem',
    display: 'inline-block',
  },
  actionsSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  dbStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    padding: '0.3rem 0.6rem',
    backgroundColor: '#f8fafc',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
  },
};
