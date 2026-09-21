import React, { useState } from 'react';
import './DiscoveryPackageReview.css';
import { FileText, X as XIcon, Plus, Sparkles, Loader2 } from 'lucide-react';
import SpotlightCard from '@/reactbits/SpotlightCard';
import WorkDriveBrowser from '@/components/proposal/WorkDriveBrowser/WorkDriveBrowser';
import { addFilesToPackage, removeFileFromPackage, getFriendlyErrorMessage } from '@/api/proposalApi';
import { formatBytes } from '@/utils/helpers';

const STATUS_LABEL = {
  PENDING: 'Pending',
  EXTRACTED: 'Extracted',
  FAILED: 'Failed',
  UNSUPPORTED: 'Unsupported'
};

/**
 * Create Proposal - Step 2: review the created discovery package (real backend package,
 * never a fake frontend one), add/remove files, then start generation.
 */
export default function DiscoveryPackageReview({ discoveryPackage, onPackageUpdated, onGenerate, onToast }) {
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [busyFileId, setBusyFileId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);

  const files = discoveryPackage?.files || [];
  const packageId = discoveryPackage?.package_id;

  const handleAddFiles = async (newFiles) => {
    setIsBrowserOpen(false);
    if (!newFiles.length) return;
    setIsAdding(true);
    setError(null);
    try {
      const res = await addFilesToPackage(packageId, newFiles);
      onPackageUpdated(res.package);
      if (onToast) onToast('Files added to the discovery package.', 'success', 3500);
    } catch (err) {
      const message = getFriendlyErrorMessage(err);
      setError(message);
      if (onToast) onToast(message, 'error', 6000);
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveFile = async (fileId) => {
    setBusyFileId(fileId);
    setError(null);
    try {
      const res = await removeFileFromPackage(packageId, fileId);
      onPackageUpdated(res.package);
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
          <p>Review the selected files, then generate the solution proposal.</p>
        </div>

        <div className="discovery-review-files-header">
          <span>{files.length} file{files.length === 1 ? '' : 's'} in package</span>
          <button type="button" className="btn-review-add-files" onClick={() => setIsBrowserOpen(true)} disabled={isAdding}>
            {isAdding ? <Loader2 size={13} className="discovery-review-spin" /> : <Plus size={13} />}
            <span>Add more files</span>
          </button>
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
                disabled={busyFileId === file.package_file_id}
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
            <span>{isGenerating ? 'Starting…' : 'Generate Proposal'}</span>
          </button>
        </div>
      </div>

      {isBrowserOpen && (
        <WorkDriveBrowser onClose={() => setIsBrowserOpen(false)} onContinue={handleAddFiles} />
      )}
    </SpotlightCard>
  );
}
