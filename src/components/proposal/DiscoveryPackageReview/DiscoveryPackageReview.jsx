import React, { useState, useRef } from 'react';
import './DiscoveryPackageReview.css';
import { FileText, X as XIcon, FileUp, FolderUp, Sparkles, Loader2 } from 'lucide-react';
import SpotlightCard from '@/reactbits/SpotlightCard';
import { addFilesToPackage, removeFileFromPackage, getFriendlyErrorMessage } from '@/api/proposalApi';
import { formatBytes } from '@/utils/helpers';

const STATUS_LABEL = {
  PENDING: 'Pending',
  EXTRACTED: 'Extracted',
  FAILED: 'Failed',
  UNSUPPORTED: 'Unsupported'
};

const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.txt', '.csv', '.md'];

function isSupportedFile(file) {
  const name = file.name.toLowerCase();
  return SUPPORTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

/**
 * Create Proposal - Step 2: review the created discovery package,
 * add/remove local files or folders, then start generation.
 */
export default function DiscoveryPackageReview({ discoveryPackage, onPackageUpdated, onGenerate, onToast }) {
  const [busyFileId, setBusyFileId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const files = discoveryPackage?.files || [];
  const packageId = discoveryPackage?.package_id;

  const handleAddFiles = async (fileList) => {
    if (!fileList || fileList.length === 0) return;
    const validFiles = Array.from(fileList).filter(isSupportedFile);
    if (validFiles.length === 0) {
      if (onToast) onToast('Please select supported documents (.pdf, .docx, .doc, .xlsx, .xls, .txt).', 'warning', 4500);
      return;
    }

    setIsAdding(true);
    setError(null);
    try {
      const res = await addFilesToPackage(packageId, validFiles);
      onPackageUpdated(res.package);
      if (onToast) onToast(`Added ${validFiles.length} file${validFiles.length === 1 ? '' : 's'} to discovery package.`, 'success', 3500);
    } catch (err) {
      const message = getFriendlyErrorMessage(err);
      setError(message);
      if (onToast) onToast(message, 'error', 6000);
    } finally {
      setIsAdding(false);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleAddFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleFolderSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleAddFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleRemoveFile = async (fileId) => {
    setBusyFileId(fileId);
    setError(null);
    try {
      const res = await removeFileFromPackage(packageId, fileId);
      onPackageUpdated(res.package);
      if (onToast) onToast('File removed from discovery package.', 'info', 3000);
    } catch (err) {
      const message = getFriendlyErrorMessage(err);
      setError(message);
      if (onToast) onToast(message, 'error', 6000);
    } finally {
      setBusyFileId(null);
    }
  };

  const handleGenerate = async () => {
    if (files.length === 0 || isGenerating) return;
    setIsGenerating(true);
    setError(null);
    try {
      await onGenerate();
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
      setIsGenerating(false);
    }
  };

  return (
    <SpotlightCard className="discovery-review-card" spotlightColor="rgba(0, 82, 255, 0.1)">
      <div className="discovery-review-inner">
        <div className="discovery-review-heading">
          <h3>{discoveryPackage?.package_name || 'Discovery Package'}</h3>
          <p>Review the staged files, add any missing notes or documents, then generate the solution proposal.</p>
        </div>

        {/* Hidden inputs for adding more files/folders */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.doc,.xlsx,.xls,.txt,.csv,.md"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={isAdding || isGenerating}
        />
        <input
          ref={folderInputRef}
          type="file"
          webkitdirectory=""
          directory=""
          multiple
          onChange={handleFolderSelect}
          style={{ display: 'none' }}
          disabled={isAdding || isGenerating}
        />

        <div className="discovery-review-files-header">
          <span>{files.length} file{files.length === 1 ? '' : 's'} in package</span>
          <div className="review-add-actions">
            <button
              type="button"
              className="btn-review-add-files"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAdding || isGenerating}
            >
              {isAdding ? <Loader2 size={13} className="discovery-review-spin" /> : <FileUp size={13} />}
              <span>Add files</span>
            </button>
            <button
              type="button"
              className="btn-review-add-files"
              onClick={() => folderInputRef.current?.click()}
              disabled={isAdding || isGenerating}
            >
              <FolderUp size={13} />
              <span>Add folder</span>
            </button>
          </div>
        </div>

        <ul className="discovery-review-file-list">
          {files.map((file) => (
            <li key={file.package_file_id} className="discovery-review-file-item">
              <FileText size={15} className="review-file-icon" />
              <span className="review-file-name" title={file.file_name}>{file.file_name}</span>
              {file.file_size > 0 && <span className="review-file-size">{formatBytes(file.file_size)}</span>}
              <span className={`review-file-status status-${(file.processing_status || 'pending').toLowerCase()}`}>
                {STATUS_LABEL[file.processing_status] || 'Pending'}
              </span>
              <button
                type="button"
                className="btn-review-remove-file"
                onClick={() => handleRemoveFile(file.package_file_id)}
                disabled={busyFileId === file.package_file_id || isGenerating}
                aria-label={`Remove ${file.file_name}`}
              >
                {busyFileId === file.package_file_id ? <Loader2 size={13} className="discovery-review-spin" /> : <XIcon size={13} />}
              </button>
            </li>
          ))}
        </ul>

        {error && <div className="discovery-review-error" role="alert">{error}</div>}

        <div className="discovery-review-footer">
          <button
            type="button"
            className="btn-review-generate"
            onClick={handleGenerate}
            disabled={files.length === 0 || isGenerating}
          >
            {isGenerating ? <Loader2 size={16} className="discovery-review-spin" /> : <Sparkles size={16} />}
            <span>{isGenerating ? 'Starting Generation…' : 'Generate Proposal'}</span>
          </button>
        </div>
      </div>
    </SpotlightCard>
  );
}
