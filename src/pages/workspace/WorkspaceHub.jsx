import React from 'react';
import './WorkspaceHub.css';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function WorkspaceHub({
  onNavigate,
  experiencesCount = 0,
  proposalsCount = 0
}) {
  return (
    <div className="workspace-hub-page animate-fade-in">
      <div className="container hub-container">
        {/* Simple & Clean Header */}
        <motion.div
          className="hub-header-area"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="hub-main-title">Sales Workspace</h1>
          <p className="hub-subtitle">
            Your home for building customer showcases and sales proposals.
            <br />
            Pick a workspace below to get started.
          </p>
        </motion.div>

        {/* The 3 Clean Workspace Cards */}
        <div className="workspace-cards-stack">
          {/* Card 1: Interactive Showcases */}
          <motion.div
            className="workspace-module-card accent-orange"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
          >
            <div className="module-card-content">
              <div className="module-card-text">
                <h2 className="module-card-title">Interactive Showcases</h2>
                <p className="module-card-description">
                  Turn your technical documents into a simple, interactive showcase that
                  customers can explore on their own. Great for demos, walkthroughs, and
                  showing off what your product can do.
                </p>
                <div className="module-card-status">
                  <span className="live-status-pill green-pill">
                    <span className="status-dot-green" />
                    <span>{experiencesCount} Live Showcases</span>
                  </span>
                </div>
              </div>

              <div className="module-card-action">
                <button
                  type="button"
                  className="btn-workspace-cta"
                  onClick={() => onNavigate && onNavigate('experience', 'generator')}
                >
                  <span>Create Showcase</span>
                  <ArrowRight size={16} strokeWidth={2.4} className="btn-cta-arrow" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Card 2: Solution Proposals */}
          <motion.div
            className="workspace-module-card accent-blue"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.06 }}
            whileHover={{ y: -3, transition: { duration: 0.15 } }}
          >
            <div className="module-card-content">
              <div className="module-card-text">
                <h2 className="module-card-title">Solution Proposals</h2>
                <p className="module-card-description">
                  Turn customer notes and requirements into a clear, professional proposal.
                  Organize the scope, pricing, and details in one place, ready to send
                  to your client.
                </p>
                <div className="module-card-status">
                  <span className="live-status-pill blue-pill">
                    <span className="status-dot-blue" />
                    <span>{proposalsCount} Customer Proposals</span>
                  </span>
                </div>
              </div>

              <div className="module-card-action">
                <button
                  type="button"
                  className="btn-workspace-cta"
                  onClick={() => onNavigate && onNavigate('proposal', 'proposal-create')}
                >
                  <span>Create Proposal</span>
                  <ArrowRight size={16} strokeWidth={2.4} className="btn-cta-arrow" />
                </button>
              </div>
            </div>
          </motion.div>

          {/* Card 3: Future Modules */}
          <motion.div
            className="workspace-module-card disabled-card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.12 }}
          >
            <div className="module-card-content">
              <div className="module-card-text">
                <h2 className="module-card-title muted-title">Future Modules</h2>
                <p className="module-card-description muted-desc">
                  A scalable home for future sales workflows.
                </p>
              </div>

              <div className="module-card-action">
                <span className="coming-soon-pill">Coming Soon</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
