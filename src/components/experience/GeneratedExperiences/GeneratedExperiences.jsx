import React, { useState } from 'react';
import './GeneratedExperiences.css';
import { formatDate, copyToClipboard, formatProposalUrl } from '@/utils/helpers';
import { ExternalLink } from 'lucide-react';
import { ShinyButton } from '@/components/ui/shiny-button';

export default function GeneratedExperiences({
  experiences = [],
  isLoading = false,
  error = null,
  onRefresh = null,
  onOpenUpload = null
}) {
  const [copiedId, setCopiedId] = useState(null);

  const handleCopyLink = async (id, url) => {
    const targetUrl = formatProposalUrl(url, id);
    if (!targetUrl) return;
    const ok = await copyToClipboard(targetUrl);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    }
  };

  const handleOpenExperience = (url, id = '') => {
    const targetUrl = formatProposalUrl(url, id);
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const totalCount = experiences.length;
  const publishedCount = experiences.filter(
    (e) => (e.status || '').toUpperCase() === 'PUBLISHED' && Boolean(e.generated_url || e.generatedUrl)
  ).length;

  return (
    <section className="generated-experiences-section" aria-labelledby="gen-exp-heading">
      <div className="container">
        {/* Section Top Header Row */}
        <div className="gen-exp-header-row">
          <div className="gen-exp-title-area">
            <div className="gen-exp-badge-pill">
              <span className="live-dot-pulse"></span>
              <span>Customer Proposals</span>
            </div>
            <h2 id="gen-exp-heading" className="gen-exp-main-title">
              Generated Customer Showcases
            </h2>
            <p className="gen-exp-subtitle">
              Live interactive proposal showcases retrieved dynamically from the Spikra serverless backend.
            </p>
          </div>

          <div className="gen-exp-actions-group">
            {totalCount > 0 && (
              <div className="gen-exp-summary-stats">
                <span className="stat-pill-item">
                  <span className="stat-num">{totalCount}</span> Total
                </span>
                <span className="stat-pill-item published">
                  <span className="stat-num">{publishedCount}</span> Published
                </span>
              </div>
            )}

            {onRefresh && (
              <button
                type="button"
                className="btn-refresh-experiences"
                onClick={onRefresh}
                disabled={isLoading}
                title="Refresh customer experiences from Catalyst backend"
              >
                <span className={`refresh-icon ${isLoading ? 'spinning' : ''}`}>↻</span>
                <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            )}
          </div>
        </div>

        {/* LOADING STATE */}
        {isLoading && experiences.length === 0 ? (
          <div className="gen-exp-loading-card animate-fade-in" role="status">
            <div className="gen-exp-spinner"></div>
            <h3 className="loading-title">Loading customer experiences...</h3>
            <p className="loading-desc">
              Retrieving live customer proposals from Zoho Catalyst serverless backend...
            </p>
          </div>
        ) : error ? (
          /* ERROR STATE */
          <div className="gen-exp-error-card animate-fade-in" role="alert">
            <div className="error-icon-circle">⚠️</div>
            <h3 className="error-card-title">Unable to load customer experiences.</h3>
            <p className="error-card-desc">
              {typeof error === 'string'
                ? error
                : error?.message || 'A network error occurred while communicating with the Catalyst backend.'}
            </p>
            {onRefresh && (
              <button
                type="button"
                className="btn btn-secondary btn-sm retry-btn"
                onClick={onRefresh}
              >
                ↻ Retry Connection
              </button>
            )}
          </div>
        ) : totalCount === 0 ? (
          /* EMPTY STATE */
          <div className="gen-exp-empty-card animate-fade-in">
            <div className="empty-symbol-box">📁</div>
            <h3 className="empty-state-title">No customer experiences have been generated yet.</h3>
            <p className="empty-state-description">
              Upload discovery notes above to generate and publish your first interactive customer experience proposal.
            </p>
            {onOpenUpload && (
              <button
                type="button"
                className="btn btn-primary btn-sm mt-3"
                onClick={onOpenUpload}
              >
                + Upload Technical Document
              </button>
            )}
          </div>
        ) : (
          /* DYNAMIC CARDS GRID */
          <div className="experiences-cards-grid animate-fade-in">
            {experiences.map((exp) => {
              const rawStatus = (exp.status || 'GENERATED').toUpperCase();
              const isPublished = rawStatus === 'PUBLISHED' && Boolean(exp.generated_url || exp.generatedUrl);
              const isFailed = rawStatus === 'FAILED';
              const isGenerating = rawStatus === 'GENERATING';
              const isDeploying = rawStatus === 'DEPLOYING';
              const isQueued = rawStatus === 'QUEUED';
              const isGenerated = rawStatus === 'GENERATED';

              const cardId = exp.experience_id || exp.experienceId || exp.project_id || exp.projectId || String(Math.random());
              const businessName = exp.business_name || exp.businessName || 'Unnamed Business';
              const experienceTitle = exp.experience_title || exp.experienceTitle || `${businessName} — Technical Proposal`;
              const projectName = exp.project_name || exp.projectName || (exp.project_id ? `Project #${exp.project_id}` : 'Technical Proposal');
              const rawGenUrl = (exp.generated_url || exp.generatedUrl || '').trim();
              const generatedUrl = formatProposalUrl(rawGenUrl, cardId);
              const createdDate = exp.published_time || exp.created_time || exp.createdAt || exp.modified_time;
              const errorMessage = exp.error_message || exp.errorMessage;

              // Format human readable status label
              let statusLabel = 'Generated';
              let statusClass = 'generated';

              if (rawStatus === 'PUBLISHED') {
                statusLabel = 'Published';
                statusClass = 'published';
              } else if (rawStatus === 'DEPLOYING') {
                statusLabel = 'Deploying';
                statusClass = 'deploying';
              } else if (rawStatus === 'GENERATING') {
                statusLabel = 'Generating';
                statusClass = 'generating';
              } else if (rawStatus === 'QUEUED') {
                statusLabel = 'Queued';
                statusClass = 'queued';
              } else if (rawStatus === 'FAILED') {
                statusLabel = 'Failed';
                statusClass = 'failed';
              }

              return (
                <article
                  key={cardId}
                  className={`experience-card ${isPublished ? 'card-published' : ''} ${isFailed ? 'card-failed' : ''}`}
                  aria-label={`Customer experience for ${businessName}`}
                >
                  {/* Card Header */}
                  <div className="exp-card-header">
                    <span className="exp-card-biz-name" title={businessName}>
                      {businessName}
                    </span>
                    <span className={`exp-card-status-pill ${statusClass}`}>
                      <span className="status-dot"></span>
                      <span>{statusLabel}</span>
                    </span>
                  </div>

                  {/* Card Title */}
                  <h3 className="exp-card-title" title={experienceTitle}>
                    {experienceTitle}
                  </h3>

                  {/* Meta Information Row */}
                  <div className="exp-card-meta-row">
                    <span className="exp-card-proj">
                      {projectName}
                    </span>
                    {createdDate && (
                      <span className="exp-card-date">• {formatDate(createdDate)}</span>
                    )}
                  </div>

                  {/* Experience URL Display Area */}
                  {isPublished && generatedUrl ? (
                    <div className="exp-card-url-box published">
                      <span className="exp-url-label">Live URL:</span>
                      <a
                        href={generatedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="exp-url-link"
                        title={generatedUrl}
                      >
                        {generatedUrl}
                      </a>
                    </div>
                  ) : isFailed ? (
                    <div className="exp-card-url-box failed">
                      <span className="exp-url-label">Error:</span>
                      <span className="exp-url-error-text" title={errorMessage || 'Deployment failed'}>
                        {errorMessage || 'Generation or deployment failed. Please re-run the process.'}
                      </span>
                    </div>
                  ) : (
                    <div className="exp-card-url-box pending">
                      <span className="exp-url-label">Status:</span>
                      <span className="exp-url-pending-text">
                        {isDeploying
                          ? 'Publishing live proposal experience...'
                          : isGenerating
                          ? 'Generating customer experience proposal...'
                          : isQueued
                          ? 'Preparing proposal experience...'
                          : 'Proposal generated successfully'}
                      </span>
                    </div>
                  )}

                  {/* Actions Buttons */}
                  <div className="exp-card-actions">
                    <ShinyButton
                      type="button"
                      className="btn btn-primary btn-sm flex items-center justify-center gap-1.5"
                      onClick={() => handleOpenExperience(generatedUrl)}
                      disabled={!isPublished || !generatedUrl}
                      title={
                        isPublished && generatedUrl
                          ? 'Open live customer proposal in a new tab'
                          : 'Live proposal URL is not available yet'
                      }
                    >
                      <span className="inline-flex items-center justify-center gap-1.5 font-bold">
                        <ExternalLink size={13} />
                        <span>View Proposal</span>
                      </span>
                    </ShinyButton>

                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleCopyLink(cardId, generatedUrl)}
                      disabled={!isPublished || !generatedUrl}
                      title={
                        isPublished && generatedUrl
                          ? 'Copy live customer experience URL'
                          : 'Live URL cannot be copied until published'
                      }
                    >
                      <span>{copiedId === cardId ? '✓ Copied' : 'Copy Link'}</span>
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
