import React from 'react';
import './WorkDriveConnect.css';
import { ExternalLink, CheckCircle2, FolderOpen, LogOut, Loader2 } from 'lucide-react';

/**
 * Zoho WorkDrive connection state card (Workspace 2 - Solution Proposals).
 * Purely presentational - the actual OAuth popup flow lives in useWorkDriveAuth.
 */
export default function WorkDriveConnect({
  status = 'checking', // 'checking' | 'connected' | 'disconnected'
  email = null,
  isConnecting = false,
  onConnect,
  onBrowseFiles,
  onDisconnect
}) {
  if (status === 'checking') {
    return (
      <div className="workdrive-connect-card is-checking" role="status" aria-live="polite">
        <Loader2 size={18} className="workdrive-spin" />
        <span>Checking WorkDrive connection…</span>
      </div>
    );
  }

  if (status === 'connected') {
    return (
      <div className="workdrive-connect-card is-connected">
        <div className="workdrive-connect-header">
          <div className="workdrive-connect-icon success">
            <CheckCircle2 size={18} />
          </div>
          <div className="workdrive-connect-text">
            <h4>WorkDrive Connected</h4>
            {email && <p title={email}>{email}</p>}
          </div>
        </div>
        <div className="workdrive-connect-actions">
          <button
            type="button"
            className="btn-workdrive-primary"
            onClick={onBrowseFiles}
          >
            <FolderOpen size={15} />
            <span>Browse Files</span>
          </button>
          <button
            type="button"
            className="btn-workdrive-ghost"
            onClick={onDisconnect}
            title="Disconnect WorkDrive"
          >
            <LogOut size={14} />
            <span>Disconnect</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="workdrive-connect-card is-disconnected">
      <div className="workdrive-connect-header">
        <div className="workdrive-connect-icon">
          <FolderOpen size={18} />
        </div>
        <div className="workdrive-connect-text">
          <h4>Zoho WorkDrive</h4>
          <p>Connect your WorkDrive to select discovery files.</p>
        </div>
      </div>
      <button
        type="button"
        className="btn-workdrive-primary"
        onClick={onConnect}
        disabled={isConnecting}
      >
        {isConnecting ? <Loader2 size={15} className="workdrive-spin" /> : <ExternalLink size={15} />}
        <span>{isConnecting ? 'Connecting…' : 'Connect WorkDrive'}</span>
      </button>
    </div>
  );
}
