import React, { useState, useMemo, useEffect, useCallback } from 'react';
import './ProposalPage.css';
import ProposalCard from '@/components/proposal/ProposalCard/ProposalCard';
import CountUp from '@/reactbits/CountUp';
import SpotlightCard from '@/reactbits/SpotlightCard';
import SpinningBorderButton from '@/components/ui/spinning-border-button';
import { ShinyButton } from '@/components/ui/shiny-button';
import SpikraExperienceSearch from '@/components/ui/SpikraExperienceSearch';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, FileText, FileEdit, Eye, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { listProposals, getFriendlyErrorMessage } from '@/api/proposalApi';
import { W2_PROPOSAL_STATUS } from '@/utils/constants';

export default function ProposalPage({
  onNavigate,
  onViewProposal,
  onToast
}) {
  const [proposals, setProposals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const load = useCallback(async (signal) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await listProposals(null, signal);
      setProposals(Array.isArray(res.proposals) ? res.proposals : []);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const totalCount = proposals.length;
  const draftCount = proposals.filter((p) => p.status === W2_PROPOSAL_STATUS.DRAFT).length;
  const inReviewCount = proposals.filter((p) => p.status === W2_PROPOSAL_STATUS.IN_REVIEW).length;
  const approvedCount = proposals.filter((p) => p.status === W2_PROPOSAL_STATUS.APPROVED).length;

  const filteredProposals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return proposals;
    const tokens = query.split(/\s+/).filter(Boolean);

    return proposals.filter((p) => {
      const searchableText = `${p.proposal_title || ''} ${p.customer_name || ''} ${p.proposal_id || ''} ${p.industry || ''} ${p.status || ''}`.toLowerCase();
      return tokens.every((token) => searchableText.includes(token));
    });
  }, [proposals, searchQuery]);

  const handleCreateProposal = () => {
    if (onNavigate) onNavigate('proposal', 'proposal-create');
  };

  const handleSelectProposal = (proposal) => {
    if (onViewProposal) onViewProposal(proposal.proposal_id);
  };

  const isUnauthorized = error?.status === 401;

  return (
    <div className="proposal-module-page animate-fade-in">
      <div className="container">
        {/* Page Top Header Bar */}
        <div className="archive-top-bar">
          <div className="archive-heading-group">
            <button
              type="button"
              className="btn-back-link"
              onClick={() => onNavigate && onNavigate('workspace', 'hub')}
            >
              <ArrowLeft size={15} className="btn-back-arrow" />
              <span>Back to Sales Workspace</span>
            </button>
            <h1 className="archive-main-title">All Proposals</h1>
            <p className="archive-subtitle">
              Structured proposals generated from customer discovery packages.
            </p>
          </div>

          <div className="archive-actions-header">
            <div className="archive-actions-top-row">
              <ShinyButton
                type="button"
                onClick={handleCreateProposal}
                className="btn-create-proposal-shiny"
              >
                <span className="inline-flex items-center justify-center gap-1.5 font-bold text-white normal-case text-sm">
                  <Plus size={16} strokeWidth={2.5} />
                  <span>Create Proposal</span>
                </span>
              </ShinyButton>
            </div>

            <div className="archive-search-container">
              <SpikraExperienceSearch
                value={searchQuery}
                onChange={setSearchQuery}
                onClear={() => setSearchQuery('')}
                placeholder="Search proposals or clients..."
                ariaLabel="Search proposals by title, client, or status"
                totalCount={totalCount}
                filteredCount={filteredProposals.length}
              />
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="archive-stats-row proposal-stats-row-4">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }}>
            <SpotlightCard className="stat-card" spotlightColor="rgba(0, 82, 255, 0.12)">
              <div className="stat-icon blue">
                <FileText size={16} strokeWidth={2.2} />
              </div>
              <div className="stat-text">
                <span className="stat-label">Total Proposals</span>
                <span className="stat-value">
                  <CountUp to={totalCount} duration={1.1} separator="" />
                </span>
              </div>
            </SpotlightCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: 'easeOut', delay: 0.06 }}>
            <SpotlightCard className="stat-card" spotlightColor="rgba(255, 122, 26, 0.12)">
              <div className="stat-icon orange">
                <FileEdit size={16} strokeWidth={2.2} />
              </div>
              <div className="stat-text">
                <span className="stat-label">Drafts</span>
                <span className="stat-value">
                  <CountUp to={draftCount} duration={1.1} separator="" />
                </span>
              </div>
            </SpotlightCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: 'easeOut', delay: 0.12 }}>
            <SpotlightCard className="stat-card" spotlightColor="rgba(255, 176, 106, 0.16)">
              <div className="stat-icon warning">
                <Eye size={16} strokeWidth={2.2} />
              </div>
              <div className="stat-text">
                <span className="stat-label">In Review</span>
                <span className="stat-value">
                  <CountUp to={inReviewCount} duration={1.1} separator="" />
                </span>
              </div>
            </SpotlightCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4, ease: 'easeOut', delay: 0.18 }}>
            <SpotlightCard className="stat-card" spotlightColor="rgba(16, 185, 129, 0.14)">
              <div className="stat-icon success">
                <CheckCircle2 size={16} strokeWidth={2.2} />
              </div>
              <div className="stat-text">
                <span className="stat-label">Approved</span>
                <span className="stat-value">
                  <CountUp to={approvedCount} duration={1.1} separator="" />
                </span>
              </div>
            </SpotlightCard>
          </motion.div>
        </div>

        {/* Body */}
        {isLoading ? (
          <div className="proposals-loading-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="proposal-skeleton-card" />
            ))}
          </div>
        ) : error ? (
          <div className="archive-empty-card animate-fade-in">
            <div className="empty-symbol"><AlertTriangle size={28} /></div>
            <h3 className="empty-heading">
              {isUnauthorized ? 'Connect WorkDrive to view proposals' : 'Unable to load proposals'}
            </h3>
            <p className="empty-text">
              {isUnauthorized
                ? 'Your WorkDrive connection has expired or hasn’t been set up yet. Connect it from Create Proposal to continue.'
                : getFriendlyErrorMessage(error)}
            </p>
            <div className="empty-action-group">
              {isUnauthorized ? (
                <SpinningBorderButton type="button" onClick={handleCreateProposal}>
                  <Plus size={16} />
                  <span>Create Proposal</span>
                </SpinningBorderButton>
              ) : (
                <button type="button" className="btn btn-secondary" onClick={() => load()}>
                  <Loader2 size={14} />
                  <span>Try again</span>
                </button>
              )}
            </div>
          </div>
        ) : totalCount > 0 ? (
          filteredProposals.length > 0 ? (
            <>
              {searchQuery.trim() && (
                <div className="archive-search-active-bar animate-fade-in">
                  <span>
                    Showing <strong>{filteredProposals.length}</strong> of {totalCount} proposals matching "<em>{searchQuery}</em>"
                  </span>
                  <button
                    type="button"
                    className="archive-search-clear-link"
                    onClick={() => setSearchQuery('')}
                  >
                    Clear search
                  </button>
                </div>
              )}

              <div className="proposals-cards-grid animate-fade-in">
                {filteredProposals.map((proposal, idx) => (
                  <motion.div
                    key={proposal.proposal_id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(idx * 0.04, 0.3) }}
                  >
                    <ProposalCard proposal={proposal} onSelect={handleSelectProposal} />
                  </motion.div>
                ))}
              </div>
            </>
          ) : (
            <div className="archive-empty-card animate-fade-in search-empty-state">
              <div className="empty-symbol">🔍</div>
              <h3 className="empty-heading">No matching proposals</h3>
              <p className="empty-text">
                No proposals found matching <strong>"{searchQuery}"</strong>.
              </p>
              <div className="empty-action-group">
                <button type="button" className="btn btn-secondary" onClick={() => setSearchQuery('')}>
                  Clear Search
                </button>
              </div>
            </div>
          )
        ) : (
          <div className="archive-empty-card">
            <div className="empty-symbol">📄</div>
            <h3 className="empty-heading">No proposals yet.</h3>
            <p className="empty-text">
              Create your first solution proposal from a customer discovery package.
            </p>
            <div className="empty-action-group">
              <SpinningBorderButton type="button" onClick={handleCreateProposal}>
                <Plus size={16} />
                <span>Create Proposal</span>
              </SpinningBorderButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
