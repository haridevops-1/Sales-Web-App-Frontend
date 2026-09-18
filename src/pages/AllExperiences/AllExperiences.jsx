import React, { useState, useMemo } from 'react';
import './AllExperiences.css';
import { formatDate, copyToClipboard, formatProposalUrl } from '@/utils/helpers';
import CountUp from '../../reactbits/CountUp';
import SpotlightCard from '../../reactbits/SpotlightCard';
import SpinningBorderButton from '@/components/ui/spinning-border-button';
import SpikraExperienceSearch from '../../components/ui/SpikraExperienceSearch';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Copy, Check, ExternalLink, FolderKanban, Plus, UploadCloud, ArrowLeft } from 'lucide-react';

export default function AllExperiences({
  onNavigate,
  experiences = [],
  isLoading = false,
  error = null,
  onRefresh = null
}) {
  const [copiedId, setCopiedId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const totalCount = experiences.length;
  const failedCount = experiences.filter((e) => (e.status || '').toUpperCase() === 'FAILED').length;

  // Filter experiences by any field related to the business
  const filteredExperiences = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return experiences;

    const tokens = query.split(/\s+/).filter(Boolean);

    return experiences.filter((exp) => {
      const rawBiz = exp.business_name || exp.businessName || '';
      const cleanBiz = rawBiz.replace(/~\d+/g, '').trim();
      const expTitle = exp.experience_title || exp.experienceTitle || '';
      const projName = exp.project_name || exp.projectName || '';
      const projId = exp.project_id || exp.projectId ? `Project #${exp.project_id || exp.projectId}` : '';
      const status = exp.status || '';
      const genUrl = exp.generated_url || exp.generatedUrl || '';
      const industry = exp.industry || '';
      const summary = exp.summary || exp.description || '';
      const createdDate = exp.published_time || exp.created_time || exp.createdAt || exp.modified_time || '';

      const searchableText = `${rawBiz} ${cleanBiz} ${expTitle} ${projName} ${projId} ${status} ${genUrl} ${industry} ${summary} ${createdDate}`.toLowerCase();

      return tokens.every((token) => searchableText.includes(token));
    });
  }, [experiences, searchQuery]);

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

  return (
    <div className="all-experiences-page animate-fade-in">
      <div className="container">
        {/* Page Top Header Bar */}
        <div className="archive-top-bar">
          <div className="archive-heading-group">
            <button
              type="button"
              className="btn-back-link"
              onClick={() => onNavigate('generator')}
            >
              <ArrowLeft size={15} className="btn-back-arrow" />
              <span>Back to Upload Document</span>
            </button>
            <h1 className="archive-main-title">All Customer Showcases</h1>
            <p className="archive-subtitle">
              Interactive proposal showcases generated from technical discovery documents.
            </p>
          </div>

          <div className="archive-actions-header">
            <div className="archive-actions-top-row">
              {onRefresh && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onRefresh}
                  disabled={isLoading}
                  title="Refresh customer showcases from Catalyst backend"
                >
                  <span className={isLoading ? 'spinning' : ''}>↻</span>
                  <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
                </button>
              )}

              <SpinningBorderButton
                type="button"
                onClick={() => onNavigate('generator')}
              >
                <Plus size={16} />
                <span>Upload Document</span>
              </SpinningBorderButton>
            </div>

            {/* Live Search Bar positioned directly under the Upload button */}
            <div className="archive-search-container">
              <SpikraExperienceSearch
                value={searchQuery}
                onChange={setSearchQuery}
                onClear={() => setSearchQuery('')}
                placeholder="Search business, proposal, or project..."
                totalCount={totalCount}
                filteredCount={filteredExperiences.length}
              />
            </div>
          </div>
        </div>

        {/* Dynamic Metrics Bar */}
        <div className="archive-stats-row">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <SpotlightCard className="stat-card" spotlightColor="rgba(0, 82, 255, 0.12)">
              <div className="stat-icon blue">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="stat-text">
                <span className="stat-label">Total Proposals</span>
                <span className="stat-value">
                  <CountUp to={totalCount} duration={1.1} separator="" />
                </span>
              </div>
            </SpotlightCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.08 }}
          >
            <SpotlightCard className="stat-card" spotlightColor="rgba(239, 68, 68, 0.12)">
              <div className="stat-icon red">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div className="stat-text">
                <span className="stat-label">Failed</span>
                <span className="stat-value text-danger">
                  <CountUp to={failedCount} duration={1.1} separator="" />
                </span>
              </div>
            </SpotlightCard>
          </motion.div>
        </div>

        {/* LOADING STATE */}
        {isLoading && totalCount === 0 ? (
          <div className="archive-empty-card animate-fade-in">
            <div className="gen-exp-spinner" style={{ margin: '0 auto 1rem' }}></div>
            <h3 className="empty-heading">Loading customer showcases...</h3>
            <p className="empty-text">
              Retrieving live customer proposals from Zoho Catalyst serverless backend...
            </p>
          </div>
        ) : error ? (
          /* ERROR STATE */
          <div className="archive-empty-card animate-fade-in" style={{ borderColor: '#fed7d7', background: '#fff5f5' }}>
            <div className="empty-symbol">⚠️</div>
            <h3 className="empty-heading" style={{ color: '#c53030' }}>Unable to load customer showcases.</h3>
            <p className="empty-text" style={{ color: '#742a2a' }}>
              {typeof error === 'string' ? error : error?.message || 'A network error occurred.'}
            </p>
            {onRefresh && (
              <div className="empty-action-group">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onRefresh}
                >
                  ↻ Retry Connection
                </button>
              </div>
            )}
          </div>
        ) : totalCount > 0 ? (
          filteredExperiences.length > 0 ? (
            <>
              {searchQuery.trim() && (
                <div className="archive-search-active-bar animate-fade-in">
                  <span>
                    Showing <strong>{filteredExperiences.length}</strong> of {totalCount} showcases matching "<em>{searchQuery}</em>"
                  </span>
                  <button
                    type="button"
                    className="archive-search-clear-link"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear search filter
                  </button>
                </div>
              )}

              {/* Experiences Grid */}
              <div className="experiences-cards-grid animate-fade-in">
                {filteredExperiences.map((exp) => {
                  const rawStatus = (exp.status || 'GENERATED').toUpperCase();
                  const isPublished = rawStatus === 'PUBLISHED' && Boolean(exp.generated_url || exp.generatedUrl);
                  const isFailed = rawStatus === 'FAILED';
                  const isDeploying = rawStatus === 'DEPLOYING';
                  const isGenerating = rawStatus === 'GENERATING';
                  const isQueued = rawStatus === 'QUEUED';

                  const cardId = exp.experience_id || exp.experienceId || exp.project_id || exp.projectId || String(Math.random());
                  const rawBiz = exp.business_name || exp.businessName || 'Business Client';
                  const businessName = rawBiz.replace(/~\d+/g, '').trim() || 'Business Client';
                  const experienceTitle = exp.experience_title || exp.experienceTitle || `${businessName} — Technical Proposal`;
                  const projectName = exp.project_name || exp.projectName || (exp.project_id ? `Project #${exp.project_id}` : '—');
                  const rawGenUrl = (exp.generated_url || exp.generatedUrl || '').trim();
                  const generatedUrl = formatProposalUrl(rawGenUrl, cardId);
                  const createdDate = exp.published_time || exp.created_time || exp.createdAt || exp.modified_time;
                  const errorMessage = exp.error_message || exp.errorMessage;
                  const logoUrl = (
                    exp.business_logo_url ||
                    exp.businessLogoUrl ||
                    exp.logo_url ||
                    exp.logoUrl ||
                    exp.business_logo?.url ||
                    exp.businessLogo?.url ||
                    ''
                  ).trim();

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

                  const statusTone = isPublished ? 'tone-orange' : isFailed ? 'tone-red' : 'tone-blue';

                  return (
                    <motion.div
                      key={cardId}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className="experience-glass-wrapper"
                    >
                      {/* Glassmorphism Card */}
                      <Card className={`experience-glass-card ${statusTone} ${isPublished ? 'card-published' : ''} ${isFailed ? 'card-failed' : ''}`}>
                        <CardContent className="experience-glass-content">
                          {/* Top Header: Status Pill with Pulsing Dot & Clock Timestamp */}
                          <div className="exp-glass-top-row">
                            <div className={`exp-glass-status-pill ${statusClass}`}>
                              <span className="status-dot animate-pulse" />
                              <span>{statusLabel}</span>
                            </div>
                            {createdDate && (
                              <div className="exp-glass-time">
                                <Clock size={13} />
                                <span className="tabular-nums">{formatDate(createdDate)}</span>
                              </div>
                            )}
                          </div>

                          {/* Visual & Business Client Identity */}
                          <div className="exp-glass-identity-row">
                            <div className="exp-glass-avatar">
                              {logoUrl ? (
                                <img
                                  src={logoUrl}
                                  alt={`${businessName} logo`}
                                  className="exp-glass-avatar-img"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.nextSibling.style.display = 'flex';
                                  }}
                                />
                              ) : null}
                              <span style={logoUrl ? { display: 'none' } : undefined}>
                                {businessName.slice(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div className="exp-glass-titles">
                              <span className="exp-glass-biz" title={businessName}>
                                {businessName}
                              </span>
                              <h3 className="exp-glass-title" title={experienceTitle}>
                                {experienceTitle}
                              </h3>
                              <div className="exp-glass-proj-row">
                                <FolderKanban size={13} className="text-slate-400" />
                                <span className="exp-glass-proj-name">{projectName}</span>
                              </div>
                            </div>
                          </div>

                          {/* Live URL or Error or Processing State */}
                          <div className="exp-glass-body-box">
                            {isPublished && generatedUrl ? (
                              <div className="exp-url-box published">
                                <div className="exp-url-top">
                                  <span className="exp-url-label">Live URL:</span>
                                  <span className="exp-url-live-tag">● Active</span>
                                </div>
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
                              <div className="exp-url-box failed">
                                <span className="exp-url-label">Error:</span>
                                <span className="exp-url-text text-danger" title={errorMessage || 'Process failed'}>
                                  {errorMessage || 'Generation or deployment failed.'}
                                </span>
                              </div>
                            ) : (
                              <div className="exp-url-box muted">
                                <span className="exp-url-label">Status:</span>
                                <span className="exp-url-text">
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
                          </div>

                          {/* Action Buttons using shadcn Button */}
                          <div className="exp-glass-actions">
                            <Button
                              variant="default"
                              className="exp-btn-open"
                              onClick={() => handleOpenExperience(generatedUrl, cardId)}
                              disabled={!isPublished || !generatedUrl}
                              title={
                                isPublished && generatedUrl
                                  ? 'Open live customer showcase in a new tab'
                                  : 'Showcase URL is not published yet'
                              }
                            >
                              <ExternalLink size={14} />
                              <span>Open Showcase</span>
                            </Button>

                            <Button
                              variant="outline"
                              className="exp-btn-copy"
                              onClick={() => handleCopyLink(cardId, generatedUrl)}
                              disabled={!isPublished || !generatedUrl}
                              title={
                                isPublished && generatedUrl
                                  ? 'Copy live customer showcase URL'
                                  : 'URL cannot be copied until published'
                              }
                            >
                              {copiedId === cardId ? (
                                <>
                                  <Check size={14} className="text-emerald-600" />
                                  <span className="text-emerald-600 font-bold">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={14} />
                                  <span>Copy Link</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Empty Filtered Search State */
            <div className="archive-empty-card animate-fade-in search-empty-state">
              <div className="empty-symbol">🔍</div>
              <h3 className="empty-heading">No matching customer showcases</h3>
              <p className="empty-text">
                No showcases found matching <strong>"{searchQuery}"</strong>. Try checking the business name, project keyword, or clear the search filter.
              </p>
              <div className="empty-action-group">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSearchQuery('')}
                >
                  Clear Search Filter
                </button>
              </div>
            </div>
          )
        ) : (
          /* Empty State Banner */
          <div className="archive-empty-card">
            <div className="empty-symbol">📁</div>
            <h3 className="empty-heading">No customer showcases have been generated yet.</h3>
            <p className="empty-text">
              Uploaded documents will appear here after processing and publishing.
            </p>
            <div className="empty-action-group">
              <SpinningBorderButton
                type="button"
                onClick={() => onNavigate('generator')}
              >
                <UploadCloud size={16} />
                <span>Upload Technical Document</span>
              </SpinningBorderButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
