import React, { useState } from 'react';
import './ProposalCard.css';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShinyButton } from '@/components/ui/shiny-button';
import { Clock, Copy, Check, ExternalLink, FolderKanban } from 'lucide-react';
import { copyToClipboard, formatDate, formatProposalUrl } from '@/utils/helpers';

export default function ProposalCard({
  proposal,
  onSelect
}) {
  const [copied, setCopied] = useState(false);

  if (!proposal) return null;

  const rawBiz = proposal.customer_name || proposal.business_name || proposal.package_name || proposal.content?.customer?.company_name || 'Business Client';
  const businessName = rawBiz.replace(/~\d+/g, '').trim() || 'Business Client';
  const proposalId = proposal.proposal_id || proposal.proposalId || '';

  // Clean proposal title so the business name is not redundantly duplicated
  let cleanTitle = (proposal.proposal_title || proposal.title || '').trim();
  if (cleanTitle) {
    const escapedBiz = businessName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleanTitle = cleanTitle.replace(new RegExp(`^${escapedBiz}\\s*[—–-]\\s*`, 'i'), '').trim();
  }
  if (!cleanTitle || cleanTitle.toLowerCase() === businessName.toLowerCase()) {
    cleanTitle = 'Solution Proposal & Architecture Blueprint';
  }
  const title = cleanTitle;
  const projectRef = proposalId ? `Proposal #${proposalId}` : 'Solution Proposal';

  const rawStatus = (proposal.status || proposal.proposal_status || 'PUBLISHED').toUpperCase();
  const createdAt = proposal.created_at || proposal.createdAt || null;

  let rawUrl = (proposal.generated_url || proposal.proposal_url || proposal.slate_url || '').trim();
  if (rawUrl.includes('spikra-customer-prop-msdrrgbk.onslate.com')) {
    rawUrl = rawUrl.replace('spikra-customer-prop-msdrrgbk.onslate.com', 'spikra-w2-proposal-jmdbymcs.onslate.com');
  }
  const targetUrl = formatProposalUrl(rawUrl, proposalId) || rawUrl;

  const isPublished = rawStatus === 'COMPLETED' || rawStatus === 'PUBLISHED' || rawStatus === 'APPROVED' || Boolean(targetUrl);
  const statusLabel = isPublished ? 'Published' : 'Draft';
  const statusClass = isPublished ? 'published' : 'draft';
  const statusTone = isPublished ? 'tone-orange' : 'tone-blue';

  const initials = businessName
    .replace(/[()]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || 'SP';

  const handleOpenProposal = (e) => {
    e.stopPropagation();
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    } else if (onSelect) {
      onSelect(proposal);
    }
  };

  const handleCopyLink = async (e) => {
    e.stopPropagation();
    if (!targetUrl) return;
    const ok = await copyToClipboard(targetUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  };

  return (
    <Card className={`experience-glass-card ${statusTone} ${isPublished ? 'card-published' : ''}`}>
      <CardContent className="experience-glass-content">
        {/* Top Header: Status Pill with Pulsing Dot & Clock Timestamp */}
        <div className="exp-glass-top-row">
          <div className={`exp-glass-status-pill ${statusClass}`}>
            <span className="status-dot animate-pulse" />
            <span>{statusLabel}</span>
          </div>
          {createdAt && (
            <div className="exp-glass-time">
              <Clock size={13} />
              <span className="tabular-nums">{formatDate(createdAt)}</span>
            </div>
          )}
        </div>

        {/* Visual & Business Client Identity */}
        <div className="exp-glass-identity-row">
          <div className="exp-glass-avatar">
            <span>{initials}</span>
          </div>
          <div className="exp-glass-titles">
            <span className="exp-glass-biz" title={businessName}>
              {businessName}
            </span>
            <h3 className="exp-glass-title" title={title}>
              {title}
            </h3>
            <div className="exp-glass-proj-row">
              <FolderKanban size={13} className="text-slate-400" />
              <span className="exp-glass-proj-name">{projectRef}</span>
            </div>
          </div>
        </div>

        {/* Live URL Box */}
        <div className="exp-glass-body-box">
          {targetUrl ? (
            <div className="exp-url-box published">
              <div className="exp-url-top">
                <span className="exp-url-label">LIVE URL:</span>
                <span className="exp-url-live-tag">● Active</span>
              </div>
              <a
                href={targetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="exp-url-link"
                title={targetUrl}
                onClick={(e) => e.stopPropagation()}
              >
                {targetUrl}
              </a>
            </div>
          ) : (
            <div className="exp-url-box muted">
              <span className="exp-url-label">STATUS:</span>
              <span className="exp-url-text">Proposal generated successfully</span>
            </div>
          )}
        </div>

        {/* Action Buttons using ShinyButton and Copy Button */}
        <div className="exp-glass-actions">
          <ShinyButton
            type="button"
            className="exp-btn-open"
            onClick={handleOpenProposal}
            disabled={!targetUrl}
            title={targetUrl ? 'Open live customer proposal in a new tab' : 'Proposal URL is not available'}
          >
            <span className="inline-flex items-center justify-center gap-1.5 font-bold">
              <ExternalLink size={14} />
              <span>VIEW PROPOSAL</span>
            </span>
          </ShinyButton>

          <Button
            variant="outline"
            className="exp-btn-copy"
            onClick={handleCopyLink}
            disabled={!targetUrl}
            title={targetUrl ? 'Copy live proposal URL' : 'URL cannot be copied'}
          >
            {copied ? (
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
  );
}
