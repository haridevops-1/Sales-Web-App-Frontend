import React, { useState, useMemo, useEffect, useCallback } from 'react';
import './ProposalPage.css';
import ProposalCard from '@/components/proposal/ProposalCard/ProposalCard';
import SpinningBorderButton from '@/components/ui/spinning-border-button';
import { ShinyButton } from '@/components/ui/shiny-button';
import SpikraExperienceSearch from '@/components/ui/SpikraExperienceSearch';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Loader2, AlertTriangle } from 'lucide-react';
import { listProposals, getFriendlyErrorMessage } from '@/api/proposalApi';

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

  const filteredProposals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return proposals;
    const tokens = query.split(/\s+/).filter(Boolean);

    return proposals.filter((p) => {
      const searchableText = `${p.customer_name || ''} ${p.business_name || ''} ${p.package_name || ''} ${p.proposal_title || ''} ${p.proposal_id || ''} ${p.industry || ''}`.toLowerCase();
      return tokens.every((token) => searchableText.includes(token));
    });
  }, [proposals, searchQuery]);

  const handleCreateProposal = () => {
    if (onNavigate) onNavigate('proposal', 'proposal-create');
  };

  const handleSelectProposal = (proposal) => {
    if (onViewProposal) onViewProposal(proposal.proposal_id);
  };

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

        {/* Proposals Grid or Empty States */}
        {isLoading ? (
          <div className="proposals-loading-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="proposal-skeleton-card" />
            ))}
          </div>
        ) : error ? (
          <div className="archive-empty-card animate-fade-in">
            <div className="empty-symbol"><AlertTriangle size={28} /></div>
            <h3 className="empty-heading">Unable to load proposals</h3>
            <p className="empty-text">{getFriendlyErrorMessage(error)}</p>
            <div className="empty-action-group">
              <button type="button" className="btn btn-secondary" onClick={() => load()}>
                <Loader2 size={14} />
                <span>Try again</span>
              </button>
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
