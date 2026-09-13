import React from 'react';
import './BrandLogo.css';
import { BorderBeam } from '@/components/ui/border-beam-search';
import spikraLogoImg from '../../assets/brand/spikra-logo.png';

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
          src={spikraLogoImg}
          alt="Spikra Emblem"
          className="spikra-logo-img"
        />
      </div>

      <div className="logo-text-group">
        <div className="logo-wordmark-row">
          <span className="logo-name">Spikra</span>
          <BorderBeam size="line" colorVariant="sunset" duration={3.5} borderRadius={6} className="logo-partner-beam">
            <span className="logo-partner-pill">Zoho Premium Partner</span>
          </BorderBeam>
        </div>
        {showSubtitle && (
          <span className="logo-subtitle">Customer Experience Engine</span>
        )}
      </div>
    </div>
  );
}
