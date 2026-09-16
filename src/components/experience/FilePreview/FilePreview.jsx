import React, { useRef, useState } from 'react';
import './FilePreview.css';
import { formatBytes } from '@/utils/helpers';
import { SUPPORTED_LOGO_EXTENSIONS } from '@/utils/constants';

export default function FilePreview({
  file,
  businessName,
  onBusinessNameChange,
  projectName,
  onProjectNameChange,
  projectDescription,
  onProjectDescriptionChange,
  businessLogoFile = null,
  businessLogoPreview = null,
  businessLogoError = null,
  onLogoSelected,
  onRemoveLogo,
  onRemove,
  onUpload,
  disabled = false
}) {
  const logoInputRef = useRef(null);
  const [isLogoDragActive, setIsLogoDragActive] = useState(false);

  if (!file) return null;

  const fileExtension = '.' + (file.name.split('.').pop() || '').toLowerCase();
  const fileTypeLabel = fileExtension === '.docx' ? 'DOCX' : 'PDF';
  const fileTypeBadgeClass = fileExtension === '.docx' ? 'docx' : 'pdf';

  const isFormValid =
    Boolean(businessName?.trim()) &&
    Boolean(projectName?.trim()) &&
    Boolean(file) &&
    file.size > 0 &&
    !businessLogoError &&
    !disabled;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isFormValid) {
      onUpload();
    }
  };

  const handleLogoDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsLogoDragActive(true);
  };

  const handleLogoDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsLogoDragActive(true);
  };

  const handleLogoDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget.contains(e.relatedTarget)) return;
    setIsLogoDragActive(false);
  };

  const handleLogoDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsLogoDragActive(false);
    if (disabled) return;
    const files = e.dataTransfer.files;
    if (files && files.length > 0 && onLogoSelected) {
      onLogoSelected(files[0]);
    }
  };

  const handleLogoInputChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0 && onLogoSelected) {
      onLogoSelected(files[0]);
    }
    e.target.value = '';
  };

  const handleTriggerLogoBrowse = () => {
    if (disabled) return;
    logoInputRef.current?.click();
  };

  return (
    <div className="compact-file-preview animate-fade-in">
      {/* File Info Header */}
      <div className="file-header-row">
        <div className="file-left-info">
          <div className={`compact-file-badge ${fileTypeBadgeClass}`}>
            <span>{fileTypeLabel}</span>
          </div>
          <div className="file-titles">
            <h4 className="file-main-name" title={file.name}>
              {file.name}
            </h4>
            <div className="file-sub-meta">
              <span className="file-size-info">{formatBytes(file.size)}</span>
              <span className="meta-dot">•</span>
              <span className="file-status-text">Ready to Process</span>
            </div>
          </div>
        </div>

        <button
          type="button"
          className="btn-remove-doc"
          onClick={onRemove}
          disabled={disabled}
          title="Remove document"
          aria-label="Remove document"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Upload Form */}
      <form onSubmit={handleSubmit} className="catalyst-upload-form">
        <div className="form-grid-fields">
          {/* Business Name Field */}
          <div className="form-field-group">
            <label htmlFor="business-name-input" className="form-field-label">
              Business Name <span className="req-star">*</span>
            </label>
            <div className="input-field-wrapper">
              <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 21h18M3 7v14M21 7v14M6 11h4M6 15h4M14 11h4M14 15h4M10 3v4M14 3v4" />
              </svg>
              <input
                id="business-name-input"
                type="text"
                className="form-text-input"
                placeholder="Enter client / business name"
                value={businessName}
                onChange={(e) => onBusinessNameChange(e.target.value)}
                disabled={disabled}
                required
                maxLength={120}
              />
            </div>
          </div>

          {/* Project Name Field */}
          <div className="form-field-group">
            <label htmlFor="project-name-input" className="form-field-label">
              Project Name <span className="req-star">*</span>
            </label>
            <div className="input-field-wrapper">
              <svg className="field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
              <input
                id="project-name-input"
                type="text"
                className="form-text-input"
                placeholder="Enter project title"
                value={projectName}
                onChange={(e) => onProjectNameChange(e.target.value)}
                disabled={disabled}
                required
                maxLength={120}
              />
            </div>
          </div>

          {/* Business Logo Upload Field */}
          <div className="form-field-group full-width">
            <div className="label-with-hint">
              <label htmlFor="business-logo-dropzone" className="form-field-label">
                Business Logo
              </label>
              <span className="optional-tag">Optional • PNG, JPG, JPEG, SVG, WebP up to 5 MB</span>
            </div>
            <p className="field-helper-text">
              Upload the business logo that should appear in the customer-facing experience.
            </p>

            {/* Hidden file input for logo */}
            <input
              ref={logoInputRef}
              id="business-logo-input"
              type="file"
              accept={SUPPORTED_LOGO_EXTENSIONS.join(',')}
              onChange={handleLogoInputChange}
              className="hidden-file-input"
              disabled={disabled}
              aria-hidden="true"
              tabIndex={-1}
            />

            {/* Logo Selected State or Dropzone */}
            {businessLogoFile && businessLogoPreview ? (
              <div className="logo-preview-card animate-fade-in">
                <div className="logo-thumb-wrapper">
                  <img
                    src={businessLogoPreview}
                    alt={businessName ? `${businessName} logo preview` : 'Business logo preview'}
                    className="logo-thumb-img"
                  />
                </div>
                <div className="logo-file-details">
                  <span className="logo-file-name" title={businessLogoFile.name}>
                    {businessLogoFile.name}
                  </span>
                  <div className="logo-file-sub">
                    <span className="logo-size">{formatBytes(businessLogoFile.size)}</span>
                    <span className="meta-dot">•</span>
                    <span className="logo-ready-tag">Logo Ready</span>
                  </div>
                </div>
                <div className="logo-actions">
                  <button
                    type="button"
                    className="btn-change-logo"
                    onClick={handleTriggerLogoBrowse}
                    disabled={disabled}
                    title="Change business logo"
                  >
                    Change
                  </button>
                  <button
                    type="button"
                    className="btn-remove-logo"
                    onClick={onRemoveLogo}
                    disabled={disabled}
                    title="Remove business logo"
                    aria-label="Remove business logo"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <div
                id="business-logo-dropzone"
                className={`logo-dropzone-box ${isLogoDragActive ? 'drag-active' : ''} ${disabled ? 'disabled' : ''}`}
                onDragEnter={handleLogoDragEnter}
                onDragOver={handleLogoDragOver}
                onDragLeave={handleLogoDragLeave}
                onDrop={handleLogoDrop}
                onClick={handleTriggerLogoBrowse}
                role="button"
                tabIndex={disabled ? -1 : 0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleTriggerLogoBrowse();
                  }
                }}
                aria-label="Upload business logo. Drag and drop image or click browse."
              >
                <div className="logo-dropzone-inner">
                  <div className="logo-icon-badge">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                  </div>
                  <div className="logo-text-block">
                    <span className="logo-lead-prompt">
                      {isLogoDragActive ? 'Drop your business logo here' : 'Drag & drop business logo here, or'}
                    </span>
                    <button
                      type="button"
                      className="btn-browse-logo-inline"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTriggerLogoBrowse();
                      }}
                      disabled={disabled}
                    >
                      Browse Image
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Logo Validation Error Message */}
            {businessLogoError && (
              <div className="logo-validation-error animate-fade-in" role="alert">
                <span className="err-bullet">⚠️</span>
                <span>{businessLogoError}</span>
              </div>
            )}
          </div>

          {/* Optional Project Description */}
          <div className="form-field-group full-width">
            <div className="label-with-hint">
              <label htmlFor="project-desc-input" className="form-field-label">
                Project Description / Context Notes
              </label>
              <span className="optional-tag">Optional</span>
            </div>
            <textarea
              id="project-desc-input"
              className="form-textarea-input"
              placeholder="Provide any additional context or discovery notes for this upload..."
              value={projectDescription}
              onChange={(e) => onProjectDescriptionChange(e.target.value)}
              disabled={disabled}
              rows={2}
              maxLength={500}
            />
          </div>
        </div>

        {/* Submit Action Row */}
        <div className="form-submit-row">
          <button
            type="button"
            className="btn-change-file-action"
            onClick={onRemove}
            disabled={disabled}
          >
            Change File
          </button>

          <button
            type="submit"
            disabled={!isFormValid}
            className="btn-upload-submit-action"
          >
            Upload Document
          </button>
        </div>
      </form>
    </div>
  );
}

