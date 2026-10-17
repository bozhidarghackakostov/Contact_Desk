import React, { useState, useEffect } from 'react';
import { Sidebar, NavigationTab } from '../components/layout/Sidebar.tsx';
import { Header } from '../components/layout/Header.tsx';
import { apiClient } from '../services/apiClient.ts';
import { DashboardView } from '../features/dashboard/DashboardView.tsx';
import { ContactList } from '../features/contacts/ContactList.tsx';
import { ContactProfile } from '../features/contacts/ContactProfile.tsx';
import { ContactFormModal } from '../features/contacts/ContactFormModal.tsx';
import { OrganizationList } from '../features/organizations/OrganizationList.tsx';
import { OrganizationProfile } from '../features/organizations/OrganizationProfile.tsx';
import { InteractionList } from '../features/interactions/InteractionList.tsx';
import { InteractionFormModal } from '../features/interactions/InteractionFormModal.tsx';
import { FollowupList } from '../features/followups/FollowupList.tsx';
import { TaskFormModal } from '../features/followups/TaskFormModal.tsx';
import { SettingsView } from '../features/settings/SettingsView.tsx';
import { Settings } from 'lucide-react';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDbConnected, setIsDbConnected] = useState<boolean>(true);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [followupView, setFollowupView] = useState<'today' | 'upcoming' | 'overdue' | 'open' | 'completed' | 'all'>('today');

  // Quick Action Modals
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isInteractionModalOpen, setIsInteractionModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  useEffect(() => {
    // Health check on initial load
    apiClient
      .checkHealth()
      .then((res) => {
        setIsDbConnected(res.data.dbConnected);
      })
      .catch((err) => {
        console.error('Health check failed:', err);
        setIsDbConnected(false);
      });
  }, []);

  const getPageInfo = (): { title: string; subtitle: string } => {
    if (selectedContactId) {
      return {
        title: 'Contact Profile',
        subtitle: 'Detailed relationship history, affiliated organizations, and notes',
      };
    }
    if (selectedOrgId) {
      return {
        title: 'Organization Profile',
        subtitle: 'Company details, affiliated contacts, and interaction history',
      };
    }

    switch (currentTab) {
      case 'dashboard':
        return {
          title: 'Relationship Dashboard',
          subtitle: 'Active relationships, conversations, and daily follow-up commitments',
        };
      case 'contacts':
        return {
          title: 'Contacts Directory',
          subtitle: 'People, notes, contact details, tags, and organizational relationships',
        };
      case 'organizations':
        return {
          title: 'Organizations Directory',
          subtitle: 'Companies, institutions, and groups affiliated with your contacts',
        };
      case 'interactions':
        return {
          title: 'Interactions & Conversations',
          subtitle: 'Chronological timeline of conversations, calls, and meetings',
        };
      case 'followups':
        return {
          title: 'Follow-ups & Tasks',
          subtitle: 'Actionable commitments and tasks linked to contacts and organizations',
        };
      case 'settings':
        return {
          title: 'Settings & Data Management',
          subtitle: 'Data portability, CSV imports/exports, tags, and local backups',
        };
    }
  };

  const { title, subtitle } = getPageInfo();

  return (
    <div style={styles.appContainer}>
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          setSelectedContactId(null);
          setSelectedOrgId(null);
        }}
        onQuickAction={(action) => {
          if (action === 'add_contact') {
            setIsContactModalOpen(true);
          }
        }}
      />

      <div style={styles.mainWrapper}>
        <Header
          title={title}
          subtitle={subtitle}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSelectResult={(item) => {
            if (item.type === 'contact') {
              setCurrentTab('contacts');
              setSelectedContactId(item.id);
            } else if (item.type === 'organization') {
              setCurrentTab('organizations');
              setSelectedOrgId(item.id);
            } else if (item.type === 'interaction') {
              setCurrentTab('interactions');
            } else if (item.type === 'task') {
              setCurrentTab('followups');
            }
          }}
          isDbConnected={isDbConnected}
        />

        <main style={styles.contentArea}>
          <div style={styles.viewContent}>
            {/* Dashboard View */}
            {currentTab === 'dashboard' && (
              <DashboardView
                onNavigateToContacts={() => {
                  setCurrentTab('contacts');
                  setSelectedContactId(null);
                }}
                onNavigateToOrgs={() => {
                  setCurrentTab('organizations');
                  setSelectedOrgId(null);
                }}
                onNavigateToInteractions={() => {
                  setCurrentTab('interactions');
                }}
                onNavigateToFollowups={(v) => {
                  if (v) setFollowupView(v as any);
                  setCurrentTab('followups');
                }}
                onSelectContact={(id) => {
                  setCurrentTab('contacts');
                  setSelectedContactId(id);
                }}
                onSelectOrg={(id) => {
                  setCurrentTab('organizations');
                  setSelectedOrgId(id);
                }}
                onOpenNewContact={() => setIsContactModalOpen(true)}
                onOpenNewInteraction={() => setIsInteractionModalOpen(true)}
                onOpenNewTask={() => setIsTaskModalOpen(true)}
              />
            )}

            {/* Contacts View */}
            {currentTab === 'contacts' && (
              selectedContactId ? (
                <ContactProfile
                  contactId={selectedContactId}
                  onBack={() => setSelectedContactId(null)}
                  onSelectOrg={(orgId) => {
                    setCurrentTab('organizations');
                    setSelectedOrgId(orgId);
                    setSelectedContactId(null);
                  }}
                />
              ) : (
                <ContactList
                  externalSearch={searchQuery}
                  onSelectContact={(id) => setSelectedContactId(id)}
                />
              )
            )}

            {/* Organizations View */}
            {currentTab === 'organizations' && (
              selectedOrgId ? (
                <OrganizationProfile
                  organizationId={selectedOrgId}
                  onBack={() => setSelectedOrgId(null)}
                  onSelectContact={(cId) => {
                    setCurrentTab('contacts');
                    setSelectedContactId(cId);
                    setSelectedOrgId(null);
                  }}
                />
              ) : (
                <OrganizationList
                  externalSearch={searchQuery}
                  onSelectOrganization={(id) => setSelectedOrgId(id)}
                />
              )
            )}

            {/* Interactions View */}
            {currentTab === 'interactions' && (
              <InteractionList
                externalSearch={searchQuery}
                onSelectContact={(cId) => {
                  setCurrentTab('contacts');
                  setSelectedContactId(cId);
                }}
                onSelectOrg={(orgId) => {
                  setCurrentTab('organizations');
                  setSelectedOrgId(orgId);
                }}
              />
            )}

            {/* Follow-ups View */}
            {currentTab === 'followups' && (
              <FollowupList
                initialView={followupView}
                onSelectContact={(cId) => {
                  setCurrentTab('contacts');
                  setSelectedContactId(cId);
                }}
                onSelectOrg={(orgId) => {
                  setCurrentTab('organizations');
                  setSelectedOrgId(orgId);
                }}
              />
            )}

            {/* Settings View */}
            {currentTab === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>

      {/* Global Quick Action Modals */}
      <ContactFormModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        onSaved={() => {
          setCurrentTab('contacts');
        }}
      />

      <InteractionFormModal
        isOpen={isInteractionModalOpen}
        onClose={() => setIsInteractionModalOpen(false)}
        onSaved={() => {
          setCurrentTab('interactions');
        }}
      />

      <TaskFormModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSaved={() => {
          setCurrentTab('followups');
        }}
      />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
  },
  mainWrapper: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
    backgroundColor: 'var(--bg-app)',
  },
  contentArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '1.5rem',
  },
  viewContent: {
    maxWidth: '1280px',
    margin: '0 auto',
  },
  iconCircle: {
    width: '64px',
    height: '64px',
    borderRadius: '50%',
    backgroundColor: 'var(--primary-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto',
  },
};
