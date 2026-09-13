import React from 'react';
import './QuickStats.css';
import { motion } from 'framer-motion';
import CountUp from '../../reactbits/CountUp';
import SpotlightCard from '../../reactbits/SpotlightCard';

export default function QuickStats({ totalCount = 0, publishedCount = 0 }) {
  return (
    <div className="quick-stats-row" aria-label="Live proposal stats">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        <SpotlightCard className="quick-stat-card" spotlightColor="rgba(0, 82, 255, 0.12)">
          <div className="quick-stat-icon blue">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
          </div>
          <div className="quick-stat-text">
            <span className="quick-stat-value">
              <CountUp to={totalCount} duration={1.1} separator="" />
            </span>
            <span className="quick-stat-label">Proposals Generated</span>
          </div>
        </SpotlightCard>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.08 }}
      >
        <SpotlightCard className="quick-stat-card" spotlightColor="rgba(16, 185, 129, 0.12)">
          <div className="quick-stat-icon green">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="quick-stat-text">
            <span className="quick-stat-value">
              <CountUp to={publishedCount} duration={1.1} separator="" />
            </span>
            <span className="quick-stat-label">Live Experiences</span>
          </div>
        </SpotlightCard>
      </motion.div>
    </div>
  );
}
