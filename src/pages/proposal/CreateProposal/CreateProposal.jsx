import React, { useEffect, useState, useRef } from 'react';
import './CreateProposal.css';
import DiscoveryUploadCard from '@/components/proposal/DiscoveryUploadCard/DiscoveryUploadCard';
import DiscoveryPackageReview from '@/components/proposal/DiscoveryPackageReview/DiscoveryPackageReview';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, Sparkles, CheckCircle2, Loader2, Database, FileText } from 'lucide-react';
import { processDiscoveryPackage, getDiscoveryPackage, listProposals, getFriendlyErrorMessage } from '@/api/proposalApi';

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_MS = 3 * 60 * 1000; // 3 minutes - a frontend polling timeout, never a proposal failure

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
  const isSynthesisActive = packageStatus === 'GENERATING' || packageStatus === 'PROCESSING';

  return (
    <div className="preparing-proposal-card animate-fade-in">
      <div className="preparing-header">
        <span className="preparing-spinner" aria-hidden="true" />
        <div>
          <h3 className="preparing-title">Synthesizing Proposal with Zia AI…</h3>
          <p className="preparing-subtitle">
            Analyzing <strong>{packageName}</strong> ({fileCount > 0 ? `${fileCount} documents` : 'documents'}). Zia AI is extracting key requirements, goals, and structuring client-ready proposal sections.
          </p>
        </div>
      </div>

      {/* Live Pipeline Steps Progress */}
      <div className="pipeline-steps-card">
        <div className="pipeline-step-item step-completed">
          <div className="pipeline-step-icon">
            <CheckCircle2 size={16} />
          </div>
          <div className="pipeline-step-info">
            <span className="pipeline-step-title">1. Stratus Storage & Records</span>
            <span className="pipeline-step-desc">All files stored securely in Stratus bucket & registered in table</span>
          </div>
          <span className="pipeline-step-badge badge-done">Done</span>
        </div>

        <div className={`pipeline-step-item ${isExtractionDone ? 'step-completed' : 'step-active'}`}>
          <div className="pipeline-step-icon">
            {isExtractionDone ? <CheckCircle2 size={16} /> : <Loader2 size={16} className="discovery-spin" />}
          </div>
          <div className="pipeline-step-info">
            <span className="pipeline-step-title">2. Text & Document Extraction</span>
            <span className="pipeline-step-desc">Extracting content from PDF, DOCX, XLSX, and notes</span>
          </div>
          <span className={`pipeline-step-badge ${isExtractionDone ? 'badge-done' : 'badge-active'}`}>
            {isExtractionDone ? 'Extracted' : 'In progress'}
          </span>
        </div>

        <div className={`pipeline-step-item ${packageStatus === 'GENERATING' ? 'step-active' : packageStatus === 'PROCESSED' ? 'step-completed' : 'step-pending'}`}>
          <div className="pipeline-step-icon">
            {packageStatus === 'PROCESSED' ? (
              <CheckCircle2 size={16} />
            ) : packageStatus === 'GENERATING' ? (
              <Sparkles size={16} className="step-sparkle-spin" />
            ) : (
              <Clock size={16} />
            )}
          </div>
          <div className="pipeline-step-info">
            <span className="pipeline-step-title">3. Zia AI Agent Reasoning & Generation</span>
            <span className="pipeline-step-desc">Synthesizing executive summary, requirements, solutions & deliverables</span>
          </div>
          <span className={`pipeline-step-badge ${packageStatus === 'PROCESSED' ? 'badge-done' : packageStatus === 'GENERATING' ? 'badge-active' : 'badge-pending'}`}>
            {packageStatus === 'PROCESSED' ? 'Ready' : packageStatus === 'GENERATING' ? 'Synthesizing…' : 'Queued'}
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

export default function CreateProposal({
  onNavigate,
  onViewProposal,
  onToast
}) {
  const [step, setStep] = useState('discovery'); // 'discovery' | 'review' | 'processing'
  const [discoveryPackage, setDiscoveryPackage] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTakingLong, setIsTakingLong] = useState(false);
  const [packageStatus, setPackageStatus] = useState('PROCESSING');

  const pollAbortRef = useRef(null);

  useEffect(() => {
    return () => {
      // Stop any in-flight polling if the salesperson navigates away mid-generation.
      if (pollAbortRef.current) pollAbortRef.current.abort();
    };
  }, []);

  const handleBackToProposals = () => {
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
      const elapsed = Date.now() - start;
      setElapsedSeconds(Math.floor(elapsed / 1000));

      if (elapsed >= MAX_POLL_MS) {
        setIsTakingLong(true);
        return null;
      }

      let pkgRes;
      try {
        pkgRes = await getDiscoveryPackage(packageId, signal);
      } catch (err) {
        if (signal.aborted) return null;
        throw err;
      }

      const pkgStatus = pkgRes.package?.status;
      if (pkgStatus) {
        setPackageStatus(pkgStatus);
      }

      if (pkgStatus === 'FAILED') {
        throw new Error('Discovery package processing failed.');
      }

      if (pkgStatus === 'PROCESSED') {
        let proposalsRes;
        try {
          proposalsRes = await listProposals(packageId, signal);
        } catch (err) {
          if (signal.aborted) return null;
          proposalsRes = null;
        }
        const proposal = proposalsRes?.proposals?.[0];
        if (proposal) return proposal;
      }

      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    }

    return null;
  };

  // Direct 1-click generate from the intake page: package was just created
  const handleDirectGenerate = async (pkg) => {
    setDiscoveryPackage(pkg);
    setStep('processing');
    setElapsedSeconds(0);
    setIsTakingLong(false);
    setPackageStatus('PROCESSING');

    const packageId = pkg.package_id;

    try {
      await processDiscoveryPackage(packageId);
    } catch (err) {
      const message = getFriendlyErrorMessage(err);
      if (onToast) onToast(message, 'error', 6000);
      setStep('discovery');
      return;
    }

    const controller = new AbortController();
    pollAbortRef.current = controller;

    try {
      const proposal = await pollForProposal(packageId, controller.signal);
      if (controller.signal.aborted) return;

      if (proposal) {
        if (onToast) onToast('Proposal generated successfully.', 'success', 5000);
        if (onViewProposal) onViewProposal(proposal.proposal_id);
        else if (onNavigate) onNavigate('proposal', 'proposal-list');
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        const message = getFriendlyErrorMessage(err);
        if (onToast) onToast(message, 'error', 6000);
        setStep('review');
      }
    }
  };

  const handleGenerate = async () => {
    const packageId = discoveryPackage.package_id;

    try {
      await processDiscoveryPackage(packageId);
    } catch (err) {
      const message = getFriendlyErrorMessage(err);
      if (onToast) onToast(message, 'error', 6000);
      throw err;
    }

    if (onToast) onToast('Proposal generation started.', 'success', 4000);
    setStep('processing');
    setElapsedSeconds(0);
    setIsTakingLong(false);
    setPackageStatus('PROCESSING');

    const controller = new AbortController();
    pollAbortRef.current = controller;

    try {
      const proposal = await pollForProposal(packageId, controller.signal);
      if (controller.signal.aborted) return;

      if (proposal) {
        if (onToast) onToast('Proposal generated successfully.', 'success', 5000);
        if (onViewProposal) onViewProposal(proposal.proposal_id);
        else if (onNavigate) onNavigate('proposal', 'proposal-list');
      }
    } catch (err) {
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

    pollForProposal(packageId, controller.signal)
      .then((proposal) => {
        if (controller.signal.aborted) return;
        if (proposal) {
          if (onToast) onToast('Proposal generated successfully.', 'success', 5000);
          if (onViewProposal) onViewProposal(proposal.proposal_id);
          else if (onNavigate) onNavigate('proposal', 'proposal-list');
        }
      })
      .catch((err) => {
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
        </div>

        {/* Hero Header */}
        <section className="proposal-hero-section" aria-labelledby="proposal-hero-heading">
          <motion.div
            className="proposal-hero-badge"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          >
            <Sparkles size={13} className="hero-badge-sparkle" />
            <span>Workspace 2 • AI Solution Proposals</span>
          </motion.div>

          <motion.h1
            id="proposal-hero-heading"
            className="proposal-hero-title"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
          >
            Turn Discovery Notes Into{' '}
            <span className="proposal-hero-gradient-text">
              Structured Proposals
            </span>
          </motion.h1>

          <motion.p
            className="proposal-hero-subtext"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.1 }}
          >
            Upload customer discovery documents, MOMs, or RFPs. Zia AI analyzes requirements and generates a comprehensive, client-ready solution proposal.
          </motion.p>
        </section>

        {/* Body: Discovery -> Review -> Processing */}
        <div className="create-proposal-body">
          <AnimatePresence mode="wait">
            {step === 'discovery' ? (
              <motion.div
                key="discovery"
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
            ) : (
              <motion.div
                key="processing"
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
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
