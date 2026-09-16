import React from 'react';
import './BrandLogo.css';
import spikraSymbol from '@/assets/brand/spikra-symbol.png';

export default function BrandLogo({ showSubtitle = true, theme = 'dark', onClick }) {
  return (
    <div
      className={`spikra-brand-logo ${theme} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label="Spikra Logo"
    >
      <div className="logo-image-container">
        <img
          src={spikraSymbol}
          alt="Spikra"
          className="spikra-logo-symbol-img"
        />
      </div>

      <div className="logo-text-group">
        <div className="logo-wordmark-row">
          <span className="logo-name">SPIKRA</span>
          <span className="logo-partner-pill">Zoho Premium Partner</span>
        </div>
        {showSubtitle && (
          <span className="logo-subtitle">Internal Sales Hub</span>
        )}
      </div>
    </div>
  );
}
