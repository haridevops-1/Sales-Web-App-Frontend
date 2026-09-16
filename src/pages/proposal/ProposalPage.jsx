import React, { useState, useMemo } from 'react';
import './ProposalPage.css';
import ProposalCard from '@/components/proposal/ProposalCard/ProposalCard';
import CountUp from '@/reactbits/CountUp';
import SpotlightCard from '@/reactbits/SpotlightCard';
import SpinningBorderButton from '@/components/ui/spinning-border-button';
import SpikraExperienceSearch from '@/components/ui/SpikraExperienceSearch';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, FileText, FileEdit } from 'lucide-react';

export default function ProposalPage({
  proposals = [],
  onNavigate,
  onToast
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const totalCount = proposals.length;
  const draftCount = proposals.filter((p) => (p.status || '').toUpperCase() === 'DRAFT').length;

  const filteredProposals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return proposals;
    const tokens = query.split(/\s+/).filter(Boolean);

    return proposals.filter((p) => {
      const searchableText = `${p.title} ${p.customer} ${p.code} ${p.industry} ${p.status} ${p.owner}`.toLowerCase();
      return tokens.every((token) => searchableText.includes(token));
    });
  }, [proposals, searchQuery]);

  const handleCreateProposal = () => {
    if (onNavigate) onNavigate('proposal', 'proposal-create');
  };

  const handleSelectProposal = (proposal) => {
    if (onToast) onToast(`Selected proposal: ${proposal.title}`, 'info', 3500);
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
              <SpinningBorderButton type="button" onClick={handleCreateProposal}>
                <Plus size={16} />
                <span>Create Proposal</span>
              </SpinningBorderButton>
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
        <div className="archive-stats-row">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
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

          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.08 }}
          >
            <SpotlightCard className="stat-card" spotlightColor="rgba(255, 107, 0, 0.12)">
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
        </div>

        {/* Body */}
        {totalCount > 0 ? (
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
                    key={proposal.id}
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
