import React, { useEffect, useState, useRef } from 'react';
import './CreateProposal.css';
import DiscoveryUploadCard from '@/components/proposal/DiscoveryUploadCard/DiscoveryUploadCard';
import DiscoveryPackageReview from '@/components/proposal/DiscoveryPackageReview/DiscoveryPackageReview';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock } from 'lucide-react';
import BlurText from '@/reactbits/BlurText';
import GradientText from '@/reactbits/GradientText';
import { processDiscoveryPackage, getDiscoveryPackage, listProposals, getFriendlyErrorMessage } from '@/api/proposalApi';

const POLL_INTERVAL_MS = 2500;
const MAX_POLL_MS = 3 * 60 * 1000; // 3 minutes - a frontend polling timeout, never a proposal failure

function ProcessingProposalCard({ elapsedSeconds, isTakingLong, onKeepWaiting, onBackToProposals }) {
  const minutes = Math.floor(elapsedSeconds / 60);
  const seconds = elapsedSeconds % 60;
  const elapsedLabel = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  return (
    <div className="preparing-proposal-card animate-fade-in">
      <div className="preparing-header">
        <span className="preparing-spinner" aria-hidden="true" />
        <div>
          <h3 className="preparing-title">Processing Proposal…</h3>
          <p className="preparing-subtitle">
            Your discovery package is being analyzed and the proposal is being generated. This can take a while for larger packages.
          </p>
        </div>
      </div>

      <div className="preparing-elapsed-row">
        <Clock size={14} />
        <span>Elapsed: {elapsedLabel}</span>
      </div>

      {isTakingLong && (
        <div className="preparing-timeout-notice animate-fade-in">
          <p>Proposal generation is taking longer than expected. You can continue waiting or return to proposals.</p>
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
      // If proposal is null (timeout), isTakingLong is already shown - the salesperson
      // chooses to keep waiting (loop restarts below) or go back.
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
    const packageId = discoveryPackage.package_id;
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
        {/* Back Link */}
        <button type="button" className="btn-back-to-proposals" onClick={handleBackToProposals}>
          <ArrowLeft size={14} />
          <span>Proposals</span>
        </button>

        {/* Hero Header */}
        <section className="proposal-hero-section" aria-labelledby="proposal-hero-heading">
          <h1 id="proposal-hero-heading" className="proposal-hero-title">
            <BlurText
              text="Turn Discovery Notes Into"
              className="proposal-hero-blur"
              delay={55}
              animateBy="words"
              direction="top"
            />
            <GradientText className="proposal-hero-accent" animationSpeed={5}>
              Structured Solution Proposals
            </GradientText>
          </h1>
          <p className="proposal-hero-subtext">
            Turn customer discovery information into a structured solution proposal.
          </p>
        </section>

        {/* Body: Discovery -> Review -> Processing */}
        <div className="create-proposal-body">
          <AnimatePresence mode="wait">
            {step === 'discovery' ? (
              <motion.div
                key="discovery"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <DiscoveryUploadCard onContinue={handlePackageCreated} onToast={onToast} />
              </motion.div>
            ) : step === 'review' ? (
              <motion.div
                key="review"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
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
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <ProcessingProposalCard
                  elapsedSeconds={elapsedSeconds}
                  isTakingLong={isTakingLong}
                  onKeepWaiting={handleKeepWaiting}
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
