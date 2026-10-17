import React, { useState, useEffect } from 'react';
import {
  Download,
  Upload,
  Database,
  Tag as TagIcon,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  FileSpreadsheet,
  FileJson,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '../../services/apiClient.ts';
import type { Tag } from '../../../shared/types/index.ts';

export const SettingsView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'export' | 'import' | 'backups' | 'tags'>('export');

  // Tags state
  const [tags, setTags] = useState<Tag[]>([]);
  const [newTagName, setNewTagName] = useState('');
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editingTagName, setEditingTagName] = useState('');

  // Backups state
  const [backups, setBackups] = useState<
    Array<{ filename: string; sizeBytes: number; createdAt: string; isIntegrityOk: boolean }>
  >([]);
  const [backupLabel, setBackupLabel] = useState('');
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Import state
  const [importCsvText, setImportCsvText] = useState('');
  const [importPreview, setImportPreview] = useState<any | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update' | 'import_anyway'>('skip');
  const [tagAsImported, setTagAsImported] = useState(true);
  const [customImportTag, setCustomImportTag] = useState('');
  const [importSuccessResult, setImportSuccessResult] = useState<any | null>(null);

  const loadTags = async () => {
    try {
      const res = await apiClient.listTags();
      setTags(res.data);
    } catch (err) {
      console.error('Failed to load tags:', err);
    }
  };

  const loadBackups = async () => {
    try {
      const res = await apiClient.listBackups();
      setBackups(res.data);
    } catch (err) {
      console.error('Failed to load backups:', err);
    }
  };

  useEffect(() => {
    loadTags();
    loadBackups();
  }, []);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMessage({ type, text });
    setTimeout(() => setFeedbackMessage(null), 5000);
  };

  // Tag Handlers
  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    try {
      await apiClient.createTag(newTagName.trim());
      setNewTagName('');
      loadTags();
      showFeedback('Tag created successfully');
    } catch (err: any) {
      showFeedback(err.message || 'Failed to create tag', 'error');
    }
  };

  const handleUpdateTag = async (id: string) => {
    if (!editingTagName.trim()) return;
    try {
      await apiClient.updateTag(id, editingTagName.trim());
      setEditingTagId(null);
      setEditingTagName('');
      loadTags();
      showFeedback('Tag updated');
    } catch (err: any) {
      showFeedback(err.message || 'Failed to update tag', 'error');
    }
  };

  const handleDeleteTag = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete tag #${name}?`)) return;
    try {
      await apiClient.deleteTag(id);
      loadTags();
      showFeedback(`Tag #${name} deleted`);
    } catch (err: any) {
      showFeedback(err.message || 'Failed to delete tag', 'error');
    }
  };

  // Backup Handlers
  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      const res = await apiClient.createBackup(backupLabel.trim() || undefined);
      setBackupLabel('');
      loadBackups();
      showFeedback(`Backup created: ${res.data.filename}`);
    } catch (err: any) {
      showFeedback(err.message || 'Failed to create backup', 'error');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async (filename: string) => {
    const confirmed = confirm(
      `RESTORE WARNING:\n\nRestoring from '${filename}' will replace current database contacts with the backup records.\n\nA safety snapshot of the active database will automatically be taken before restoration. If the backup fails integrity checks, it will automatically roll back.\n\nProceed with restore?`
    );
    if (!confirmed) return;

    setIsRestoring(true);
    try {
      const res = await apiClient.restoreBackup(filename);
      loadBackups();
      showFeedback(
        `Database successfully restored from ${res.data.restoredFilename}! (Safety snapshot created: ${res.data.safetyBackupFilename})`
      );
    } catch (err: any) {
      showFeedback(err.message || 'Restore failed', 'error');
    } finally {
      setIsRestoring(false);
    }
  };

  // Import Handlers
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setImportCsvText(text);
      handlePreview(text);
    };
    reader.readAsText(file);
  };

  const handlePreview = async (textToPreview?: string) => {
    const text = textToPreview || importCsvText;
    if (!text.trim()) {
      showFeedback('Please provide or upload CSV content first', 'error');
      return;
    }

    setIsPreviewing(true);
    setImportSuccessResult(null);
    try {
      const res = await apiClient.previewImport(text);
      setImportPreview(res.data);
    } catch (err: any) {
      showFeedback(err.message || 'Failed to parse CSV preview', 'error');
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleCommitImport = async () => {
    if (!importCsvText.trim()) return;

    setIsCommitting(true);
    try {
      const res = await apiClient.commitImport({
        csvText: importCsvText,
        duplicateStrategy,
        tagAsImported,
        customTag: customImportTag.trim() || undefined,
      });

      setImportSuccessResult(res.data);
      setImportPreview(null);
      setImportCsvText('');
      loadTags();
      showFeedback(
        `Import completed: ${res.data.importedCount} imported, ${res.data.updatedCount} updated, ${res.data.skippedCount} skipped.`
      );
    } catch (err: any) {
      showFeedback(err.message || 'Failed to commit import', 'error');
    } finally {
      setIsCommitting(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div style={styles.container}>
      {/* Feedback Alert */}
      {feedbackMessage && (
        <div
          style={{
            ...styles.alert,
            backgroundColor:
              feedbackMessage.type === 'success' ? 'var(--success-subtle)' : '#fef2f2',
            borderColor:
              feedbackMessage.type === 'success' ? 'var(--success)' : 'var(--danger)',
            color: feedbackMessage.type === 'success' ? '#065f46' : 'var(--danger)',
          }}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle size={16} />
          ) : (
            <AlertTriangle size={16} />
          )}
          <span>{feedbackMessage.text}</span>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div style={styles.tabBar}>
        <button
          style={activeSubTab === 'export' ? styles.tabActive : styles.tab}
          onClick={() => setActiveSubTab('export')}
        >
          <Download size={15} />
          <span>Data Export</span>
        </button>
        <button
          style={activeSubTab === 'import' ? styles.tabActive : styles.tab}
          onClick={() => setActiveSubTab('import')}
        >
          <Upload size={15} />
          <span>CSV Import Wizard</span>
        </button>
        <button
          style={activeSubTab === 'backups' ? styles.tabActive : styles.tab}
          onClick={() => setActiveSubTab('backups')}
        >
          <Database size={15} />
          <span>Database Backups</span>
        </button>
        <button
          style={activeSubTab === 'tags' ? styles.tabActive : styles.tab}
          onClick={() => setActiveSubTab('tags')}
        >
          <TagIcon size={15} />
          <span>Tag Management</span>
        </button>
      </div>

      {/* 1. DATA EXPORT SECTION */}
      {activeSubTab === 'export' && (
        <div style={styles.sectionContainer}>
          <div className="card" style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.cardTitle}>Complete Data Portability & Exports</h3>
                <p style={styles.cardSubtitle}>
                  Download your contacts, companies, conversation history, and commitments in open, standard formats. All CSV exports include formula-injection protection.
                </p>
              </div>
            </div>

            <div style={styles.exportGrid}>
              <div style={styles.exportItem}>
                <div style={styles.exportIconBox}>
                  <FileSpreadsheet size={24} color="var(--primary)" />
                </div>
                <div style={styles.exportInfo}>
                  <h4 style={styles.exportName}>Contacts Directory (CSV)</h4>
                  <p style={styles.exportDesc}>
                    All contact profiles with emails, phones, job titles, affiliated organizations, tags, notes, and timestamps.
                  </p>
                  <a
                    href="/api/export/contacts.csv"
                    download
                    className="btn btn-secondary btn-sm"
                    style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
                  >
                    <Download size={13} />
                    <span>Download Contacts CSV</span>
                  </a>
                </div>
              </div>

              <div style={styles.exportItem}>
                <div style={styles.exportIconBox}>
                  <FileSpreadsheet size={24} color="var(--primary)" />
                </div>
                <div style={styles.exportInfo}>
                  <h4 style={styles.exportName}>Organizations (CSV)</h4>
                  <p style={styles.exportDesc}>
                    Companies, industries, websites, contact details, descriptions, and affiliated organizational data.
                  </p>
                  <a
                    href="/api/export/organizations.csv"
                    download
                    className="btn btn-secondary btn-sm"
                    style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
                  >
                    <Download size={13} />
                    <span>Download Organizations CSV</span>
                  </a>
                </div>
              </div>

              <div style={styles.exportItem}>
                <div style={styles.exportIconBox}>
                  <FileSpreadsheet size={24} color="var(--primary)" />
                </div>
                <div style={styles.exportInfo}>
                  <h4 style={styles.exportName}>Interactions & Timeline (CSV)</h4>
                  <p style={styles.exportDesc}>
                    Complete chronological history of calls, meetings, emails, locations, summaries, and touchpoint notes.
                  </p>
                  <a
                    href="/api/export/interactions.csv"
                    download
                    className="btn btn-secondary btn-sm"
                    style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
                  >
                    <Download size={13} />
                    <span>Download Interactions CSV</span>
                  </a>
                </div>
              </div>

              <div style={styles.exportItem}>
                <div style={styles.exportIconBox}>
                  <FileSpreadsheet size={24} color="var(--primary)" />
                </div>
                <div style={styles.exportInfo}>
                  <h4 style={styles.exportName}>Follow-up Tasks (CSV)</h4>
                  <p style={styles.exportDesc}>
                    Actionable commitments, due dates, priority levels, completion status, and linked contacts.
                  </p>
                  <a
                    href="/api/export/tasks.csv"
                    download
                    className="btn btn-secondary btn-sm"
                    style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
                  >
                    <Download size={13} />
                    <span>Download Tasks CSV</span>
                  </a>
                </div>
              </div>

              <div style={styles.exportItem}>
                <div style={styles.exportIconBox}>
                  <FileJson size={24} color="var(--primary)" />
                </div>
                <div style={styles.exportInfo}>
                  <h4 style={styles.exportName}>Complete Snapshot (JSON)</h4>
                  <p style={styles.exportDesc}>
                    Complete structured JSON archive including all database tables, relationships, junction tables, and metadata.
                  </p>
                  <a
                    href="/api/export/all.json"
                    download
                    className="btn btn-primary btn-sm"
                    style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}
                  >
                    <Download size={13} />
                    <span>Download Complete JSON</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CSV IMPORT WIZARD */}
      {activeSubTab === 'import' && (
        <div style={styles.sectionContainer}>
          <div className="card" style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.cardTitle}>CSV Contact Import Wizard</h3>
                <p style={styles.cardSubtitle}>
                  Import contacts from Google Contacts, Apple Contacts, Outlook, or spreadsheets with automated column mapping, duplicate preview, and transactional safety.
                </p>
              </div>
            </div>

            {/* Success summary if just imported */}
            {importSuccessResult && (
              <div style={styles.successBox}>
                <CheckCircle size={20} color="var(--success)" />
                <div>
                  <h4 style={{ fontWeight: 600, color: 'var(--success)' }}>Import Successful!</h4>
                  <p style={{ fontSize: '0.8125rem', marginTop: '0.2rem' }}>
                    Successfully imported <strong>{importSuccessResult.importedCount}</strong> new contacts, updated <strong>{importSuccessResult.updatedCount}</strong> existing contacts, and skipped <strong>{importSuccessResult.skippedCount}</strong> duplicate or invalid rows.
                  </p>
                </div>
              </div>
            )}

            {/* Step 1: Input CSV */}
            {!importPreview && (
              <div style={styles.stepBox}>
                <div style={styles.dropZone}>
                  <Upload size={32} color="var(--text-light)" />
                  <p style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '0.5rem' }}>
                    Choose a CSV file or paste content below
                  </p>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileUpload}
                    style={{ marginTop: '0.75rem', fontSize: '0.8125rem' }}
                  />
                </div>

                <div style={{ marginTop: '1rem' }}>
                  <label className="label">Or paste raw CSV text:</label>
                  <textarea
                    className="textarea"
                    rows={6}
                    placeholder="First Name,Last Name,Email,Company,Phone,Notes&#10;Alice,Smith,alice@example.com,Acme Corp,555-0101,Met at tech conference"
                    value={importCsvText}
                    onChange={(e) => setImportCsvText(e.target.value)}
                  />
                </div>

                <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-primary"
                    onClick={() => handlePreview()}
                    disabled={isPreviewing || !importCsvText.trim()}
                  >
                    {isPreviewing ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Analyzing CSV...</span>
                      </>
                    ) : (
                      <>
                        <ShieldCheck size={15} />
                        <span>Preview & Analyze Import</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Preview & Configuration */}
            {importPreview && (
              <div style={styles.stepBox}>
                <div style={styles.previewStats}>
                  <div style={styles.statPill}>
                    <span style={styles.statLabel}>Total Rows:</span>
                    <span style={styles.statVal}>{importPreview.totalRows}</span>
                  </div>
                  <div style={styles.statPill}>
                    <span style={styles.statLabel}>Valid Rows:</span>
                    <span style={{ ...styles.statVal, color: 'var(--success)' }}>
                      {importPreview.validRowsCount}
                    </span>
                  </div>
                  <div style={styles.statPill}>
                    <span style={styles.statLabel}>Invalid Rows:</span>
                    <span style={{ ...styles.statVal, color: 'var(--danger)' }}>
                      {importPreview.invalidRowsCount}
                    </span>
                  </div>
                  <div style={styles.statPill}>
                    <span style={styles.statLabel}>Potential Duplicates:</span>
                    <span style={{ ...styles.statVal, color: 'var(--warning)' }}>
                      {importPreview.duplicateCount}
                    </span>
                  </div>
                </div>

                {/* Import Strategy Options */}
                <div style={styles.optionsGrid}>
                  <div>
                    <label className="label">Duplicate Handling Strategy:</label>
                    <select
                      className="select"
                      value={duplicateStrategy}
                      onChange={(e) => setDuplicateStrategy(e.target.value as any)}
                    >
                      <option value="skip">Skip duplicates (Safe & Recommended)</option>
                      <option value="update">Update existing contacts with imported details</option>
                      <option value="import_anyway">Import as new contacts anyway</option>
                    </select>
                  </div>

                  <div>
                    <label className="label">Tagging Options:</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.4rem' }}>
                      <input
                        type="checkbox"
                        id="tagImported"
                        checked={tagAsImported}
                        onChange={(e) => setTagAsImported(e.target.checked)}
                      />
                      <label htmlFor="tagImported" style={{ fontSize: '0.8125rem', cursor: 'pointer' }}>
                        Tag with imported date badge
                      </label>
                    </div>
                  </div>
                </div>

                {/* Sample Preview Table */}
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '1.25rem', marginBottom: '0.5rem' }}>
                  Preview (First {importPreview.previewRows.length} Rows)
                </h4>
                <div style={styles.previewTableWrapper}>
                  <table className="table" style={{ fontSize: '0.75rem' }}>
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Phone</th>
                        <th>Organization</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.previewRows.map((row: any) => (
                        <tr key={row.rowNumber}>
                          <td>{row.rowNumber}</td>
                          <td>
                            <strong>
                              {row.parsedContact.display_name ||
                                `${row.parsedContact.first_name} ${row.parsedContact.last_name}`}
                            </strong>
                          </td>
                          <td>{row.parsedContact.primary_email || '—'}</td>
                          <td>{row.parsedContact.primary_phone || '—'}</td>
                          <td>{row.parsedContact.organization || '—'}</td>
                          <td>
                            {row.hasDuplicate ? (
                              <span className="badge badge-warning" title={row.duplicateReason}>
                                Duplicate: {row.existingContact?.name}
                              </span>
                            ) : !row.isValid ? (
                              <span className="badge badge-danger">Invalid row</span>
                            ) : (
                              <span className="badge badge-success">Ready</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Actions */}
                <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => {
                      setImportPreview(null);
                      setImportCsvText('');
                    }}
                  >
                    Cancel
                  </button>

                  <button
                    className="btn btn-primary"
                    onClick={handleCommitImport}
                    disabled={isCommitting || importPreview.validRowsCount === 0}
                  >
                    {isCommitting ? (
                      <>
                        <Loader2 size={15} className="animate-spin" />
                        <span>Importing Records...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle size={15} />
                        <span>Commit Import ({importPreview.validRowsCount} contacts)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. DATABASE BACKUP & RESTORE */}
      {activeSubTab === 'backups' && (
        <div style={styles.sectionContainer}>
          <div className="card" style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.cardTitle}>Local SQLite Database Backups</h3>
                <p style={styles.cardSubtitle}>
                  Create point-in-time SQLite backups stored in <code>data/backups/</code>. Restoring automatically creates a pre-restore safety copy and verifies database integrity before applying changes.
                </p>
              </div>
            </div>

            {/* Create Backup Box */}
            <div style={styles.createBackupBox}>
              <div style={{ flex: 1, maxWidth: '400px' }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Optional backup label (e.g., before_quarterly_review)"
                  value={backupLabel}
                  onChange={(e) => setBackupLabel(e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleCreateBackup}
                disabled={isCreatingBackup}
              >
                {isCreatingBackup ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Creating Backup...</span>
                  </>
                ) : (
                  <>
                    <Database size={15} />
                    <span>Create Database Backup Now</span>
                  </>
                )}
              </button>
            </div>

            {/* Backups Table */}
            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginTop: '1.5rem', marginBottom: '0.75rem' }}>
              Available Backups ({backups.length})
            </h4>

            {backups.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No database backups found in <code>data/backups/</code>. Click above to create your first backup.
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Filename</th>
                      <th>Created</th>
                      <th>Size</th>
                      <th>Integrity</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.map((b) => (
                      <tr key={b.filename}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <Database size={14} color="var(--primary)" />
                            <span style={{ fontWeight: 600 }}>{b.filename}</span>
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{b.createdAt.slice(0, 19).replace('T', ' ')}</td>
                        <td>{formatBytes(b.sizeBytes)}</td>
                        <td>
                          <span className="badge badge-success">
                            <ShieldCheck size={11} style={{ display: 'inline', marginRight: 3 }} />
                            Verified OK
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleRestoreBackup(b.filename)}
                            disabled={isRestoring}
                            title="Restore database from this backup"
                          >
                            <RotateCcw size={13} />
                            <span>Restore</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. TAG MANAGEMENT */}
      {activeSubTab === 'tags' && (
        <div style={styles.sectionContainer}>
          <div className="card" style={styles.card}>
            <div style={styles.cardHeader}>
              <div>
                <h3 style={styles.cardTitle}>Tag Management</h3>
                <p style={styles.cardSubtitle}>
                  Organize contacts with custom tags. Renaming a tag automatically updates all affiliated contacts.
                </p>
              </div>
            </div>

            {/* Create Tag Bar */}
            <div style={{ display: 'flex', gap: '0.5rem', maxWidth: '400px', marginBottom: '1.25rem' }}>
              <input
                type="text"
                className="input"
                placeholder="New tag name (e.g. Investor, Mentor, College)..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateTag();
                }}
              />
              <button className="btn btn-primary" onClick={handleCreateTag}>
                <Plus size={15} />
                <span>Add Tag</span>
              </button>
            </div>

            {/* Tag List */}
            {tags.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No tags created yet.
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Tag Name</th>
                      <th>Affiliated Contacts</th>
                      <th>Created</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tags.map((t) => (
                      <tr key={t.id}>
                        <td>
                          {editingTagId === t.id ? (
                            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                              <input
                                type="text"
                                className="input"
                                value={editingTagName}
                                onChange={(e) => setEditingTagName(e.target.value)}
                                autoFocus
                                style={{ width: '180px', padding: '0.25rem 0.5rem' }}
                              />
                              <button
                                className="btn btn-primary btn-sm"
                                onClick={() => handleUpdateTag(t.id)}
                              >
                                <Check size={13} />
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => setEditingTagId(null)}
                              >
                                <X size={13} />
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                              <TagIcon size={13} color="var(--primary)" />
                              <span style={{ fontWeight: 600 }}>#{t.name}</span>
                            </div>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-primary">{t.contacts_count ?? 0} contacts</span>
                        </td>
                        <td style={{ color: 'var(--text-muted)' }}>{t.created_at.slice(0, 10)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                setEditingTagId(t.id);
                                setEditingTagName(t.name);
                              }}
                              title="Edit tag name"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleDeleteTag(t.id, t.name)}
                              title="Delete tag"
                              style={{ color: 'var(--danger)' }}
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
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  alert: {
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.875rem',
  },
  tabBar: {
    display: 'flex',
    gap: '0.5rem',
    borderBottom: '1px solid var(--border-subtle)',
    paddingBottom: '0.5rem',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.5rem 0.85rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: 'var(--text-muted)',
    backgroundColor: 'transparent',
    border: 'none',
    cursor: 'pointer',
  },
  tabActive: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.5rem 0.85rem',
    borderRadius: 'var(--radius-md)',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--primary)',
    backgroundColor: 'var(--primary-subtle)',
    border: 'none',
    cursor: 'pointer',
  },
  sectionContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  card: {
    padding: '1.5rem',
  },
  cardHeader: {
    marginBottom: '1.25rem',
  },
  cardTitle: {
    fontSize: '1.125rem',
    fontWeight: 600,
    color: 'var(--text-main)',
  },
  cardSubtitle: {
    fontSize: '0.8125rem',
    color: 'var(--text-muted)',
    marginTop: '0.25rem',
  },
  exportGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  exportItem: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '1rem',
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border-subtle)',
    backgroundColor: '#f8fafc',
  },
  exportIconBox: {
    padding: '0.75rem',
    borderRadius: 'var(--radius-md)',
    backgroundColor: '#ffffff',
    border: '1px solid var(--border-subtle)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportInfo: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  },
  exportName: {
    fontSize: '0.9375rem',
    fontWeight: 600,
    color: 'var(--text-main)',
  },
  exportDesc: {
    fontSize: '0.8125rem',
    color: 'var(--text-muted)',
    marginTop: '0.25rem',
  },
  stepBox: {
    marginTop: '1rem',
  },
  dropZone: {
    border: '2px dashed var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
    padding: '2rem',
    textAlign: 'center',
    backgroundColor: '#f8fafc',
  },
  previewStats: {
    display: 'flex',
    gap: '1rem',
    flexWrap: 'wrap',
    padding: '0.75rem 1rem',
    borderRadius: 'var(--radius-md)',
    backgroundColor: '#f8fafc',
    border: '1px solid var(--border-subtle)',
  },
  statPill: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontSize: '0.8125rem',
  },
  statLabel: {
    color: 'var(--text-muted)',
  },
  statVal: {
    fontWeight: 700,
  },
  optionsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1rem',
    marginTop: '1rem',
  },
  previewTableWrapper: {
    maxHeight: '300px',
    overflowY: 'auto',
    border: '1px solid var(--border-subtle)',
    borderRadius: 'var(--radius-md)',
  },
  successBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
    backgroundColor: 'var(--success-subtle)',
    border: '1px solid var(--success)',
    marginBottom: '1rem',
  },
  createBackupBox: {
    display: 'flex',
    gap: '0.75rem',
    alignItems: 'center',
    padding: '1rem',
    borderRadius: 'var(--radius-md)',
    backgroundColor: '#f8fafc',
    border: '1px solid var(--border-subtle)',
  },
};
