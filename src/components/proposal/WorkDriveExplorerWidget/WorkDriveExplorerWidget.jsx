import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { listWorkdriveItems, searchWorkdrive } from '@/api/workdriveApi';
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
  const [businessName, setBusinessName] = useState(initialBusinessName);
  const [activeSearch, setActiveSearch] = useState('');

  // Folder navigation state: [{ id: null, name: 'WorkDrive Root' }]
  const [pathStack, setPathStack] = useState([{ id: null, name: 'WorkDrive Root' }]);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Widget-selected files map: fileId -> fileObject
  const [selectedMap, setSelectedMap] = useState(new Map());

  const currentFolder = pathStack[pathStack.length - 1];
  const modalRef = useRef(null);

  // Sync initialBusinessName if changed from parent
  useEffect(() => {
    if (initialBusinessName && !businessName) {
      setBusinessName(initialBusinessName);
    }
  }, [initialBusinessName]);

  // Load items from REST API
  const fetchItems = useCallback(async (folderId = null, query = '', signal) => {
    if (!isConnected) return;
    setIsLoading(true);
    setError(null);
    try {
      let res;
      if (query && query.trim()) {
        res = await searchWorkdrive(query.trim(), folderId, signal);
      } else {
        res = await listWorkdriveItems(folderId, signal);
      }

      if (res && res.items) {
        const normalized = normalizeWorkdriveItems(res.items);
        setItems(normalized);
      } else {
        setItems([]);
      }
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
    setPathStack([{ id: null, name: clean ? `Search: "${clean}"` : 'WorkDrive Root' }]);
  };

  const handleClearSearch = () => {
    setBusinessName('');
    setActiveSearch('');
    setPathStack([{ id: null, name: 'WorkDrive Root' }]);
  };

  // Folder navigation
  const openFolder = (folder) => {
    setPathStack((prev) => [...prev, { id: folder.id, name: folder.name }]);
  };

  const goBack = () => {
    if (pathStack.length > 1) {
      setPathStack((prev) => prev.slice(0, -1));
    }
  };

  const goToBreadcrumb = (idx) => {
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

  // Select all files in current view
  const handleSelectAllInFolder = () => {
    const supportedFiles = items.filter((i) => !i.isFolder && isFileSupported(i.name));
    if (supportedFiles.length === 0) return;

    setSelectedMap((prev) => {
      const next = new Map(prev);
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
      return next;
    });

    if (onToast) {
      onToast(`Selected all ${supportedFiles.length} document(s) in this folder.`, 'info', 2500);
    }
  };

  // Confirm and attach selected files to proposal
  const handleAttachToProposal = () => {
    const selectedFiles = Array.from(selectedMap.values());
    if (selectedFiles.length === 0) {
      if (onToast) onToast('Please select at least one document to attach.', 'warning', 3000);
      return;
    }

    if (onSelectFiles) {
      onSelectFiles(selectedFiles, businessName.trim());
    }

    if (onToast) {
      onToast(`Attached ${selectedFiles.length} WorkDrive document(s) for ${businessName.trim() || 'Proposal'}.`, 'success', 3500);
    }

    setSelectedMap(new Map());
    onClose();
  };

  const folders = items.filter((i) => i.isFolder);
  const files = items.filter((i) => !i.isFolder);
  const totalSelectedCount = selectedMap.size;

  return (
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
                  placeholder="Enter business / client name (e.g. Acme Corp, Logistics Co)..."
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
                <span>Find Client Folders</span>
              </button>
            </form>

            {activeSearch && (
              <div className="wd-active-search-chip">
                <span>Showing results for: <strong>"{activeSearch}"</strong></span>
                <button type="button" onClick={handleClearSearch} className="chip-reset-link">
                  Reset to All Folders
                </button>
              </div>
            )}
          </div>

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
                <span>Select All Files</span>
              </button>
            </div>
          </div>

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
                    <span className="wd-section-label">Folders ({folders.length})</span>
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
                              <span className="folder-meta">Subfolder · Click to browse</span>
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
  </AnimatePresence>
);
}
