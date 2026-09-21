import React, { useState, useEffect, useCallback, useRef } from 'react';
import './WorkDriveBrowser.css';
import { listWorkdriveFolders, getFriendlyErrorMessage } from '@/api/proposalApi';
import { normalizeWorkdriveItems } from './workdriveItem';
import { validateWorkdriveFileSelection, formatBytes, formatDate } from '@/utils/helpers';
import {
  X,
  Folder,
  FileText,
  FileSpreadsheet,
  File as FileIcon,
  ChevronLeft,
  Loader2,
  RefreshCcw
} from 'lucide-react';

function fileIconFor(extension) {
  if (['.xlsx', '.xls'].includes(extension)) return FileSpreadsheet;
  if (['.pdf', '.docx', '.doc', '.txt'].includes(extension)) return FileText;
  return FileIcon;
}

/**
 * WorkDrive folder/file browser modal (Workspace 2 - Solution Proposals).
 * Only browses metadata via proposal-api - never downloads file content here; the
 * backend handles downloading/processing once a discovery package is created.
 */
export default function WorkDriveBrowser({ onClose, onContinue }) {
  // Breadcrumb stack: [{ id: null, name: 'My Files' }, { id, name }, ...]. A null id means root.
  const [pathStack, setPathStack] = useState([{ id: null, name: 'My Files' }]);
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [selectedFiles, setSelectedFiles] = useState(() => new Map());
  const [selectionError, setSelectionError] = useState(null);

  const dialogRef = useRef(null);
  const currentFolder = pathStack[pathStack.length - 1];

  const loadFolder = useCallback(async (folderId, signal) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listWorkdriveFolders(folderId, signal);
      setItems(normalizeWorkdriveItems(res.items));
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(getFriendlyErrorMessage(err));
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadFolder(currentFolder.id, controller.signal);
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentFolder.id]);

  useEffect(() => {
    dialogRef.current?.focus();
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const openFolder = (item) => {
    setPathStack((prev) => [...prev, { id: item.id, name: item.name }]);
  };

  const goBack = () => {
    setPathStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  };

  const goToBreadcrumb = (index) => {
    setPathStack((prev) => prev.slice(0, index + 1));
  };

  const toggleSelect = (item) => {
    setSelectionError(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) {
        next.delete(item.id);
        setSelectedFiles((prevFiles) => {
          const nextFiles = new Map(prevFiles);
          nextFiles.delete(item.id);
          return nextFiles;
        });
      } else {
        const candidate = {
          workdrive_file_id: item.id,
          file_name: item.name,
          file_type: item.extension.replace('.', ''),
          mime_type: item.mimeType,
          file_size: item.size
        };
        const validation = validateWorkdriveFileSelection(candidate);
        if (!validation.valid) {
          setSelectionError(validation.error);
          return prev;
        }
        next.add(item.id);
        setSelectedFiles((prevFiles) => new Map(prevFiles).set(item.id, candidate));
      }
      return next;
    });
  };

  const folders = items.filter((item) => item.isFolder);
  const files = items.filter((item) => !item.isFolder);
  const selectedCount = selectedIds.size;

  const handleContinue = () => {
    if (selectedCount === 0) return;
    onContinue(Array.from(selectedFiles.values()));
  };

  return (
    <div className="workdrive-browser-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div
        className="workdrive-browser-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workdrive-browser-title"
        ref={dialogRef}
        tabIndex={-1}
      >
        <div className="workdrive-browser-header">
          <div>
            <h3 id="workdrive-browser-title">WorkDrive</h3>
            <div className="workdrive-breadcrumbs">
              {pathStack.map((crumb, index) => (
                <React.Fragment key={crumb.id || 'root'}>
                  {index > 0 && <span className="crumb-sep">/</span>}
                  <button
                    type="button"
                    className={`crumb-btn ${index === pathStack.length - 1 ? 'is-current' : ''}`}
                    onClick={() => goToBreadcrumb(index)}
                    disabled={index === pathStack.length - 1}
                  >
                    {crumb.name}
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>
          <button type="button" className="btn-close-browser" onClick={onClose} aria-label="Close WorkDrive browser">
            <X size={18} />
          </button>
        </div>

        <div className="workdrive-browser-toolbar">
          <button
            type="button"
            className="btn-browser-back"
            onClick={goBack}
            disabled={pathStack.length <= 1}
          >
            <ChevronLeft size={15} />
            <span>Back</span>
          </button>
          <button
            type="button"
            className="btn-browser-refresh"
            onClick={() => loadFolder(currentFolder.id)}
            title="Refresh"
          >
            <RefreshCcw size={14} />
          </button>
        </div>

        <div className="workdrive-browser-body">
          {isLoading ? (
            <div className="workdrive-browser-state">
              <Loader2 size={22} className="workdrive-spin" />
              <span>Loading…</span>
            </div>
          ) : error ? (
            <div className="workdrive-browser-state is-error">
              <span>{error}</span>
              <button type="button" className="btn-browser-retry" onClick={() => loadFolder(currentFolder.id)}>
                Try again
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="workdrive-browser-state">
              <span>This folder is empty.</span>
            </div>
          ) : (
            <ul className="workdrive-item-list">
              {folders.map((item) => (
                <li key={item.id} className="workdrive-item folder-item">
                  <button type="button" className="workdrive-item-row" onClick={() => openFolder(item)}>
                    <Folder size={17} className="item-icon folder" />
                    <span className="item-name">{item.name}</span>
                  </button>
                </li>
              ))}

              {files.map((item) => {
                const Icon = fileIconFor(item.extension);
                const isSelected = selectedIds.has(item.id);
                return (
                  <li key={item.id} className="workdrive-item file-item">
                    <label className="workdrive-item-row selectable">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(item)}
                        aria-label={`Select ${item.name}`}
                      />
                      <Icon size={17} className="item-icon file" />
                      <span className="item-name" title={item.name}>{item.name}</span>
                      <span className="item-meta">
                        {item.size > 0 ? formatBytes(item.size) : ''}
                        {item.modifiedTime ? ` · ${formatDate(item.modifiedTime)}` : ''}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {selectionError && (
          <div className="workdrive-selection-error" role="alert">{selectionError}</div>
        )}

        <div className="workdrive-browser-footer">
          <span className="selected-count-text">
            {selectedCount > 0 ? `${selectedCount} file${selectedCount === 1 ? '' : 's'} selected` : 'No files selected'}
          </span>
          <button
            type="button"
            className="btn-browser-continue"
            onClick={handleContinue}
            disabled={selectedCount === 0}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
