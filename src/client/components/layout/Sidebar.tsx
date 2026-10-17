import React from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  MessageSquareText,
  CheckSquare,
  Settings,
  ShieldCheck,
  Plus,
} from 'lucide-react';

export type NavigationTab =
  | 'dashboard'
  | 'contacts'
  | 'organizations'
  | 'interactions'
  | 'followups'
  | 'settings';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  onQuickAction?: (action: 'add_contact' | 'add_org' | 'add_interaction' | 'add_task') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  onQuickAction,
}) => {
  const navItems: Array<{ id: NavigationTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'contacts', label: 'Contacts', icon: <Users size={18} /> },
    { id: 'organizations', label: 'Organizations', icon: <Building2 size={18} /> },
    { id: 'interactions', label: 'Interactions', icon: <MessageSquareText size={18} /> },
    { id: 'followups', label: 'Follow-ups', icon: <CheckSquare size={18} /> },
    { id: 'settings', label: 'Settings & Data', icon: <Settings size={18} /> },
  ];

  return (
    <aside style={styles.sidebar}>
      {/* Branding */}
      <div style={styles.brandContainer}>
        <div style={styles.brandTitleRow}>
          <div style={styles.brandLogo}>CD</div>
          <div>
            <h1 style={styles.brandName}>ContactDesk</h1>
            <span style={styles.brandSubtitle}>Personal CRM</span>
          </div>
        </div>
        <div style={styles.offlineBadge}>
          <ShieldCheck size={12} style={{ marginRight: 4 }} />
          <span>Local & Offline</span>
        </div>
      </div>

      {/* Quick Action Button */}
      {onQuickAction && (
        <div style={styles.quickActionWrapper}>
          <button
            style={styles.quickActionButton}
            onClick={() => onQuickAction('add_contact')}
            title="Add new contact"
          >
            <Plus size={16} />
            <span>New Contact</span>
          </button>
        </div>
      )}

      {/* Main Navigation Items */}
      <nav style={styles.navList}>
        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              style={{
                ...styles.navItem,
                ...(isActive ? styles.navItemActive : {}),
              }}
            >
              <span style={{ color: isActive ? '#38bdf8' : '#94a3b8' }}>
                {item.icon}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div style={styles.footer}>
        <div style={styles.footerText}>Bound to 127.0.0.1</div>
        <div style={styles.footerVersion}>v1.0.0 • SQLite Powered</div>
      </div>
    </aside>
  );
};

const styles: Record<string, React.CSSProperties> = {
  sidebar: {
    width: '240px',
    height: '100vh',
    backgroundColor: 'var(--bg-sidebar)',
    color: 'var(--text-sidebar)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    borderRight: '1px solid #1e293b',
  },
  brandContainer: {
    padding: '1.25rem 1rem 1rem',
    borderBottom: '1px solid #1e293b',
  },
  brandTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  brandLogo: {
    width: '32px',
    height: '32px',
    backgroundColor: 'var(--primary)',
    color: '#ffffff',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 700,
    fontSize: '0.875rem',
  },
  brandName: {
    fontSize: '1rem',
    fontWeight: 600,
    color: '#ffffff',
    letterSpacing: '-0.01em',
  },
  brandSubtitle: {
    fontSize: '0.75rem',
    color: '#64748b',
    display: 'block',
  },
  offlineBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    marginTop: '0.75rem',
    padding: '0.2rem 0.5rem',
    borderRadius: '9999px',
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    color: '#4ade80',
    fontSize: '0.7rem',
    fontWeight: 500,
  },
  quickActionWrapper: {
    padding: '1rem 1rem 0.5rem',
  },
  quickActionButton: {
    width: '100%',
    padding: '0.5rem 0.75rem',
    backgroundColor: '#1e293b',
    border: '1px solid #334155',
    color: '#f8fafc',
    borderRadius: 'var(--radius-md)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    fontSize: '0.8125rem',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.15s ease',
  },
  navList: {
    flex: 1,
    padding: '0.5rem 0.75rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 0.75rem',
    borderRadius: 'var(--radius-md)',
    color: '#cbd5e1',
    fontSize: '0.875rem',
    fontWeight: 500,
    textAlign: 'left',
    transition: 'background-color 0.15s ease, color 0.15s ease',
  },
  navItemActive: {
    backgroundColor: 'var(--bg-sidebar-active)',
    color: '#ffffff',
  },
  footer: {
    padding: '1rem',
    borderTop: '1px solid #1e293b',
  },
  footerText: {
    fontSize: '0.75rem',
    color: '#64748b',
  },
  footerVersion: {
    fontSize: '0.7rem',
    color: '#475569',
    marginTop: '0.2rem',
  },
};
