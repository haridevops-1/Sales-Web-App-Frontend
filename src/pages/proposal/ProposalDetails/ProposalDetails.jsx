import React, { useState, useEffect, useCallback } from 'react';
import './ProposalDetails.css';
import {
  ArrowLeft,
  Building2,
  Target,
  ListChecks,
  AlertTriangle,
  Workflow,
  Lightbulb,
  Sparkles,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { getProposal, updateProposalStatus, getFriendlyErrorMessage } from '@/api/proposalApi';
import { W2_PROPOSAL_STATUS, W2_PROPOSAL_STATUSES } from '@/utils/constants';
import { formatDate } from '@/utils/helpers';

const STATUS_TONE = {
  [W2_PROPOSAL_STATUS.DRAFT]: 'tone-draft',
  [W2_PROPOSAL_STATUS.IN_REVIEW]: 'tone-review',
  [W2_PROPOSAL_STATUS.APPROVED]: 'tone-approved'
};

// Mirrors proposal-api's own services/proposal ALLOWED_TRANSITIONS - the backend is the
// source of truth and re-validates regardless; this only decides which buttons to show.
const NEXT_STATUSES = {
  [W2_PROPOSAL_STATUS.DRAFT]: [W2_PROPOSAL_STATUS.IN_REVIEW],
  [W2_PROPOSAL_STATUS.IN_REVIEW]: [W2_PROPOSAL_STATUS.APPROVED, W2_PROPOSAL_STATUS.DRAFT],
  [W2_PROPOSAL_STATUS.APPROVED]: []
};

function Section({ icon: Icon, title, children }) {
  return (
    <section className="proposal-detail-section">
      <div className="proposal-detail-section-heading">
        <Icon size={16} />
        <h3>{title}</h3>
      </div>
      {children}
    </section>
  );
}

function BulletList({ items }) {
  if (!items || items.length === 0) {
    return <p className="proposal-detail-empty-text">Not specified in this proposal.</p>;
  }
  return (
    <ul className="proposal-detail-bullet-list">
      {items.map((item, idx) => (
        <li key={idx}>{item}</li>
      ))}
    </ul>
  );
}

export default function ProposalDetails({ proposalId, onNavigate, onToast }) {
  const [proposal, setProposal] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const load = useCallback(async (signal) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await getProposal(proposalId, signal);
      setProposal(res.proposal);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [proposalId]);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const handleBack = () => {
    if (onNavigate) onNavigate('proposal', 'proposal-list');
  };

  const handleStatusChange = async (newStatus) => {
    if (isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    try {
      const res = await updateProposalStatus(proposalId, newStatus);
      setProposal(res.proposal);
      if (onToast) onToast(`Proposal moved to "${newStatus}".`, 'success', 4000);
    } catch (err) {
      if (onToast) onToast(getFriendlyErrorMessage(err), 'error', 6000);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <div className="proposal-details-page animate-fade-in">
        <div className="container proposal-details-state">
          <Loader2 size={22} className="proposal-details-spin" />
          <span>Loading proposal…</span>
        </div>
      </div>
    );
  }

  if (error) {
    const isUnauthorized = error.status === 401;
    return (
      <div className="proposal-details-page animate-fade-in">
        <div className="container proposal-details-state is-error">
          <AlertTriangle size={22} />
          <p>{isUnauthorized ? 'Your session has expired. Please reconnect WorkDrive.' : getFriendlyErrorMessage(error)}</p>
          <div className="proposal-details-state-actions">
            <button type="button" className="btn-back-to-proposals" onClick={handleBack}>
              <ArrowLeft size={14} />
              <span>Back to Proposals</span>
            </button>
            {!isUnauthorized && (
              <button type="button" className="btn-details-retry" onClick={() => load()}>Try again</button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!proposal) return null;

  const content = proposal.content || {};
  const customer = content.customer || {};
  const nextStatuses = NEXT_STATUSES[proposal.status] || [];

  return (
    <div className="proposal-details-page animate-fade-in">
      <div className="container proposal-details-container">
        <button type="button" className="btn-back-to-proposals" onClick={handleBack}>
          <ArrowLeft size={14} />
          <span>Proposals</span>
        </button>

        <div className="proposal-details-header">
          <div className="proposal-details-header-text">
            <span className={`proposal-detail-status-pill ${STATUS_TONE[proposal.status] || 'tone-draft'}`}>
              {proposal.status}
            </span>
            <h1>{proposal.proposal_title || 'Solution Proposal'}</h1>
            <p className="proposal-details-meta">
              {proposal.customer_name}
              {proposal.industry ? ` · ${proposal.industry}` : ''}
              {proposal.created_at ? ` · Created ${formatDate(proposal.created_at)}` : ''}
            </p>
          </div>

          {nextStatuses.length > 0 && (
            <div className="proposal-details-status-actions">
              {nextStatuses.map((next) => (
                <button
                  key={next}
                  type="button"
                  className={`btn-status-transition ${next === W2_PROPOSAL_STATUS.APPROVED ? 'is-primary' : ''}`}
                  onClick={() => handleStatusChange(next)}
                  disabled={isUpdatingStatus}
                >
                  {isUpdatingStatus ? <Loader2 size={14} className="proposal-details-spin" /> : null}
                  <span>Move to {next}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {proposal.deal_value > 0 && (
          <div className="proposal-details-deal-value">
            <TrendingUp size={15} />
            <span>Deal Value: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(proposal.deal_value)}</span>
          </div>
        )}

        <div className="proposal-details-body">
          <Section icon={Building2} title="About the Customer">
            <dl className="proposal-detail-kv-list">
              <div>
                <dt>Customer</dt>
                <dd>{customer.company_name || proposal.customer_name || '—'}</dd>
              </div>
              <div>
                <dt>Industry</dt>
                <dd>{customer.industry || proposal.industry || '—'}</dd>
              </div>
              {customer.business_context && (
                <div className="full-width">
                  <dt>Business Context</dt>
                  <dd>{customer.business_context}</dd>
                </div>
              )}
            </dl>
          </Section>

          <Section icon={Target} title="Customer Goals">
            <BulletList items={content.goals} />
          </Section>

          <Section icon={ListChecks} title="Customer Requirements">
            <BulletList items={content.requirements} />
          </Section>

          <Section icon={AlertTriangle} title="Business Challenges / Pain Points">
            <BulletList items={content.pain_points} />
          </Section>

          <Section icon={Workflow} title="Existing Process">
            <BulletList items={content.existing_process} />
          </Section>

          <Section icon={Lightbulb} title="Proposed Solution">
            <BulletList items={content.proposed_solution} />
          </Section>

          <Section icon={Sparkles} title="Zoho Solutions">
            <BulletList items={content.zoho_solutions} />
          </Section>

          <Section icon={TrendingUp} title="Expected Outcomes">
            <BulletList items={content.expected_outcomes} />
          </Section>
        </div>
      </div>
    </div>
  );
}
