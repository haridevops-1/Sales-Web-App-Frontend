import React, { useState, useEffect, useRef, useCallback } from 'react';
import './ProcessStatus.css';
import { getProcessStatus } from '@/api/catalystApi';
import { copyToClipboard, formatProposalUrl } from '@/utils/helpers';
import SpotlightCard from '@/reactbits/SpotlightCard';
import { motion } from 'framer-motion';
import { 
  ExternalLink, 
  Copy, 
  Check, 
  Building2, 
  Plus, 
  Globe, 
  Link2, 
  FileCheck2,
  RotateCcw,
  Eye,
  EyeOff
} from 'lucide-react';
import CustomerExperiencePreview from '../CustomerExperiencePreview/CustomerExperiencePreview';

const formatCleanText = (text) => {
  if (!text || typeof text !== 'string') return '';
  let clean = text.replace(/~\d+/g, '').trim();
  clean = clean.replace(/\bImplemenation\b/gi, 'Implementation');
  return clean;
};

const containerVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.16, 1, 0.3, 1],
      staggerChildren: 0.08
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: 'easeOut' }
  }
};

/**
 * Dedicated, Neat & Clean Customer Proposal Completion Component.
 * Presents the final live proposal with direct clickable link, copy button,
 * and Spikra brand theme for sales reps.
 */
export default function ProcessStatus({
  projectId,
  project_id,
  documentId,
  document_id,
  experienceId,
  experience_id,
  businessName = '',
  projectName = '',
  experienceTitle = '',
  generatedUrl: propGeneratedUrl = '',
  businessLogoPreview = null,
  businessLogoFile = null,
  analysisData = null,
  onPublished = null,
  onError = null,
  onStageChange = null,
  onUploadAnother = null
}) {
  const actualProjectId = String(projectId || project_id || '').trim();
  const actualDocumentId = String(documentId || document_id || '').trim();
  const actualExperienceId = String(experienceId || experience_id || '').trim();

  const [statusData, setStatusData] = useState(null);
  const [currentStage, setCurrentStage] = useState(propGeneratedUrl ? 'PUBLISHED' : 'DEPLOYING');
  const [fetchError, setFetchError] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [showDocumentUI, setShowDocumentUI] = useState(false);

  const isMountedRef = useRef(true);
  const timerRef = useRef(null);
  const isFetchingRef = useRef(false);
  const hasPublishedRef = useRef(Boolean(propGeneratedUrl));
  const isPollingRef = useRef(!propGeneratedUrl);

  // Clean business and project names
  const rawBiz = statusData?.project?.business_name || businessName || 'Business Client';
  const displayBusinessName = formatCleanText(rawBiz) || 'Business Client';
  const rawProj = statusData?.experience?.experience_title || experienceTitle || statusData?.project?.project_name || projectName || 'Customer Proposal';
  const displayProjectName = formatCleanText(rawProj) || 'Customer Proposal';
  const rawUrl = (propGeneratedUrl || statusData?.experience?.generated_url || '').trim();
  const generatedUrl = formatProposalUrl(rawUrl, actualExperienceId);

  const pollProcessStatus = useCallback(async () => {
    if (!isMountedRef.current || isFetchingRef.current || !isPollingRef.current) {
      return;
    }

    if (!actualProjectId) {
      return;
    }

    isFetchingRef.current = true;

    try {
      const response = await getProcessStatus({
        projectId: actualProjectId,
        documentId: actualDocumentId,
        experienceId: actualExperienceId
      });

      if (!isMountedRef.current) return;

      setStatusData(response);
      setFetchError(null);

      const stage = String(response.current_stage || '').toUpperCase();
      setCurrentStage(stage);

      if (onStageChange) {
        onStageChange(stage, response);
      }

      if (stage === 'PUBLISHED' || response?.experience?.generated_url) {
        isPollingRef.current = false;
        if (onPublished && !hasPublishedRef.current) {
          hasPublishedRef.current = true;
          onPublished(response);
        }
        return;
      }

      if (stage === 'FAILED') {
        isPollingRef.current = false;
        const errMsg = response.error_message || 'Customer experience generation could not be completed.';
        setFetchError(errMsg);
        if (onError) onError(errMsg);
        return;
      }
    } catch (err) {
      if (!isMountedRef.current) return;
      console.warn('[ProcessStatus] Status poll notice:', err.message);
    } finally {
      isFetchingRef.current = false;
    }
  }, [actualProjectId, actualDocumentId, actualExperienceId, onPublished, onError, onStageChange]);

  useEffect(() => {
    if (propGeneratedUrl) {
      setCurrentStage('PUBLISHED');
      return;
    }

    isMountedRef.current = true;
    isPollingRef.current = true;

    pollProcessStatus();

    timerRef.current = setInterval(() => {
      pollProcessStatus();
    }, 2500);

    return () => {
      isMountedRef.current = false;
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [actualProjectId, actualDocumentId, actualExperienceId, propGeneratedUrl, pollProcessStatus]);

  const handleCopyUrl = async () => {
    if (!generatedUrl) return;
    const ok = await copyToClipboard(generatedUrl);
    if (ok) {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    }
  };

  const handleOpenExperience = () => {
    if (generatedUrl) {
      window.open(generatedUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleRetry = () => {
    setFetchError(null);
    isPollingRef.current = true;
    setCurrentStage('DEPLOYING');
    pollProcessStatus();
  };

  const isPublished = currentStage === 'PUBLISHED' || Boolean(generatedUrl);
  const isFailed = currentStage === 'FAILED' && !isPublished;

  return (
    <SpotlightCard
      className="spikra-completion-spotlight-wrap"
      spotlightColor="rgba(0, 82, 255, 0.08)"
    >
      <div className="clean-status-card">
        {/* Top Continuous Shimmer Accent Bar (Spikra Navy -> Spikra Blue -> Flame Orange -> Amber) */}
        <div className="status-card-accent-bar" />
        {/* Ambient Subtle Glow */}
        <div className="status-card-glow-mesh" />

        {/* 1. PUBLISHED STATE: Clean executive card with official Spikra branding */}
        {isPublished && generatedUrl ? (
          <motion.div
            className="clean-result-container"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Header: Clean, modern status and headline (No security guard logo) */}
            <motion.div className="clean-result-header" variants={itemVariants}>
              <div className="clean-header-text">
                <div className="clean-status-pill-row">
                  <span className="clean-status-tag">
                    <span className="clean-tag-dot-wrapper">
                      <span className="clean-tag-dot-ping" />
                      <span className="clean-tag-dot" />
                    </span>
                    <span>LIVE & CLIENT READY</span>
                  </span>
                </div>
                <h3 className="clean-title">
                  Customer Proposal <span className="title-orange-accent">Ready</span>
                </h3>
                <p className="clean-subtitle">
                  The interactive proposal experience has been generated and is ready to share with your client.
                </p>
              </div>
            </motion.div>

            {/* Basic Document & Business Info: Two Distinct Executive Cards */}
            <motion.div className="clean-info-grid" variants={itemVariants}>
              <div className="clean-info-card">
                <div className="clean-info-card-header">
                  <Building2 size={15} className="clean-info-icon-navy" />
                  <span className="clean-info-label">Client Account</span>
                </div>
                <div className="clean-info-biz-row">
                  {businessLogoPreview ? (
                    <img
                      src={businessLogoPreview}
                      alt={displayBusinessName}
                      className="clean-info-biz-logo"
                    />
                  ) : (
                    <div className="clean-info-biz-avatar">
                      {displayBusinessName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <strong className="clean-info-value" title={displayBusinessName}>
                    {displayBusinessName}
                  </strong>
                </div>
              </div>

              <div className="clean-info-card">
                <div className="clean-info-card-header">
                  <FileCheck2 size={15} className="clean-info-icon-orange" />
                  <span className="clean-info-label">Proposal Scope</span>
                </div>
                <div className="clean-info-title-row">
                  <strong className="clean-info-value" title={displayProjectName}>
                    {displayProjectName}
                  </strong>
                </div>
              </div>
            </motion.div>

            {/* Interactive Clickable Link Console */}
            <motion.div className="clean-link-section" variants={itemVariants}>
              <div className="clean-link-header-row">
                <label className="clean-link-label" htmlFor="created-proposal-link">
                  <Globe size={15} className="clean-link-label-icon" />
                  <span>Generated Proposal Link</span>
                </label>
                <span className="clean-link-hint">Click link below to open directly in your browser</span>
              </div>
              <div className="clean-link-input-group">
                <div className="clean-link-icon-tile">
                  <Link2 size={16} />
                </div>
                {/* Direct Clickable Anchor Tag for Sales Reps */}
                <a
                  id="created-proposal-link"
                  href={generatedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="clean-proposal-link-anchor"
                  title="Click to view proposal experience in a new tab"
                >
                  <span className="clean-link-text">{generatedUrl}</span>
                  <ExternalLink size={14} className="clean-link-external-hint" />
                </a>

                <motion.button
                  type="button"
                  className={`btn-clean-copy ${copiedUrl ? 'copied' : ''}`}
                  onClick={handleCopyUrl}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  title="Copy link to clipboard"
                >
                  {copiedUrl ? (
                    <>
                      <Check size={14} className="text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>Copy Link</span>
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>

            {/* Action Buttons Row: Proper High-Contrast Laser-Beamed View Button + Secondary CTA */}
            <motion.div className="clean-actions-row" variants={itemVariants}>
              <motion.button
                type="button"
                className="btn-view-experience-proper"
                onClick={handleOpenExperience}
                whileTap={{ scale: 0.98 }}
                title="Open interactive proposal in a new browser tab"
              >
                {/* Crisp 360° Rotating Border Beam along the 12px border path */}
                <span className="btn-beam-track" aria-hidden="true">
                  <span className="btn-beam-rotator" />
                </span>

                {/* Subtle Specular Surface Light Sweep */}
                <span className="btn-shimmer-sweep" aria-hidden="true" />

                {/* Button Content with Smooth Icon Slide */}
                <span className="btn-content-wrap">
                  <span>View Generated Proposal</span>
                  <ExternalLink size={16} className="btn-external-icon" />
                </span>
              </motion.button>

              <motion.button
                type="button"
                className="btn-preview-minimal-ui"
                onClick={() => setShowDocumentUI((prev) => !prev)}
                whileHover={{ y: -2 }}
                whileTap={{ y: 0, scale: 0.98 }}
                title="Toggle inline minimal proposal UI for the uploaded document"
              >
                {showDocumentUI ? <EyeOff size={16} /> : <Eye size={16} />}
                <span>{showDocumentUI ? 'Hide Document UI' : 'Preview Minimal UI'}</span>
              </motion.button>

              {onUploadAnother && (
                <motion.button
                  type="button"
                  className="btn-secondary-create-another"
                  onClick={onUploadAnother}
                  whileHover={{ y: -2 }}
                  whileTap={{ y: 0, scale: 0.98 }}
                >
                  <Plus size={16} className="btn-plus-icon" />
                  <span>Create Another Proposal</span>
                </motion.button>
              )}
            </motion.div>

            {/* In-App Minimal Proposal UI for the Uploaded Document */}
            {showDocumentUI && (
              <motion.div
                className="document-minimal-preview-wrapper"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <div className="document-minimal-preview-banner">
                  <div className="preview-banner-left">
                    <span className="preview-live-dot" />
                    <strong>Uploaded Document Minimal UI</strong>
                    <span className="preview-sep">•</span>
                    <span>{displayBusinessName}</span>
                  </div>
                  <button
                    type="button"
                    className="btn-close-minimal-ui"
                    onClick={() => setShowDocumentUI(false)}
                    aria-label="Close minimal UI preview"
                  >
                    ✕ Close
                  </button>
                </div>
                <div className="document-minimal-preview-body">
                  <CustomerExperiencePreview
                    businessName={displayBusinessName}
                    projectName={displayProjectName}
                    experienceTitle={displayProjectName}
                    businessLogoPreview={businessLogoPreview}
                    businessLogoFile={businessLogoFile}
                    status={currentStage === 'PUBLISHED' ? 'PUBLISHED' : 'GENERATED'}
                    generatedUrl={generatedUrl}
                    analysisData={analysisData}
                  />
                </div>
              </motion.div>
            )}
          </motion.div>
        ) : isFailed ? (
          /* 2. FAILED STATE */
          <div className="clean-failed-container animate-fade-in">
            <div className="clean-failed-header">
              <span className="clean-failed-icon">⚠️</span>
              <div>
                <h3 className="clean-title">Unable to Generate Proposal</h3>
                <p className="clean-subtitle">
                  {fetchError || 'An error occurred while creating the proposal. Please try again.'}
                </p>
              </div>
            </div>

            <div className="clean-actions-row">
              <button
                type="button"
                className="btn-primary-view-proposal"
                onClick={handleRetry}
              >
                <RotateCcw size={15} />
                <span>Retry Generation</span>
              </button>
              {onUploadAnother && (
                <button
                  type="button"
                  className="btn-secondary-create-another"
                  onClick={onUploadAnother}
                >
                  <Plus size={15} />
                  <span>Upload Another Document</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          /* 3. IN-PROGRESS STATE */
          <div className="clean-loading-container animate-fade-in">
            <div className="spinner-orange-glow">
              <div className="spinner-center-dot"></div>
            </div>
            <div className="clean-loading-text">
              <h3 className="clean-loading-title">Generating Customer Experience...</h3>
              <p className="clean-loading-desc">
                Preparing proposal for <strong>{displayBusinessName}</strong>.
              </p>
            </div>
          </div>
        )}
      </div>
    </SpotlightCard>
  );
}
