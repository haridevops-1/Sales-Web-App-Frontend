import React, { useEffect, useState, useRef, useCallback } from 'react';
import './CreateProposal.css';
import DiscoveryUploadCard from '@/components/proposal/DiscoveryUploadCard/DiscoveryUploadCard';
import DiscoveryPackageReview from '@/components/proposal/DiscoveryPackageReview/DiscoveryPackageReview';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  CheckCircle2,
  Loader2,
  FileText,
  ArrowUpRight,
  Copy,
  Check,
  Building2,
  Calendar,
  ShieldCheck,
  Lock,
  ExternalLink,
  Plus
} from 'lucide-react';
import {
  processDiscoveryPackage,
  getProposal,
  listProposals,
  getFriendlyErrorMessage
} from '@/api/proposalApi';
import { formatDate, formatProposalUrl } from '@/utils/helpers';

/**
 * The 6 distinct Solution Proposal Generation Steps
 */
const PIPELINE_STEPS = [
  {
    id: 1,
    title: '1. Validating Discovery Documents',
    desc: 'Verifying file formats, schema structure, and upload integrity',
    activeBadge: 'Validating…',
    doneBadge: 'Validated'
  },
  {
    id: 2,
    title: '2. Initializing Discovery Session',
    desc: 'Allocating workspace sandbox and securing cloud storage session',
    activeBadge: 'Initializing…',
    doneBadge: 'Initialized'
  },
  {
    id: 3,
    title: '3. Extracting Document Content',
    desc: 'Extracting text, specifications, and scope notes across all files',
    activeBadge: 'Extracting…',
    doneBadge: 'Extracted'
  },
  {
    id: 4,
    title: '4. Analyzing Requirements & Architecture',
    desc: 'Synthesizing client pain points, workflows, and solution architecture',
    activeBadge: 'Analyzing…',
    doneBadge: 'Analyzed'
  },
  {
    id: 5,
    title: '5. Compiling Structured Proposal',
    desc: 'Structuring executive summary, deliverables, timeline, and scope',
    activeBadge: 'Compiling…',
    doneBadge: 'Compiled'
  },
  {
    id: 6,
    title: '6. Publishing Solution Proposal',
    desc: 'Provisioning live interactive URL and securing client preview',
    activeBadge: 'Publishing…',
    doneBadge: 'Published'
  }
];

/**
 * 6 Thinking / Processing Steps with realistic dynamic progression.
 * Steps are NOT prefilled. Step 3 features a smooth rotating spinner.
 * When generation completes, all remaining steps cascade to Done with 100% completion.
 */
function ProcessingProposalCard({
  elapsedSeconds,
  activeStepIndex = 0,
  isAllComplete = false,
  isTakingLong,
  onKeepWaiting,
  onBackToProposals,
  packageName = 'Discovery Package',
  fileCount = 0
}) {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const elapsedLabel = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

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

      {isAllComplete && (
        <div className="pipeline-complete-banner animate-fade-in">
          <CheckCircle2 size={16} className="banner-check-icon" />
          <span>All 6 pipeline steps completed successfully · Redirecting to interactive showcase...</span>
        </div>
      )}

      {/* Live Pipeline Steps Progress */}
      <div className="pipeline-steps-card">
        {PIPELINE_STEPS.map((step, idx) => {
          const isDone = isAllComplete || idx < activeStepIndex;
          const isActive = !isAllComplete && idx === activeStepIndex;
          const isPending = !isAllComplete && idx > activeStepIndex;

          const itemClass = isDone ? 'step-completed' : isActive ? 'step-active' : 'step-pending';
          const badgeClass = isDone ? 'badge-done' : isActive ? 'badge-active' : 'badge-pending';
          const badgeText = isDone ? step.doneBadge : isActive ? step.activeBadge : 'Queued';

          return (
            <div key={step.id} className={`pipeline-step-item ${itemClass}`}>
              <div className="pipeline-step-icon">
                {isDone ? (
                  <CheckCircle2 size={16} />
                ) : isActive ? (
                  <Loader2 size={16} className="discovery-spin" />
                ) : (
                  <Clock size={16} />
                )}
              </div>
              <div className="pipeline-step-info">
                <span className="pipeline-step-title">{step.title}</span>
                <span className="pipeline-step-desc">{step.desc}</span>
              </div>
              <span className={`pipeline-step-badge ${badgeClass}`}>
                {badgeText}
              </span>
            </div>
          );
        })}
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
 * 21st.dev Redesigned Enterprise Proposal Result Card:
 * Features ambient top border, security credentials, 4-metric bento grid,
 * interactive live URL box with 1-click copy feedback, and primary CTA suite.
 */
function ProposalResultCard({
  proposal,
  discoveryPackage,
  onViewDetails,
  onCreateAnother,
  onBackToProposals
}) {
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const customerName = proposal?.customer_name || 'Client';
  const proposalId = proposal?.proposal_id || '—';
  const fileCount = proposal?.content?.sources?.length || discoveryPackage?.files?.length || 1;
  const createdAt = proposal?.created_at ? formatDate(proposal.created_at) : formatDate();
  const status = proposal?.status || 'COMPLETED';

  let targetUrl = proposal?.proposal_url || proposal?.generated_url || proposal?.slate_url || (proposalId && proposalId !== '—' ? `https://spikra-w2-proposal-jmdbymcs.onslate.com/?proposal_id=${proposalId}` : null);
  if (targetUrl && targetUrl.includes('spikra-customer-prop-msdrrgbk.onslate.com')) {
    targetUrl = targetUrl.replace('spikra-customer-prop-msdrrgbk.onslate.com', 'spikra-w2-proposal-jmdbymcs.onslate.com');
  }

  const handleCopyUrl = async () => {
    if (!targetUrl) return;
    try {
      await navigator.clipboard.writeText(targetUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch (e) {
      console.warn('Clipboard write failed', e);
    }
  };

  const handleCopyId = async () => {
    if (!proposalId || proposalId === '—') return;
    try {
      await navigator.clipboard.writeText(proposalId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2500);
    } catch (e) {
      console.warn('Clipboard write failed', e);
    }
  };

  const initials = customerName
    ? customerName
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'SP';

  return (
    <div className="proposal-result-card modern-result-card animate-fade-in">
      {/* Top Status & Security Badges Row */}
      <div className="result-top-badge-row">
        <div className="proposal-result-badge">
          <CheckCircle2 size={15} />
          <span>PROPOSAL PUBLISHED & ACTIVE</span>
        </div>

        <div className="result-security-chip" title="Enterprise encrypted datastore session">
          <Lock size={12} className="security-icon" />
          <span>TLS 1.3 · Authenticated Datastore Session</span>
        </div>
      </div>

      {/* Hero Header with Client Monogram Avatar */}
      <div className="result-hero-client-row">
        <div className="result-client-avatar">
          <span>{initials}</span>
        </div>
        <div className="result-client-info">
          <h2 className="proposal-result-title">
            {customerName} — Solution Proposal
          </h2>
          <div className="result-id-row">
            <span className="result-id-label">Proposal ID:</span>
            <button
              type="button"
              className="result-id-badge-btn"
              onClick={handleCopyId}
              title="Click to copy Proposal ID"
            >
              <code>#{proposalId}</code>
              {copiedId ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
              <span className="btn-copy-tooltip">{copiedId ? 'Copied ID!' : 'Copy'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 21st.dev 4-Metric Bento Grid */}
      <div className="proposal-result-bento-grid">
        <div className="bento-metric-card">
          <div className="bento-metric-icon-wrap icon-blue">
            <Building2 size={16} />
          </div>
          <div className="bento-metric-data">
            <span className="bento-metric-label">Client Organization</span>
            <span className="bento-metric-value">{customerName}</span>
          </div>
        </div>

        <div className="bento-metric-card">
          <div className="bento-metric-icon-wrap icon-orange">
            <FileText size={16} />
          </div>
          <div className="bento-metric-data">
            <span className="bento-metric-label">Source Documents</span>
            <span className="bento-metric-value">{fileCount} Document{fileCount === 1 ? '' : 's'} Analyzed</span>
          </div>
        </div>

        <div className="bento-metric-card">
          <div className="bento-metric-icon-wrap icon-purple">
            <Calendar size={16} />
          </div>
          <div className="bento-metric-data">
            <span className="bento-metric-label">Generated Timestamp</span>
            <span className="bento-metric-value">{createdAt}</span>
          </div>
        </div>

        <div className="bento-metric-card">
          <div className="bento-metric-icon-wrap icon-green">
            <ShieldCheck size={16} />
          </div>
          <div className="bento-metric-data">
            <span className="bento-metric-label">Proposal Status</span>
            <span className="bento-metric-value status-completed-text">
              <span className="pulse-dot-green" />
              {status}
            </span>
          </div>
        </div>
      </div>

      {/* Interactive 21st.dev Live Client Showcase URL Box */}
      {targetUrl && (
        <div className="proposal-result-url-box modern-url-box">
          <div className="url-box-header">
            <div className="url-box-heading">
              <span className="url-box-title">CLIENT-FACING LIVE PORTAL</span>
              <span className="url-live-pill">
                <span className="url-live-dot" />
                Live On-Demand
              </span>
            </div>
            <span className="url-box-security">Encrypted HTTPS Preview</span>
          </div>

          <div className="url-box-display-row">
            <span className="url-protocol-tag">HTTPS</span>
            <a
              href={targetUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="url-display-link"
              title={targetUrl}
            >
              {targetUrl}
            </a>
            <div className="url-display-actions">
              <button
                type="button"
                className={`btn-url-action ${copiedUrl ? 'is-copied' : ''}`}
                onClick={handleCopyUrl}
                title="Copy shareable URL"
              >
                {copiedUrl ? <Check size={14} /> : <Copy size={14} />}
                <span>{copiedUrl ? 'Copied Link!' : 'Copy Link'}</span>
              </button>

              <button
                type="button"
                className="btn-url-action btn-url-test"
                onClick={() => window.open(targetUrl, '_blank', 'noopener,noreferrer')}
                title="Open live portal in new tab"
              >
                <ExternalLink size={14} />
                <span>Test Live</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Suite */}
      <div className="proposal-result-actions modern-actions-suite">
        {targetUrl && (
          <motion.button
            type="button"
            className="btn-open-proposal modern-primary-btn"
            onClick={() => {
              console.log(`[Workspace 2 Proposal API] 🌐 Opening live proposal URL:`, targetUrl);
              window.open(targetUrl, '_blank', 'noopener,noreferrer');
            }}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <ArrowUpRight size={18} strokeWidth={2.4} />
            <span>Launch Proposal Showcase</span>
          </motion.button>
        )}

        {onViewDetails && (
          <button
            type="button"
            className="btn-result-secondary"
            onClick={onViewDetails}
          >
            <span>View Architecture Breakdown</span>
          </button>
        )}

        <button
          type="button"
          className="btn-result-ghost"
          onClick={onCreateAnother}
        >
          <Plus size={15} />
          <span>Create Another Proposal</span>
        </button>

        <button
          type="button"
          className="btn-result-ghost"
          onClick={onBackToProposals}
        >
          <ArrowLeft size={15} />
          <span>Back to All Proposals</span>
        </button>
      </div>
    </div>
  );
}

export default function CreateProposal({ onNavigate, onViewProposal, onToast, onProposalCreated }) {
  const [step, setStep] = useState('discovery'); // 'discovery' | 'review' | 'processing' | 'result'
  const [discoveryPackage, setDiscoveryPackage] = useState(null);
  const [generatedProposal, setGeneratedProposal] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isAllComplete, setIsAllComplete] = useState(false);
  const [isTakingLong, setIsTakingLong] = useState(false);

  const timerRef = useRef(null);
  const stepProgressionRef = useRef(null);

  const stopTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (stepProgressionRef.current) {
      clearInterval(stepProgressionRef.current);
      stepProgressionRef.current = null;
    }
  };

  const startTimers = () => {
    stopTimers();
    const start = Date.now();
    setElapsedSeconds(0);
    setActiveStepIndex(0);
    setIsAllComplete(false);

    // Elapsed timer (1 second ticks)
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      setElapsedSeconds(elapsed);
      if (elapsed > 45) {
        setIsTakingLong(true);
      }
    }, 1000);

    // Realistic natural step progression timer
    // Step 0 -> Step 1 at ~2s
    // Step 1 -> Step 2 at ~4s
    // Step 2 -> Step 3 at ~7s (Step 3 spinner rotates smoothly)
    // Step 3 -> Step 4 at ~10s
    // Step 4 -> Step 5 at ~13s
    stepProgressionRef.current = setInterval(() => {
      const elapsed = (Date.now() - start) / 1000;
      if (elapsed >= 13) {
        setActiveStepIndex((prev) => Math.max(prev, 5));
      } else if (elapsed >= 10) {
        setActiveStepIndex((prev) => Math.max(prev, 4));
      } else if (elapsed >= 6.8) {
        setActiveStepIndex((prev) => Math.max(prev, 3));
      } else if (elapsed >= 3.8) {
        setActiveStepIndex((prev) => Math.max(prev, 2));
      } else if (elapsed >= 1.8) {
        setActiveStepIndex((prev) => Math.max(prev, 1));
      }
    }, 400);
  };

  useEffect(() => {
    return () => {
      stopTimers();
    };
  }, []);

  const handleGoToWorkspace = () => {
    stopTimers();
    if (onNavigate) onNavigate('workspace', 'hub');
  };

  const handleBackToProposals = () => {
    stopTimers();
    if (onNavigate) onNavigate('proposal', 'proposal-list');
  };

  const handlePackageCreated = (pkg) => {
    setDiscoveryPackage(pkg);
    setStep('review');
  };

  const handlePackageUpdated = (pkg) => {
    setDiscoveryPackage(pkg);
  };

  // Helper to persist proposal with salesperson entered business name and generated link
  const saveGeneratedProposal = (res, pkg) => {
    const rawProposal = res?.proposal || res || {};
    const pkgObj = pkg || discoveryPackage || {};
    const enteredBizName = pkgObj?.customer_name || pkgObj?.package_name || rawProposal?.customer_name || 'Business Client';
    const cleanBiz = String(enteredBizName).replace(/~\d+/g, '').trim() || 'Business Client';
    const proposalId = rawProposal?.proposal_id || pkgObj?.package_id || String(Date.now());
    const rawUrl = (rawProposal?.generated_url || rawProposal?.proposal_url || '').trim() ||
      `https://spikra-w2-proposal-jmdbymcs.onslate.com/?proposal_id=${proposalId}`;
    const formattedUrl = formatProposalUrl(rawUrl, proposalId) || rawUrl;

    const normalizedProposal = {
      ...rawProposal,
      proposal_id: proposalId,
      customer_name: cleanBiz,
      business_name: cleanBiz,
      package_name: cleanBiz,
      proposal_title: rawProposal?.proposal_title || `${cleanBiz} — Solution Proposal`,
      generated_url: formattedUrl,
      proposal_url: formattedUrl,
      status: (rawProposal?.status || 'COMPLETED').toUpperCase(),
      created_at: rawProposal?.created_at || new Date().toISOString()
    };

    try {
      const stored = JSON.parse(localStorage.getItem('spikra_proposals') || '[]');
      const filtered = stored.filter((p) => p.proposal_id !== proposalId);
      const updated = [normalizedProposal, ...filtered];
      localStorage.setItem('spikra_proposals', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save proposal to localStorage:', e);
    }

    return normalizedProposal;
  };

  /**
   * Cascade remaining steps to Done smoothly when backend completes,
   * guaranteeing all 6 steps are shown completing without abrupt redirection.
   */
  const cascadeCompleteRemainingSteps = async (startStep, proposalResult) => {
    // Stop the natural progression timer
    if (stepProgressionRef.current) {
      clearInterval(stepProgressionRef.current);
      stepProgressionRef.current = null;
    }

    // Cascade any remaining steps one-by-one so user sees all steps turn Done
    for (let s = Math.max(startStep, 1); s <= 6; s++) {
      setActiveStepIndex(s);
      if (s < 6) {
        await new Promise((resolve) => setTimeout(resolve, 320));
      }
    }

    // Mark 100% complete
    setIsAllComplete(true);
    setActiveStepIndex(6);

    // Brief delay to appreciate 100% completed state before showing result card
    await new Promise((resolve) => setTimeout(resolve, 650));
    stopTimers();
    setGeneratedProposal(proposalResult);
    setStep('result');
    if (onToast) onToast('Proposal generated and published successfully.', 'success', 5000);
  };

  /**
   * Full 4-API Lifecycle Execution:
   * 1. createDiscoveryPackage (POST /proposal/discovery) -> already ran in intake
   * 2. processDiscoveryPackage (POST /proposal/processor/process) -> proposal agent generator
   * 3. getProposal (GET /proposal/api?resource=proposals&proposal_id=...) -> fetch record from Datastore
   * 4. listProposals (GET /proposal/api?resource=proposals) -> refresh datastore catalog
   */
  const executeProposalGeneration = async (pkg) => {
    const packageId = pkg?.package_id;
    if (!packageId) return;

    setStep('processing');
    startTimers();
    setIsTakingLong(false);

    try {
      // Step 2 API: Trigger Serverless Proposal Generator
      console.log(`[Workspace 2 Proposal API] 🚀 Initiating proposal generation for package: ${packageId}`);
      const res = await processDiscoveryPackage(packageId);
      console.log(`[Workspace 2 Proposal API] ✅ Proposal generation complete:`, res);

      const proposalId = res?.proposal_id || res?.proposal?.proposal_id || packageId;

      // Step 3 API: Fetch validated proposal record from Catalyst Datastore
      let datastoreProposal = null;
      if (proposalId) {
        console.log(`[Workspace 2 Proposal API] 📥 Fetching validated proposal '${proposalId}' from Catalyst Datastore...`);
        try {
          const fetched = await getProposal(proposalId);
          datastoreProposal = fetched?.proposal || null;
          console.log(`[Workspace 2 Proposal API] 200 OK (/proposal/api?resource=proposals&proposal_id=${proposalId})`, fetched);
        } catch (fetchErr) {
          console.warn('[Workspace 2 Proposal API] Notice fetching proposal from Datastore:', fetchErr);
        }
      }

      // Step 4 API: Sync proposals catalog from Datastore
      console.log(`[Workspace 2 Proposal API] 🔄 Syncing proposals catalog with Catalyst Datastore...`);
      try {
        const catalog = await listProposals();
        console.log(`[Workspace 2 Proposal API] 200 OK (/proposal/api?resource=proposals)`, catalog);
      } catch (catalogErr) {
        console.warn('[Workspace 2 Proposal API] Notice syncing proposals catalog:', catalogErr);
      }

      // Normalize proposal with salesperson entered business name & live URL
      const finalProposal = saveGeneratedProposal(datastoreProposal || res, pkg);

      if (onProposalCreated) {
        onProposalCreated(finalProposal);
      }

      // Smoothly cascade remaining steps to 100% completion
      await cascadeCompleteRemainingSteps(activeStepIndex, finalProposal);
    } catch (err) {
      stopTimers();
      console.error(`[Workspace 2 Proposal API] Generation error:`, err);
      const message = getFriendlyErrorMessage(err);
      if (onToast) onToast(message, 'error', 6000);
      setStep('review');
    }
  };

  // Direct 1-click generate from the intake page: package was just created
  const handleDirectGenerate = async (pkg) => {
    setDiscoveryPackage(pkg);
    await executeProposalGeneration(pkg);
  };

  // Generate from review page
  const handleGenerate = async () => {
    if (!discoveryPackage?.package_id) return;
    await executeProposalGeneration(discoveryPackage);
  };

  const handleKeepWaiting = () => {
    setIsTakingLong(false);
  };

  return (
    <div className="create-proposal-page animate-fade-in">
      <div className="container create-proposal-container">
        {/* Navigation Choice Bar: Left to Sales Workspace & Far Right to All Proposals */}
        <div className="create-proposal-nav-bar">
          <motion.button
            type="button"
            className="btn-nav-choice btn-nav-left"
            onClick={handleGoToWorkspace}
            whileHover={{ x: -3, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            title="Go to Sales Workspace"
          >
            <ArrowLeft size={15} className="btn-nav-arrow-left" />
            <span>Go to Sales Workspace</span>
          </motion.button>

          <motion.button
            type="button"
            className="btn-nav-choice btn-nav-right"
            onClick={handleBackToProposals}
            whileHover={{ x: 3, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            title="Go to All Proposals"
          >
            <span>Go to All Proposals</span>
            <ArrowRight size={15} className="btn-nav-arrow-right" />
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
                  activeStepIndex={activeStepIndex}
                  isAllComplete={isAllComplete}
                  isTakingLong={isTakingLong}
                  onKeepWaiting={handleKeepWaiting}
                  onBackToProposals={handleBackToProposals}
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
                    setActiveStepIndex(0);
                    setIsAllComplete(false);
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
