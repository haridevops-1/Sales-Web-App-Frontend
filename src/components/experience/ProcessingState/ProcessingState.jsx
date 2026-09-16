import React from 'react';
import './ProcessingState.css';
import ThinkingState from '@/components/ui/thinking';
import { UPLOAD_STAGES } from '@/utils/constants';

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
    title: 'Analyzing Discovery Requirements...',
    stage: (biz) => `Structuring tailored recommendations & solution architecture for ${biz}...`
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
  const activeIndex = STAGE_INDEX_MAP[stage] ?? 0;
  const copy = STAGE_COPY[stage] || STAGE_COPY[UPLOAD_STAGES.UPLOADING];
  const bizLabel = businessName || 'your client';

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
      secondary: 'Solution architecture'
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
          <h4 className="processing-main-text">{copy.title}</h4>
          <span className="processing-active-stage">{copy.stage(bizLabel)}</span>
        </div>
      </div>

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
      </div>
    </div>
  );
}
