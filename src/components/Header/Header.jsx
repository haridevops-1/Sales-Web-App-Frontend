import React from 'react';
import './Header.css';
import { motion, AnimatePresence } from 'framer-motion';
import BrandLogo from '../BrandLogo/BrandLogo';
import CountUp from '../../reactbits/CountUp';

export default function Header({
  activePage,
  onNavigate,
  totalCount = 0,
  currentUser = {
    name: "Hariharan R",
    designation: "Product Consultant"
  }
}) {
  const userInitials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'HR';

  return (
    <header className="spikra-header">
      <div className="container header-container">
        {/* Spikra Official Logo */}
        <BrandLogo
          showSubtitle={true}
          theme="dark"
          onClick={() => onNavigate('generator')}
        />

        {/* 2-Page Navigation Switcher Tabs */}
        <nav className="header-nav-tabs" aria-label="Main Navigation">
          <button
            type="button"
            className={`nav-tab-btn ${activePage === 'generator' ? 'active' : ''}`}
            onClick={() => onNavigate('generator')}
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
            onClick={() => onNavigate('history')}
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
        </nav>

        {/* User Profile Badge */}
        <div className="header-right">
          {currentUser && (
            <div className="user-profile-badge" title={`${currentUser.name} • ${currentUser.designation || 'Consultant'}`}>
              <div className="sales-avatar">
                <span>{userInitials}</span>
                <span className="sales-avatar-status" aria-hidden="true" title="Signed in" />
              </div>
              <div className="user-meta-column">
                <span className="user-display-name">{currentUser.name}</span>
                {currentUser.designation && (
                  <span className="user-designation-text">{currentUser.designation}</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
