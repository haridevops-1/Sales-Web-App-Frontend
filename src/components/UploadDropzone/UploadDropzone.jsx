import React, { useRef, useState } from 'react';
import './UploadDropzone.css';
import { SUPPORTED_FILE_EXTENSIONS, MAX_FILE_SIZE_BYTES } from '../../utils/constants';
import { formatBytes } from '../../utils/helpers';
import GlareHover from '../../reactbits/GlareHover';

export default function UploadDropzone({ onFileSelected, disabled = false }) {
  const fileInputRef = useRef(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragActive(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (disabled) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      onFileSelected(files[0]);
    }
  };

  const handleInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelected(files[0]);
    }
    e.target.value = '';
  };

  const handleTriggerBrowse = (e) => {
    e.stopPropagation();
    if (disabled) return;
    fileInputRef.current?.click();
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  return (
    <GlareHover className="dropzone-glare-wrap">
    <div
      className={`compact-dropzone ${isDragActive ? 'drag-active' : ''} ${
        disabled ? 'disabled' : ''
      }`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleTriggerBrowse}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload technical document. Drag and drop a PDF or Word file, or click browse."
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={SUPPORTED_FILE_EXTENSIONS.join(',')}
        onChange={handleInputChange}
        className="hidden-file-input"
        disabled={disabled}
        aria-hidden="true"
        tabIndex={-1}
      />

      <div className="compact-dropzone-content">
        <div className="compact-icon-box">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>

        <div className="compact-text-block">
          <div className="dropzone-line-one">
            <span className="drop-lead-text">
              {isDragActive ? 'Drop your document here' : 'Drag & drop your discovery document here, or'}
            </span>
            <button
              type="button"
              className="btn-browse-trigger"
              onClick={handleTriggerBrowse}
            >
              Browse Files
            </button>
          </div>
          <div className="dropzone-line-two">
            <span className="supported-formats">PDF or Word Document (.pdf, .docx)</span>
            <span className="format-separator">•</span>
            <span className="max-size-tag">Maximum {formatBytes(MAX_FILE_SIZE_BYTES)}</span>
          </div>
        </div>
      </div>
    </div>
    </GlareHover>
  );
}
