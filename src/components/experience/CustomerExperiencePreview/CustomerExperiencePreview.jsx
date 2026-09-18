import React, { useState } from 'react';
import './CustomerExperiencePreview.css';
import { formatProposalUrl } from '@/utils/helpers';

export default function CustomerExperiencePreview({
  businessName = '',
  projectName = '',
  experienceTitle = '',
  businessLogoPreview = null,
  businessLogoFile = null,
  status = 'GENERATED',
  generatedUrl = '',
  analysisData = null
}) {
  const [activeTab, setActiveTab] = useState('summary');
  const [openAccordions, setOpenAccordions] = useState({ 0: true, 1: false });

  // Clean values with strictly neutral fallbacks
  const displayBusinessName = businessName?.trim() || 'Business Name';
  const displayProjectName = projectName?.trim() || 'Project Title';
  const displayTitle = experienceTitle?.trim() || `${displayBusinessName} — Technical Architecture Proposal`;

  // Get initials for fallback avatar
  const getInitials = (name) => {
    if (!name || name === 'Business Name') return 'SP';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const toggleAccordion = (index) => {
    setOpenAccordions((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleOpenUrl = () => {
    const targetUrl = formatProposalUrl(generatedUrl);
    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="spikra-preview-container animate-fade-in">
      {/* Top Banner Bar */}
      <div className="preview-top-bar">
        <div className="preview-status-group">
          <span className={`preview-status-pill ${status.toLowerCase()}`}>
            <span className="status-dot"></span>
            <span>{status === 'PUBLISHED' ? 'Published on Slate' : status === 'DEPLOYING' ? 'Deploying to Slate' : 'Generated Preview'}</span>
          </span>
          <span className="preview-watermark">Spikra Design System • Official Source of Truth</span>
        </div>

        {generatedUrl && status === 'PUBLISHED' && (
          <button
            type="button"
            className="btn-open-live-top"
            onClick={handleOpenUrl}
          >
            <span>Open Live Experience ↗</span>
          </button>
        )}
      </div>

      {/* Main Experience Layout Frame */}
      <div className="spikra-experience-frame">
        {/* Header Navigation Bar */}
        <header className="exp-header">
          <div className="exp-header-container">
            <div className="exp-brand-left">
              <span className="exp-spikra-logo">SPIKRA</span>
              <span className="exp-brand-divider">/</span>
              <span className="exp-engine-tag">Customer Experience Engine</span>
            </div>
            <div className="exp-header-right">
              <div className="exp-client-badge">
                <span className="badge-dot-green"></span>
                <span>{displayBusinessName}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="exp-hero">
          <div className="exp-hero-container">
            {/* Client Branding Card */}
            <div className="exp-client-brand-card">
              <div className="exp-logo-wrapper">
                {businessLogoPreview ? (
                  <img
                    src={businessLogoPreview}
                    alt={`${displayBusinessName} logo`}
                    className="exp-client-logo-img"
                  />
                ) : (
                  <div className="exp-client-avatar">
                    {getInitials(displayBusinessName)}
                  </div>
                )}
              </div>

              <div className="exp-brand-info">
                <h2 className="exp-client-title">{displayBusinessName}</h2>
                <div className="exp-brand-badge">
                  <span className="verified-check">✓</span>
                  <span>Verified Customer Proposal</span>
                </div>
                <div className="exp-brand-meta">
                  <span>Project: {displayProjectName}</span>
                </div>
              </div>
            </div>

            {/* Proposal Headline & Subtitle */}
            <div className="exp-hero-main-content">
              <div className="exp-eyebrow-pill">
                <span className="eyebrow-dot"></span>
                <span>DIGITAL BLUEPRINT & ARCHITECTURE SPECIFICATION</span>
              </div>

              <h1 className="exp-hero-heading">{displayTitle}</h1>

              <p className="exp-hero-subtitle">
                An interactive customer experience proposal designed and generated specifically for {displayBusinessName}.
              </p>

              {/* Snapshot Quick Stats */}
              <div className="exp-snapshot-grid">
                <div className="exp-snap-card">
                  <span className="snap-lbl">Target Client</span>
                  <span className="snap-val" title={displayBusinessName}>{displayBusinessName}</span>
                </div>
                <div className="exp-snap-card">
                  <span className="snap-lbl">Project Title</span>
                  <span className="snap-val" title={displayProjectName}>{displayProjectName}</span>
                </div>
                <div className="exp-snap-card">
                  <span className="snap-lbl">Engine Architecture</span>
                  <span className="snap-val text-orange">Zoho Catalyst</span>
                </div>
                <div className="exp-snap-card">
                  <span className="snap-lbl">Proposal Status</span>
                  <span className="snap-val text-emerald">{status}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tab Navigation Menu */}
        <nav className="exp-nav-tabs-wrapper" aria-label="Proposal Section Tabs">
          <div className="exp-tabs-container">
            <button
              type="button"
              className={`exp-tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
              onClick={() => setActiveTab('summary')}
            >
              <span className="tab-icon">📋</span>
              <span>1. Executive Summary</span>
            </button>

            <button
              type="button"
              className={`exp-tab-btn ${activeTab === 'modules' ? 'active' : ''}`}
              onClick={() => setActiveTab('modules')}
            >
              <span className="tab-icon">🧩</span>
              <span>2. Capabilities & Modules</span>
            </button>

            <button
              type="button"
              className={`exp-tab-btn ${activeTab === 'timeline' ? 'active' : ''}`}
              onClick={() => setActiveTab('timeline')}
            >
              <span className="tab-icon">⏱️</span>
              <span>3. Delivery Timeline</span>
            </button>

            <button
              type="button"
              className={`exp-tab-btn ${activeTab === 'ecosystem' ? 'active' : ''}`}
              onClick={() => setActiveTab('ecosystem')}
            >
              <span className="tab-icon">⚙️</span>
              <span>4. Technical Ecosystem</span>
            </button>

            <button
              type="button"
              className={`exp-tab-btn ${activeTab === 'governance' ? 'active' : ''}`}
              onClick={() => setActiveTab('governance')}
            >
              <span className="tab-icon">🛡️</span>
              <span>5. Scope & Governance</span>
            </button>
          </div>
        </nav>

        {/* Main Tab Panels Content */}
        <main className="exp-content-body">
          {/* TAB 1: EXECUTIVE SUMMARY */}
          {activeTab === 'summary' && (
            <div className="exp-panel animate-fade-in">
              <div className="exp-section-head">
                <span className="exp-section-eyebrow">EXECUTIVE OVERVIEW</span>
                <h3 className="exp-section-title">Strategic Vision & Operational Scope</h3>
              </div>

              <div className="exp-summary-card">
                <p className="exp-summary-text">
                  This interactive proposal synthesizes discovery requirements for <strong>{displayBusinessName}</strong> to deliver a scalable, enterprise-grade architecture. The solution optimizes business workflows, secures data management, and establishes reliable digital operations.
                </p>
              </div>

              {/* Key Benefits Grid */}
              <div className="exp-sub-block">
                <h4 className="exp-sub-heading">Expected Business Outcomes</h4>
                <div className="exp-benefits-grid">
                  <div className="exp-benefit-card">
                    <div className="exp-benefit-check">✓</div>
                    <div>
                      <h5 className="exp-benefit-title">Operational Automation</h5>
                      <p className="exp-benefit-desc">Streamlines manual discovery workflows into automated serverless pipelines.</p>
                    </div>
                  </div>

                  <div className="exp-benefit-card">
                    <div className="exp-benefit-check">✓</div>
                    <div>
                      <h5 className="exp-benefit-title">Enterprise Security</h5>
                      <p className="exp-benefit-desc">Ensures end-to-end data encryption and role-based access controls.</p>
                    </div>
                  </div>

                  <div className="exp-benefit-card">
                    <div className="exp-benefit-check">✓</div>
                    <div>
                      <h5 className="exp-benefit-title">Real-Time Insights</h5>
                      <p className="exp-benefit-desc">Delivers transparent tracking and continuous transaction auditing.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Key Stakeholders */}
              <div className="exp-sub-block">
                <h4 className="exp-sub-heading">Target Stakeholders & Users</h4>
                <div className="exp-audience-chips">
                  <div className="exp-chip"><span>👤</span><span>Executive Leadership</span></div>
                  <div className="exp-chip"><span>👤</span><span>System Administrators</span></div>
                  <div className="exp-chip"><span>👤</span><span>Operations & Support Teams</span></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CAPABILITIES & MODULES */}
          {activeTab === 'modules' && (
            <div className="exp-panel animate-fade-in">
              <div className="exp-section-head">
                <span className="exp-section-eyebrow">SYSTEM SPECIFICATIONS</span>
                <h3 className="exp-section-title">Core Capabilities & Feature Modules</h3>
              </div>

              <div className="exp-modules-grid">
                <div className="exp-module-card">
                  <div className="exp-module-head">
                    <span className="exp-module-icon">⚡</span>
                    <span className="exp-module-code">MOD-01</span>
                  </div>
                  <h4 className="exp-module-title">Core Orchestration Engine</h4>
                  <p className="exp-module-desc">Central workflow and event routing pipeline for business operations.</p>
                  <div className="exp-module-tags">
                    <span className="exp-tag">Automation</span>
                    <span className="exp-tag">Event Routing</span>
                  </div>
                </div>

                <div className="exp-module-card">
                  <div className="exp-module-head">
                    <span className="exp-module-icon">🔗</span>
                    <span className="exp-module-code">MOD-02</span>
                  </div>
                  <h4 className="exp-module-title">Integration Hub</h4>
                  <p className="exp-module-desc">Standardized connectors for external API endpoints and databases.</p>
                  <div className="exp-module-tags">
                    <span className="exp-tag">REST APIs</span>
                    <span className="exp-tag">Webhooks</span>
                  </div>
                </div>

                <div className="exp-module-card">
                  <div className="exp-module-head">
                    <span className="exp-module-icon">🛡️</span>
                    <span className="exp-module-code">MOD-03</span>
                  </div>
                  <h4 className="exp-module-title">Security & Audit Layer</h4>
                  <p className="exp-module-desc">Role-based access control and continuous transaction auditing.</p>
                  <div className="exp-module-tags">
                    <span className="exp-tag">Encryption</span>
                    <span className="exp-tag">Compliance</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DELIVERY TIMELINE */}
          {activeTab === 'timeline' && (
            <div className="exp-panel animate-fade-in">
              <div className="exp-section-head">
                <span className="exp-section-eyebrow">DELIVERY TIMELINE</span>
                <h3 className="exp-section-title">End-to-End Implementation Stages</h3>
              </div>

              <div className="exp-steps-grid">
                <div className="exp-step-card">
                  <span className="exp-step-badge">Phase 01</span>
                  <h4 className="exp-step-title">Architecture & Setup</h4>
                  <p className="exp-step-desc">Environment provisioning, schema validation, and baseline connectivity.</p>
                </div>

                <div className="exp-step-card">
                  <span className="exp-step-badge">Phase 02</span>
                  <h4 className="exp-step-title">Core Development</h4>
                  <p className="exp-step-desc">Building operational microservices, API triggers, and data pipelines.</p>
                </div>

                <div className="exp-step-card">
                  <span className="exp-step-badge">Phase 03</span>
                  <h4 className="exp-step-title">System Integration</h4>
                  <p className="exp-step-desc">End-to-end integration testing and security audit validation.</p>
                </div>

                <div className="exp-step-card">
                  <span className="exp-step-badge">Phase 04</span>
                  <h4 className="exp-step-title">Go-Live & Support</h4>
                  <p className="exp-step-desc">Staged deployment, handover, and operational performance monitoring.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TECHNICAL ECOSYSTEM */}
          {activeTab === 'ecosystem' && (
            <div className="exp-panel animate-fade-in">
              <div className="exp-tech-row">
                <div className="exp-tech-card">
                  <h4 className="exp-tech-title">System Integrations & Connectors</h4>
                  <div className="exp-tech-tags">
                    <span className="exp-tag-tech"><span className="tech-dot green"></span>Enterprise API</span>
                    <span className="exp-tag-tech"><span className="tech-dot green"></span>Cloud Data Store</span>
                    <span className="exp-tag-tech"><span className="tech-dot green"></span>Authentication Provider</span>
                  </div>
                </div>

                <div className="exp-tech-card">
                  <h4 className="exp-tech-title">Technology Stack & Infrastructure</h4>
                  <div className="exp-tech-tags">
                    <span className="exp-tag-tech"><span className="tech-dot orange"></span>Zoho Catalyst</span>
                    <span className="exp-tag-tech"><span className="tech-dot orange"></span>Serverless Cloud</span>
                    <span className="exp-tag-tech"><span className="tech-dot orange"></span>HTTPS / TLS 1.3</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: SCOPE & GOVERNANCE */}
          {activeTab === 'governance' && (
            <div className="exp-panel animate-fade-in">
              <div className="exp-section-head">
                <span className="exp-section-eyebrow">ENTERPRISE GOVERNANCE</span>
                <h3 className="exp-section-title">Scope, Assumptions & Compliance</h3>
              </div>

              <div className="exp-governance-grid">
                <div className="exp-accordion-item">
                  <div
                    className="exp-accordion-header"
                    onClick={() => toggleAccordion(0)}
                  >
                    <span>Assumptions & Operational Dependencies</span>
                    <span className="accordion-arrow">{openAccordions[0] ? '▲' : '▼'}</span>
                  </div>
                  {openAccordions[0] && (
                    <div className="exp-accordion-body animate-fade-in">
                      <ul className="exp-accordion-list">
                        <li>Standard cloud infrastructure access and API endpoints are provided.</li>
                        <li>Production credentials and permissions follow least-privilege security.</li>
                      </ul>
                    </div>
                  )}
                </div>

                <div className="exp-accordion-item">
                  <div
                    className="exp-accordion-header"
                    onClick={() => toggleAccordion(1)}
                  >
                    <span>Security & Operational Standards</span>
                    <span className="accordion-arrow">{openAccordions[1] ? '▲' : '▼'}</span>
                  </div>
                  {openAccordions[1] && (
                    <div className="exp-accordion-body animate-fade-in">
                      <ul className="exp-accordion-list">
                        <li>End-to-end data encryption in transit (TLS 1.3) and at rest (AES-256).</li>
                        <li>Compliance with enterprise audit and disaster recovery standards.</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Action Banner Section */}
        <section className="exp-action-card">
          <div className="exp-action-content">
            <span className="exp-action-eyebrow">VERIFIED ARCHITECTURE PROPOSAL</span>
            <h3 className="exp-action-title">Prepared for {displayBusinessName}</h3>
            <p className="exp-action-desc">
              This digital customer experience blueprint is verified and ready for project deployment and stakeholder review.
            </p>
          </div>
          <div className="exp-action-buttons">
            <button
              type="button"
              className="btn-exp-primary"
              onClick={handlePrint}
            >
              Print Blueprint
            </button>

            {generatedUrl && status === 'PUBLISHED' && (
              <button
                type="button"
                className="btn-exp-secondary"
                onClick={handleOpenUrl}
              >
                Open Live Proposal ↗
              </button>
            )}
          </div>
        </section>

        {/* Spikra Footer */}
        <footer className="exp-footer">
          <div className="exp-footer-container">
            <div className="exp-footer-left">
              <span className="exp-footer-brand">SPIKRA</span>
              <span className="exp-footer-copy">© 2026 Spikra Technologies. All rights reserved.</span>
            </div>
            <div className="exp-footer-right">
              <span className="exp-footer-tag">Customer Experience Proposal</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
