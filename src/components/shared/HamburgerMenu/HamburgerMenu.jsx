import React from 'react';
import './HamburgerMenu.css';
import { motion } from 'framer-motion';

export default function HamburgerMenu({
  isOpen,
  onClick,
  label = 'Workspace',
  showLabel = true,
  ariaLabel = 'Toggle navigation sidebar'
}) {
  return (
    <button
      type="button"
      className={`spikra-hamburger-btn ${isOpen ? 'is-active' : ''}`}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-expanded={isOpen}
      title={isOpen ? 'Collapse navigation sidebar' : 'Open navigation sidebar'}
    >
      <div className="hamburger-icon-box">
        <span className="hamburger-bar top-bar" />
        <span className="hamburger-bar middle-bar" />
        <span className="hamburger-bar bottom-bar" />
      </div>
      {showLabel && (
        <div className="hamburger-label-group">
          <span className="hamburger-label-text">{label}</span>
          <svg
            className={`hamburger-chevron ${isOpen ? 'rotated' : ''}`}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      )}
    </button>
  );
}
