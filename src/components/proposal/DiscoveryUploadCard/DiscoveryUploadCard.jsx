import React, { useState, useEffect, useCallback, useRef } from 'react';
import './DiscoveryUploadCard.css';
import {
  Cloud,
  Folder,
  FileText,
  FileSpreadsheet,
  File as FileIcon,
  ChevronLeft,
  RefreshCw,
  Search,
  Check,
  X as XIcon,
  Loader2,
  ExternalLink,
  FolderOpen,
  ArrowRight,
  UploadCloud,
  CheckCircle2,
  Trash2,
  FolderUp,
  FileUp,
  Info,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SpotlightCard from '@/reactbits/SpotlightCard';
import { useWorkDrive } from '@/context/WorkDriveContext';
import { listWorkdriveItems } from '@/api/workdriveApi';
import { normalizeWorkdriveItems } from '@/components/shared/WorkDrivePicker/workdriveItem';
import { createDiscoveryPackage, getFriendlyErrorMessage } from '@/api/proposalApi';
import { resetApiGuard } from '@/api/apiCallGuard';
import { formatBytes, formatDate } from '@/utils/helpers';
import { getWorkdriveSessionToken } from '@/utils/workdriveSession';

const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.csv', '.txt', '.md'];

function getFileIcon(extension) {
  const ext = String(extension || '').toLowerCase();
  if (['.xlsx', '.xls', '.csv'].includes(ext)) {
    return { Icon: FileSpreadsheet, badgeClass: 'badge-sheet', label: 'XLSX' };
  }
  if (ext === '.pdf') {
    return { Icon: FileText, badgeClass: 'badge-pdf', label: 'PDF' };
  }
  if (['.docx', '.doc'].includes(ext)) {
    return { Icon: FileText, badgeClass: 'badge-doc', label: 'DOC' };
  }
  return { Icon: FileText, badgeClass: 'badge-text', label: 'TXT' };
}

function isFileSupported(filename) {
  const name = String(filename || '').toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export default function DiscoveryUploadCard({ onGenerate, disabled = false, onToast }) {
  const {
    isConnected,
    isConnecting,
    email,
    error: authError,
    handleOpenWorkDrive,
    disconnect,
    clearError
  } = useWorkDrive();

  // Mode: ONLY 'local' or 'workdrive'
  const [uploadMode, setUploadMode] = useState('local');
  const [isDragging, setIsDragging] = useState(false);

  // WorkDrive navigation state
  const [pathStack, setPathStack] = useState([{ id: null, name: 'My WorkDrive' }]);
  const [workdriveItems, setWorkdriveItems] = useState([]);
  const [isLoadingWorkDrive, setIsLoadingWorkDrive] = useState(false);
  const [workdriveError, setWorkdriveError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Staged files for proposal generation
  const [stagedFiles, setStagedFiles] = useState([]);
  const [packageName, setPackageName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // Local upload refs
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const currentFolder = pathStack[pathStack.length - 1];

  // Fetch WorkDrive items for current folder
  const loadFolder = useCallback(async (folderId = null, signal) => {
    const token = getWorkdriveSessionToken();
    if (!token) return;

    setIsLoadingWorkDrive(true);
    setWorkdriveError(null);

    try {
      const res = await listWorkdriveItems(folderId, signal);
      if (res && res.items) {
        const normalized = normalizeWorkdriveItems(res.items);
        setWorkdriveItems(normalized);
      } else {
        setWorkdriveItems([]);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.warn('[DiscoveryUploadCard] Load WorkDrive failed:', err);
      setWorkdriveError(err.message || 'Unable to load items from Zoho WorkDrive.');
      setWorkdriveItems([]);
    } finally {
      setIsLoadingWorkDrive(false);
    }
  }, []);

  // When WorkDrive becomes connected or folder changes, load items
  useEffect(() => {
    if (!isConnected) {
      setWorkdriveItems([]);
      return;
    }
    const controller = new AbortController();
    loadFolder(currentFolder.id, controller.signal);
    return () => controller.abort();
  }, [isConnected, currentFolder.id, loadFolder]);

  // Navigate deeper into a WorkDrive folder
  const openFolder = (folderItem) => {
    setSearchQuery('');
    setPathStack((prev) => [...prev, { id: folderItem.id, name: folderItem.name }]);
  };

  const goBackFolder = () => {
    if (pathStack.length > 1) {
      setSearchQuery('');
      setPathStack((prev) => prev.slice(0, -1));
    }
  };

  const goToBreadcrumb = (index) => {
    setSearchQuery('');
    setPathStack((prev) => prev.slice(0, index + 1));
  };

  // Toggle selection of a WorkDrive file
  const handleToggleWorkDriveFile = (item) => {
    const isAlreadyStaged = stagedFiles.some((f) => f.workdrive_file_id === item.id);

    if (isAlreadyStaged) {
      setStagedFiles((prev) => prev.filter((f) => f.workdrive_file_id !== item.id));
    } else {
      const newItem = {
        name: item.name,
        size: item.size || 0,
        isWorkdrive: true,
        workdrive_file_id: item.id,
        extension: item.extension || '',
        folderPath: pathStack.length > 1 ? pathStack.map((p) => p.name).join(' / ') : ''
      };

      setStagedFiles((prev) => [...prev, newItem]);

      setPackageName((prev) => {
        if (prev.trim()) return prev;
        const clean = item.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').trim();
        return clean || 'Solution Proposal';
      });
    }
  };

  // Stage all supported files in current folder
  const handleSelectAllInFolder = () => {
    const supportedFilesInFolder = workdriveItems.filter((i) => !i.isFolder && isFileSupported(i.name));
    if (supportedFilesInFolder.length === 0) return;

    const newItems = supportedFilesInFolder.map((item) => ({
      name: item.name,
      size: item.size || 0,
      isWorkdrive: true,
      workdrive_file_id: item.id,
      extension: item.extension || '',
      folderPath: pathStack.length > 1 ? pathStack.map((p) => p.name).join(' / ') : ''
    }));

    setStagedFiles((prev) => {
      const existingIds = new Set(prev.map((f) => f.workdrive_file_id).filter(Boolean));
      const filteredNew = newItems.filter((m) => !existingIds.has(m.workdrive_file_id));
      return [...prev, ...filteredNew];
    });

    setPackageName((prev) => {
      if (prev.trim()) return prev;
      if (currentFolder.name && currentFolder.name !== 'My WorkDrive') {
        return currentFolder.name.replace(/[_-]/g, ' ');
      }
      return 'Solution Proposal';
    });

    if (onToast) {
      onToast(`Added ${newItems.length} files from "${currentFolder.name}".`, 'success', 3000);
    }
  };

  // Local file / folder additions
  const handleLocalFiles = (filesList, folderName = '') => {
    const valid = Array.from(filesList).filter((f) => isFileSupported(f.name));
    if (valid.length === 0) {
      if (onToast) onToast('Please select supported documents (.pdf, .docx, .xlsx, .txt).', 'warning', 4000);
      return;
    }

    setStagedFiles((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.name}_${f.size}`));
      const newLocal = valid.filter((f) => !existingKeys.has(`${f.name}_${f.size}`));
      return [...prev, ...newLocal];
    });

    setPackageName((prev) => {
      if (prev.trim()) return prev;
      if (folderName) return folderName.replace(/[_-]/g, ' ');
      if (valid[0]) return valid[0].name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      return 'Solution Proposal';
    });
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) {
      handleLocalFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveStagedItem = (index) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAllStaged = () => {
    setStagedFiles([]);
  };

  // Submit and start proposal generation
  const handleGenerate = async () => {
    if (stagedFiles.length === 0 || !packageName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await createDiscoveryPackage(packageName.trim(), stagedFiles);
      const pkgData = {
        ...(res?.package || {}),
        package_id: res?.package?.package_id || res?.session_id,
        package_name: packageName.trim(),
        customer_name: packageName.trim(),
        business_name: packageName.trim(),
        files: stagedFiles
      };

      if (onToast) onToast(`Discovery package "${packageName.trim()}" ready.`, 'success', 3000);
      if (onGenerate) {
        onGenerate(pkgData);
      }
    } catch (err) {
      const message = getFriendlyErrorMessage(err);
      setSubmitError(message);
      if (onToast) onToast(message, 'error', 6000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredWorkdriveItems = workdriveItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    return item.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
  });

  const folders = filteredWorkdriveItems.filter((i) => i.isFolder);
  const files = filteredWorkdriveItems.filter((i) => !i.isFolder);
  const totalSizeBytes = stagedFiles.reduce((acc, f) => acc + (f.size || 0), 0);
  const isFormValid = stagedFiles.length > 0 && packageName.trim().length > 0;

  return (
    <SpotlightCard className="discovery-upload-card" spotlightColor="rgba(255, 122, 26, 0.15)">
      <div className="discovery-upload-inner">
        {/* Card Header */}
        <div className="discovery-section-heading">
          <div className="discovery-heading-tag">
            <Cloud size={13} />
            <span>Document Intake</span>
          </div>
          <h2 className="discovery-dropzone-title">Upload Discovery Documents</h2>
          <p className="discovery-dropzone-hint">
            Upload discovery documents locally from your computer or open Zoho WorkDrive to select files and folders.
          </p>
        </div>

        {/* Hidden Local Upload Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          id="discovery-local-file-input"
          name="discovery_local_files"
          multiple
          accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.csv,.md"
          onChange={(e) => {
            if (e.target.files?.length) {
              handleLocalFiles(e.target.files);
              e.target.value = '';
            }
          }}
          style={{ display: 'none' }}
        />
        <input
          ref={folderInputRef}
          type="file"
          id="discovery-local-folder-input"
          name="discovery_local_folder"
          webkitdirectory=""
          directory=""
          multiple
          onChange={(e) => {
            if (e.target.files?.length) {
              let fName = '';
              const firstRel = e.target.files[0]?.webkitRelativePath;
              if (firstRel?.includes('/')) fName = firstRel.split('/')[0];
              handleLocalFiles(e.target.files, fName);
              e.target.value = '';
            }
          }}
          style={{ display: 'none' }}
        />

        {/* Source Options: ONLY Local Upload and Open WorkDrive */}
        <div className="discovery-source-toggle-row" role="tablist" aria-label="Upload Source Options">
          <button
            type="button"
            className={`btn-source-toggle ${uploadMode === 'local' ? 'active' : ''}`}
            onClick={() => setUploadMode('local')}
            role="tab"
            aria-selected={uploadMode === 'local'}
          >
            <UploadCloud size={15} />
            <span>Local Upload</span>
          </button>

          <button
            type="button"
            className={`btn-source-toggle ${uploadMode === 'workdrive' ? 'active' : ''}`}
            onClick={() => {
              setUploadMode('workdrive');
              if (!isConnected) {
                handleOpenWorkDrive();
              }
            }}
            role="tab"
            aria-selected={uploadMode === 'workdrive'}
          >
            <Cloud size={15} className="text-orange-500" />
            <span>Open WorkDrive</span>
            <ExternalLink size={12} className="opacity-70" />
          </button>
        </div>

        {/* OPTION 1: Local Upload */}
        {uploadMode === 'local' && (
          <div className="discovery-local-dropzone-box animate-fade-in">
            <div
              className={`discovery-dropzone ${isDragging ? 'is-dragging' : ''}`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Drag and drop documents or click to browse"
            >
              <div className="dropzone-icon-bubble">
                <UploadCloud size={30} className="dropzone-cloud-icon" />
              </div>

              <div className="dropzone-text-group">
                <p className="dropzone-primary-text">
                  {isDragging ? 'Drop your files or folder here' : 'Drag & drop discovery files or folder here'}
                </p>
                <p className="dropzone-secondary-text">
                  Supports PDF, Word, Excel, and Text documents
                </p>
              </div>

              <div className="dropzone-actions-group" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="btn-dropzone-action"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <FileUp size={15} />
                  <span>Browse Files</span>
                </button>

                <button
                  type="button"
                  className="btn-dropzone-action"
                  onClick={() => folderInputRef.current?.click()}
                >
                  <FolderUp size={15} />
                  <span>Upload Folder</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* OPTION 2: Open WorkDrive */}
        {uploadMode === 'workdrive' && (
          <div className="discovery-workdrive-view animate-fade-in">
            {!isConnected ? (
              /* If not connected: clean prompt with Open WorkDrive button */
              <div className="workdrive-auth-hero-box animate-fade-in">
                <div className="workdrive-auth-bubble">
                  <Cloud size={36} className="workdrive-auth-cloud-icon" />
                </div>

                <h3 className="workdrive-auth-title">Connect Zoho WorkDrive</h3>
                <p className="workdrive-auth-desc">
                  Click below to authorize your Zoho WorkDrive account and pick files or folders.
                </p>

                {authError && (
                  <div className="discovery-inline-error mb-4 animate-fade-in" role="alert" style={{ maxWidth: '460px', margin: '0 auto 1.25rem' }}>
                    <AlertCircle size={16} className="shrink-0 text-red-600" />
                    <div style={{ flex: 1, textAlign: 'left', wordBreak: 'break-word' }}>
                      <span className="font-semibold text-red-700">Connection Error: </span>
                      <span>{authError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        clearError?.();
                        handleOpenWorkDrive();
                      }}
                      style={{
                        background: '#DC2626',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Retry
                    </button>
                  </div>
                )}

                <div className="workdrive-auth-action-row">
                  <button
                    type="button"
                    className="btn-open-workdrive-primary"
                    onClick={handleOpenWorkDrive}
                    disabled={isConnecting || disabled}
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 size={16} className="workdrive-spin" />
                        <span>Opening Zoho OAuth...</span>
                      </>
                    ) : (
                      <>
                        <Cloud size={16} />
                        <span>Open WorkDrive</span>
                        <ExternalLink size={14} className="opacity-70" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* If connected: WorkDrive Explorer */
              <div className="workdrive-browser-card animate-fade-in">
                {/* Connected Header Bar */}
                <div className="workdrive-connected-bar">
                  <div className="connected-badge-left">
                    <span className="live-pulse-dot" />
                    <Cloud size={15} className="text-emerald-500" />
                    <span className="connected-label">Connected:</span>
                    <span className="connected-email" title={email || 'Zoho WorkDrive'}>
                      {email || 'Zoho WorkDrive Account'}
                    </span>
                  </div>

                  <div className="connected-actions-right">
                    <button
                      type="button"
                      className="btn-workdrive-mini-action"
                      onClick={() => loadFolder(currentFolder.id)}
                      title="Refresh folder"
                      disabled={isLoadingWorkDrive}
                    >
                      <RefreshCw size={13} className={isLoadingWorkDrive ? 'workdrive-spin' : ''} />
                      <span>Refresh</span>
                    </button>

                    <button
                      type="button"
                      className="btn-workdrive-mini-action text-slate-400 hover:text-slate-600"
                      onClick={disconnect}
                      title="Disconnect account"
                    >
                      <span>Disconnect</span>
                    </button>
                  </div>
                </div>

                {/* Toolbar */}
                <div className="workdrive-toolbar">
                  <div className="workdrive-breadcrumbs">
                    {pathStack.map((crumb, idx) => (
                      <React.Fragment key={crumb.id || 'root'}>
                        {idx > 0 && <span className="crumb-divider">/</span>}
                        <button
                          type="button"
                          className={`crumb-btn ${idx === pathStack.length - 1 ? 'is-current' : ''}`}
                          onClick={() => goToBreadcrumb(idx)}
                          disabled={idx === pathStack.length - 1}
                        >
                          {idx === 0 && <Cloud size={12} className="inline mr-1 text-orange-500" />}
                          <span>{crumb.name}</span>
                        </button>
                      </React.Fragment>
                    ))}
                  </div>

                  <div className="workdrive-toolbar-actions">
                    <button
                      type="button"
                      className="btn-toolbar-nav"
                      onClick={goBackFolder}
                      disabled={pathStack.length <= 1}
                      title="Go to parent directory"
                    >
                      <ChevronLeft size={14} />
                      <span>Back</span>
                    </button>

                    <button
                      type="button"
                      className="btn-toolbar-nav btn-select-all-folder"
                      onClick={handleSelectAllInFolder}
                      disabled={files.length === 0}
                      title="Stage all supported files in this folder"
                    >
                      <CheckCircle2 size={13} className="text-orange-500" />
                      <span>Select All Files</span>
                    </button>
                  </div>
                </div>

                {/* Search */}
                <div className="workdrive-search-box">
                  <Search size={14} className="text-slate-400" />
                  <input
                    type="text"
                    id="discovery-workdrive-search-input"
                    name="discovery_workdrive_search"
                    className="workdrive-search-input"
                    placeholder="Search documents in this folder..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      className="btn-clear-search"
                      onClick={() => setSearchQuery('')}
                      title="Clear search"
                    >
                      <XIcon size={13} />
                    </button>
                  )}
                </div>

                {/* Viewport */}
                <div className="workdrive-items-viewport">
                  {isLoadingWorkDrive ? (
                    <div className="workdrive-state-box">
                      <Loader2 size={24} className="workdrive-spin text-orange-500" />
                      <span>Loading WorkDrive items...</span>
                    </div>
                  ) : workdriveError ? (
                    <div className="workdrive-state-box is-error">
                      <Info size={18} className="text-red-500" />
                      <span>{workdriveError}</span>
                      <button
                        type="button"
                        className="btn-retry-action"
                        onClick={() => {
                          resetApiGuard();
                          loadFolder(currentFolder.id);
                        }}
                      >
                        Try Again
                      </button>
                    </div>
                  ) : folders.length === 0 && files.length === 0 ? (
                    <div className="workdrive-state-box">
                      <FolderOpen size={24} className="text-slate-300" />
                      <span>
                        {searchQuery ? 'No documents matched your filter.' : 'This WorkDrive folder is empty.'}
                      </span>
                    </div>
                  ) : (
                    <div className="workdrive-items-grid">
                      {/* Folders */}
                      {folders.map((folder) => (
                        <div
                          key={folder.id}
                          className="workdrive-item-row folder-row"
                          onClick={() => openFolder(folder)}
                          role="button"
                          tabIndex={0}
                          title={`Open folder "${folder.name}"`}
                        >
                          <div className="item-row-left">
                            <div className="item-icon-box folder-icon-box">
                              <Folder size={15} />
                            </div>
                            <div className="item-details">
                              <span className="item-name font-medium">{folder.name}</span>
                              <span className="item-subtext">Folder · Click to open</span>
                            </div>
                          </div>

                          <div className="item-row-right">
                            <span className="folder-open-arrow">→</span>
                          </div>
                        </div>
                      ))}

                      {/* Files */}
                      {files.map((file) => {
                        const isSupported = isFileSupported(file.name);
                        const isStaged = stagedFiles.some((f) => f.workdrive_file_id === file.id);
                        const fileBadge = getFileIcon(file.extension);
                        const BadgeIcon = fileBadge.Icon;

                        return (
                          <div
                            key={file.id}
                            className={`workdrive-item-row file-row ${isStaged ? 'is-staged' : ''} ${!isSupported ? 'is-unsupported' : ''}`}
                            onClick={() => isSupported && handleToggleWorkDriveFile(file)}
                            role="button"
                            tabIndex={isSupported ? 0 : -1}
                            title={!isSupported ? 'Format not supported' : file.name}
                          >
                            <div className="item-row-left">
                              <div className={`item-icon-box ${fileBadge.badgeClass}`}>
                                <BadgeIcon size={14} />
                              </div>
                              <div className="item-details">
                                <span className="item-name">{file.name}</span>
                                <span className="item-subtext">
                                  {file.size > 0 ? formatBytes(file.size) : 'File'}
                                  {file.modifiedTime ? ` · Modified ${formatDate(file.modifiedTime)}` : ''}
                                </span>
                              </div>
                            </div>

                            <div className="item-row-right">
                              <div
                                className={`item-checkbox ${isStaged ? 'is-checked' : ''} ${!isSupported ? 'is-disabled' : ''}`}
                              >
                                {isStaged && <Check size={12} strokeWidth={3} />}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Selected Documents Staged Panel */}
        <AnimatePresence>
          {stagedFiles.length > 0 && (
            <motion.div
              className="discovery-selected-files"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <div className="discovery-selected-header">
                <div className="selected-header-left">
                  <span className="selected-counter-pill">
                    <CheckCircle2 size={13} className="counter-icon" />
                    <span>{stagedFiles.length} document{stagedFiles.length === 1 ? '' : 's'} staged</span>
                  </span>
                  {totalSizeBytes > 0 && (
                    <span className="selected-total-size">
                      Total: {formatBytes(totalSizeBytes)}
                    </span>
                  )}
                </div>

                <div className="selected-header-actions">
                  <button
                    type="button"
                    className="btn-staged-action btn-clear-staged"
                    onClick={handleClearAllStaged}
                    disabled={disabled || isSubmitting}
                    title="Clear all staged documents"
                  >
                    <Trash2 size={13} />
                    <span>Clear all</span>
                  </button>
                </div>
              </div>

              <ul className="discovery-selected-list">
                <AnimatePresence initial={false}>
                  {stagedFiles.map((file, idx) => {
                    const badge = getFileIcon(file.extension || file.name);
                    const BadgeIcon = badge.Icon;

                    return (
                      <motion.li
                        key={`${file.workdrive_file_id || file.name}_${idx}`}
                        className="discovery-selected-item"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.16 }}
                      >
                        <div className="selected-file-main">
                          <span className={`file-badge ${badge.badgeClass}`}>
                            <BadgeIcon size={12} />
                            <span>{badge.label}</span>
                          </span>

                          <div className="selected-file-meta">
                            <span className="selected-file-name" title={file.name}>
                              {file.name}
                            </span>
                            {file.isWorkdrive && (
                              <span className="selected-file-folder-chip workdrive-chip" title="Picked from Zoho WorkDrive">
                                <Cloud size={11} className="folder-chip-icon text-orange-500" />
                                <span>WorkDrive</span>
                              </span>
                            )}
                            {file.folderPath && (
                              <span className="selected-file-folder-chip" title={`From: ${file.folderPath}`}>
                                <Folder size={11} className="folder-chip-icon" />
                                <span>{file.folderPath}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="selected-file-right">
                          {file.size > 0 && (
                            <span className="selected-file-size">{formatBytes(file.size)}</span>
                          )}

                          <span className="selected-file-status status-ready">Ready</span>

                          <button
                            type="button"
                            className="btn-remove-selected-file"
                            onClick={() => handleRemoveStagedItem(idx)}
                            disabled={disabled || isSubmitting}
                            aria-label={`Remove ${file.name}`}
                            title="Remove file"
                          >
                            <XIcon size={14} />
                          </button>
                        </div>
                      </motion.li>
                    );
                  })}
                </AnimatePresence>
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Client / Business Name Field */}
        <AnimatePresence>
          {stagedFiles.length > 0 && (
            <motion.div
              className="discovery-field"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="discovery-field-label-row">
                <label className="discovery-field-label" htmlFor="discovery-package-name">
                  Client / Business Name <span className="discovery-req-asterisk">*</span>
                </label>
              </div>

              <div className="discovery-field-input-wrap">
                <FolderOpen size={17} className="discovery-field-icon" />
                <input
                  id="discovery-package-name"
                  type="text"
                  className="discovery-field-input"
                  placeholder="e.g. Acme Industries Pvt. Ltd."
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  disabled={disabled || isSubmitting}
                  maxLength={120}
                  autoComplete="off"
                />
                {packageName && (
                  <button
                    type="button"
                    className="btn-clear-input"
                    onClick={() => setPackageName('')}
                    disabled={disabled || isSubmitting}
                    aria-label="Clear client name"
                  >
                    <XIcon size={13} />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {submitError && (
          <div className="discovery-inline-error" role="alert">
            <Info size={16} className="inline-error-icon" />
            <span>{submitError}</span>
          </div>
        )}

        {/* Single Primary Action: Generate Proposal */}
        <div className="discovery-footer-row">
          <motion.button
            type="button"
            className="btn-discovery-continue"
            onClick={handleGenerate}
            disabled={!isFormValid || disabled || isSubmitting}
            whileHover={isFormValid && !isSubmitting ? { y: -1.5, scale: 1.01 } : {}}
            whileTap={isFormValid && !isSubmitting ? { scale: 0.97 } : {}}
            transition={{ duration: 0.15 }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={15} className="discovery-spin" />
                <span>Preparing Proposal…</span>
              </>
            ) : (
              <>
                <span>Generate Proposal</span>
                <ArrowRight size={15} strokeWidth={2.4} className="btn-arrow-icon" />
              </>
            )}
          </motion.button>
        </div>
      </div>
    </SpotlightCard>
  );
}
