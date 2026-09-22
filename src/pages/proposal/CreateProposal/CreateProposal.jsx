import React, { useEffect, useState, useRef } from 'react';
import './CreateProposal.css';
import DiscoveryUploadCard from '@/components/proposal/DiscoveryUploadCard/DiscoveryUploadCard';
import DiscoveryPackageReview from '@/components/proposal/DiscoveryPackageReview/DiscoveryPackageReview';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  Loader2,
  FileText,
  ArrowUpRight
} from 'lucide-react';
import {
  processDiscoveryPackage,
  getDiscoveryPackage,
  listProposals,
  getFriendlyErrorMessage
} from '@/api/proposalApi';
import { formatDate } from '@/utils/helpers';

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_MS = 3 * 60 * 1000; // 3 minutes polling timeout

/**
 * 5 Simplified Thinking / Processing Steps
 */
function ProcessingProposalCard({
  elapsedSeconds,
  isTakingLong,
  onKeepWaiting,
  onBackToProposals,
  packageStatus = 'PROCESSING',
  packageName = 'Discovery Package',
  fileCount = 0
}) {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const elapsedLabel = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  const isExtractionDone = packageStatus === 'GENERATING' || packageStatus === 'PROCESSED';
  const isGenerationDone = packageStatus === 'PROCESSED';

  return (
    <div className="preparing-proposal-card animate-fade-in">
      <div className="preparing-header">
        <span className="preparing-spinner" aria-hidden="true" />
        <div>
          <h3 className="preparing-title">Generating Solution Proposal…</h3>
          <p className="preparing-subtitle">
            Analyzing <strong>{packageName}</strong> ({fileCount > 0 ? `${fileCount} documents` : 'documents'}). Processing requirements, solution specifications, and compiling structured proposal sections.
          </p>
        </div>
      </div>

      {/* Live Pipeline Steps Progress */}
      <div className="pipeline-steps-card">
        {/* Step 1: Preparing Documents */}
        <div className="pipeline-step-item step-completed">
          <div className="pipeline-step-icon">
            <CheckCircle2 size={16} />
          </div>
          <div className="pipeline-step-info">
            <span className="pipeline-step-title">1. Preparing Documents</span>
            <span className="pipeline-step-desc">Staged discovery files validated and queued</span>
          </div>
          <span className="pipeline-step-badge badge-done">Done</span>
        </div>

        {/* Step 2: Creating Discovery Session */}
        <div className="pipeline-step-item step-completed">
          <div className="pipeline-step-icon">
            <CheckCircle2 size={16} />
          </div>
          <div className="pipeline-step-info">
            <span className="pipeline-step-title">2. Creating Discovery Session</span>
            <span className="pipeline-step-desc">Initialized discovery package and local storage</span>
          </div>
          <span className="pipeline-step-badge badge-done">Done</span>
        </div>

        {/* Step 3: Extracting Document Content */}
        <div className={`pipeline-step-item ${isExtractionDone ? 'step-completed' : 'step-active'}`}>
          <div className="pipeline-step-icon">
            {isExtractionDone ? <CheckCircle2 size={16} /> : <Loader2 size={16} className="discovery-spin" />}
          </div>
          <div className="pipeline-step-info">
            <span className="pipeline-step-title">3. Extracting Document Content</span>
            <span className="pipeline-step-desc">Extracting text, specifications, and scope notes</span>
          </div>
          <span className={`pipeline-step-badge ${isExtractionDone ? 'badge-done' : 'badge-active'}`}>
            {isExtractionDone ? 'Extracted' : 'In Progress'}
          </span>
        </div>

        {/* Step 4: Analyzing Customer Requirements */}
        <div className={`pipeline-step-item ${isExtractionDone ? (isGenerationDone ? 'step-completed' : 'step-active') : 'step-pending'}`}>
          <div className="pipeline-step-icon">
            {isGenerationDone ? (
              <CheckCircle2 size={16} />
            ) : isExtractionDone ? (
              <Loader2 size={16} className="discovery-spin" />
            ) : (
              <Clock size={16} />
            )}
          </div>
          <div className="pipeline-step-info">
            <span className="pipeline-step-title">4. Analyzing Customer Requirements</span>
            <span className="pipeline-step-desc">Identifying client goals, pain points, and architecture needs</span>
          </div>
          <span className={`pipeline-step-badge ${isGenerationDone ? 'badge-done' : isExtractionDone ? 'badge-active' : 'badge-pending'}`}>
            {isGenerationDone ? 'Done' : isExtractionDone ? 'Analyzing…' : 'Queued'}
          </span>
        </div>

        {/* Step 5: Generating Proposal */}
        <div className={`pipeline-step-item ${packageStatus === 'GENERATING' ? 'step-active' : isGenerationDone ? 'step-completed' : 'step-pending'}`}>
          <div className="pipeline-step-icon">
            {isGenerationDone ? (
              <CheckCircle2 size={16} />
            ) : packageStatus === 'GENERATING' ? (
              <Loader2 size={16} className="discovery-spin" />
            ) : (
              <Clock size={16} />
            )}
          </div>
          <div className="pipeline-step-info">
            <span className="pipeline-step-title">5. Generating Proposal</span>
            <span className="pipeline-step-desc">Structuring deliverables, executive summary, and solutions</span>
          </div>
          <span className={`pipeline-step-badge ${isGenerationDone ? 'badge-done' : packageStatus === 'GENERATING' ? 'badge-active' : 'badge-pending'}`}>
            {isGenerationDone ? 'Ready' : packageStatus === 'GENERATING' ? 'Generating…' : 'Queued'}
          </span>
        </div>

        {/* Step 6: Finalizing Proposal */}
        <div className={`pipeline-step-item ${isGenerationDone ? 'step-completed' : 'step-pending'}`}>
          <div className="pipeline-step-icon">
            {isGenerationDone ? <CheckCircle2 size={16} /> : <Clock size={16} />}
          </div>
          <div className="pipeline-step-info">
            <span className="pipeline-step-title">6. Finalizing Proposal</span>
            <span className="pipeline-step-desc">Publishing solution proposal and preparing interactive view</span>
          </div>
          <span className={`pipeline-step-badge ${isGenerationDone ? 'badge-done' : 'badge-pending'}`}>
            {isGenerationDone ? 'Published' : 'Queued'}
          </span>
        </div>
      </div>

      <div className="preparing-elapsed-row">
        <Clock size={14} />
        <span>Elapsed: {elapsedLabel}</span>
      </div>

      {isTakingLong && (
        <div className="preparing-timeout-notice animate-fade-in">
          <p>Proposal generation is taking a little longer than usual. You can continue waiting or return to the proposals list.</p>
          <div className="preparing-timeout-actions">
            <button type="button" className="btn-keep-waiting" onClick={onKeepWaiting}>Keep waiting</button>
            <button type="button" className="btn-back-to-proposals-inline" onClick={onBackToProposals}>Back to proposals</button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Requirement 7: Proposal Result Screen
 */
function ProposalResultCard({
  proposal,
  discoveryPackage,
  onViewDetails,
  onCreateAnother,
  onBackToProposals
}) {
  const customerName = proposal?.customer_name || 'Client';
  const proposalId = proposal?.proposal_id || '—';
  const fileCount = proposal?.content?.sources?.length || discoveryPackage?.files?.length || 1;
  const createdAt = proposal?.created_at ? formatDate(proposal.created_at) : formatDate();
  const status = proposal?.status || 'Draft';
  const targetUrl = proposal?.generated_url || proposal?.slate_url || `https://spikra-ai-proposal-698386704.development.catalystserverless.com/proposal/api?resource=view&proposal_id=${proposalId}`;

  return (
    <div className="proposal-result-card animate-fade-in">
      <div className="proposal-result-badge">
        <CheckCircle2 size={16} />
        <span>Proposal Generated Successfully</span>
      </div>

      <h2 className="proposal-result-title">
        {proposal?.proposal_title || `${customerName} — Solution Proposal`}
      </h2>

      <div className="proposal-result-meta-grid">
        <div className="result-meta-item">
          <span className="result-meta-label">Customer Name</span>
          <span className="result-meta-value">{customerName}</span>
        </div>
        <div className="result-meta-item">
          <span className="result-meta-label">Proposal ID</span>
          <span className="result-meta-value result-code">{proposalId}</span>
        </div>
        <div className="result-meta-item">
          <span className="result-meta-label">Source Documents</span>
          <span className="result-meta-value">{fileCount} document{fileCount === 1 ? '' : 's'}</span>
        </div>
        <div className="result-meta-item">
          <span className="result-meta-label">Generated Date & Time</span>
          <span className="result-meta-value">{createdAt}</span>
        </div>
        <div className="result-meta-item">
          <span className="result-meta-label">Proposal Status</span>
          <span className="result-status-pill">{status}</span>
        </div>
      </div>

      <div className="proposal-result-actions">
        <motion.button
          type="button"
          className="btn-open-proposal"
          onClick={() => {
            console.log(`[Workspace 2 Proposal API] 🌐 Opening proposal URL:`, targetUrl);
            window.open(targetUrl, '_blank', 'noopener,noreferrer');
          }}
          whileHover={{ scale: 1.02, y: -1 }}
          whileTap={{ scale: 0.98 }}
        >
          <ArrowUpRight size={17} />
          <span>Open Proposal</span>
        </motion.button>

        {onViewDetails && (
          <button
            type="button"
            className="btn-result-secondary"
            onClick={onViewDetails}
          >
            <span>View Details Breakdown</span>
          </button>
        )}

        <button
          type="button"
          className="btn-result-ghost"
          onClick={onCreateAnother}
        >
          <span>Create Another Proposal</span>
        </button>

        <button
          type="button"
          className="btn-result-ghost"
          onClick={onBackToProposals}
        >
          <span>Back to Proposals</span>
        </button>
      </div>
    </div>
  );
}

export default function CreateProposal({
  onNavigate,
  onViewProposal,
  onToast
}) {
  const [step, setStep] = useState('discovery'); // 'discovery' | 'review' | 'processing' | 'result'
  const [discoveryPackage, setDiscoveryPackage] = useState(null);
  const [generatedProposal, setGeneratedProposal] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTakingLong, setIsTakingLong] = useState(false);
  const [packageStatus, setPackageStatus] = useState('PROCESSING');

  const pollAbortRef = useRef(null);
  const timerRef = useRef(null);

  const startTimer = () => {
    stopTimer();
    const start = Date.now();
    setElapsedSeconds(0);
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - start) / 1000));
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopTimer();
      // Stop any in-flight polling if the salesperson navigates away mid-generation.
      if (pollAbortRef.current) pollAbortRef.current.abort();
    };
  }, []);

  const handleBackToProposals = () => {
    stopTimer();
    if (pollAbortRef.current) pollAbortRef.current.abort();
    if (onNavigate) onNavigate('proposal', 'proposal-list');
  };

  const handlePackageCreated = (pkg) => {
    setDiscoveryPackage(pkg);
    setStep('review');
  };

  const handlePackageUpdated = (pkg) => {
    setDiscoveryPackage(pkg);
  };

  const pollForProposal = async (packageId, signal) => {
    const start = Date.now();

    while (!signal.aborted) {
      const elapsed = Math.floor((Date.now() - start) / 1000);

      if (elapsed >= MAX_POLL_MS / 1000) {
        setIsTakingLong(true);
      }

      console.log(`[Workspace 2 Proposal API] 📡 Polling status (elapsed ${elapsed}s): GET /proposal/discovery?package_id=${packageId}`);
      let pkgRes;
      try {
        pkgRes = await getDiscoveryPackage(packageId, signal);
      } catch (err) {
        if (signal.aborted) return null;
        console.warn(`[Workspace 2 Proposal API] Polling warning:`, err.message);
      }

      const pkgStatus = pkgRes?.package?.status;
      if (pkgStatus) {
        console.log(`[Workspace 2 Proposal API] 📊 Backend status: ${pkgStatus}`);
        setPackageStatus(pkgStatus);
      }

      if (pkgStatus === 'FAILED') {
        stopTimer();
        throw new Error('Discovery package processing failed.');
      }

      if (pkgStatus === 'PROCESSED') {
        console.log(`[Workspace 2 Proposal API] 🔍 Package is PROCESSED! Fetching generated proposal: GET /proposal/api?resource=proposals&package_id=${packageId}`);
        let proposalsRes;
        try {
          proposalsRes = await listProposals(packageId, signal);
        } catch (err) {
          if (signal.aborted) return null;
          proposalsRes = null;
        }
        const proposal = proposalsRes?.proposals?.[0];
        if (proposal) {
          console.log(`[Workspace 2 Proposal API] 🎉 Proposal ready!`, proposal);
          stopTimer();
          setGeneratedProposal(proposal);
          setStep('result');
          if (onToast) onToast('Proposal generated successfully.', 'success', 5000);
          return proposal;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    return null;
  };

  // Direct 1-click generate from the intake page: package was just created
  const handleDirectGenerate = async (pkg) => {
    setDiscoveryPackage(pkg);
    setStep('processing');
    startTimer();
    setIsTakingLong(false);
    setPackageStatus('PROCESSING');

    const packageId = pkg.package_id;
    console.log(`[Workspace 2 Proposal API] 🚀 Initiating proposal generation for package: ${packageId}`);

    processDiscoveryPackage(packageId)
      .then((res) => {
        console.log(`[Workspace 2 Proposal API] ✅ Process trigger acknowledged:`, res);
      })
      .catch((err) => {
        console.warn(`[Workspace 2 Proposal API] Process call background notice (polling active):`, err.message);
      });

    const controller = new AbortController();
    pollAbortRef.current = controller;

    try {
      await pollForProposal(packageId, controller.signal);
    } catch (err) {
      stopTimer();
      if (!controller.signal.aborted) {
        const message = getFriendlyErrorMessage(err);
        if (onToast) onToast(message, 'error', 6000);
        setStep('review');
      }
    }
  };

  const handleGenerate = async () => {
    const packageId = discoveryPackage.package_id;
    setStep('processing');
    startTimer();
    setIsTakingLong(false);
    setPackageStatus('PROCESSING');

    console.log(`[Workspace 2 Proposal API] 🚀 Starting proposal generation for package: ${packageId}`);

    processDiscoveryPackage(packageId)
      .then((res) => {
        console.log(`[Workspace 2 Proposal API] ✅ Process trigger acknowledged:`, res);
      })
      .catch((err) => {
        console.warn(`[Workspace 2 Proposal API] Process call background notice (polling active):`, err.message);
      });

    const controller = new AbortController();
    pollAbortRef.current = controller;

    try {
      await pollForProposal(packageId, controller.signal);
    } catch (err) {
      stopTimer();
      if (!controller.signal.aborted) {
        const message = getFriendlyErrorMessage(err);
        if (onToast) onToast(message, 'error', 6000);
        setStep('review');
      }
    }
  };

  const handleKeepWaiting = () => {
    setIsTakingLong(false);
    const packageId = discoveryPackage?.package_id;
    if (!packageId) return;

    const controller = new AbortController();
    pollAbortRef.current = controller;

    pollForProposal(packageId, controller.signal).catch((err) => {
      stopTimer();
      if (!controller.signal.aborted) {
        if (onToast) onToast(getFriendlyErrorMessage(err), 'error', 6000);
        setStep('review');
      }
    });
  };

  return (
    <div className="create-proposal-page animate-fade-in">
      <div className="container create-proposal-container">
        {/* Navigation Breadcrumb Bar */}
        <div className="create-proposal-nav-bar">
          <motion.button
            type="button"
            className="btn-back-to-proposals"
            onClick={handleBackToProposals}
            whileHover={{ x: -3 }}
            transition={{ duration: 0.15 }}
          >
            <ArrowLeft size={15} />
            <span>Back to Proposals</span>
          </motion.button>

          <div className="nav-engine-pill">
            <span className="engine-ping-dot" />
            <span>Workspace 2 • Solution Architecture</span>
          </div>
        </div>

        {/* Hero Header */}
        <section className="proposal-hero-section" aria-labelledby="proposal-hero-heading">
          <motion.div
            className="proposal-hero-badge"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <FileText size={13} className="hero-badge-icon" />
            <span>Workspace 2 • Solution Proposal</span>
          </motion.div>

          <motion.h1
            id="proposal-hero-heading"
            className="proposal-hero-title"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
          >
            Solution Proposal
          </motion.h1>

          <motion.p
            className="proposal-hero-subtext"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
          >
            Upload customer discovery documents and materials to generate a structured, client-ready solution proposal.
          </motion.p>
        </section>

        {/* Body: Discovery -> Review -> Processing -> Result */}
        <div className="create-proposal-body">
          <AnimatePresence mode="wait">
            {step === 'discovery' ? (
              <motion.div
                key="discovery"
                className="proposal-card-single"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
              >
                <DiscoveryUploadCard
                  onContinue={handlePackageCreated}
                  onGenerate={handleDirectGenerate}
                  onToast={onToast}
                />
              </motion.div>
            ) : step === 'review' ? (
              <motion.div
                key="review"
                className="proposal-card-single"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
              >
                <DiscoveryPackageReview
                  discoveryPackage={discoveryPackage}
                  onPackageUpdated={handlePackageUpdated}
                  onGenerate={handleGenerate}
                  onToast={onToast}
                />
              </motion.div>
            ) : step === 'processing' ? (
              <motion.div
                key="processing"
                className="proposal-card-single"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
              >
                <ProcessingProposalCard
                  elapsedSeconds={elapsedSeconds}
                  isTakingLong={isTakingLong}
                  onKeepWaiting={handleKeepWaiting}
                  onBackToProposals={handleBackToProposals}
                  packageStatus={packageStatus}
                  packageName={discoveryPackage?.package_name || 'Discovery Package'}
                  fileCount={discoveryPackage?.files?.length || 0}
                />
              </motion.div>
            ) : (
              <motion.div
                key="result"
                className="proposal-card-single"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
              >
                <ProposalResultCard
                  proposal={generatedProposal}
                  discoveryPackage={discoveryPackage}
                  onViewDetails={() => {
                    if (onViewProposal && generatedProposal?.proposal_id) {
                      onViewProposal(generatedProposal.proposal_id);
                    } else if (onNavigate) {
                      onNavigate('proposal', 'proposal-details');
                    }
                  }}
                  onCreateAnother={() => {
                    setStep('discovery');
                    setDiscoveryPackage(null);
                    setGeneratedProposal(null);
                  }}
                  onBackToProposals={handleBackToProposals}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
