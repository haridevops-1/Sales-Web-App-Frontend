import React, { useEffect } from 'react';
import './Toast.css';

export default function Toast({ message, type = 'success', onClose, duration = 7000 }) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  return (
    <div className={`toast-container ${type} animate-toast-slide`} role="status" aria-live="polite">
      <div className="toast-icon-circle">
        {type === 'success' && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        {type === 'error' && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        )}
        {type === 'info' && (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        )}
      </div>

      <div className="toast-content">
        <span className="toast-message-text">{message}</span>
      </div>

      <button
        type="button"
        className="toast-close-btn"
        onClick={onClose}
        aria-label="Close notification"
      >
        ✕
      </button>

      {/* 7-Second Visual Timer Progress Line */}
      <div className="toast-timer-progress-bar"></div>
    </div>
  );
}
