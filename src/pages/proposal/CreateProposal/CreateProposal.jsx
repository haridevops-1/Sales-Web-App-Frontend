import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import './CreateProposal.css';
import DiscoveryUploadCard from '@/components/proposal/DiscoveryUploadCard/DiscoveryUploadCard';
import DiscoveryPackageReview from '@/components/proposal/DiscoveryPackageReview/DiscoveryPackageReview';
import QuickStats from '@/components/experience/QuickStats/QuickStats';
import BlurText from '@/reactbits/BlurText';
import GradientText from '@/reactbits/GradientText';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  FileText,
  ArrowUpRight,
  Copy,
  Check,
  Building2,
  Calendar,
  ShieldCheck,
  ExternalLink,
  Plus
} from 'lucide-react';
import ThinkingState from '@/components/ui/thinking';
import {
  processDiscoveryPackage,
  runProposalAgent,
  getProposal,
  getProposalByPackage,
  listProposals,
  getFriendlyErrorMessage
} from '@/api/proposalApi';
import { resetApiGuard } from '@/api/apiCallGuard';
import { formatDate, formatProposalUrl } from '@/utils/helpers';

/**
 * The 6 distinct Solution Proposal Generation Steps
 */
const PIPELINE_STEPS = [
  {
    id: 1,
    title: 'Validating Documents',
    desc: 'Checking file formats and upload integrity',
    activeBadge: 'Validating...',
    doneBadge: 'Validated'
  },
  {
    id: 2,
    title: 'Extracting Content',
    desc: 'Reading text and key information from documents',
    activeBadge: 'Extracting...',
    doneBadge: 'Extracted'
  },
  {
    id: 3,
    title: 'Analyzing Requirements',
    desc: 'Understanding client needs and solution fit',
    activeBadge: 'Analyzing...',
    doneBadge: 'Analyzed'
  },
  {
    id: 4,
    title: 'Building Proposal',
    desc: 'Writing the proposal sections and structure',
    activeBadge: 'Building...',
    doneBadge: 'Built'
  },
  {
    id: 5,
    title: 'Publishing',
    desc: 'Creating a shareable client link',
    activeBadge: 'Publishing...',
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

  const thinkingRows = PIPELINE_STEPS.map((step) => ({
    primary: step.title,
    secondary: step.desc
  }));

  return (
    <div className="compact-processing-card animate-fade-in" aria-live="polite">
      <div className="processing-compact-header">
        <div className="spinner-orange-glow">
          <div className="spinner-center-dot"></div>
        </div>
        <div className="processing-titles">
          <h4 className="processing-main-text">Generating Solution Proposal...</h4>
          <span className="processing-active-stage">
            Processing {packageName}{fileCount > 0 ? ` (${fileCount} document${fileCount === 1 ? '' : 's'})` : ''}
          </span>
        </div>
      </div>

      <div className="processing-thinking-wrapper">
        <ThinkingState
          variant="Steps"
          activeText="Proposal Generation in Progress"
          doneText="Proposal Ready to View"
          rows={thinkingRows}
          currentStepIndex={activeStepIndex}
          isWorking={!isAllComplete}
          defaultExpanded={true}
        />
      </div>

      <div className="preparing-elapsed-row">
        <Clock size={14} />
        <span>Elapsed: {elapsedLabel}</span>
      </div>

      {isTakingLong && (
        <div className="preparing-timeout-notice animate-fade-in">
          <p>This is taking longer than usual. You can keep waiting or go back.</p>
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
  onCreateAnother,
  onBackToProposals
}) {
  const [copiedUrl, setCopiedUrl] = useState(false);

  const customerName = proposal?.customer_name || 'Client';
  const proposalId = proposal?.proposal_id || '—';
  const fileCount = proposal?.content?.sources?.length || discoveryPackage?.files?.length || 1;
  const createdAt = proposal?.created_at ? formatDate(proposal.created_at) : formatDate();

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

  const initials = customerName
    ? customerName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : 'SP';

  return (
    <div className="proposal-result-card modern-result-card animate-fade-in">
      {/* Status Badge */}
      <div className="result-top-badge-row">
        <div className="proposal-result-badge">
          <CheckCircle2 size={15} />
          <span>PROPOSAL READY</span>
        </div>
      </div>

      {/* Client Identity */}
      <div className="result-hero-client-row">
        <div className="result-client-avatar">
          <span>{initials}</span>
        </div>
        <div className="result-client-info">
          <h2 className="proposal-result-title">
            {customerName} — Solution Proposal
          </h2>
          <div className="result-id-row">
            <span className="result-id-label">Reference:</span>
            <code className="result-id-code">#{proposalId}</code>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="proposal-result-bento-grid">
        <div className="bento-metric-card">
          <div className="bento-metric-icon-wrap icon-blue">
            <Building2 size={16} />
          </div>
          <div className="bento-metric-data">
            <span className="bento-metric-label">Client</span>
            <span className="bento-metric-value">{customerName}</span>
          </div>
        </div>

        <div className="bento-metric-card">
          <div className="bento-metric-icon-wrap icon-orange">
            <FileText size={16} />
          </div>
          <div className="bento-metric-data">
            <span className="bento-metric-label">Documents</span>
            <span className="bento-metric-value">{fileCount} Analyzed</span>
          </div>
        </div>

        <div className="bento-metric-card">
          <div className="bento-metric-icon-wrap icon-purple">
            <Calendar size={16} />
          </div>
          <div className="bento-metric-data">
            <span className="bento-metric-label">Generated</span>
            <span className="bento-metric-value">{createdAt}</span>
          </div>
        </div>

        <div className="bento-metric-card">
          <div className="bento-metric-icon-wrap icon-green">
            <ShieldCheck size={16} />
          </div>
          <div className="bento-metric-data">
            <span className="bento-metric-label">Status</span>
            <span className="bento-metric-value status-completed-text">
              <span className="pulse-dot-green" />
              Published
            </span>
          </div>
        </div>
      </div>

      {/* Live URL Box */}
      {targetUrl && (
        <div className="proposal-result-url-box modern-url-box">
          <div className="url-box-header">
            <div className="url-box-heading">
              <span className="url-box-title">CLIENT PROPOSAL LINK</span>
              <span className="url-live-pill">
                <span className="url-live-dot" />
                Live
              </span>
            </div>
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
                <span>{copiedUrl ? 'Copied!' : 'Copy Link'}</span>
              </button>

              <button
                type="button"
                className="btn-url-action btn-url-test"
                onClick={() => window.open(targetUrl, '_blank', 'noopener,noreferrer')}
                title="Open in new tab"
              >
                <ExternalLink size={14} />
                <span>Open</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="proposal-result-actions modern-actions-suite">
        {targetUrl && (
          <motion.button
            type="button"
            className="btn-open-proposal modern-primary-btn"
            onClick={() => window.open(targetUrl, '_blank', 'noopener,noreferrer')}
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
          >
            <ArrowUpRight size={18} strokeWidth={2.4} />
            <span>Open Proposal</span>
          </motion.button>
        )}

        <button
          type="button"
          className="btn-result-ghost"
          onClick={onCreateAnother}
        >
          <Plus size={15} />
          <span>Create Another</span>
        </button>

        <button
          type="button"
          className="btn-result-ghost"
          onClick={onBackToProposals}
        >
          <ArrowLeft size={15} />
          <span>All Proposals</span>
        </button>
      </div>
    </div>
  );
}

export default function CreateProposal({
  onNavigate,
  onViewProposal,
  onToast,
  onProposalCreated,
  proposalsCount = 0,
  experiencesCount = 0
}) {
  const [step, setStep] = useState('discovery'); // 'discovery' | 'review' | 'processing' | 'result'
  const [discoveryPackage, setDiscoveryPackage] = useState(null);
  const [generatedProposal, setGeneratedProposal] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [isAllComplete, setIsAllComplete] = useState(false);
  const [isTakingLong, setIsTakingLong] = useState(false);

  const timerRef = useRef(null);
  const isGeneratingRef = useRef(false);
  const executedPackagesRef = useRef(new Set());

  // Compute live proposal and showcase counts matching Workspace 1
  const effectiveProposalsCount = useMemo(() => {
    if (typeof proposalsCount === 'number' && proposalsCount > 0) return proposalsCount;
    try {
      const stored = JSON.parse(localStorage.getItem('spikra_proposals') || '[]');
      return Array.isArray(stored) ? stored.length : 0;
    } catch {
      return proposalsCount || 0;
    }
  }, [proposalsCount]);

  const effectiveExperiencesCount = useMemo(() => {
    if (typeof experiencesCount === 'number' && experiencesCount > 0) return experiencesCount;
    try {
      const stored = JSON.parse(localStorage.getItem('spikra_experiences') || '[]');
      return Array.isArray(stored) ? stored.length : 0;
    } catch {
      return experiencesCount || 0;
    }
  }, [experiencesCount]);

  const stopTimers = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startElapsedTimer = () => {
    stopTimers();
    const start = Date.now();
    setElapsedSeconds(0);

    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      setElapsedSeconds(elapsed);
      if (elapsed > 90) {
        setIsTakingLong(true);
      }
    }, 1000);
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
    const proposalId = rawProposal?.proposal_id || rawProposal?.id || '';
    const backendUrl = (rawProposal?.generated_url || rawProposal?.proposal_url || rawProposal?.slate_url || '').trim();
    const rawUrl = backendUrl || (proposalId ? `https://spikra-w2-proposal-jmdbymcs.onslate.com/?proposal_id=${proposalId}` : '');
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
      status: (rawProposal?.status || rawProposal?.proposal_status || 'PUBLISHED').toUpperCase(),
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
   * Mark a step as complete (API-driven — called after each real API response).
   */
  const advanceStep = (toIndex) => {
    setActiveStepIndex(toIndex);
  };

  /**
   * Cascade any remaining steps to Done, then show the result card.
   */
  const cascadeCompleteRemainingSteps = async (currentStep, proposalResult) => {
    // Cascade any remaining steps one-by-one
    for (let s = Math.max(currentStep, 1); s <= 5; s++) {
      setActiveStepIndex(s);
      if (s < 5) {
        await new Promise((resolve) => setTimeout(resolve, 280));
      }
    }

    setIsAllComplete(true);
    setActiveStepIndex(5);

    await new Promise((resolve) => setTimeout(resolve, 600));
    stopTimers();
    setGeneratedProposal(proposalResult);
    setStep('result');
    if (onToast) onToast('Proposal generated successfully.', 'success', 5000);
  };

  const executeProposalGeneration = async (pkg) => {
    const packageId = pkg?.package_id;
    if (!packageId) return;

    if (isGeneratingRef.current) {
      console.warn('[Workspace 2] Proposal generation is already in progress. Ignoring duplicate trigger.');
      return;
    }
    if (executedPackagesRef.current.has(packageId)) {
      console.warn('[Workspace 2] Proposal generation already executed for package ' + packageId + '. Repeat calls are blocked.');
      return;
    }

    isGeneratingRef.current = true;
    executedPackagesRef.current.add(packageId);
    resetApiGuard();

    setStep('processing');
    setActiveStepIndex(0);
    setIsAllComplete(false);
    setIsTakingLong(false);
    startElapsedTimer();

    try {
      // Step 1 active — Validating Documents
      advanceStep(0);
      const sessionId = packageId;
      const customerName = pkg?.customer_name || pkg?.package_name || "Client";
      const fileNames = (pkg?.files || []).map((f) => f.name || f.file_name || "").filter(Boolean);
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 2 active — Extracting Content (running proposal agent)
      advanceStep(1);
      console.log("[Workspace 2] Running proposal agent for package:", packageId);
      const discoverySummary = fileNames.length > 0
        ? `Discovery package for ${customerName}. Files: ${fileNames.join(", ")}`
        : `Discovery package for ${customerName}`;

      let agentResult = null;
      try {
        agentResult = await runProposalAgent(packageId, sessionId, {
          customer_name: customerName,
          file_names: fileNames,
          discovery_content: discoverySummary
        });
        console.log("[Workspace 2] Agent completed:", agentResult);
      } catch (agentErr) {
        console.warn("[Workspace 2] Agent notice (non-fatal):", agentErr?.message);
      }

      // Step 3 active — Analyzing Structure & Running Processor
      advanceStep(2);
      console.log("[Workspace 2] Running processor for package:", packageId);
      const processRes = await processDiscoveryPackage(packageId);
      console.log("[Workspace 2] Processor completed:", processRes);

      if (!processRes || processRes.success === false) {
        throw new Error(processRes?.message || processRes?.error?.message || "Discovery package processing failed.");
      }

      let knownProposalId = processRes?.proposal_id || processRes?.proposal?.proposal_id || agentResult?.proposal_id || null;

      // Step 4 active — Fetching from Datastore (poll until backend finishes)
      advanceStep(3);
      console.log("[Workspace 2] Fetching proposal from datastore for package:", packageId);

      let datastoreProposal = processRes?.proposal || null;
      let proposalUrl = (processRes?.proposal_url || processRes?.generated_url || datastoreProposal?.proposal_url || datastoreProposal?.generated_url || "").trim();

      // If backend is still generating, poll datastore until completed
      if (!proposalUrl || processRes?.status === "GENERATING" || datastoreProposal?.status === "GENERATING") {
        const pollIntervalMs = 2500;
        const maxPollAttempts = 25; // ~60 seconds
        let attempts = 0;

        while (attempts < maxPollAttempts) {
          attempts++;
          await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

          console.log(`[Workspace 2] Polling proposal datastore (attempt ${attempts}/${maxPollAttempts})...`);
          try {
            let fetchedRes = null;
            if (knownProposalId) {
              try {
                fetchedRes = await getProposal(knownProposalId);
              } catch (pErr) {
                // Ignore temporary failure while generating and fall back to package query
              }
            }

            if (!fetchedRes?.proposal) {
              fetchedRes = await getProposalByPackage(packageId);
            }

            const candidate = fetchedRes?.proposal || null;
            if (candidate) {
              const candUrl = (candidate.generated_url || candidate.proposal_url || candidate.slate_url || "").trim();
              const candStatus = String(candidate.status || candidate.proposal_status || "").toUpperCase();

              if (candStatus === "FAILED") {
                throw new Error("Proposal generation was marked as failed on the server.");
              }

              if (candUrl || candStatus === "COMPLETED" || candStatus === "PUBLISHED" || candStatus === "DRAFT") {
                datastoreProposal = candidate;
                if (!knownProposalId && candidate.proposal_id) {
                  knownProposalId = candidate.proposal_id;
                }
                console.log("[Workspace 2] Completed proposal verified in datastore:", candidate);
                break;
              }
            }
          } catch (pollErr) {
            console.warn("[Workspace 2] Datastore poll check notice:", pollErr?.message);
            if (pollErr?.message && pollErr.message.includes("failed on the server")) {
              throw pollErr;
            }
          }
        }
      }

      const rawProposal = datastoreProposal || processRes?.proposal || null;
      if (!rawProposal) {
        throw new Error("Proposal generation timed out on the backend. Please check your Proposals list shortly.");
      }

      // Step 5 active — Publishing / Syncing catalog
      advanceStep(4);
      console.log("[Workspace 2] Syncing proposals catalog...");
      try {
        const catalog = await listProposals();
        console.log("[Workspace 2] Catalog synced. Count:", catalog?.proposals?.length ?? 0);
      } catch (catalogErr) {
        console.warn("[Workspace 2] Catalog sync notice (non-fatal):", catalogErr?.message);
      }

      // Normalize and save
      const finalProposal = saveGeneratedProposal(rawProposal, pkg);
      if (onProposalCreated) onProposalCreated(finalProposal);

      // All steps done — cascade to complete
      await cascadeCompleteRemainingSteps(5, finalProposal);
    } catch (err) {
      stopTimers();
      console.error("[Workspace 2] Generation error:", err);
      // Reset executed package tracker so the user can re-try after fixing
      if (packageId) {
        executedPackagesRef.current.delete(packageId);
      }
      const message = getFriendlyErrorMessage(err);
      if (onToast) onToast(message, "error", 6000);
      setStep("review");
    } finally {
      isGeneratingRef.current = false;
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
        {/* Back Link Row matching Workspace 1 */}
        <div className="create-proposal-back-row">
          <button
            type="button"
            className="btn-back-link"
            onClick={() => onNavigate && onNavigate('workspace', 'hub')}
          >
            <ArrowLeft size={15} className="btn-back-arrow" />
            <span>Back to Sales Workspace</span>
          </button>
        </div>

        {/* Hero Header - centered and animated matching Workspace 1 exactly */}
        <section className="proposal-hero-section" aria-labelledby="proposal-hero-heading">
          <div className="proposal-hero-container">
            <h1 id="proposal-hero-heading" className="proposal-hero-title">
              <BlurText
                text="Turn Discovery Documents Into a"
                className="proposal-hero-title-blur"
                delay={70}
                animateBy="words"
                direction="top"
              />
              <GradientText className="proposal-hero-title-accent" animationSpeed={5}>
                Professional Proposal
              </GradientText>
            </h1>

            <p className="proposal-hero-subtext">
              Upload customer discovery documents and materials to generate a structured, client-ready solution proposal.
            </p>
          </div>
        </section>

        {/* Quick Stats Cards matching Workspace 1 */}
        <QuickStats
          totalCount={effectiveProposalsCount}
          publishedCount={effectiveExperiencesCount}
        />

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
