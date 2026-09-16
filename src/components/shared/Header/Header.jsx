import React from 'react';
import './Header.css';
import { motion, AnimatePresence } from 'framer-motion';
import BrandLogo from '../BrandLogo/BrandLogo';
import HamburgerMenu from '../HamburgerMenu/HamburgerMenu';
import UserProfile from '../UserProfile/UserProfile';
import CountUp from '@/reactbits/CountUp';

export default function Header({
  activeModule = 'workspace', // 'workspace' | 'proposal' | 'experience'
  activePage = 'generator',   // 'hub' | 'proposal-list' | 'generator' | 'history'
  onNavigate,
  onToggleSidebar,
  onOpenSettings,
  isSidebarOpen = false,
  totalCount = 0,
  currentUser = {
    name: "Hariharan R",
    designation: "Product Consultant"
  }
}) {
  return (
    <header className="spikra-header">
      <div className="container header-container">
        {/* Left Section: Hamburger / Workspace Selector & Official Logo */}
        <div className="header-left-group">
          <HamburgerMenu
            isOpen={isSidebarOpen}
            onClick={onToggleSidebar}
            label="Workspace"
            showLabel={true}
          />

          <span className="header-left-divider" aria-hidden="true" />

          <BrandLogo
            showSubtitle={true}
            theme="dark"
            onClick={() => onNavigate && onNavigate('workspace', 'hub')}
          />
        </div>

        {/* Middle Navigation Context: Module Context Tabs */}
        {(activeModule === 'experience' || activeModule === 'proposal') && (
          <nav className="header-nav-tabs" aria-label="Main Navigation">
            {activeModule === 'experience' && (
              <>
                <button
                  type="button"
                  className={`nav-tab-btn ${activePage === 'generator' ? 'active' : ''}`}
                  onClick={() => onNavigate('experience', 'generator')}
                >
                  {activePage === 'generator' && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="nav-tab-pill"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="tab-icon">⚡</span>
                  <span>Create Showcase</span>
                </button>

                <button
                  type="button"
                  className={`nav-tab-btn ${activePage === 'history' ? 'active' : ''}`}
                  onClick={() => onNavigate('experience', 'history')}
                >
                  {activePage === 'history' && (
                    <motion.span
                      layoutId="nav-active-pill"
                      className="nav-tab-pill"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                    />
                  )}
                  <span className="tab-icon">📁</span>
                  <span>All Showcases</span>
                  <AnimatePresence mode="popLayout">
                    <motion.span
                      key={totalCount}
                      className="tab-badge"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                    >
                      <CountUp to={totalCount} duration={0.8} separator="" />
                    </motion.span>
                  </AnimatePresence>
                </button>
              </>
            )}

            {activeModule === 'proposal' && (
              <button
                type="button"
                className={`nav-tab-btn ${activePage === 'proposal-list' || activePage === 'proposal-create' ? 'active' : ''}`}
                onClick={() => onNavigate('proposal', 'proposal-list')}
              >
                <motion.span
                  layoutId="nav-active-pill"
                  className="nav-tab-pill proposal-pill"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
                <span className="tab-icon">📄</span>
                <span>Proposals</span>
              </button>
            )}
          </nav>
        )}

        {/* Right Section: User Profile Badge */}
        <div className="header-right">
          <UserProfile
            currentUser={currentUser}
            theme="dark"
            onClick={onOpenSettings}
          />
        </div>
      </div>
    </header>
  );
}
