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
  const [openCapabilityAccordions, setOpenCapabilityAccordions] = useState({ 0: true });

  const toggleCapabilityAccordion = (index) => {
    setOpenCapabilityAccordions((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // Read real capabilities from analysisData without hardcoding or filler fallbacks
  const rawCapabilities = (
    analysisData?.capabilities ||
    analysisData?.data?.capabilities ||
    analysisData?.raw?.capabilities ||
    analysisData?.raw?.data?.capabilities ||
    analysisData?.analysis?.capabilities ||
    []
  );

  const capabilitiesList = Array.isArray(rawCapabilities) ? rawCapabilities.map((item, idx) => {
    if (typeof item === 'string') {
      const trimmed = item.trim();
      return {
        id: idx,
        code: `CAP-${String(idx + 1).padStart(2, '0')}`,
        title: trimmed,
        description: '',
        hasDescription: false,
        tags: []
      };
    }
    const title = (item?.title || item?.name || item?.capability_name || item?.module_name || `Capability ${idx + 1}`).trim();
    const description = (item?.description || item?.desc || item?.details || '').trim();
    const tags = Array.isArray(item?.tags) ? item.tags : (item?.category ? [item.category] : []);
    return {
      id: item?.id ?? idx,
      code: item?.code || `CAP-${String(idx + 1).padStart(2, '0')}`,
      title,
      description,
      hasDescription: Boolean(description),
      tags
    };
  }) : [];

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
            <span>{status === 'PUBLISHED' ? 'Published' : status === 'DEPLOYING' ? 'Deploying' : 'Generated Preview'}</span>
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
                  <span className="snap-val text-orange">Enterprise Cloud Platform</span>
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
                <p className="exp-section-subtitle">
                  {capabilitiesList.length > 0
                    ? `${capabilitiesList.length} verified system architectural module${capabilitiesList.length === 1 ? '' : 's'} defined for ${displayBusinessName}.`
                    : 'System capabilities and module definitions.'}
                </p>
              </div>

              {capabilitiesList.length > 0 ? (
                <div className="exp-capabilities-accordion-list">
                  {capabilitiesList.map((cap, idx) => {
                    const isOpen = Boolean(openCapabilityAccordions[idx]);
                    const canExpand = cap.hasDescription;

                    return (
                      <div
                        key={cap.id}
                        className={`exp-capability-accordion-item ${isOpen && canExpand ? 'is-open' : ''} ${!canExpand ? 'no-desc' : ''}`}
                      >
                        <div
                          className={`exp-capability-accordion-header ${canExpand ? 'clickable' : 'static'}`}
                          onClick={() => canExpand && toggleCapabilityAccordion(idx)}
                          role={canExpand ? 'button' : undefined}
                          tabIndex={canExpand ? 0 : undefined}
                          onKeyDown={(e) => {
                            if (canExpand && (e.key === 'Enter' || e.key === ' ')) {
                              e.preventDefault();
                              toggleCapabilityAccordion(idx);
                            }
                          }}
                          aria-expanded={canExpand ? isOpen : undefined}
                        >
                          <div className="exp-capability-header-left">
                            <span className="exp-capability-code">{cap.code}</span>
                            <h4 className="exp-capability-title">{cap.title}</h4>
                          </div>

                          <div className="exp-capability-header-right">
                            {cap.tags.length > 0 && (
                              <div className="exp-capability-tags">
                                {cap.tags.slice(0, 3).map((tag, tIdx) => (
                                  <span key={tIdx} className="exp-tag">{tag}</span>
                                ))}
                              </div>
                            )}
                            {/* Gracefully hide dropdown arrow if description is missing */}
                            {canExpand && (
                              <span className="exp-capability-arrow" aria-hidden="true">
                                {isOpen ? '▲' : '▼'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Accordion body: renders 2-3 real sentences description returned by backend */}
                        {isOpen && canExpand && (
                          <div className="exp-capability-accordion-body animate-fade-in">
                            <p className="exp-capability-description-text">
                              {cap.description}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="exp-empty-capabilities">
                  <div className="exp-empty-icon">📋</div>
                  <h4>No Specific Capabilities Listed</h4>
                  <p>The document analysis did not identify any discrete capability modules for this document.</p>
                </div>
              )}
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
