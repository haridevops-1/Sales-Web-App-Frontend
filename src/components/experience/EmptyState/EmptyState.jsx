import React from 'react';
import './EmptyState.css';

export default function EmptyState({ onUploadClick }) {
  return (
    <div className="empty-state-card animate-fade-in">
      <div className="empty-icon-circle">
        <svg
          className="empty-icon-svg"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect width="48" height="48" rx="14" fill="#F1F5F9" />
          <path
            d="M17 19H31M17 25H27M17 31H23M13 11H35C36.1046 11 37 11.8954 37 13V35C37 36.1046 36.1046 37 35 37H13C11.8954 37 11 36.1046 11 35V13C11 11.8954 11.8954 11 13 11Z"
            stroke="#94A3B8"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>

      <h3 className="empty-state-title">No customer experiences are available yet.</h3>
      <p className="empty-state-description">
        Uploaded documents will appear here after processing and publishing.
      </p>

      {onUploadClick && (
        <button
          type="button"
          className="btn btn-primary btn-empty-cta"
          onClick={onUploadClick}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span>Upload Technical Document</span>
        </button>
      )}
    </div>
  );
}
