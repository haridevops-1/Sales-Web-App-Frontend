import React, { useState, useEffect } from 'react';
import './ProcessingState.css';
import ThinkingState from '../ui/thinking';
import { UPLOAD_STAGES } from '../../utils/constants';

const STAGE_INDEX_MAP = {
  [UPLOAD_STAGES.UPLOADING]: 0,
  [UPLOAD_STAGES.EXTRACTING]: 1,
  [UPLOAD_STAGES.AI_ANALYZING]: 2,
  [UPLOAD_STAGES.GENERATING_EXPERIENCE]: 3,
  [UPLOAD_STAGES.DEPLOYING]: 4,
  [UPLOAD_STAGES.PUBLISHED]: 5
};

const STAGE_COPY = {
  [UPLOAD_STAGES.UPLOADING]: {
    title: 'Uploading Discovery Notes...',
    stage: (biz) => `Uploading discovery document & client logo for ${biz}...`
  },
  [UPLOAD_STAGES.EXTRACTING]: {
    title: 'Reading Client Requirements...',
    stage: (biz) => `Extracting requirements, scope & project goals for ${biz}...`
  },
  [UPLOAD_STAGES.AI_ANALYZING]: {
    title: 'Structuring AI Proposal with Claude...',
    stage: (biz) => `Drafting tailored recommendations & solution architecture for ${biz}...`
  },
  [UPLOAD_STAGES.GENERATING_EXPERIENCE]: {
    title: 'Building Interactive Experience...',
    stage: (biz) => `Formatting client-ready interactive proposal for ${biz}...`
  },
  [UPLOAD_STAGES.DEPLOYING]: {
    title: 'Publishing Live Proposal...',
    stage: (biz) => `Generating secure, shareable proposal link for ${biz}...`
  },
  [UPLOAD_STAGES.PUBLISHED]: {
    title: 'Proposal Ready!',
    stage: (biz) => `Client proposal for ${biz} is live and ready to share.`
  }
};

export default function ProcessingState({
  stage = UPLOAD_STAGES.UPLOADING,
  businessName,
  projectName,
  hasLogo = false
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Live timer tracking processing duration
  useEffect(() => {
    if (stage === UPLOAD_STAGES.PUBLISHED || stage === UPLOAD_STAGES.FAILED) {
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [stage]);

  const activeIndex = STAGE_INDEX_MAP[stage] ?? 0;
  const copy = STAGE_COPY[stage] || STAGE_COPY[UPLOAD_STAGES.UPLOADING];
  const bizLabel = businessName || 'your client';

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    if (mins > 0) {
      return `${mins}m ${remainingSecs < 10 ? '0' : ''}${remainingSecs}s`;
    }
    return `${remainingSecs}s`;
  };

  const isHeavyDocument = elapsedSeconds >= 45;

  const thinkingRows = [
    {
      primary: 'Uploading discovery notes & client logo',
      secondary: businessName ? `${businessName}` : 'Document verification'
    },
    {
      primary: 'Reading requirements, goals & technical scope',
      secondary: 'Scope extraction'
    },
    {
      primary: 'Structuring tailored proposal & architecture',
      secondary: isHeavyDocument ? 'Multi-section Claude AI analysis' : 'Spikra AI intelligence'
    },
    {
      primary: 'Building client-ready interactive experience',
      secondary: 'Interactive format & UI components'
    },
    {
      primary: 'Publishing live proposal & generating your link',
      secondary: 'Shareable link'
    }
  ];

  return (
    <div className="compact-processing-card animate-fade-in" aria-live="polite">
      <div className="processing-compact-header">
        <div className="spinner-orange-glow">
          <div className="spinner-center-dot"></div>
        </div>
        <div className="processing-titles">
          <div className="processing-title-row">
            <h4 className="processing-main-text">{copy.title}</h4>
            <span className="processing-timer-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {formatTime(elapsedSeconds)}
            </span>
          </div>
          <span className="processing-active-stage">{copy.stage(bizLabel)}</span>
        </div>
      </div>

      {/* High-Visibility Heavy Document Processing Indicator (shown when processing takes >45s) */}
      {isHeavyDocument && stage !== UPLOAD_STAGES.PUBLISHED && (
        <div className="heavy-document-notice animate-fade-in">
          <div className="heavy-notice-icon-wrapper">
            <span className="heavy-notice-pulse-dot"></span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <div className="heavy-notice-content">
            <div className="heavy-notice-header">
              <strong className="heavy-notice-title">Deep Multi-Section Analysis in Progress</strong>
              <span className="heavy-notice-badge">Heavy Document</span>
            </div>
            <p className="heavy-notice-text">
              This document contains extensive technical specifications and multi-tier scope. Claude AI is conducting in-depth cross-section analysis to ensure all modules, workflows, architecture, and deliverables are preserved for the interactive proposal.
            </p>
            <div className="heavy-notice-subtext">
              <span className="heavy-spinner-mini"></span>
              Synthesizing proposal sections & generating UI assets... Please keep this tab open.
            </div>
          </div>
        </div>
      )}

      {/* Spikra-Themed 5 Thinking Steps for Sales Reps */}
      <div className="processing-thinking-wrapper">
        <ThinkingState
          variant="Steps"
          activeText="Proposal Generation in Progress"
          doneText="Proposal Ready to View"
          rows={thinkingRows}
          currentStepIndex={activeIndex}
          isWorking={stage !== UPLOAD_STAGES.PUBLISHED}
          defaultExpanded={true}
        />
      </div>

      <div className="uploading-info-footer">
        <div className="info-tag-item">
          <span className="info-lbl">Client:</span>
          <span className="info-val">{businessName || '—'}</span>
        </div>
        {projectName && (
          <div className="info-tag-item">
            <span className="info-lbl">Project:</span>
            <span className="info-val">{projectName}</span>
          </div>
        )}
        {hasLogo && (
          <div className="info-tag-item">
            <span className="info-lbl">Logo:</span>
            <span className="info-val">Included</span>
          </div>
        )}
        <div className="info-tag-item info-tag-status">
          <span className="info-lbl">Engine:</span>
          <span className="info-val-badge">Claude Sonnet 5</span>
        </div>
      </div>
    </div>
  );
}
