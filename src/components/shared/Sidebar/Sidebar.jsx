import React from 'react';
import './Sidebar.css';
import { motion, AnimatePresence } from 'framer-motion';
import BrandLogo from '../BrandLogo/BrandLogo';
import {
  Settings,
  User,
  X,
  ExternalLink,
  Presentation,
  FileText,
  Layers,
  Plus,
  LayoutGrid
} from 'lucide-react';

export default function Sidebar({
  isOpen,
  onClose,
  activeModule = 'workspace', // 'workspace' | 'proposal' | 'experience'
  activeSubPage = 'hub',     // 'hub' | 'proposal-list' | 'proposal-create' | 'generator' | 'history'
  onNavigateModule,
  onOpenSettings,
  currentUser = {
    name: 'Hariharan R',
    designation: 'Product Consultant'
  }
}) {
  const handleNav = (module, subPage) => {
    if (onNavigateModule) {
      onNavigateModule(module, subPage);
    }
  };

  const handleSettingsClick = () => {
    if (onOpenSettings) {
      onOpenSettings();
    }
    if (onClose) {
      onClose();
    }
  };

  const userInitials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'HR';

  return (
    <>
      {/* Mobile/Tablet Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Main Sidebar Aside */}
      <aside className={`spikra-enterprise-sidebar ${isOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <div className="sidebar-inner-container">
          {/* Top Brand Logo & Close Button */}
          <div className="sidebar-brand-header">
            <BrandLogo
              showSubtitle={true}
              showIcon={false}
              theme="dark"
              onClick={() => handleNav('workspace', 'hub')}
            />
            <button
              type="button"
              className="sidebar-close-btn"
              onClick={onClose}
              aria-label="Close navigation sidebar"
            >
              <X size={16} />
            </button>
          </div>

          {/* Navigation Scroll Area with Proper Distribution */}
          <div className="sidebar-nav-scroll" aria-label="Sidebar Navigation">
            {/* Section 0: SALES CONSULTANT */}
            <div className="sidebar-section salesperson-section">
              <span className="sidebar-section-title">CONSULTANT</span>
              <div
                className="sidebar-consultant-card"
                onClick={handleSettingsClick}
                role="button"
                tabIndex={0}
                title={`${currentUser.name} • ${currentUser.designation}`}
              >
                <div className="consultant-avatar-ring">
                  <div className="consultant-avatar-circle">
                    <span>{userInitials}</span>
                  </div>
                  <span className="consultant-pulse-dot" aria-hidden="true" />
                </div>
                <div className="consultant-info-box">
                  <span className="sidebar-consultant-name">{currentUser.name}</span>
                  <span className="consultant-role-badge">{currentUser.designation}</span>
                </div>
              </div>
            </div>

            {/* Section 1: WORKSPACE */}
            <div className="sidebar-section">
              <span className="sidebar-section-title">WORKSPACE</span>

              <div className="sidebar-items-list">
                {/* 1. Experiences Module */}
                <div className="sidebar-module-block">
                  <button
                    type="button"
                    className={`sidebar-nav-item ${activeModule === 'experience' ? 'is-active-parent' : ''}`}
                    onClick={() => handleNav('experience', activeSubPage === 'history' ? 'history' : 'generator')}
                  >
                    <Presentation size={16} className="nav-item-icon" />
                    <span className="nav-item-label">Interactive Showcases</span>
                  </button>

                  {/* Submenu: guided by a continuous vertical line via .sidebar-sub-menu::before */}
                  <div className="sidebar-sub-menu">
                    <button
                      type="button"
                      className={`sub-nav-link ${activeModule === 'experience' && activeSubPage === 'generator' ? 'is-active' : ''}`}
                      onClick={() => handleNav('experience', 'generator')}
                    >
                      <Plus size={13} className="sub-nav-icon" />
                      <span>Create Showcase</span>
                    </button>
                    <button
                      type="button"
                      className={`sub-nav-link ${activeModule === 'experience' && activeSubPage === 'history' ? 'is-active' : ''}`}
                      onClick={() => handleNav('experience', 'history')}
                    >
                      <LayoutGrid size={13} className="sub-nav-icon" />
                      <span>All Showcases</span>
                    </button>
                  </div>
                </div>

                {/* 2. Solution Proposals Module */}
                <div className="sidebar-module-block">
                  <button
                    type="button"
                    className={`sidebar-nav-item ${activeModule === 'proposal' ? 'is-active-parent' : ''}`}
                    onClick={() => handleNav('proposal', 'proposal-list')}
                  >
                    <FileText size={16} className="nav-item-icon orange" />
                    <span className="nav-item-label">Solution Proposals</span>
                  </button>

                  {/* Submenu: guided by a continuous vertical line via .sidebar-sub-menu::before */}
                  <div className="sidebar-sub-menu">
                    <button
                      type="button"
                      className={`sub-nav-link ${activeModule === 'proposal' && activeSubPage === 'proposal-create' ? 'is-active' : ''}`}
                      onClick={() => handleNav('proposal', 'proposal-create')}
                    >
                      <Plus size={13} className="sub-nav-icon" />
                      <span>Create Proposal</span>
                    </button>
                    <button
                      type="button"
                      className={`sub-nav-link ${activeModule === 'proposal' && activeSubPage === 'proposal-list' ? 'is-active' : ''}`}
                      onClick={() => handleNav('proposal', 'proposal-list')}
                    >
                      <LayoutGrid size={13} className="sub-nav-icon" />
                      <span>All Proposals</span>
                    </button>
                  </div>
                </div>

                {/* 3. Future Modules */}
                <div className="sidebar-module-block">
                  <div className="sidebar-nav-item is-disabled">
                    <Layers size={16} className="nav-item-icon muted" />
                    <span className="nav-item-label muted">Future Modules</span>
                    <span className="soon-badge">Soon</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: SETTINGS */}
            <div className="sidebar-section">
              <span className="sidebar-section-title">PREFERENCES</span>

              <div className="sidebar-items-list">
                <button
                  type="button"
                  className="sidebar-nav-item utility-link"
                  onClick={handleSettingsClick}
                >
                  <Settings size={15} className="nav-item-icon" />
                  <span className="nav-item-label">Settings</span>
                </button>
                <button
                  type="button"
                  className="sidebar-nav-item utility-link"
                  onClick={handleSettingsClick}
                >
                  <User size={15} className="nav-item-icon" />
                  <span className="nav-item-label">Account Profile</span>
                </button>
              </div>
            </div>

            {/* Section 3: ABOUT SPIKRA */}
            <div className="sidebar-section about-section">
              <span className="sidebar-section-title">ABOUT</span>
              <div className="sidebar-about-card">
                <div className="about-header-row">
                  <span className="about-company-name">Spikra Pvt Ltd</span>
                  <span className="about-partner-pill">Zoho Partner</span>
                </div>
                <p className="about-company-desc">
                  <strong>Zoho Premium Partner</strong> building AI-driven automation for enterprise clients.
                </p>

                <a
                  href="https://spikra.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="about-site-link"
                >
                  <span>Visit spikra.com</span>
                  <ExternalLink size={13} className="about-site-link-icon" />
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="sidebar-footer">
            <span className="sidebar-copyright-text">
              © 2026 Spikra Pvt Ltd. All rights reserved.
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
