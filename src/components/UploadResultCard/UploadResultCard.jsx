import React, { useState } from 'react';
import './UploadResultCard.css';
import { formatBytes, copyToClipboard } from '../../utils/helpers';
import { STATUS_MAPPING, UPLOAD_STAGES, FUNCTION_5_LABELS } from '../../utils/constants';
import SpikraDotBorderButton from '../ui/SpikraDotBorderButton';

export default function UploadResultCard({
  uploadResult,
  processResult,
  analysisResult,
  experienceResult,
  deploymentResult = null,
  stage = UPLOAD_STAGES.AI_ANALYZED,
  isGenerating = false,
  generationError = null,
  isDeploying = false,
  deployError = null,
  businessLogoFile = null,
  businessLogoPreview = null,
  onGenerateExperience,
  onDeployExperience,
  onUploadAnother
}) {
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  if (!uploadResult) return null;

  const businessName = uploadResult?.businessName || deploymentResult?.businessName || '';
  const projectName = uploadResult?.projectName || '';
  const fileName = uploadResult?.fileName || '';
  const fileSize = uploadResult?.fileSize || null;
  const projectId = uploadResult?.projectId || deploymentResult?.projectId || '';
  const documentId = uploadResult?.documentId || deploymentResult?.documentId || '';

  // Business logo details
  const logoInfo = uploadResult?.businessLogo || null;
  const hasLogo = Boolean(businessLogoPreview || logoInfo?.uploaded || businessLogoFile);
  const logoName = logoInfo?.fileName || businessLogoFile?.name || '';
  const logoSize = logoInfo?.fileSize || businessLogoFile?.size || 0;

  const uploadJobId = processResult?.jobId || uploadResult?.jobId || '';
  const aiJobId = analysisResult?.jobId || '';
  const experienceId = experienceResult?.experienceId || deploymentResult?.experienceId || '';

  const contentObjectKey = experienceResult?.contentObjectKey || '';
  const generatedFiles = experienceResult?.files || [
    'index.html',
    'styles.css',
    'script.js',
    'experience.json'
  ];

  // Function 5 Slate deployment attributes
  const generatedUrl = (deploymentResult?.generatedUrl || deploymentResult?.generated_url || '').trim();
  const slateAppId = deploymentResult?.slateAppId || deploymentResult?.slate_app_id || '';
  const slateDeploymentId = deploymentResult?.slateDeploymentId || deploymentResult?.slate_deployment_id || '';

  // Determine stage flags
  const isPublished = stage === UPLOAD_STAGES.PUBLISHED && Boolean(generatedUrl);
  const isDeployInProgress = stage === UPLOAD_STAGES.DEPLOYING && deploymentResult?.status === 'DEPLOYING';
  const isDeployActive = stage === UPLOAD_STAGES.DEPLOYING || isDeploying;
  const isDeployFailed = Boolean(deployError);
  const isGenerated = Boolean(experienceResult?.status === 'GENERATED' || experienceId);
  const isGenerationFailed = stage === UPLOAD_STAGES.FAILED && !isDeployFailed && Boolean(generationError);
  const isAiFailed = analysisResult?.success === false;
  const isExtractFailed = processResult?.success === false;
  const isFailed = isAiFailed || isExtractFailed || isGenerationFailed || isDeployFailed;

  // Header Title, Caption & Status Pill Label
  let mainHeading = 'AI Analysis Completed Successfully';
  let subCaption = 'Discovery requirements analyzed successfully. Ready to generate customer experience.';
  let mappedStatusText = STATUS_MAPPING.AI_ANALYZED;

  if (isPublished) {
    mainHeading = `Customer experience for ${businessName || 'Client'}`;
    subCaption = 'Customer proposal experience published to Zoho Slate and ready to share.';
    mappedStatusText = FUNCTION_5_LABELS.PUBLISHED;
  } else if (isDeployInProgress) {
    mainHeading = `Customer experience for ${businessName || 'Client'}`;
    subCaption = 'Slate accepted the deployment. The experience is still being built.';
    mappedStatusText = FUNCTION_5_LABELS.IN_PROGRESS;
  } else if (isDeployActive) {
    mainHeading = 'Publishing Customer Experience to Slate...';
    subCaption = `Deploying generated interactive proposal for ${businessName || 'Client'} to Zoho Slate hosting.`;
    mappedStatusText = FUNCTION_5_LABELS.DEPLOYING;
  } else if (isDeployFailed) {
    mainHeading = 'The experience was generated, but it could not be published to Slate.';
    subCaption = deployError || 'Customer experience publication failed. Please try again.';
    mappedStatusText = FUNCTION_5_LABELS.FAILED;
  } else if (isGenerated) {
    mainHeading = 'Customer experience generated';
    subCaption = 'Customer-facing interface created from document content, extracted text, and AI analysis. Stored securely in Stratus.';
    mappedStatusText = FUNCTION_5_LABELS.READY_TO_PUBLISH;
  } else if (isGenerationFailed) {
    mainHeading = 'The document was analyzed, but the customer experience could not be generated.';
    subCaption = generationError || 'Experience generation encountered a server or network failure. You can retry the generation below.';
    mappedStatusText = STATUS_MAPPING.FAILED;
  } else if (isAiFailed) {
    mainHeading = 'Document text was extracted, but AI analysis failed.';
    subCaption = analysisResult?.message || 'Document analysis failed.';
    mappedStatusText = STATUS_MAPPING.FAILED;
  } else if (isExtractFailed) {
    mainHeading = 'Document processing failed.';
    subCaption = processResult?.message || 'Text extraction could not complete.';
    mappedStatusText = STATUS_MAPPING.FAILED;
  }

  const handleCopyKey = async () => {
    if (!contentObjectKey) return;
    const ok = await copyToClipboard(contentObjectKey);
    if (ok) {
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2500);
    }
  };

  const handleCopyUrl = async () => {
    if (!generatedUrl) return;
    const ok = await copyToClipboard(generatedUrl);
    if (ok) {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    }
  };

  const handleOpenExperience = () => {
    if (!generatedUrl) return;
    window.open(generatedUrl, '_blank', 'noopener,noreferrer');
  };

  const handleGenerateClick = () => {
    if (isGenerating || !onGenerateExperience) return;
    onGenerateExperience();
  };

  const handleDeployClick = () => {
    if (isDeployActive || !onDeployExperience) return;
    // Pre-flight checks
    if (!projectId || !documentId || !experienceId || !businessName || experienceResult?.status !== 'GENERATED') {
      return;
    }
    onDeployExperience();
  };

  const canDeploy = Boolean(
    projectId &&
    documentId &&
    experienceId &&
    businessName &&
    experienceResult?.status === 'GENERATED' &&
    !isDeployActive &&
    !isGenerating
  );

  return (
    <div
      className={`compact-success-card animate-fade-in ${isFailed ? 'card-failed' : ''} ${isPublished ? 'card-published' : isGenerated ? 'card-generated' : ''}`}
      aria-labelledby="upload-success-title"
    >
      {/* Top Header: Confirmation */}
      <div className="success-header-row">
        <div className={`success-icon-badge ${isFailed ? 'badge-error' : isPublished ? 'badge-published' : isGenerated ? 'badge-generated' : ''}`}>
          {isFailed ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          ) : isPublished ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          ) : isGenerated ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>

        <div className="success-title-column">
          <div className="success-main-heading" id="upload-success-title">
            {mainHeading}
          </div>
          <div className="success-sub-caption">
            {subCaption}
          </div>
        </div>

        <div className={`status-pill-emerald ${isFailed ? 'pill-failed' : isPublished ? 'pill-published' : isDeployActive || isDeployInProgress ? 'pill-deploying' : isGenerated ? 'pill-generated' : ''}`}>
          <span className={isFailed ? 'static-red-dot' : isDeployActive || isDeployInProgress ? 'pulsing-orange-dot' : 'pulsing-emerald-dot'}></span>
          <span>{mappedStatusText}</span>
        </div>
      </div>

      {/* Real Details Summary Grid */}
      <div className="success-summary-box">
        <div className="summary-col">
          <span className="summary-label">Target Client</span>
          <span className="summary-value highlight-client" title={businessName}>
            {businessName || '—'}
          </span>
        </div>

        <div className="summary-col">
          <span className="summary-label">Project Title</span>
          <span className="summary-value" title={projectName}>
            {projectName || '—'}
          </span>
        </div>

        <div className="summary-col">
          <span className="summary-label">Document Ingested</span>
          <div className="summary-doc-pill" title={fileName}>
            <span className="pdf-tag">PDF</span>
            <span className="doc-name">{fileName}</span>
            {fileSize ? <span className="doc-size">({formatBytes(fileSize)})</span> : null}
          </div>
        </div>

        {/* Business Logo Summary Column */}
        <div className="summary-col">
          <span className="summary-label">Business Logo</span>
          {hasLogo ? (
            <div className="summary-logo-pill">
              {businessLogoPreview ? (
                <img
                  src={businessLogoPreview}
                  alt={businessName ? `${businessName} logo preview` : 'Business logo preview'}
                  className="summary-logo-thumb"
                />
              ) : (
                <span className="summary-logo-icon">🖼️</span>
              )}
              <div className="summary-logo-meta">
                <span className="logo-doc-name" title={logoName || 'Business Logo'}>
                  {logoName || 'Logo uploaded'}
                </span>
                {logoSize ? (
                  <span className="logo-doc-size">({formatBytes(logoSize)})</span>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="summary-logo-pill muted">
              <span className="logo-not-provided-text">No logo provided</span>
            </div>
          )}
        </div>
      </div>

      {/* IN-PROGRESS SLATE DEPLOYMENT BANNER */}
      {isDeployInProgress && (
        <div className="deployment-notice-banner banner-in-progress animate-fade-in" role="status">
          <div className="banner-icon-area">
            <span className="spinning-ring"></span>
          </div>
          <div className="banner-text-area">
            <span className="banner-title">Slate deployment is in progress</span>
            <span className="banner-desc">Slate accepted the deployment. The experience is still being built.</span>
          </div>
        </div>
      )}

      {/* FUNCTION 5 DEPLOYMENT ERROR BANNER */}
      {isDeployFailed && (
        <div className="deployment-notice-banner banner-failed animate-fade-in" role="alert">
          <div className="banner-icon-area">⚠️</div>
          <div className="banner-text-area">
            <span className="banner-title">The experience was generated, but it could not be published to Slate.</span>
            <span className="banner-desc">{deployError}</span>
          </div>
        </div>
      )}

      {/* FUNCTION 5 PUBLISHED EXPERIENCE RESULT PANEL */}
      {isPublished && generatedUrl && (
        <div className="experience-published-panel animate-fade-in">
          <div className="published-panel-header">
            <div className="published-badge-title">
              <span className="published-globe-icon">🌐</span>
              <div>
                <h4 className="published-h4">Customer experience for {businessName}</h4>
                <span className="published-subtitle">Live Interactive Proposal on Zoho Slate</span>
              </div>
            </div>
            <div className="badge-live-published">
              <span className="pulse-dot-green"></span>
              <span>Status: PUBLISHED</span>
            </div>
          </div>

          {/* Live Slate URL Container */}
          <div className="published-url-box">
            <span className="published-url-label">Live Customer Proposal URL</span>
            <div className="url-action-bar">
              <a
                href={generatedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="live-slate-link"
                title={generatedUrl}
              >
                {generatedUrl}
              </a>
              <button
                type="button"
                className="btn-copy-live-url"
                onClick={handleCopyUrl}
                title="Copy live Slate URL"
              >
                {copiedUrl ? '✓ Copied' : 'Copy Link'}
              </button>
            </div>
          </div>

          {/* Quick Action Buttons inside Panel */}
          <div className="published-actions-row">
            <button
              type="button"
              className="btn btn-open-experience"
              onClick={handleOpenExperience}
              disabled={!generatedUrl}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                <polyline points="15 3 21 3 21 9"></polyline>
                <line x1="10" y1="14" x2="21" y2="3"></line>
              </svg>
              <span>Open Experience</span>
            </button>

            <button
              type="button"
              className="btn btn-copy-experience"
              onClick={handleCopyUrl}
              disabled={!generatedUrl}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>{copiedUrl ? 'Copied to Clipboard!' : 'Copy Link'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Action & Status Footer */}
      <div className="success-footer-actions">
        <div className={`next-stage-badge ${isPublished ? 'stage-published' : isGenerated ? 'stage-done' : !isFailed && analysisResult?.success ? 'ready-generation' : ''}`}>
          <span className="stage-dot"></span>
          <span>
            {isPublished
              ? 'Customer proposal published'
              : isDeployActive
              ? 'Publishing to Slate'
              : isDeployFailed
              ? 'Customer experience publication failed'
              : isGenerated
              ? 'Customer experience generated'
              : isGenerationFailed
              ? 'AI analysis completed • Generation failed'
              : !isFailed && analysisResult?.success
              ? 'Ready for proposal generation'
              : 'Processing in progress'}
          </span>
        </div>

        <div className="footer-action-buttons">
          {/* FUNCTION 5 PUBLISH CUSTOMER EXPERIENCE BUTTON (Shown after F4 GENERATED and not yet PUBLISHED) */}
          {isGenerated && !isPublished && (
            <SpikraDotBorderButton
              as="button"
              type="button"
              theme="blue"
              onClick={handleDeployClick}
              disabled={!canDeploy}
              title={
                !canDeploy
                  ? 'All prerequisites (project ID, document ID, experience ID, business name) must be present.'
                  : 'Deploy the customer proposal to Zoho Slate'
              }
            >
              {isDeployActive ? (
                <>
                  <span className="btn-spinner-icon"></span>
                  <span>Publishing customer experience to Slate...</span>
                </>
              ) : isDeployFailed ? (
                <>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
                  </svg>
                  <span>Retry Slate Deployment</span>
                </>
              ) : (
                <>
                  <span className="btn-rocket">🚀</span>
                  <span>Publish Customer Experience</span>
                </>
              )}
            </SpikraDotBorderButton>
          )}

          {/* FUNCTION 5 PUBLISHED ACTIONS: OPEN & COPY */}
          {isPublished && generatedUrl && (
            <>
              <button
                type="button"
                className="btn btn-primary btn-open-exp-footer"
                onClick={handleOpenExperience}
                disabled={!generatedUrl}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <line x1="10" y1="14" x2="21" y2="3"></line>
                </svg>
                <span>Open Experience</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-copy-exp-footer"
                onClick={handleCopyUrl}
                disabled={!generatedUrl}
              >
                <span>{copiedUrl ? '✓ Link Copied' : 'Copy Link'}</span>
              </button>
            </>
          )}

          {/* Retry Generation Button if F4 failed */}
          {isGenerationFailed && (
            <SpikraDotBorderButton
              as="button"
              type="button"
              theme="orange"
              onClick={handleGenerateClick}
              disabled={isGenerating}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
              </svg>
              <span>{isGenerating ? 'Creating experience...' : 'Retry Experience Generation'}</span>
            </SpikraDotBorderButton>
          )}

          {/* Generate Experience CTA if AI analysis completed and not yet generated */}
          {!isGenerated && !isGenerationFailed && !isFailed && analysisResult?.success && (
            <SpikraDotBorderButton
              as="button"
              type="button"
              theme="orange"
              onClick={handleGenerateClick}
              disabled={isGenerating || !projectId || !documentId}
            >
              <span className="btn-lightning">⚡</span>
              <span>{isGenerating ? 'Creating customer experience...' : 'Generate Customer Experience'}</span>
            </SpikraDotBorderButton>
          )}

          {/* Upload Another Document */}
          <button
            type="button"
            className={`btn ${isPublished || isGenerated ? 'btn-secondary' : 'btn-outline'} btn-upload-another`}
            onClick={onUploadAnother}
            disabled={isGenerating || isDeployActive}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Upload Another Document</span>
          </button>
        </div>
      </div>
    </div>
  );
}

