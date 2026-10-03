import React, { useState, useRef, useEffect } from 'react';
import './WorkDriveStatusBadge.css';
import { useWorkDrive } from '@/context/WorkDriveContext';
import { Cloud, CheckCircle2, ChevronDown, LogOut, Loader2, RefreshCw } from 'lucide-react';

export default function WorkDriveStatusBadge({ className = '' }) {
  const { status, email, isConnected, isConnecting, error, connect, disconnect } = useWorkDrive();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef(null);

  // Close popover when clicking outside
  useEffect(() => {
    if (!isOpen) return;
    const handleOutsideClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen]);

  if (status === 'checking') {
    return (
      <div className={`workdrive-status-badge-wrap ${className}`}>
        <div className="workdrive-checking-pill" title="Checking Zoho WorkDrive connection">
          <Loader2 size={12} className="workdrive-spin text-orange-400" />
          <span>WorkDrive...</span>
        </div>
      </div>
    );
  }

  if (isConnected) {
    return (
      <div className={`workdrive-status-badge-wrap ${className}`} ref={popoverRef}>
        <button
          type="button"
          className={`workdrive-connected-pill ${isOpen ? 'is-open' : ''}`}
          onClick={() => setIsOpen((prev) => !prev)}
          title={`Zoho WorkDrive Connected (${email || 'Active'})`}
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <span className="workdrive-indicator-dot" />
          <Cloud size={14} className="text-emerald-400" />
          <span className="workdrive-email-label">{email || 'WorkDrive'}</span>
          <ChevronDown size={12} className="workdrive-chevron" />
        </button>

        {isOpen && (
          <div className="workdrive-status-popover" role="dialog" aria-label="WorkDrive Connection Details">
            <div className="wd-popover-header">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span className="wd-popover-title">WorkDrive Connected</span>
            </div>
            <div className="wd-popover-email" title={email}>
              {email || 'Signed in via Zoho OAuth'}
            </div>
            <p className="wd-popover-note">
              This connection is shared across Customer Showcases and Solution Proposals.
            </p>
            <button
              type="button"
              className="btn-workdrive-disconnect"
              onClick={async () => {
                setIsOpen(false);
                await disconnect();
              }}
            >
              <LogOut size={13} />
              <span>Disconnect WorkDrive</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Disconnected state
  return (
    <div className={`workdrive-status-badge-wrap ${className}`}>
      <button
        type="button"
        className="btn-workdrive-connect"
        onClick={connect}
        disabled={isConnecting}
        title="Connect your Zoho WorkDrive account to pick documents"
      >
        {isConnecting ? (
          <>
            <Loader2 size={13} className="workdrive-spin text-orange-400" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <Cloud size={14} className="text-orange-400" />
            <span>Connect WorkDrive</span>
          </>
        )}
      </button>
    </div>
  );
}
