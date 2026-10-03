import React, { useState, useEffect, useCallback, useRef } from 'react';
import './WorkDrivePickerModal.css';
import { useWorkDrive } from '@/context/WorkDriveContext';
import { listWorkdriveItems, getWorkdriveMetadata } from '@/api/workdriveApi';
import { normalizeWorkdriveItems } from './workdriveItem';
import { formatBytes, formatDate } from '@/utils/helpers';
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
  X,
  Loader2,
  Info,
  ExternalLink
} from 'lucide-react';

function getFileIcon(extension) {
  const ext = String(extension || '').toLowerCase();
  if (['.xlsx', '.xls', '.csv'].includes(ext)) {
    return { Icon: FileSpreadsheet, className: 'sheet' };
  }
  if (ext === '.pdf') {
    return { Icon: FileText, className: 'pdf' };
  }
  if (['.docx', '.doc'].includes(ext)) {
    return { Icon: FileText, className: 'doc' };
  }
  if (['.txt', '.md'].includes(ext)) {
    return { Icon: FileText, className: 'text' };
  }
  return { Icon: FileIcon, className: 'text' };
}

export default function WorkDrivePickerModal({
  isOpen = false,
  onClose,
  onSelect,
  multiple = false,
  allowedExtensions = null, // e.g. ['.pdf', '.docx', '.doc']
  title = 'Pick from Zoho WorkDrive',
  subtitle = 'Browse your WorkDrive folders and select files',
  confirmLabel = null
}) {
  const { isConnected, isConnecting, connect } = useWorkDrive();

  // Navigation Stack: [{ id: null, name: 'My WorkDrive' }, { id, name }, ...]
  const [pathStack, setPathStack] = useState([{ id: null, name: 'My WorkDrive' }]);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected files map: id -> fileObject
  const [selectedMap, setSelectedMap] = useState(new Map());

  // Quick metadata preview state
  const [previewItem, setPreviewItem] = useState(null);
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);

  const dialogRef = useRef(null);
  const currentFolder = pathStack[pathStack.length - 1];

  // Fetch current folder items
  const loadFolder = useCallback(async (folderId, signal) => {
    if (!isConnected) return;
    setIsLoading(true);
    setError(null);
    setPreviewItem(null);
    try {
      const res = await listWorkdriveItems(folderId, signal);
      const normalized = normalizeWorkdriveItems(res.items);
      setItems(normalized);
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.warn('[WorkDrivePicker] List folder failed:', err);
      setError(err.message || 'Failed to list items from Zoho WorkDrive.');
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);

  // Load root or current folder whenever modal opens or folder changes
  useEffect(() => {
    if (!isOpen) {
      // Reset state when closing
      setSelectedMap(new Map());
      setSearchQuery('');
      setPathStack([{ id: null, name: 'My WorkDrive' }]);
      setPreviewItem(null);
      return;
    }

    if (isConnected) {
      const controller = new AbortController();
      loadFolder(currentFolder.id, controller.signal);
      return () => controller.abort();
    }
  }, [isOpen, isConnected, currentFolder.id, loadFolder]);

  // Keyboard navigation & accessibility
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const openFolder = (folderItem) => {
    setSearchQuery('');
    setPathStack((prev) => [...prev, { id: folderItem.id, name: folderItem.name }]);
  };

  const goBack = () => {
    if (pathStack.length > 1) {
      setSearchQuery('');
      setPathStack((prev) => prev.slice(0, -1));
    }
  };

  const goToBreadcrumb = (index) => {
    setSearchQuery('');
    setPathStack((prev) => prev.slice(0, index + 1));
  };

  const isFileAllowed = (fileItem) => {
    if (!allowedExtensions || allowedExtensions.length === 0) return true;
    const ext = (fileItem.extension || '').toLowerCase();
    return allowedExtensions.includes(ext);
  };

  const handleToggleSelect = (fileItem) => {
    if (!isFileAllowed(fileItem)) return;

    if (multiple) {
      setSelectedMap((prev) => {
        const next = new Map(prev);
        if (next.has(fileItem.id)) {
          next.delete(fileItem.id);
        } else {
          next.set(fileItem.id, fileItem);
        }
        return next;
      });
    } else {
      // Single select mode
      setSelectedMap((prev) => {
        if (prev.has(fileItem.id)) {
          return new Map();
        }
        return new Map([[fileItem.id, fileItem]]);
      });
    }
  };

  const handleRowDoubleClick = (item) => {
    if (item.isFolder) {
      openFolder(item);
    } else if (isFileAllowed(item)) {
      if (!multiple) {
        onSelect([item]);
        onClose();
      }
    }
  };

  const handleInspectMetadata = async (e, fileItem) => {
    e.stopPropagation();
    if (previewItem?.id === fileItem.id) {
      setPreviewItem(null);
      return;
    }
    setIsLoadingMetadata(true);
    try {
      const res = await getWorkdriveMetadata(fileItem.id);
      setPreviewItem({
        id: fileItem.id,
        name: fileItem.name,
        metadata: res?.file || fileItem
      });
    } catch {
      setPreviewItem({
        id: fileItem.id,
        name: fileItem.name,
        metadata: fileItem
      });
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  const handleConfirm = () => {
    const selectedList = Array.from(selectedMap.values());
    if (selectedList.length === 0) return;
    onSelect(selectedList);
    onClose();
  };

  // Filter items by search query
  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    return item.name.toLowerCase().includes(searchQuery.trim().toLowerCase());
  });

  const folders = filteredItems.filter((i) => i.isFolder);
  const files = filteredItems.filter((i) => !i.isFolder);
  const selectedCount = selectedMap.size;

  const defaultButtonLabel = multiple
    ? `Select ${selectedCount > 0 ? `(${selectedCount})` : ''} Files`
    : 'Select Document';

  return (
    <div
      className="wd-picker-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="wd-picker-dialog" ref={dialogRef} tabIndex={-1}>
        {/* Header */}
        <div className="wd-picker-header">
          <div className="wd-picker-title-group">
            <div className="wd-picker-logo-icon">
              <Cloud size={18} />
            </div>
            <div>
              <h3 className="wd-picker-title">{title}</h3>
              <p className="wd-picker-subtitle">{subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-picker-close"
            onClick={onClose}
            aria-label="Close WorkDrive Picker"
          >
            <X size={18} />
          </button>
        </div>

        {!isConnected ? (
          /* Disconnected State / Connect Prompt */
          <div className="wd-connect-prompt">
            <div className="wd-prompt-icon">
              <Cloud size={28} />
            </div>
            <h4 className="wd-prompt-title">Connect Zoho WorkDrive</h4>
            <p className="wd-prompt-desc">
              To pick files directly from your company workspace, please connect your Zoho WorkDrive account.
            </p>
            <button
              type="button"
              className="btn-picker-confirm"
              onClick={connect}
              disabled={isConnecting}
            >
              {isConnecting ? (
                <>
                  <Loader2 size={15} className="workdrive-spin inline mr-2" />
                  Connecting to Zoho...
                </>
              ) : (
                <>
                  <ExternalLink size={15} className="inline mr-2" />
                  Connect Zoho WorkDrive
                </>
              )}
            </button>
          </div>
        ) : (
          /* Connected Browser Flow */
          <>
            {/* Toolbar: Breadcrumb Navigation & Action Buttons */}
            <div className="wd-picker-toolbar">
              <div className="wd-breadcrumbs">
                {pathStack.map((crumb, idx) => (
                  <React.Fragment key={crumb.id || 'root'}>
                    {idx > 0 && <span className="wd-crumb-sep">/</span>}
                    <button
                      type="button"
                      className={`wd-crumb-btn ${idx === pathStack.length - 1 ? 'is-current' : ''}`}
                      onClick={() => goToBreadcrumb(idx)}
                      disabled={idx === pathStack.length - 1}
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>

              <div className="wd-toolbar-actions">
                <button
                  type="button"
                  className="btn-toolbar-nav"
                  onClick={goBack}
                  disabled={pathStack.length <= 1}
                  title="Go back to parent folder"
                >
                  <ChevronLeft size={14} />
                  <span>Back</span>
                </button>
                <button
                  type="button"
                  className="btn-toolbar-nav"
                  onClick={() => loadFolder(currentFolder.id)}
                  title="Refresh folder content"
                >
                  <RefreshCw size={13} className={isLoading ? 'workdrive-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {/* Search Filter */}
            <div className="wd-picker-search">
              <Search size={14} className="text-slate-400" />
              <input
                type="text"
                className="wd-search-input"
                placeholder="Filter files by name in this folder..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="btn-picker-close"
                  onClick={() => setSearchQuery('')}
                  title="Clear filter"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Quick Metadata Preview Banner */}
            {previewItem && (
              <div className="wd-metadata-preview">
                <div className="flex items-center gap-2 overflow-hidden">
                  <Info size={14} className="text-orange-400 shrink-0" />
                  <span className="truncate">
                    <strong>{previewItem.name}</strong>
                    {previewItem.metadata?.size ? ` · ${formatBytes(previewItem.metadata.size)}` : ''}
                    {previewItem.metadata?.modifiedTime ? ` · Modified ${formatDate(previewItem.metadata.modifiedTime)}` : ''}
                  </span>
                </div>
                <button
                  type="button"
                  className="btn-item-info"
                  onClick={() => setPreviewItem(null)}
                  title="Dismiss preview"
                >
                  <X size={13} />
                </button>
              </div>
            )}

            {/* Items Body */}
            <div className="wd-picker-body">
              {isLoading ? (
                <div className="wd-picker-state">
                  <Loader2 size={26} className="workdrive-spin text-orange-400" />
                  <span>Loading WorkDrive items...</span>
                </div>
              ) : error ? (
                <div className="wd-picker-state is-error">
                  <span>{error}</span>
                  <button
                    type="button"
                    className="btn-picker-retry"
                    onClick={() => loadFolder(currentFolder.id)}
                  >
                    Try again
                  </button>
                </div>
              ) : folders.length === 0 && files.length === 0 ? (
                <div className="wd-picker-state">
                  <span>
                    {searchQuery
                      ? 'No items matched your search filter.'
                      : 'This folder is empty.'}
                  </span>
                </div>
              ) : (
                <ul className="wd-items-grid">
                  {/* Folders */}
                  {folders.map((folder) => (
                    <li key={folder.id}>
                      <div
                        className="wd-item-row"
                        onClick={() => openFolder(folder)}
                        onDoubleClick={() => openFolder(folder)}
                        title={`Folder: ${folder.name}`}
                      >
                        <div className="wd-item-icon-box folder">
                          <Folder size={16} />
                        </div>
                        <div className="wd-item-main">
                          <span className="wd-item-name">{folder.name}</span>
                          <span className="wd-item-meta">Folder</span>
                        </div>
                      </div>
                    </li>
                  ))}

                  {/* Files */}
                  {files.map((file) => {
                    const isAllowed = isFileAllowed(file);
                    const isSelected = selectedMap.has(file.id);
                    const { Icon, className: iconClass } = getFileIcon(file.extension);

                    return (
                      <li key={file.id}>
                        <div
                          className={`wd-item-row ${isSelected ? 'is-selected' : ''} ${!isAllowed ? 'is-disabled' : ''}`}
                          onClick={() => isAllowed && handleToggleSelect(file)}
                          onDoubleClick={() => isAllowed && handleRowDoubleClick(file)}
                          title={!isAllowed ? `Format not supported (${file.extension || 'file'})` : file.name}
                        >
                          <div className={`wd-item-icon-box ${iconClass}`}>
                            <Icon size={16} />
                          </div>

                          <div className="wd-item-main">
                            <span className="wd-item-name">{file.name}</span>
                            <span className="wd-item-meta">
                              {file.size > 0 ? formatBytes(file.size) : 'File'}
                              {file.modifiedTime ? ` · ${formatDate(file.modifiedTime)}` : ''}
                              {!isAllowed && ' · (Unsupported format)'}
                            </span>
                          </div>

                          <div className="wd-item-actions">
                            <button
                              type="button"
                              className="btn-item-info"
                              onClick={(e) => handleInspectMetadata(e, file)}
                              title="Inspect file details"
                            >
                              <Info size={14} />
                            </button>

                            {multiple ? (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                disabled={!isAllowed}
                                onChange={() => handleToggleSelect(file)}
                                onClick={(e) => e.stopPropagation()}
                                aria-label={`Select ${file.name}`}
                                className="w-4 h-4 accent-orange-500 rounded cursor-pointer"
                              />
                            ) : (
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                  isSelected
                                    ? 'border-orange-500 bg-orange-500 text-white'
                                    : 'border-slate-600 bg-transparent'
                                }`}
                              >
                                {isSelected && <Check size={11} strokeWidth={3} />}
                              </div>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div className="wd-picker-footer">
              <span className="wd-footer-count">
                {selectedCount > 0 ? (
                  <>
                    <strong>{selectedCount}</strong> {selectedCount === 1 ? 'file' : 'files'} selected
                  </>
                ) : (
                  'No file selected'
                )}
              </span>

              <div className="wd-footer-actions">
                <button type="button" className="btn-picker-cancel" onClick={onClose}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-picker-confirm"
                  onClick={handleConfirm}
                  disabled={selectedCount === 0}
                >
                  {confirmLabel || defaultButtonLabel}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
