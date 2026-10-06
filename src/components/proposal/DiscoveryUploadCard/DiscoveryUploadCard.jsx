import React, { useState, useEffect, useRef } from 'react';
import './DiscoveryUploadCard.css';
import {
  Cloud,
  Folder,
  FileText,
  FileSpreadsheet,
  File as FileIcon,
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
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SpotlightCard from '@/reactbits/SpotlightCard';
import { useWorkDrive } from '@/context/WorkDriveContext';
import { createDiscoveryPackage, getFriendlyErrorMessage } from '@/api/proposalApi';
import { resetApiGuard } from '@/api/apiCallGuard';
import { formatBytes } from '@/utils/helpers';
import WorkDriveExplorerWidget from '../WorkDriveExplorerWidget/WorkDriveExplorerWidget';

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

  // Staged files for proposal generation
  const [stagedFiles, setStagedFiles] = useState([]);
  const [packageName, setPackageName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  // WorkDrive Explorer Widget modal state (Full screen frozen backdrop overlay)
  const [isWidgetOpen, setIsWidgetOpen] = useState(false);
  const prevConnectedRef = useRef(isConnected);

  // Auto-open explorer widget when OAuth connects successfully
  useEffect(() => {
    if (!prevConnectedRef.current && isConnected) {
      setIsWidgetOpen(true);
      setUploadMode('workdrive');
    }
    prevConnectedRef.current = isConnected;
  }, [isConnected]);

  // Handle files attached from WorkDrive Explorer Widget
  const handleWidgetSelectFiles = (selectedFiles, businessNameFromWidget) => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    setStagedFiles((prev) => {
      const existingIds = new Set(prev.map((f) => f.workdrive_file_id).filter(Boolean));
      const newItems = selectedFiles.filter((f) => !existingIds.has(f.workdrive_file_id));
      return [...prev, ...newItems];
    });

    if (businessNameFromWidget && businessNameFromWidget.trim()) {
      setPackageName(businessNameFromWidget.trim());
    } else if (!packageName.trim()) {
      if (selectedFiles[0]?.name) {
        const clean = selectedFiles[0].name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').trim();
        if (clean) setPackageName(clean);
      }
    }
  };

  // Local upload refs
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  // Process selected local files
  const handleLocalFiles = (fileList, customFolderName = '') => {
    const rawFiles = Array.from(fileList || []);
    if (rawFiles.length === 0) return;

    const validFiles = rawFiles.filter((file) => isFileSupported(file.name));
    const unsupportedCount = rawFiles.length - validFiles.length;

    if (unsupportedCount > 0 && onToast) {
      onToast(`Ignored ${unsupportedCount} unsupported file(s). Only PDF, Word, Excel, and Text are supported.`, 'warning', 4000);
    }

    if (validFiles.length === 0) {
      if (onToast && unsupportedCount > 0) {
        onToast('No supported documents found in selection.', 'error', 4000);
      }
      return;
    }

    const newItems = validFiles.map((file) => {
      const lastDot = file.name.lastIndexOf('.');
      const extension = lastDot !== -1 ? file.name.slice(lastDot).toLowerCase() : '';
      return {
        id: `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: file.name,
        size: file.size,
        file: file,
        isWorkdrive: false,
        extension,
        path: file.webkitRelativePath || file.name
      };
    });

    setStagedFiles((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.name}-${f.size}`));
      const filtered = newItems.filter((f) => !existingKeys.has(`${f.name}-${f.size}`));
      return [...prev, ...filtered];
    });

    if (!packageName.trim()) {
      if (customFolderName && customFolderName.trim()) {
        setPackageName(customFolderName.trim());
      } else if (validFiles[0]?.name) {
        const clean = validFiles[0].name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ').trim();
        if (clean) setPackageName(clean);
      }
    }

    if (onToast) {
      onToast(`Added ${validFiles.length} local document(s).`, 'success', 3000);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDragging) setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer?.files?.length) {
      handleLocalFiles(e.dataTransfer.files);
    }
  };

  // Remove staged file
  const removeStagedFile = (id) => {
    setStagedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  // Clear all staged files
  const clearAllStaged = () => {
    setStagedFiles([]);
  };

  // Submit and Generate Proposal
  const handleGenerate = async () => {
    if (stagedFiles.length === 0 || !packageName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);
    resetApiGuard();

    try {
      const res = await createDiscoveryPackage(packageName.trim(), stagedFiles);
      const pkg = res?.package || res?.session || res;
      const packageId = pkg?.package_id || pkg?.session_id || res?.package_id || res?.session_id;

      const payload = {
        package_id: packageId,
        package_name: packageName.trim(),
        customer_name: packageName.trim(),
        business_name: packageName.trim(),
        files: stagedFiles
      };

      if (onToast) onToast(`Discovery package "${packageName.trim()}" ready.`, 'success', 3000);
      if (onGenerate) onGenerate(payload);
    } catch (err) {
      console.error('[DiscoveryUploadCard] Submit error:', err);
      const friendly = getFriendlyErrorMessage(err, 'Failed to upload discovery files. Please try again.');
      setSubmitError(friendly);
      if (onToast) onToast(friendly, 'error', 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = stagedFiles.length > 0 && packageName.trim().length > 0;
  const workdriveStagedCount = stagedFiles.filter((f) => f.isWorkdrive).length;

  return (
    <SpotlightCard className="discovery-upload-card" spotlightColor="rgba(255, 122, 26, 0.08)">
      <div className="discovery-card-header">
        <div className="discovery-pill-tag">
          <UploadCloud size={13} className="text-orange-500" />
          <span>Document Intake</span>
        </div>
        <h2 className="discovery-headline">Upload Discovery Documents</h2>
        <p className="discovery-subline">
          Upload discovery documents locally from your computer or open Zoho WorkDrive to select files and folders.
        </p>
      </div>

      <div className="discovery-card-body">
        {/* Hidden inputs for local file/folder picker */}
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
              } else {
                setIsWidgetOpen(true);
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

        {/* OPTION 2: Open WorkDrive (No inline widget under section - uses frozen screen widget) */}
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
              /* If connected: Clean connection hero with button to launch Explorer Widget */
              <div className="workdrive-connected-hero-box animate-fade-in">
                <div className="workdrive-connected-hero-top">
                  <div className="connected-badge-pill">
                    <span className="live-pulse-dot" />
                    <Cloud size={16} className="text-emerald-500" />
                    <span className="connected-label font-medium">Zoho WorkDrive Connected</span>
                  </div>
                  <span className="connected-email-tag" title={email || 'Zoho WorkDrive'}>
                    {email || 'Zoho WorkDrive Account'}
                  </span>
                </div>

                <div className="workdrive-connected-hero-body">
                  <div className="connected-hero-icon-bubble">
                    <FolderOpen size={34} className="text-orange-500" />
                  </div>
                  <h3 className="connected-hero-title">Browse WorkDrive Folders & Files</h3>
                  <p className="connected-hero-desc">
                    Search customer folders by business name, navigate subfolders, and select discovery documents in the Explorer Widget.
                  </p>

                  <div className="connected-hero-actions">
                    <button
                      type="button"
                      className="btn-launch-explorer-primary"
                      onClick={() => setIsWidgetOpen(true)}
                    >
                      <Sparkles size={16} />
                      <span>Open WorkDrive Explorer</span>
                    </button>

                    <button
                      type="button"
                      className="btn-disconnect-link"
                      onClick={disconnect}
                      title="Disconnect account"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>

                {workdriveStagedCount > 0 && (
                  <div className="workdrive-staged-summary-banner">
                    <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    <span className="staged-summary-text">
                      <strong>{workdriveStagedCount}</strong> WorkDrive document{workdriveStagedCount === 1 ? '' : 's'} attached to this proposal.
                    </span>
                    <button
                      type="button"
                      className="btn-open-more-workdrive"
                      onClick={() => setIsWidgetOpen(true)}
                    >
                      Browse More Files →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Staged Discovery Files List (For both Local Upload and WorkDrive Explorer) */}
        <AnimatePresence>
          {stagedFiles.length > 0 && (
            <motion.div
              className="discovery-staged-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="staged-card-header">
                <div className="staged-header-left">
                  <CheckCircle2 size={16} className="text-emerald-500" />
                  <span className="staged-title">
                    Staged Discovery Files ({stagedFiles.length})
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-clear-staged"
                  onClick={clearAllStaged}
                  title="Remove all files"
                >
                  <Trash2 size={13} />
                  <span>Clear All</span>
                </button>
              </div>

              <ul className="staged-files-list">
                <AnimatePresence>
                  {stagedFiles.map((item) => {
                    const badge = getFileIcon(item.extension);
                    const BadgeIcon = badge.Icon;
                    return (
                      <motion.li
                        key={item.id}
                        className="staged-file-item"
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                      >
                        <div className="staged-item-left">
                          <div className={`file-badge-box ${badge.badgeClass}`}>
                            <BadgeIcon size={14} />
                          </div>
                          <div className="staged-item-info">
                            <span className="staged-filename" title={item.name}>
                              {item.name}
                            </span>
                            <span className="staged-filemeta">
                              {item.size > 0 ? formatBytes(item.size) : 'Document'}
                              {item.isWorkdrive ? (
                                <span className="source-pill workdrive-pill">
                                  <Cloud size={10} className="inline mr-0.5" />
                                  WorkDrive
                                </span>
                              ) : (
                                <span className="source-pill local-pill">Local</span>
                              )}
                              {item.folderPath && item.folderPath !== 'Root' && (
                                <span className="folder-crumb-tag">📂 {item.folderPath}</span>
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="staged-item-right">
                          <button
                            type="button"
                            className="btn-remove-staged"
                            onClick={() => removeStagedFile(item.id)}
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
            whileHover={isFormValid && !isSubmitting ? { scale: 1.01 } : {}}
            whileTap={isFormValid && !isSubmitting ? { scale: 0.99 } : {}}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Preparing Discovery Package...</span>
              </>
            ) : (
              <>
                <span>Generate Solution Proposal</span>
                <ArrowRight size={16} strokeWidth={2.4} />
              </>
            )}
          </motion.button>
        </div>
      </div>

      {/* Dedicated WorkDrive Explorer Widget Modal (with frozen screen backdrop) */}
      <WorkDriveExplorerWidget
        isOpen={isWidgetOpen}
        onClose={() => setIsWidgetOpen(false)}
        onSelectFiles={handleWidgetSelectFiles}
        initialBusinessName={packageName}
        alreadyStagedIds={stagedFiles.map((f) => f.workdrive_file_id).filter(Boolean)}
        onToast={onToast}
      />
    </SpotlightCard>
  );
}
