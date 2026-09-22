import React, { useEffect, useState, useRef } from 'react';
import './CreateProposal.css';
import DiscoveryUploadCard from '@/components/proposal/DiscoveryUploadCard/DiscoveryUploadCard';
import DiscoveryPackageReview from '@/components/proposal/DiscoveryPackageReview/DiscoveryPackageReview';
import SpotlightCard from '@/reactbits/SpotlightCard';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  Sparkles,
  CheckCircle2,
  Loader2,
  Database,
  FileText,
  Layers,
  ShieldCheck,
  Zap,
  ArrowRight,
  FileSpreadsheet
} from 'lucide-react';
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

          <div className="nav-engine-pill">
            <span className="engine-ping-ring">
              <span className="engine-ping-dot" />
            </span>
            <span>Workspace 2 • Zia AI Engine Ready</span>
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
            <Sparkles size={13} className="hero-badge-sparkle" />
            <span>AI Solution Studio • Workspace 2</span>
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

        {/* Body: Discovery Studio -> Review -> Processing */}
        <div className="create-proposal-body">
          <AnimatePresence mode="wait">
            {step === 'discovery' ? (
              <motion.div
                key="discovery"
                className="proposal-studio-grid"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
              >
                {/* Left Column: Intake Studio */}
                <div className="proposal-studio-main">
                  <DiscoveryUploadCard
                    onContinue={handlePackageCreated}
                    onGenerate={handleDirectGenerate}
                    onToast={onToast}
                  />
                </div>

                {/* Right Column: 21st.dev Bento Intelligence Sidebar */}
                <aside className="proposal-studio-sidebar" aria-label="Proposal synthesis features">
                  {/* Bento Card 1: What Zia Synthesizes */}
                  <SpotlightCard className="studio-bento-card bento-card-synthesis" spotlightColor="rgba(255, 122, 26, 0.12)">
                    <div className="bento-card-header">
                      <div className="bento-icon-wrap icon-wrap-orange">
                        <Sparkles size={17} />
                      </div>
                      <div className="bento-header-text">
                        <span className="bento-pill-tag">ZIA AI AGENT</span>
                        <h3 className="bento-card-title">Proposal Synthesis</h3>
                      </div>
                    </div>
                    <p className="bento-card-desc">
                      Uploaded discovery content is analyzed and structured into 5 client-ready executive sections:
                    </p>
                    <ul className="bento-pillars-list">
                      <li className="bento-pillar-item">
                        <span className="pillar-dot dot-orange" />
                        <div className="pillar-content">
                          <span className="pillar-title">Executive Summary & Context</span>
                          <span className="pillar-sub">Strategic goals & problem statement</span>
                        </div>
                      </li>
                      <li className="bento-pillar-item">
                        <span className="pillar-dot dot-blue" />
                        <div className="pillar-content">
                          <span className="pillar-title">Objectives & Gap Analysis</span>
                          <span className="pillar-sub">Operational challenges mapped to outcomes</span>
                        </div>
                      </li>
                      <li className="bento-pillar-item">
                        <span className="pillar-dot dot-purple" />
                        <div className="pillar-content">
                          <span className="pillar-title">Zoho Solution Architecture</span>
                          <span className="pillar-sub">Target apps, workflows & data sync</span>
                        </div>
                      </li>
                      <li className="bento-pillar-item">
                        <span className="pillar-dot dot-emerald" />
                        <div className="pillar-content">
                          <span className="pillar-title">Implementation Phasing</span>
                          <span className="pillar-sub">Sprint milestones & deliverables roadmap</span>
                        </div>
                      </li>
                      <li className="bento-pillar-item">
                        <span className="pillar-dot dot-amber" />
                        <div className="pillar-content">
                          <span className="pillar-title">Commercials & Projected ROI</span>
                          <span className="pillar-sub">Investment estimates & value metrics</span>
                        </div>
                      </li>
                    </ul>
                  </SpotlightCard>

                  {/* Bento Card 2: Formats & Multi-file */}
                  <SpotlightCard className="studio-bento-card bento-card-formats" spotlightColor="rgba(0, 82, 255, 0.08)">
                    <div className="bento-card-header">
                      <div className="bento-icon-wrap icon-wrap-blue">
                        <Layers size={17} />
                      </div>
                      <div className="bento-header-text">
                        <span className="bento-pill-tag tag-blue">SMART EXTRACTION</span>
                        <h3 className="bento-card-title">Supported Inputs</h3>
                      </div>
                    </div>
                    <p className="bento-card-desc">
                      Upload individual files or full folders. Zia parses text, multi-sheet spreadsheets, and notes:
                    </p>
                    <div className="bento-format-chips">
                      <div className="bento-chip">
                        <span className="chip-badge badge-pdf">PDF</span>
                        <span>RFPs & Specs</span>
                      </div>
                      <div className="bento-chip">
                        <span className="chip-badge badge-doc">DOCX</span>
                        <span>MOMs & Notes</span>
                      </div>
                      <div className="bento-chip">
                        <span className="chip-badge badge-sheet">XLSX</span>
                        <span>Sheets & Pricing</span>
                      </div>
                      <div className="bento-chip">
                        <span className="chip-badge badge-text">TXT</span>
                        <span>Transcripts</span>
                      </div>
                    </div>
                  </SpotlightCard>

                  {/* Bento Card 3: Stratus Security */}
                  <SpotlightCard className="studio-bento-card bento-card-security" spotlightColor="rgba(16, 185, 129, 0.08)">
                    <div className="bento-card-header">
                      <div className="bento-icon-wrap icon-wrap-emerald">
                        <ShieldCheck size={17} />
                      </div>
                      <div className="bento-header-text">
                        <span className="bento-pill-tag tag-emerald">CATALYST STRATUS</span>
                        <h3 className="bento-card-title">Secure & Instant</h3>
                      </div>
                    </div>
                    <p className="bento-card-desc">
                      Files are encrypted in Catalyst Stratus. Generated proposals are instantly published as interactive web views & exportable PDFs.
                    </p>
                  </SpotlightCard>
                </aside>
              </motion.div>
            ) : step === 'review' ? (
              <motion.div
                key="review"
                className="proposal-studio-single"
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
                className="proposal-studio-single"
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
