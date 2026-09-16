import React, { useState } from 'react';
import './DiscoveryUploadCard.css';
import { FolderOpen, ExternalLink, CheckCircle2, RefreshCcw, Layers, ArrowRight, Building2, User } from 'lucide-react';
import SpotlightCard from '@/reactbits/SpotlightCard';
import GlareHover from '@/reactbits/GlareHover';
import BlurText from '@/reactbits/BlurText';

// Real Zoho WorkDrive entry point — sales reps upload the discovery folder/files
// there directly rather than through a local browser file picker.
const WORKDRIVE_URL = 'https://workdrive.zoho.com/';

export default function DiscoveryUploadCard({ onContinue, disabled = false }) {
  const [hasOpenedWorkDrive, setHasOpenedWorkDrive] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [customerName, setCustomerName] = useState('');

  const handleOpenWorkDrive = () => {
    if (disabled) return;
    window.open(WORKDRIVE_URL, '_blank', 'noopener,noreferrer');
    setHasOpenedWorkDrive(true);
  };

  const canContinue = hasOpenedWorkDrive && businessName.trim() && customerName.trim();

  const handleContinue = () => {
    if (!canContinue || disabled) return;
    if (onContinue) {
      onContinue({
        businessName: businessName.trim(),
        customerName: customerName.trim()
      });
    }
  };

  return (
    <SpotlightCard className="discovery-upload-card" spotlightColor="rgba(255, 107, 0, 0.1)">
      <div className="discovery-upload-inner">
        <GlareHover className="discovery-glare-wrap">
          <div className={`discovery-dropzone ${hasOpenedWorkDrive ? 'has-selection' : ''} ${disabled ? 'disabled' : ''}`}>
            {hasOpenedWorkDrive ? (
              <div className="discovery-workdrive-confirmed animate-fade-in">
                <div className="discovery-confirmed-icon">
                  <CheckCircle2 size={26} />
                </div>
                <h3 className="discovery-dropzone-title">Zoho WorkDrive opened</h3>
                <p className="discovery-dropzone-hint">
                  Upload the discovery folder or files there, then fill in the details
                  below and continue.
                </p>
                {!disabled && (
                  <button
                    type="button"
                    className="btn-reopen-workdrive"
                    onClick={handleOpenWorkDrive}
                  >
                    <RefreshCcw size={13} />
                    <span>Reopen Zoho WorkDrive</span>
                  </button>
                )}
              </div>
            ) : (
              <>
                <div className="discovery-dropzone-icon">
                  <FolderOpen size={28} />
                </div>
                <h3 className="discovery-dropzone-title">
                  <BlurText text="Upload Discovery Package" delay={45} animateBy="words" />
                </h3>
                <p className="discovery-dropzone-hint">
                  Upload a discovery folder or files directly in Zoho WorkDrive.
                </p>

                <div className="discovery-browse-actions">
                  <button
                    type="button"
                    className="btn-open-workdrive"
                    onClick={handleOpenWorkDrive}
                    disabled={disabled}
                  >
                    <ExternalLink size={15} />
                    <span>Open Zoho WorkDrive</span>
                  </button>
                </div>

                <p className="discovery-supported-types">
                  Email &bull; Documents &bull; Meeting Recordings &bull; Excel
                </p>
              </>
            )}
          </div>
        </GlareHover>

        {hasOpenedWorkDrive && (
          <div className="discovery-details-form animate-fade-in">
            <div className="discovery-field">
              <label className="discovery-field-label" htmlFor="discovery-business-name">
                Business Name <span className="discovery-req-asterisk">*</span>
              </label>
              <div className="discovery-field-input-wrap">
                <Building2 size={15} className="discovery-field-icon" />
                <input
                  id="discovery-business-name"
                  type="text"
                  className="discovery-field-input"
                  placeholder="e.g. Spikra Pvt Ltd"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  disabled={disabled}
                  maxLength={100}
                />
              </div>
            </div>

            <div className="discovery-field">
              <label className="discovery-field-label" htmlFor="discovery-customer-name">
                Client / Customer Name <span className="discovery-req-asterisk">*</span>
              </label>
              <div className="discovery-field-input-wrap">
                <User size={15} className="discovery-field-icon" />
                <input
                  id="discovery-customer-name"
                  type="text"
                  className="discovery-field-input"
                  placeholder="e.g. Apex Global Logistics"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  disabled={disabled}
                  maxLength={100}
                />
              </div>
            </div>
          </div>
        )}

        <div className="discovery-note-row">
          <Layers size={15} className="discovery-note-icon" />
          <span>We'll organize the contents of your discovery package to help structure the proposal.</span>
        </div>

        <div className="discovery-footer-row">
          <button
            type="button"
            className="btn-discovery-continue"
            onClick={handleContinue}
            disabled={!canContinue || disabled}
          >
            <span>Continue</span>
            <ArrowRight size={16} strokeWidth={2.4} />
          </button>
        </div>
      </div>
    </SpotlightCard>
  );
}
