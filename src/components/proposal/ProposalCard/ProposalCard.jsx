import React, { useState } from 'react';
import './ProposalCard.css';
import { Building2, Calendar, ArrowUpRight, Copy, Check } from 'lucide-react';
import { copyToClipboard } from '@/utils/helpers';
import { ShinyButton } from '@/components/ui/shiny-button';

export default function ProposalCard({
  proposal,
  onSelect
}) {
  const [copied, setCopied] = useState(false);

  if (!proposal) return null;

  const {
    title,
    customer,
    industry,
    status = 'Draft',
    date,
    value,
    code = 'PROP-2026-001'
  } = proposal;

  const getStatusMeta = (st) => {
    const s = String(st).toLowerCase();
    if (s === 'approved') return { label: 'Approved', className: 'approved', tone: 'tone-approved' };
    if (s === 'review' || s === 'in review' || s === 'in_review') return { label: 'In Review', className: 'review', tone: 'tone-review' };
    if (s === 'sent') return { label: 'Sent', className: 'sent', tone: 'tone-sent' };
    return { label: 'Draft', className: 'draft', tone: 'tone-draft' };
  };

  const status_ = getStatusMeta(status);

  const formattedValue = value ? new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value) : '$0';

  const initials = (customer || 'NA').replace(/[()]/g, '').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  const handleCopyCode = async (e) => {
    e.stopPropagation();
    const ok = await copyToClipboard(code);
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
        {date && (
          <span className="proposal-glass-date">
            <Calendar size={13} />
            <span>{date}</span>
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

      {/* Deal Value Box */}
      <div className="proposal-glass-info-box">
        <span className="proposal-info-label">Deal Value</span>
        <span className="proposal-info-value">{formattedValue}</span>
      </div>

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
          onClick={handleCopyCode}
          title="Copy proposal code"
        >
          {copied ? (
            <>
              <Check size={14} className="text-emerald-600" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>{code}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
