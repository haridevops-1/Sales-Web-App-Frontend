import React, { useState, useRef, useCallback } from 'react';
import './DiscoveryUploadCard.css';
import {
  UploadCloud,
  FolderUp,
  FileUp,
  FolderOpen,
  X as XIcon,
  FileText,
  ArrowRight,
  Loader2,
  Trash2
} from 'lucide-react';
import SpotlightCard from '@/reactbits/SpotlightCard';
import { createDiscoveryPackage, getFriendlyErrorMessage } from '@/api/proposalApi';
import { formatBytes } from '@/utils/helpers';

const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.txt'];

function isSupportedFile(file) {
  const name = file.name.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/**
 * Create Proposal - Step 1: Upload local discovery files and/or folders.
 * Supports multiple file selection, folder selection (webkitdirectory), and drag-and-drop.
 */
export default function DiscoveryUploadCard({ onContinue, disabled = false, onToast }) {
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
      if (suggestedFolder) return suggestedFolder;
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

  const isFormValid = selectedFiles.length > 0 && packageName.trim().length > 0;

  const handleCreatePackage = async () => {
    if (!isFormValid || isCreating) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      const res = await createDiscoveryPackage(packageName.trim(), selectedFiles);
      if (onToast) onToast(`Discovery package "${packageName.trim()}" created successfully.`, 'success', 4000);
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
    <SpotlightCard className="discovery-upload-card" spotlightColor="rgba(255, 122, 26, 0.12)">
      <div className="discovery-upload-inner">
        <div className="discovery-section-heading">
          <h3 className="discovery-dropzone-title">Upload Discovery Documents</h3>
          <p className="discovery-dropzone-hint">
            Upload multiple files or an entire folder containing discovery notes, RFPs, emails, or MOM documents.
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
        />

        {/* Drag and Drop Zone */}
        <div
          className={`discovery-dropzone ${isDragging ? 'is-dragging' : ''} ${disabled ? 'is-disabled' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="dropzone-icon-bubble">
            <UploadCloud size={28} className="dropzone-cloud-icon" />
          </div>
          <div className="dropzone-text-group">
            <p className="dropzone-primary-text">
              Drag & drop discovery files or folders here
            </p>
            <p className="dropzone-secondary-text">
              Supports <strong>PDF, DOCX, DOC, XLSX, XLS, TXT</strong> (up to 25MB per file)
            </p>
          </div>

          <div className="dropzone-actions-group">
            <button
              type="button"
              className="btn-dropzone-action btn-files-picker"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || isCreating}
            >
              <FileUp size={16} />
              <span>Choose Files</span>
            </button>

            <button
              type="button"
              className="btn-dropzone-action btn-folder-picker"
              onClick={() => folderInputRef.current?.click()}
              disabled={disabled || isCreating}
            >
              <FolderUp size={16} />
              <span>Upload Folder</span>
            </button>
          </div>
        </div>

        {/* Selected Files Review List */}
        {selectedFiles.length > 0 && (
          <div className="discovery-selected-files animate-fade-in">
            <div className="discovery-selected-header">
              <span className="selected-count-badge">
                {selectedFiles.length} document{selectedFiles.length === 1 ? '' : 's'} staged
              </span>
              <div className="selected-header-actions">
                <button
                  type="button"
                  className="btn-add-more-inline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || isCreating}
                >
                  <FileUp size={13} />
                  <span>Add files</span>
                </button>
                <button
                  type="button"
                  className="btn-add-more-inline"
                  onClick={() => folderInputRef.current?.click()}
                  disabled={disabled || isCreating}
                >
                  <FolderUp size={13} />
                  <span>Add folder</span>
                </button>
                <button
                  type="button"
                  className="btn-clear-staged"
                  onClick={handleClearAll}
                  disabled={disabled || isCreating}
                >
                  <Trash2 size={13} />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            <ul className="discovery-selected-list">
              {selectedFiles.map((file, idx) => {
                const relPath = file.webkitRelativePath || '';
                return (
                  <li key={`${file.name}_${idx}`} className="discovery-selected-item">
                    <FileText size={16} className="selected-file-icon" />
                    <div className="selected-file-meta">
                      <span className="selected-file-name" title={file.name}>
                        {file.name}
                      </span>
                      {relPath && relPath !== file.name && (
                        <span className="selected-file-relpath" title={relPath}>
                          {relPath}
                        </span>
                      )}
                    </div>
                    {file.size > 0 && (
                      <span className="selected-file-size">{formatBytes(file.size)}</span>
                    )}
                    <button
                      type="button"
                      className="btn-remove-selected-file"
                      onClick={() => handleRemoveFile(idx)}
                      disabled={disabled || isCreating}
                      aria-label={`Remove ${file.name}`}
                    >
                      <XIcon size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Customer / Package Name Field */}
        {selectedFiles.length > 0 && (
          <div className="discovery-field animate-fade-in">
            <label className="discovery-field-label" htmlFor="discovery-package-name">
              Customer / Proposal Package Name <span className="discovery-req-asterisk">*</span>
            </label>
            <div className="discovery-field-input-wrap">
              <FolderOpen size={16} className="discovery-field-icon" />
              <input
                id="discovery-package-name"
                type="text"
                className="discovery-field-input"
                placeholder="e.g. Apex Global Logistics"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                disabled={disabled || isCreating}
                maxLength={120}
              />
            </div>
          </div>
        )}

        {createError && (
          <div className="discovery-inline-error" role="alert">
            {createError}
          </div>
        )}

        <div className="discovery-footer-row">
          <button
            type="button"
            className="btn-discovery-continue"
            onClick={handleCreatePackage}
            disabled={!isFormValid || disabled || isCreating}
          >
            {isCreating ? (
              <Loader2 size={16} className="discovery-spin" />
            ) : (
              <ArrowRight size={16} strokeWidth={2.4} />
            )}
            <span>
              {isCreating
                ? 'Creating package & uploading files…'
                : `Create Discovery Package (${selectedFiles.length} file${selectedFiles.length === 1 ? '' : 's'})`}
            </span>
          </button>
        </div>
      </div>
    </SpotlightCard>
  );
}
