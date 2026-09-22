import React, { useState, useMemo, useEffect, useCallback } from 'react';
import './ProposalPage.css';
import ProposalCard from '@/components/proposal/ProposalCard/ProposalCard';
import CountUp from '@/reactbits/CountUp';
import SpotlightCard from '@/reactbits/SpotlightCard';
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

    // Read cached/locally staged proposals first
    let localProposals = [];
    try {
      localProposals = JSON.parse(localStorage.getItem('spikra_proposals') || '[]');
      if (Array.isArray(localProposals) && localProposals.length > 0) {
        setProposals(localProposals);
      }
    } catch (e) {
      console.warn('Could not read cached proposals:', e);
    }

    try {
      const res = await listProposals(null, signal);
      const backendList = Array.isArray(res.proposals) ? res.proposals : [];

      // Merge backend and local proposals
      // Prioritize the salesperson's entered business name and generated URL
      const mergedMap = new Map();

      backendList.forEach((p) => {
        const id = p.proposal_id || p.id;
        if (id) mergedMap.set(String(id), p);
      });

      localProposals.forEach((p) => {
        const id = p.proposal_id || p.id;
        if (id) {
          const existing = mergedMap.get(String(id));
          mergedMap.set(String(id), {
            ...(existing || {}),
            ...p,
            customer_name: p.customer_name || existing?.customer_name || 'Business Client',
            business_name: p.business_name || p.customer_name || existing?.business_name || 'Business Client',
            generated_url: p.generated_url || existing?.generated_url || existing?.proposal_url || ''
          });
        }
      });

      const finalProposals = Array.from(mergedMap.values());
      setProposals(finalProposals);

      try {
        localStorage.setItem('spikra_proposals', JSON.stringify(finalProposals));
      } catch (e) {
        console.warn('Could not sync localStorage proposals:', e);
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      if (localProposals.length === 0) {
        setError(err);
      }
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
  const failedCount = proposals.filter((p) => (p.status || p.proposal_status || '').toUpperCase() === 'FAILED').length;

  const filteredProposals = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return proposals;
    const tokens = query.split(/\s+/).filter(Boolean);

    return proposals.filter((p) => {
      const rawBiz = p.customer_name || p.business_name || p.package_name || '';
      const cleanBiz = rawBiz.replace(/~\d+/g, '').trim();
      const title = p.proposal_title || '';
      const id = p.proposal_id ? `Proposal #${p.proposal_id}` : '';
      const url = p.generated_url || p.proposal_url || '';
      const status = p.status || p.proposal_status || '';

      const searchableText = `${rawBiz} ${cleanBiz} ${title} ${id} ${url} ${status}`.toLowerCase();
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
        {/* Page Top Header Bar (Matching Image 2) */}
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
            <h1 className="archive-main-title">All Customer Proposals</h1>
            <p className="archive-subtitle">
              Structured proposal showcases generated from customer discovery documents.
            </p>
          </div>

          <div className="archive-actions-header">
            <div className="archive-actions-top-row">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => load()}
                disabled={isLoading}
                title="Refresh customer proposals from Catalyst backend"
              >
                <span className={isLoading ? 'spinning' : ''}>↻</span>
                <span>{isLoading ? 'Refreshing...' : 'Refresh'}</span>
              </button>

              <button
                type="button"
                className="btn-upload-simple"
                onClick={handleCreateProposal}
              >
                <Plus size={15} strokeWidth={2.5} />
                <span>Create Proposal</span>
              </button>
            </div>

            {/* Live Search Bar positioned directly under the buttons */}
            <div className="archive-search-container">
              <SpikraExperienceSearch
                value={searchQuery}
                onChange={setSearchQuery}
                onClear={() => setSearchQuery('')}
                placeholder="Search business, proposal, or project..."
                totalCount={totalCount}
                filteredCount={filteredProposals.length}
              />
            </div>
          </div>
        </div>

        {/* Dynamic Metrics Bar (Matching Image 2) */}
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

        {/* Proposals Grid or Empty States */}
        {isLoading && totalCount === 0 ? (
          <div className="archive-empty-card animate-fade-in">
            <div className="gen-exp-spinner" style={{ margin: '0 auto 1rem' }} />
            <h3 className="empty-heading">Loading customer proposals...</h3>
            <p className="empty-text">
              Retrieving live proposals from Zoho Catalyst serverless backend...
            </p>
          </div>
        ) : error ? (
          <div className="archive-empty-card animate-fade-in" style={{ borderColor: '#fed7d7', background: '#fff5f5' }}>
            <div className="empty-symbol">⚠️</div>
            <h3 className="empty-heading" style={{ color: '#c53030' }}>Unable to load proposals</h3>
            <p className="empty-text" style={{ color: '#742a2a' }}>{getFriendlyErrorMessage(error)}</p>
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

              <div className="experiences-cards-grid animate-fade-in">
                {filteredProposals.map((proposal, idx) => (
                  <motion.div
                    key={proposal.proposal_id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut', delay: Math.min(idx * 0.04, 0.3) }}
                    className="experience-glass-wrapper"
                  >
                    <ProposalCard proposal={proposal} onSelect={handleSelectProposal} />
                  </motion.div>
                ))}
              </div>
            </>
          ) : (
            <div className="archive-empty-card animate-fade-in search-empty-state">
              <div className="empty-symbol">🔍</div>
              <h3 className="empty-heading">No matching customer proposals</h3>
              <p className="empty-text">
                No proposals found matching <strong>"{searchQuery}"</strong>. Try checking the business name or clear the search filter.
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
              <button type="button" className="btn-upload-simple" onClick={handleCreateProposal}>
                <Plus size={15} strokeWidth={2.5} />
                <span>Create Proposal</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
