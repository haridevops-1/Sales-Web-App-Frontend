import React, { useState } from 'react';
import './DiscoveryUploadCard.css';
import { FolderOpen, X as XIcon, FileText, ArrowRight, Loader2 } from 'lucide-react';
import SpotlightCard from '@/reactbits/SpotlightCard';
import WorkDriveConnect from '@/components/proposal/WorkDriveConnect/WorkDriveConnect';
import WorkDriveBrowser from '@/components/proposal/WorkDriveBrowser/WorkDriveBrowser';
import { useWorkDriveAuth } from '@/hooks/useWorkDriveAuth';
import { createDiscoveryPackage, getFriendlyErrorMessage } from '@/api/proposalApi';
import { formatBytes } from '@/utils/helpers';

/**
 * Create Proposal - Step 1: connect WorkDrive, select discovery files, name the
 * package, and create it (real backend call to proposal-discovery). Local file upload
 * is not supported by the current backend - only the WorkDrive path is wired up.
 */
export default function DiscoveryUploadCard({ onContinue, disabled = false, onToast }) {
  const workdrive = useWorkDriveAuth();
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [packageName, setPackageName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState(null);

  const handleBrowseContinue = (files) => {
    setSelectedFiles((prev) => {
      const existingIds = new Set(prev.map((f) => f.workdrive_file_id));
      const merged = [...prev];
      files.forEach((f) => {
        if (!existingIds.has(f.workdrive_file_id)) merged.push(f);
      });
      return merged;
    });
    setIsBrowserOpen(false);
  };

  const handleRemoveFile = (workdriveFileId) => {
    setSelectedFiles((prev) => prev.filter((f) => f.workdrive_file_id !== workdriveFileId));
  };

  const isFormValid = selectedFiles.length > 0 && packageName.trim().length > 0;

  const handleCreatePackage = async () => {
    if (!isFormValid || isCreating) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      const res = await createDiscoveryPackage(packageName.trim(), selectedFiles);
      if (onToast) onToast('Discovery package created.', 'success', 4000);
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
    <SpotlightCard className="discovery-upload-card" spotlightColor="rgba(255, 122, 26, 0.1)">
      <div className="discovery-upload-inner">
        <div className="discovery-section-heading">
          <h3 className="discovery-dropzone-title">Upload Discovery Package</h3>
          <p className="discovery-dropzone-hint">
            Connect Zoho WorkDrive and select the files that make up this customer's discovery package.
          </p>
        </div>

        <WorkDriveConnect
          status={workdrive.status}
          email={workdrive.email}
          isConnecting={workdrive.isConnecting}
          onConnect={workdrive.connect}
          onBrowseFiles={() => setIsBrowserOpen(true)}
          onDisconnect={workdrive.disconnect}
        />

        {workdrive.error && (
          <div className="discovery-inline-error" role="alert">{workdrive.error}</div>
        )}

        {selectedFiles.length > 0 && (
          <div className="discovery-selected-files animate-fade-in">
            <div className="discovery-selected-header">
              <span>{selectedFiles.length} file{selectedFiles.length === 1 ? '' : 's'} selected</span>
              {workdrive.isConnected && (
                <button type="button" className="btn-add-more-files" onClick={() => setIsBrowserOpen(true)} disabled={disabled}>
                  Add more files
                </button>
              )}
            </div>
            <ul className="discovery-selected-list">
              {selectedFiles.map((file) => (
                <li key={file.workdrive_file_id} className="discovery-selected-item">
                  <FileText size={15} className="selected-file-icon" />
                  <span className="selected-file-name" title={file.file_name}>{file.file_name}</span>
                  {file.file_size > 0 && <span className="selected-file-size">{formatBytes(file.file_size)}</span>}
                  <button
                    type="button"
                    className="btn-remove-selected-file"
                    onClick={() => handleRemoveFile(file.workdrive_file_id)}
                    disabled={disabled || isCreating}
                    aria-label={`Remove ${file.file_name}`}
                  >
                    <XIcon size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {selectedFiles.length > 0 && (
          <div className="discovery-field animate-fade-in">
            <label className="discovery-field-label" htmlFor="discovery-package-name">
              Customer / Package Name <span className="discovery-req-asterisk">*</span>
            </label>
            <div className="discovery-field-input-wrap">
              <FolderOpen size={15} className="discovery-field-icon" />
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
          <div className="discovery-inline-error" role="alert">{createError}</div>
        )}

        <div className="discovery-footer-row">
          <button
            type="button"
            className="btn-discovery-continue"
            onClick={handleCreatePackage}
            disabled={!isFormValid || disabled || isCreating}
          >
            {isCreating ? <Loader2 size={16} className="discovery-spin" /> : <ArrowRight size={16} strokeWidth={2.4} />}
            <span>{isCreating ? 'Creating package…' : 'Create Discovery Package'}</span>
          </button>
        </div>
      </div>

      {isBrowserOpen && (
        <WorkDriveBrowser
          onClose={() => setIsBrowserOpen(false)}
          onContinue={handleBrowseContinue}
        />
      )}
    </SpotlightCard>
  );
}
