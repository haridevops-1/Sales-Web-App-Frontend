import React, { useState } from 'react';
import './ProposalCard.css';
import { Building2, Calendar, ArrowUpRight, Copy, Check } from 'lucide-react';
import { copyToClipboard, formatDate } from '@/utils/helpers';
import { ShinyButton } from '@/components/ui/shiny-button';
import { W2_PROPOSAL_STATUS } from '@/utils/constants';

export default function ProposalCard({
  proposal,
  onSelect
}) {
  const [copied, setCopied] = useState(false);

  if (!proposal) return null;

  const {
    proposal_title: title,
    customer_name: customer,
    industry,
    status = W2_PROPOSAL_STATUS.DRAFT,
    created_at: createdAt,
    deal_value: dealValue,
    proposal_id: proposalId
  } = proposal;

  const getStatusMeta = (st) => {
    if (st === W2_PROPOSAL_STATUS.APPROVED) return { label: 'Approved', className: 'approved', tone: 'tone-approved' };
    if (st === W2_PROPOSAL_STATUS.IN_REVIEW) return { label: 'In Review', className: 'review', tone: 'tone-review' };
    return { label: 'Draft', className: 'draft', tone: 'tone-draft' };
  };

  const status_ = getStatusMeta(status);

  // deal_value is real when present (never invented) - proposal-api always returns a
  // number, defaulting to 0 when the Zia Agent didn't estimate one, so 0 means "not set"
  // rather than a genuine $0 deal.
  const hasDealValue = Number(dealValue) > 0;
  const formattedValue = hasDealValue
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(dealValue)
    : null;

  const initials = (customer || 'NA').replace(/[()]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  const handleCopyId = async (e) => {
    e.stopPropagation();
    const ok = await copyToClipboard(proposalId);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`proposal-glass-card ${status_.tone}`} onClick={() => onSelect && onSelect(proposal)}>
      {/* Top Row: Status Pill + Date */}
      <div className="proposal-glass-top-row">
        <span className={`proposal-glass-status-pill ${status_.className}`}>
          <span className="status-dot-sm animate-pulse" />
          <span>{status_.label}</span>
        </span>
        {createdAt && (
          <span className="proposal-glass-date">
            <Calendar size={13} />
            <span>{formatDate(createdAt)}</span>
          </span>
        )}
      </div>

      {/* Identity Row */}
      <div className="proposal-glass-identity-row">
        <div className="proposal-glass-avatar">{initials}</div>
        <div className="proposal-glass-titles">
          {industry && <span className="proposal-glass-industry">{industry}</span>}
          <h3 className="proposal-glass-title" title={title}>{title}</h3>
          <div className="proposal-glass-customer-row">
            <Building2 size={13} />
            <span className="proposal-glass-customer-name" title={customer}>{customer}</span>
          </div>
        </div>
      </div>

      {/* Deal Value Box - only shown when the backend actually returned one */}
      {hasDealValue && (
        <div className="proposal-glass-info-box">
          <span className="proposal-info-label">Deal Value</span>
          <span className="proposal-info-value">{formattedValue}</span>
        </div>
      )}

      {/* Actions */}
      <div className="proposal-glass-actions">
        <ShinyButton
          type="button"
          className="btn-proposal-view"
          onClick={(e) => {
            e.stopPropagation();
            if (onSelect) onSelect(proposal);
          }}
        >
          <span className="inline-flex items-center justify-center gap-1.5 font-bold">
            <ArrowUpRight size={14} />
            <span>View Proposal</span>
          </span>
        </ShinyButton>

        <button
          type="button"
          className="btn-proposal-copy"
          onClick={handleCopyId}
          title="Copy proposal ID"
        >
          {copied ? (
            <>
              <Check size={14} className="text-emerald-600" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>{proposalId}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
