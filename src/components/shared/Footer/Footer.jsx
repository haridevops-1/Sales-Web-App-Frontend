import React from 'react';
import './Footer.css';
import BrandLogo from '../BrandLogo/BrandLogo';

export default function Footer({ onNavigate }) {
  return (
    <footer className="spikra-refined-footer">
      <div className="container">
        <div className="footer-three-column-grid">
          {/* Column 1 (Left): Spikra Logo & Consulting/Implementation Description */}
          <div className="footer-col footer-brand-col">
            <BrandLogo
              showSubtitle={true}
              theme="dark"
              onClick={() => onNavigate && onNavigate('workspace', 'hub')}
            />
            <p className="footer-business-desc">
              Spikra is an enterprise <strong>Zoho Premium Partner</strong>, helping businesses architect, automate, and scale with Zoho — across real estate, healthcare, retail, and manufacturing.
            </p>
          </div>

          {/* Column 2 (Middle): Navigation */}
          <div className="footer-col footer-nav-col">
            <h4 className="footer-col-title">Navigation</h4>
            <ul className="footer-link-list">
              <li>
                <button
                  type="button"
                  className="footer-nav-btn"
                  onClick={() => onNavigate && onNavigate('experience', 'generator')}
                >
                  ⚡ Create Showcase
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-nav-btn"
                  onClick={() => onNavigate && onNavigate('experience', 'history')}
                >
                  📁 All Showcases
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-nav-btn"
                  onClick={() => onNavigate && onNavigate('proposal', 'proposal-create')}
                >
                  ⚡ Create Proposal
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="footer-nav-btn"
                  onClick={() => onNavigate && onNavigate('proposal', 'proposal-list')}
                >
                  📁 All Proposals
                </button>
              </li>
              <li>
                <a
                  href="https://spikra.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="footer-nav-btn"
                >
                  🌐 Official Website (spikra.com) ↗
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3 (Right): Contact Us */}
          <div className="footer-col footer-contact-col">
            <h4 className="footer-col-title">Contact Us</h4>
            <div className="footer-contact-details">
              <div className="contact-item">
                <span className="contact-icon">📧</span>
                <a href="mailto:sales@spikra.com" className="contact-link">
                  sales@spikra.com
                </a>
              </div>

              <div className="contact-item">
                <span className="contact-icon">📞</span>
                <a href="tel:+917530059992" className="contact-link">
                  +91 75300 59992
                </a>
              </div>

              <div className="contact-item">
                <span className="contact-icon">📍</span>
                <span className="contact-text">
                  Thanjavur, Tamil Nadu, India
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright Row */}
        <div className="footer-bottom-row">
          <span className="footer-copy">
            © {new Date().getFullYear()} Spikra Pvt Ltd. All rights reserved.
          </span>
          <span className="footer-tagline">
            Zoho Premium Partner • ISO 27001 Certified • Catalyst Enterprise Cloud
          </span>
        </div>
      </div>
    </footer>
  );
}
