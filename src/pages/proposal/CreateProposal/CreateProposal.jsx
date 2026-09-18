import React, { useEffect, useState } from 'react';
import './CreateProposal.css';
import DiscoveryUploadCard from '@/components/proposal/DiscoveryUploadCard/DiscoveryUploadCard';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Check, FileStack, FileEdit } from 'lucide-react';
import BlurText from '@/reactbits/BlurText';
import GradientText from '@/reactbits/GradientText';
import CountUp from '@/reactbits/CountUp';
import SpotlightCard from '@/reactbits/SpotlightCard';

const PREP_STEPS = [
  'Reading discovery package',
  'Structuring proposal outline',
  'Finalizing draft'
];

function PreparingProposalCard({ activeStepIndex }) {
  return (
    <div className="preparing-proposal-card animate-fade-in">
      <div className="preparing-header">
        <span className="preparing-spinner" aria-hidden="true" />
        <div>
          <h3 className="preparing-title">Preparing your proposal…</h3>
          <p className="preparing-subtitle">This will only take a moment.</p>
        </div>
      </div>

      <ul className="preparing-steps-list">
        {PREP_STEPS.map((label, index) => {
          const isDone = index < activeStepIndex;
          const isActive = index === activeStepIndex;
          return (
            <li
              key={label}
              className={`preparing-step-item ${isDone ? 'is-done' : ''} ${isActive ? 'is-active' : ''}`}
            >
              <span className="preparing-step-marker">
                {isDone ? <Check size={12} strokeWidth={3} /> : <span className="preparing-step-dot" />}
              </span>
              <span className="preparing-step-label">{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function CreateProposal({
  onNavigate,
  onProposalCreated,
  currentUser = { name: 'Hariharan R' },
  totalProposals = 0,
  draftProposals = 0
}) {
  const [step, setStep] = useState('upload'); // 'upload' | 'preparing'
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  useEffect(() => {
    if (step !== 'preparing') return undefined;

    const timers = PREP_STEPS.map((_, index) =>
      setTimeout(() => setActiveStepIndex(index + 1), (index + 1) * 650)
    );

    return () => timers.forEach(clearTimeout);
  }, [step]);

  const handleBackToProposals = () => {
    if (onNavigate) onNavigate('proposal', 'proposal-list');
  };

  const handleContinue = (selection) => {
    setActiveStepIndex(0);
    setStep('preparing');

    const { businessName, customerName } = selection;

    setTimeout(() => {
      const newProposal = {
        id: `prop-${Date.now()}`,
        code: `PROP-2026-${Math.floor(100 + Math.random() * 900)}`,
        title: `${businessName} — Solution Proposal`,
        customer: customerName,
        industry: 'Unassigned',
        value: 0,
        status: 'Draft',
        date: 'Just now',
        owner: currentUser?.name || 'Hariharan R',
        description: `Drafted from a Zoho WorkDrive discovery package for ${businessName}`
      };

      if (onProposalCreated) onProposalCreated(newProposal);
      if (onNavigate) onNavigate('proposal', 'proposal-list');
    }, PREP_STEPS.length * 650 + 300);
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

        {/* Quick Stats */}
        <div className="proposal-quick-stats-row">
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut' }}>
            <SpotlightCard className="proposal-stat-card" spotlightColor="rgba(0, 82, 255, 0.12)">
              <div className="proposal-stat-icon blue">
                <FileStack size={18} strokeWidth={2.2} />
              </div>
              <div className="proposal-stat-text">
                <span className="proposal-stat-value">
                  <CountUp to={totalProposals} duration={1.1} separator="" />
                </span>
                <span className="proposal-stat-label">Total Proposals</span>
              </div>
            </SpotlightCard>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: 'easeOut', delay: 0.08 }}>
            <SpotlightCard className="proposal-stat-card" spotlightColor="rgba(255, 133, 51, 0.12)">
              <div className="proposal-stat-icon orange">
                <FileEdit size={18} strokeWidth={2.2} />
              </div>
              <div className="proposal-stat-text">
                <span className="proposal-stat-value">
                  <CountUp to={draftProposals} duration={1.1} separator="" />
                </span>
                <span className="proposal-stat-label">Drafts In Progress</span>
              </div>
            </SpotlightCard>
          </motion.div>
        </div>

        {/* Body: Upload -> Preparing */}
        <div className="create-proposal-body">
          <AnimatePresence mode="wait">
            {step === 'upload' ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <DiscoveryUploadCard onContinue={handleContinue} />
              </motion.div>
            ) : (
              <motion.div
                key="preparing"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                <PreparingProposalCard activeStepIndex={activeStepIndex} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
