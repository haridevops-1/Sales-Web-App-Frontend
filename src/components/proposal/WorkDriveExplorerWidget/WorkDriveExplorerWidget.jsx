import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import './WorkDriveExplorerWidget.css';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cloud,
  Folder,
  FileText,
  FileSpreadsheet,
  File as FileIcon,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Check,
  X as XIcon,
  Loader2,
  FolderOpen,
  CheckCircle2,
  Building2,
  ExternalLink,
  Info,
  LogOut,
  Sparkles
} from 'lucide-react';
import { useWorkDrive } from '@/context/WorkDriveContext';
import { listWorkdriveItems } from '@/api/workdriveApi';
import { normalizeWorkdriveItems } from '@/components/shared/WorkDrivePicker/workdriveItem';
import { formatBytes, formatDate } from '@/utils/helpers';

const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.txt', '.md'];

function isFileSupported(filename) {
  const name = String(filename || '').toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function getFileBadge(extension) {
  const ext = String(extension || '').toLowerCase();
  if (['.xlsx', '.xls', '.csv'].includes(ext)) {
    return { Icon: FileSpreadsheet, badgeClass: 'sheet' };
  }
  if (ext === '.pdf') {
    return { Icon: FileText, badgeClass: 'pdf' };
  }
  if (['.docx', '.doc'].includes(ext)) {
    return { Icon: FileText, badgeClass: 'doc' };
  }
  return { Icon: FileIcon, badgeClass: 'text' };
}

export default function WorkDriveExplorerWidget({
  isOpen = false,
  onClose,
  onSelectFiles,
  initialBusinessName = '',
  alreadyStagedIds = [],
  onToast
}) {
  const { isConnected, email, handleOpenWorkDrive, disconnect } = useWorkDrive();

  // Business Name Search state
  const [businessName, setBusinessName] = useState(initialBusinessName || '');
  const [activeSearch, setActiveSearch] = useState(initialBusinessName || '');

  // Folder navigation state: [{ id: null, name: 'WorkDrive Root' }]
  const [pathStack, setPathStack] = useState([{ id: null, name: 'WorkDrive Root' }]);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Business folder detection state
  const [matchedFolderInfo, setMatchedFolderInfo] = useState(null);
  const [allMatchedFolders, setAllMatchedFolders] = useState([]);

  // Widget-selected files map: fileId -> fileObject
  const [selectedMap, setSelectedMap] = useState(new Map());

  const currentFolder = pathStack[pathStack.length - 1];
  const modalRef = useRef(null);

  // Freeze the background screen when modal is open
  useEffect(() => {
    if (isOpen) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isOpen]);

  // Sync initialBusinessName if changed from parent
  useEffect(() => {
    if (initialBusinessName && initialBusinessName !== businessName) {
      setBusinessName(initialBusinessName);
      setActiveSearch(initialBusinessName);
    }
  }, [initialBusinessName]);

  // Load items from WorkDrive API based on business name and folder
  const fetchItems = useCallback(async (folderId = null, query = '', signal) => {
    if (!isConnected) return;
    setIsLoading(true);
    setError(null);

    const cleanQuery = String(query || '').trim().toLowerCase();

    try {
      // Step 1: If folderId is explicitly provided (user navigated into a subfolder), load that folder
      if (folderId) {
        const res = await listWorkdriveItems(folderId, signal);
        const normalized = normalizeWorkdriveItems(res?.items || []);
        setItems(normalized);
        return;
      }

      // Step 2: At root level, always fetch root items (folders & files)
      const rootRes = await listWorkdriveItems(null, signal);
      const rootItems = normalizeWorkdriveItems(rootRes?.items || []);
      const rootFolders = rootItems.filter((i) => i.isFolder);

      // Step 3: If a business name is provided, find matching business folders or files -
      // filtered client-side from the SAME root listing already fetched above. Never a
      // second network call for the same data just to try a different filter.
      if (cleanQuery) {
        const nameMatches = (item) => {
          const name = String(item.name || '').toLowerCase();
          return name.includes(cleanQuery) || cleanQuery.includes(name);
        };

        const matched = rootFolders.filter(nameMatches);

        if (matched.length > 0) {
          // Found matching business folder(s)!
          const bestFolder = matched[0];
          setMatchedFolderInfo(bestFolder);
          setAllMatchedFolders(matched);

          // Automatically load ALL FILES inside that business folder!
          const folderRes = await listWorkdriveItems(bestFolder.id, signal);
          const folderItems = normalizeWorkdriveItems(folderRes?.items || []);

          setPathStack([
            { id: null, name: 'WorkDrive Root' },
            { id: bestFolder.id, name: bestFolder.name }
          ]);
          setItems(folderItems);
          return;
        }

        // No folder matched by name - check for files at root matching the query instead
        const matchedFiles = rootItems.filter((i) => !i.isFolder && nameMatches(i));
        if (matchedFiles.length > 0) {
          setMatchedFolderInfo(null);
          setAllMatchedFolders([]);
          setPathStack([{ id: null, name: `Search: "${query}"` }]);
          setItems(matchedFiles);
          return;
        }

        // No folder or file matched the query - show root folders with notice
        setMatchedFolderInfo(null);
        setAllMatchedFolders([]);
        setPathStack([{ id: null, name: 'WorkDrive Root' }]);
        setItems(rootItems);
        return;
      }

      // Step 4: No business name query given - show root folders
      setMatchedFolderInfo(null);
      setAllMatchedFolders([]);
      setPathStack([{ id: null, name: 'WorkDrive Root' }]);
      setItems(rootItems);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.warn('[WorkDrive Widget] Fetch failed:', err);
      setError(err.message || 'Unable to load items from Zoho WorkDrive.');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  // Auto-fetch when modal opens or path/search changes
  useEffect(() => {
    if (!isOpen || !isConnected) return;
    const controller = new AbortController();
    fetchItems(currentFolder.id, activeSearch, controller.signal);
    return () => controller.abort();
  }, [isOpen, isConnected, currentFolder.id, activeSearch, fetchItems]);

  // Handle ESC key to cancel/close
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Execute business name search
  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const clean = businessName.trim();
    setActiveSearch(clean);
    // Reset path stack to root so search resolves business folders from root
    setPathStack([{ id: null, name: 'WorkDrive Root' }]);
  };

  const handleClearSearch = () => {
    setBusinessName('');
    setActiveSearch('');
    setMatchedFolderInfo(null);
    setAllMatchedFolders([]);
    setPathStack([{ id: null, name: 'WorkDrive Root' }]);
  };

  // Switch to another matched folder when multiple match
  const handleSwitchMatchedFolder = async (folder) => {
    setMatchedFolderInfo(folder);
    setPathStack([
      { id: null, name: 'WorkDrive Root' },
      { id: folder.id, name: folder.name }
    ]);
    setIsLoading(true);
    setError(null);
    try {
      const res = await listWorkdriveItems(folder.id);
      const folderItems = normalizeWorkdriveItems(res?.items || []);
      setItems(folderItems);
    } catch (err) {
      setError(err.message || 'Failed to load folder files.');
    } finally {
      setIsLoading(false);
    }
  };

  // Folder navigation: open any folder
  const openFolder = async (folder) => {
    setMatchedFolderInfo(folder);
    if (!businessName.trim()) {
      setBusinessName(folder.name);
    }
    setPathStack((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const goBack = () => {
    if (pathStack.length > 1) {
      setMatchedFolderInfo(null);
      setPathStack((prev) => prev.slice(0, -1));
    }
  };

  const goToBreadcrumb = (idx) => {
    if (idx === 0) setMatchedFolderInfo(null);
    setPathStack((prev) => prev.slice(0, idx + 1));
  };

  // Toggle file selection
  const handleToggleFile = (file) => {
    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (next.has(file.id)) {
        next.delete(file.id);
      } else {
        next.set(file.id, {
          name: file.name,
          size: file.size || 0,
          isWorkdrive: true,
          workdrive_file_id: file.id,
          extension: file.extension || '',
          folderPath: pathStack.length > 1 ? pathStack.map((p) => p.name).join(' / ') : 'Root'
        });
      }
      return next;
    });
  };

  // Select / deselect all supported files in current view
  const handleSelectAllInFolder = () => {
    const supportedFiles = items.filter((i) => !i.isFolder && isFileSupported(i.name));
    if (supportedFiles.length === 0) return;

    const allCurrentlySelected = supportedFiles.every((f) => selectedMap.has(f.id));

    setSelectedMap((prev) => {
      const next = new Map(prev);
      if (allCurrentlySelected) {
        supportedFiles.forEach((f) => next.delete(f.id));
      } else {
        supportedFiles.forEach((file) => {
          next.set(file.id, {
            name: file.name,
            size: file.size || 0,
            isWorkdrive: true,
            workdrive_file_id: file.id,
            extension: file.extension || '',
            folderPath: pathStack.length > 1 ? pathStack.map((p) => p.name).join(' / ') : 'Root'
          });
        });
      }
      return next;
    });

    if (onToast) {
      if (allCurrentlySelected) {
        onToast(`Deselected ${supportedFiles.length} document(s).`, 'info', 2000);
      } else {
        onToast(`Selected all ${supportedFiles.length} document(s) in this folder.`, 'info', 2500);
      }
    }
  };

  // Confirm and attach selected files to proposal
  const handleAttachToProposal = () => {
    const selectedFiles = Array.from(selectedMap.values());
    if (selectedFiles.length === 0) {
      if (onToast) onToast('Please select at least one document to attach.', 'warning', 3000);
      return;
    }

    const resolvedBusinessName = businessName.trim() || (matchedFolderInfo?.name) || (currentFolder?.name !== 'WorkDrive Root' ? currentFolder.name : '');

    if (onSelectFiles) {
      onSelectFiles(selectedFiles, resolvedBusinessName);
    }

    if (onToast) {
      onToast(`Attached ${selectedFiles.length} WorkDrive document(s) for ${resolvedBusinessName || 'Proposal'}.`, 'success', 3500);
    }

    setSelectedMap(new Map());
    onClose();
  };

  const folders = items.filter((i) => i.isFolder);
  const files = items.filter((i) => !i.isFolder);
  const totalSelectedCount = selectedMap.size;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="workdrive-widget-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="wd-widget-title">
          <motion.div
            className="workdrive-widget-modal"
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            ref={modalRef}
          >
            {/* 1. Header Bar */}
            <div className="wd-widget-header">
              <div className="wd-header-left">
                <div className="wd-brand-badge">
                  <Cloud size={18} className="text-orange-500" />
                  <span className="wd-pulse-green" />
                </div>
                <div className="wd-header-text">
                  <h3 id="wd-widget-title" className="wd-modal-title">Zoho WorkDrive Explorer</h3>
                  <p className="wd-modal-subtitle">
                    {isConnected ? (
                      <>Connected as <span className="font-semibold text-slate-800 dark:text-slate-200">{email}</span></>
                    ) : (
                      'Not connected to Zoho WorkDrive'
                    )}
                  </p>
                </div>
              </div>

              <div className="wd-header-actions">
                {isConnected && (
                  <button
                    type="button"
                    className="btn-wd-header-icon"
                    onClick={() => fetchItems(currentFolder.id, activeSearch)}
                    title="Refresh items"
                    disabled={isLoading}
                  >
                    <RefreshCw size={14} className={isLoading ? 'animate-spin text-orange-500' : ''} />
                  </button>
                )}

                {isConnected && (
                  <button
                    type="button"
                    className="btn-wd-disconnect"
                    onClick={async () => {
                      await disconnect();
                      onClose();
                    }}
                    title="Disconnect account"
                  >
                    <LogOut size={13} />
                    <span>Disconnect</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn-wd-close"
                  onClick={onClose}
                  aria-label="Cancel and Close"
                  title="Close WorkDrive Explorer (ESC)"
                >
                  <XIcon size={16} />
                </button>
              </div>
            </div>

            {/* 2. Business / Client Name Search Bar */}
            <div className="wd-business-search-panel">
              <form onSubmit={handleSearchSubmit} className="wd-search-form">
                <div className="wd-search-input-group">
                  <Building2 size={16} className="wd-search-icon" />
                  <input
                    type="text"
                    id="workdrive-business-name-input"
                    name="business_name"
                    className="wd-business-input"
                    placeholder="Enter business / client name (e.g. Acme Corp, Joy & Co, Sundar)..."
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                  />
                  {businessName && (
                    <button
                      type="button"
                      className="btn-clear-business-input"
                      onClick={handleClearSearch}
                      title="Clear search"
                    >
                      <XIcon size={14} />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  className="btn-wd-search-submit"
                  disabled={isLoading || !businessName.trim()}
                >
                  <Search size={14} />
                  <span>Find Business Files</span>
                </button>
              </form>

              {activeSearch && (
                <div className="wd-active-search-chip">
                  <span>Searching for: <strong>"{activeSearch}"</strong></span>
                  <button type="button" onClick={handleClearSearch} className="chip-reset-link">
                    Reset to All Folders
                  </button>
                </div>
              )}
            </div>

            {/* Multiple matched folders switcher (if multiple match query) */}
            {allMatchedFolders.length > 1 && (
              <div className="wd-matched-folders-bar" style={{ padding: '0.5rem 1.5rem', background: '#F8FAFC', borderBottom: '1px solid #EDF2F7', display: 'flex', alignItems: 'center', gap: '0.5rem', overflowX: 'auto' }}>
                <span style={{ fontSize: '0.78rem', color: '#64748B', fontWeight: 600, whiteSpace: 'nowrap' }}>Matching folders:</span>
                {allMatchedFolders.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => handleSwitchMatchedFolder(f)}
                    style={{
                      background: matchedFolderInfo?.id === f.id ? '#FFF7ED' : '#FFFFFF',
                      border: matchedFolderInfo?.id === f.id ? '1px solid #F97316' : '1px solid #E2E8F0',
                      color: matchedFolderInfo?.id === f.id ? '#C2410C' : '#334155',
                      padding: '3px 10px',
                      borderRadius: '14px',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Folder size={12} className={matchedFolderInfo?.id === f.id ? 'text-orange-500' : 'text-slate-400'} />
                    <span>{f.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* 3. Navigation Toolbar & Breadcrumbs */}
            <div className="wd-widget-toolbar">
              <div className="wd-breadcrumbs">
                {pathStack.map((crumb, idx) => (
                  <React.Fragment key={crumb.id || 'root'}>
                    {idx > 0 && <ChevronRight size={13} className="crumb-chevron" />}
                    <button
                      type="button"
                      className={`wd-crumb-btn ${idx === pathStack.length - 1 ? 'is-current' : ''}`}
                      onClick={() => goToBreadcrumb(idx)}
                      disabled={idx === pathStack.length - 1}
                    >
                      {idx === 0 && <Cloud size={12} className="inline mr-1 text-orange-500" />}
                      <span>{crumb.name}</span>
                    </button>
                  </React.Fragment>
                ))}
              </div>

              <div className="wd-toolbar-right">
                {pathStack.length > 1 && (
                  <button
                    type="button"
                    className="btn-wd-toolbar-nav"
                    onClick={goBack}
                    title="Go back to parent folder"
                  >
                    <ChevronLeft size={14} />
                    <span>Back</span>
                  </button>
                )}

                <button
                  type="button"
                  className="btn-wd-toolbar-nav btn-select-all"
                  onClick={handleSelectAllInFolder}
                  disabled={files.length === 0}
                  title="Select all supported files in this folder"
                >
                  <CheckCircle2 size={13} className="text-orange-500" />
                  <span>Select All Files ({files.filter(f => isFileSupported(f.name)).length})</span>
                </button>
              </div>
            </div>

            {/* Active Business Folder Notice */}
            {matchedFolderInfo && (
              <div style={{
                background: 'linear-gradient(90deg, #FFF7ED 0%, #FFEDD5 100%)',
                borderBottom: '1px solid #FED7AA',
                padding: '0.65rem 1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                fontSize: '0.84rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#9A3412', fontWeight: 600 }}>
                  <FolderOpen size={16} className="text-orange-600" />
                  <span>Showing all documents inside business folder: <strong>"{matchedFolderInfo.name}"</strong></span>
                </div>
                <span style={{ fontSize: '0.78rem', color: '#C2410C', background: '#FFFFFF', padding: '2px 8px', borderRadius: '10px', border: '1px solid #FDBA74' }}>
                  {files.length} document{files.length === 1 ? '' : 's'}
                </span>
              </div>
            )}

            {/* 4. Explorer Viewport */}
            <div className="wd-widget-viewport">
              {!isConnected ? (
                <div className="wd-state-empty">
                  <Cloud size={32} className="text-slate-300" />
                  <h4>Connect to Zoho WorkDrive</h4>
                  <p>Authorize your WorkDrive account to browse client folders and discovery files.</p>
                  <button
                    type="button"
                    className="btn-connect-oauth-modal"
                    onClick={handleOpenWorkDrive}
                  >
                    <Sparkles size={14} />
                    <span>Open Zoho OAuth Login</span>
                  </button>
                </div>
              ) : isLoading ? (
                <div className="wd-state-loading">
                  <Loader2 size={28} className="animate-spin text-orange-500" />
                  <span>Loading Zoho WorkDrive folders and files...</span>
                </div>
              ) : error ? (
                <div className="wd-state-error">
                  <Info size={22} className="text-red-500" />
                  <h4>Unable to Load WorkDrive Items</h4>
                  <p>{error}</p>
                  <button
                    type="button"
                    className="btn-wd-retry"
                    onClick={() => fetchItems(currentFolder.id, activeSearch)}
                  >
                    Try Again
                  </button>
                </div>
              ) : folders.length === 0 && files.length === 0 ? (
                <div className="wd-state-empty">
                  <FolderOpen size={32} className="text-slate-300" />
                  <h4>No Documents Found</h4>
                  <p>
                    {activeSearch
                      ? `No folders or files matched "${activeSearch}". Try another business name or view root folders.`
                      : 'This WorkDrive folder does not contain any files or subfolders.'}
                  </p>
                  {activeSearch && (
                    <button type="button" className="btn-wd-retry" onClick={handleClearSearch}>
                      View All Folders
                    </button>
                  )}
                </div>
              ) : (
                <div className="wd-items-container">
                  {/* Section: Subfolders */}
                  {folders.length > 0 && (
                    <div className="wd-folders-section">
                      <span className="wd-section-label">
                        {currentFolder.id ? `Subfolders (${folders.length})` : `Business Client Folders (${folders.length})`}
                      </span>
                      <div className="wd-folders-grid">
                        {folders.map((folder) => (
                          <div
                            key={folder.id}
                            className="wd-folder-card"
                            onClick={() => openFolder(folder)}
                            role="button"
                            tabIndex={0}
                            title={`Open folder: ${folder.name}`}
                          >
                            <div className="folder-card-left">
                              <div className="folder-icon-wrapper">
                                <Folder size={17} />
                              </div>
                              <div className="folder-name-box">
                                <span className="folder-title font-medium">{folder.name}</span>
                                <span className="folder-meta">Click to show all files</span>
                              </div>
                            </div>
                            <span className="folder-chevron">→</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section: Documents / Subfiles */}
                  {files.length > 0 && (
                    <div className="wd-files-section">
                      <span className="wd-section-label">Documents & Files ({files.length})</span>
                      <div className="wd-files-list">
                        {files.map((file) => {
                          const isSupported = isFileSupported(file.name);
                          const isSelected = selectedMap.has(file.id);
                          const isAlreadyImported = alreadyStagedIds.includes(file.id);
                          const badge = getFileBadge(file.extension);
                          const BadgeIcon = badge.Icon;

                          return (
                            <div
                              key={file.id}
                              className={`wd-file-row ${isSelected ? 'is-selected' : ''} ${!isSupported ? 'is-unsupported' : ''} ${isAlreadyImported ? 'is-already-staged' : ''}`}
                              onClick={() => isSupported && handleToggleFile(file)}
                              role="button"
                              tabIndex={isSupported ? 0 : -1}
                              title={!isSupported ? 'File type not supported' : file.name}
                            >
                              <div className="file-row-left">
                                <div className={`file-badge-icon ${badge.badgeClass}`}>
                                  <BadgeIcon size={14} />
                                </div>
                                <div className="file-text-box">
                                  <span className="file-title">{file.name}</span>
                                  <span className="file-subtext">
                                    {file.size > 0 ? formatBytes(file.size) : 'Document'}
                                    {file.modifiedTime ? ` · ${formatDate(file.modifiedTime)}` : ''}
                                    {isAlreadyImported && ' · Already Attached'}
                                  </span>
                                </div>
                              </div>

                              <div className="file-row-right">
                                <div
                                  className={`wd-checkbox ${isSelected ? 'checked' : ''} ${!isSupported ? 'disabled' : ''}`}
                                >
                                  {isSelected && <Check size={12} strokeWidth={3} />}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 5. Footer & Action Bar */}
            <div className="wd-widget-footer">
              <div className="wd-footer-left">
                <span className="wd-selected-counter">
                  <strong>{totalSelectedCount}</strong> {totalSelectedCount === 1 ? 'file' : 'files'} selected
                </span>
              </div>

              <div className="wd-footer-right">
                <button
                  type="button"
                  className="btn-wd-cancel"
                  onClick={onClose}
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="btn-wd-attach"
                  onClick={handleAttachToProposal}
                  disabled={totalSelectedCount === 0}
                >
                  <span>Attach to Proposal</span>
                  <span className="btn-count-bubble">{totalSelectedCount}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
