import React, { useState, useRef, useCallback } from 'react';
import './DiscoveryUploadCard.css';
import {
  UploadCloud,
  FolderUp,
  FileUp,
  FolderOpen,
  X as XIcon,
  FileText,
  FileSpreadsheet,
  ArrowRight,
  Loader2,
  Trash2,
  Folder,
  CheckCircle2,
  Sparkles,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import SpotlightCard from '@/reactbits/SpotlightCard';
import { createDiscoveryPackage, getFriendlyErrorMessage } from '@/api/proposalApi';
import { formatBytes } from '@/utils/helpers';

const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.txt'];

function isSupportedFile(file) {
  const name = file.name.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function getFileBadgeInfo(filename) {
  const name = String(filename || '').toLowerCase();
  if (name.endsWith('.pdf')) {
    return { label: 'PDF', badgeClass: 'badge-pdf', icon: FileText };
  }
  if (name.endsWith('.docx') || name.endsWith('.doc')) {
    return { label: 'DOC', badgeClass: 'badge-doc', icon: FileText };
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
    return { label: 'XLSX', badgeClass: 'badge-sheet', icon: FileSpreadsheet };
  }
  return { label: 'TXT', badgeClass: 'badge-text', icon: FileText };
}

/**
 * Cleanly split a webkitRelativePath into { folderPath, fileName }
 */
function parseFilePath(file) {
  const rel = file.webkitRelativePath || '';
  if (rel && rel.includes('/')) {
    const parts = rel.split('/');
    const fileName = parts[parts.length - 1];
    const folderPath = parts.slice(0, -1).join(' / ');
    return { folderPath, fileName };
  }
  return { folderPath: '', fileName: file.name };
}

/**
 * Create Proposal - Step 1: Upload local discovery files and/or folders.
 * Features drag-and-drop, folder recursion, format badges, micro-animations,
 * and a high-end enterprise SaaS aesthetic.
 */
export default function DiscoveryUploadCard({ onContinue, onGenerate, disabled = false, onToast }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [packageName, setPackageName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  // Helper to add files and suggest package name if not yet set
  const appendFiles = useCallback((newFiles, suggestedFolder = '') => {
    const validFiles = Array.from(newFiles).filter(isSupportedFile);
    if (validFiles.length === 0) {
      if (onToast) onToast('Please select supported documents (.pdf, .docx, .doc, .xlsx, .xls, .txt).', 'warning', 4500);
      return;
    }

    setSelectedFiles((prev) => {
      const existingKeys = new Set(prev.map((f) => `${f.name}_${f.size}`));
      const filtered = validFiles.filter((f) => !existingKeys.has(`${f.name}_${f.size}`));
      return [...prev, ...filtered];
    });

    setPackageName((prev) => {
      if (prev.trim()) return prev;
      if (suggestedFolder) return suggestedFolder.replace(/[_-]/g, ' ');
      if (validFiles[0]) {
        return validFiles[0].name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      }
      return 'Discovery Package';
    });
  }, [onToast]);

  // File input change handler (multiple files)
  const handleFilesSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      appendFiles(e.target.files);
      e.target.value = '';
    }
  };

  // Folder input change handler
  const handleFolderSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      let folderName = '';
      const firstRel = e.target.files[0]?.webkitRelativePath;
      if (firstRel && firstRel.includes('/')) {
        folderName = firstRel.split('/')[0];
      }
      appendFiles(e.target.files, folderName);
      e.target.value = '';
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled && !isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled || isCreating) return;

    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const collectedFiles = [];
      const entryPromises = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (typeof item.webkitGetAsEntry === 'function') {
          const entry = item.webkitGetAsEntry();
          if (entry) {
            entryPromises.push(readEntryRecursively(entry, collectedFiles));
            continue;
          }
        }
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) collectedFiles.push(file);
        }
      }

      if (entryPromises.length > 0) {
        await Promise.all(entryPromises);
      }

      if (collectedFiles.length > 0) {
        appendFiles(collectedFiles);
        return;
      }
    }

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      appendFiles(e.dataTransfer.files);
    }
  };

  // Recursively read directories from drag-and-drop
  const readEntryRecursively = (entry, outArray) => {
    return new Promise((resolve) => {
      if (entry.isFile) {
        entry.file((file) => {
          outArray.push(file);
          resolve();
        }, () => resolve());
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        dirReader.readEntries(async (entries) => {
          const childPromises = entries.map((child) => readEntryRecursively(child, outArray));
          await Promise.all(childPromises);
          resolve();
        }, () => resolve());
      } else {
        resolve();
      }
    });
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearAll = () => {
    setSelectedFiles([]);
  };

  const totalSizeBytes = selectedFiles.reduce((acc, f) => acc + (f.size || 0), 0);
  const isFormValid = selectedFiles.length > 0 && packageName.trim().length > 0;

  const handleGenerateClick = async () => {
    if (!isFormValid || isCreating) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      const res = await createDiscoveryPackage(packageName.trim(), selectedFiles);
      if (onToast) onToast(`Uploaded documents & created package "${packageName.trim()}".`, 'success', 3000);
      if (onGenerate) {
        onGenerate(res.package);
      } else if (onContinue) {
        onContinue(res.package);
      }
    } catch (err) {
      const message = getFriendlyErrorMessage(err);
      setCreateError(message);
      if (onToast) onToast(message, 'error', 6000);
      setIsCreating(false);
    }
  };

  const handleReviewClick = async () => {
    if (!isFormValid || isCreating) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      const res = await createDiscoveryPackage(packageName.trim(), selectedFiles);
      if (onToast) onToast(`Discovery package "${packageName.trim()}" staged for review.`, 'success', 3000);
      if (onContinue) onContinue(res.package);
    } catch (err) {
      const message = getFriendlyErrorMessage(err);
      setCreateError(message);
      if (onToast) onToast(message, 'error', 6000);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <SpotlightCard className="discovery-upload-card" spotlightColor="rgba(255, 122, 26, 0.15)">
      <div className="discovery-upload-inner">
        {/* Card Header */}
        <div className="discovery-section-heading">
          <div className="discovery-heading-tag">
            <Sparkles size={13} className="sparkle-icon" />
            <span>Document Intake</span>
          </div>
          <h2 className="discovery-dropzone-title">Upload Discovery Documents</h2>
          <p className="discovery-dropzone-hint">
            Upload multiple client documents or an entire project folder containing discovery notes, RFPs, emails, spreadsheets, or MOM records.
          </p>
        </div>

        {/* Hidden File Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.xlsx,.xls,.txt"
          onChange={handleFilesSelect}
          style={{ display: 'none' }}
          disabled={disabled || isCreating}
          aria-label="Upload multiple files"
        />
        <input
          ref={folderInputRef}
          type="file"
          webkitdirectory=""
          directory=""
          multiple
          onChange={handleFolderSelect}
          style={{ display: 'none' }}
          disabled={disabled || isCreating}
          aria-label="Upload entire folder"
        />

        {/* Enhanced Drag and Drop Zone */}
        <motion.div
          className={`discovery-dropzone ${isDragging ? 'is-dragging' : ''} ${disabled ? 'is-disabled' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={(e) => {
            if (e.target.closest('.btn-dropzone-action')) return;
            fileInputRef.current?.click();
          }}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          role="button"
          tabIndex={0}
          aria-label="Drag and drop documents here or browse"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <div className="dropzone-ambient-glow" aria-hidden="true" />
          
          <div className="dropzone-icon-bubble">
            <UploadCloud size={30} className="dropzone-cloud-icon" />
          </div>

          <div className="dropzone-text-group">
            <p className="dropzone-primary-text">
              {isDragging ? 'Drop your files or folder here' : 'Drag & drop discovery files or whole folders here'}
            </p>
            <p className="dropzone-secondary-text">
              Click anywhere to browse, or use the dedicated pickers below
            </p>

            <div className="dropzone-format-pills">
              <span className="format-pill format-pdf">PDF</span>
              <span className="format-pill format-doc">DOCX</span>
              <span className="format-pill format-sheet">XLSX</span>
              <span className="format-pill format-txt">TXT</span>
              <span className="format-pill-limit">Up to 25MB / file</span>
            </div>
          </div>

          <div className="dropzone-divider-row" onClick={(e) => e.stopPropagation()}>
            <span className="dropzone-divider-line" />
            <span className="dropzone-divider-text">OR CHOOSE BELOW</span>
            <span className="dropzone-divider-line" />
          </div>

          <div className="dropzone-actions-group" onClick={(e) => e.stopPropagation()}>
            <motion.button
              type="button"
              className="btn-dropzone-action btn-files-picker"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isCreating}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              <FileUp size={16} className="btn-icon-accent" />
              <span>Browse Files</span>
            </motion.button>

            <motion.button
              type="button"
              className="btn-dropzone-action btn-folder-picker"
              onClick={() => folderInputRef.current?.click()}
              disabled={disabled || isCreating}
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
            >
              <FolderUp size={16} className="btn-icon-accent" />
              <span>Upload Folder</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Selected Files Review List with AnimatePresence */}
        <AnimatePresence>
          {selectedFiles.length > 0 && (
            <motion.div
              className="discovery-selected-files"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <div className="discovery-selected-header">
                <div className="selected-header-left">
                  <span className="selected-counter-pill">
                    <CheckCircle2 size={13} className="counter-icon" />
                    <span>{selectedFiles.length} document{selectedFiles.length === 1 ? '' : 's'} staged</span>
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
                    className="btn-staged-action btn-add-files"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={disabled || isCreating}
                    title="Add more individual files"
                  >
                    <FileUp size={13} />
                    <span>Add files</span>
                  </button>

                  <button
                    type="button"
                    className="btn-staged-action btn-add-folder"
                    onClick={() => folderInputRef.current?.click()}
                    disabled={disabled || isCreating}
                    title="Add another directory"
                  >
                    <FolderUp size={13} />
                    <span>Add folder</span>
                  </button>

                  <button
                    type="button"
                    className="btn-staged-action btn-clear-staged"
                    onClick={handleClearAll}
                    disabled={disabled || isCreating}
                    title="Clear all staged files"
                  >
                    <Trash2 size={13} />
                    <span>Clear all</span>
                  </button>
                </div>
              </div>

              <ul className="discovery-selected-list">
                <AnimatePresence initial={false}>
                  {selectedFiles.map((file, idx) => {
                    const badge = getFileBadgeInfo(file.name);
                    const BadgeIcon = badge.icon;
                    const { folderPath, fileName } = parseFilePath(file);

                    return (
                      <motion.li
                        key={`${file.name}_${file.size}_${idx}`}
                        className="discovery-selected-item"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.18, delay: Math.min(idx * 0.02, 0.2) }}
                      >
                        <div className="selected-file-main">
                          <span className={`file-badge ${badge.badgeClass}`}>
                            <BadgeIcon size={12} />
                            <span>{badge.label}</span>
                          </span>

                          <div className="selected-file-meta">
                            <span className="selected-file-name" title={fileName}>
                              {fileName}
                            </span>
                            {folderPath && (
                              <span className="selected-file-folder-chip" title={`From: ${folderPath}`}>
                                <Folder size={11} className="folder-chip-icon" />
                                <span>{folderPath}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="selected-file-right">
                          {file.size > 0 && (
                            <span className="selected-file-size">{formatBytes(file.size)}</span>
                          )}

                          <button
                            type="button"
                            className="btn-remove-selected-file"
                            onClick={() => handleRemoveFile(idx)}
                            disabled={disabled || isCreating}
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

        {/* Customer / Package Name Field */}
        <AnimatePresence>
          {selectedFiles.length > 0 && (
            <motion.div
              className="discovery-field"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22 }}
            >
              <div className="discovery-field-label-row">
                <label className="discovery-field-label" htmlFor="discovery-package-name">
                  Customer / Proposal Package Name <span className="discovery-req-asterisk">*</span>
                </label>
                <span className="discovery-field-tip">
                  <Info size={12} /> Auto-suggested from uploaded content
                </span>
              </div>

              <div className="discovery-field-input-wrap">
                <FolderOpen size={17} className="discovery-field-icon" />
                <input
                  id="discovery-package-name"
                  type="text"
                  className="discovery-field-input"
                  placeholder="e.g. Apex Global Logistics Solution Proposal"
                  value={packageName}
                  onChange={(e) => setPackageName(e.target.value)}
                  disabled={disabled || isCreating}
                  maxLength={120}
                  autoComplete="off"
                />
                {packageName && (
                  <button
                    type="button"
                    className="btn-clear-input"
                    onClick={() => setPackageName('')}
                    disabled={disabled || isCreating}
                    aria-label="Clear package name"
                  >
                    <XIcon size={13} />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {createError && (
          <div className="discovery-inline-error" role="alert">
            <Info size={16} className="inline-error-icon" />
            <span>{createError}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="discovery-footer-row">
          {selectedFiles.length > 0 && onContinue && (
            <button
              type="button"
              className="btn-discovery-secondary"
              onClick={handleReviewClick}
              disabled={!isFormValid || disabled || isCreating}
            >
              <span>Review Details First</span>
            </button>
          )}

          <motion.button
            type="button"
            className="btn-discovery-continue"
            onClick={handleGenerateClick}
            disabled={!isFormValid || disabled || isCreating}
            whileHover={isFormValid && !isCreating ? { scale: 1.02, y: -1 } : {}}
            whileTap={isFormValid && !isCreating ? { scale: 0.98 } : {}}
          >
            {isCreating ? (
              <>
                <Loader2 size={16} className="discovery-spin" />
                <span>Creating Proposal with Zia AI…</span>
              </>
            ) : (
              <>
                <Sparkles size={16} className="btn-sparkle-icon" />
                <span>
                  {selectedFiles.length > 0
                    ? `Create Proposal (${selectedFiles.length} document${selectedFiles.length === 1 ? '' : 's'})`
                    : 'Create Proposal'}
                </span>
                <ArrowRight size={16} strokeWidth={2.4} className="btn-arrow-icon" />
              </>
            )}
          </motion.button>
        </div>
      </div>
    </SpotlightCard>
  );
}
