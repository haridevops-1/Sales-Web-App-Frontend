import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import Header from '@/components/shared/Header/Header';
import Sidebar from '@/components/shared/Sidebar/Sidebar';
import Footer from '@/components/shared/Footer/Footer';
import Toast from '@/components/shared/Toast/Toast';
import WorkspaceHub from '@/pages/workspace/WorkspaceHub';
import ProposalPage from '@/pages/proposal/ProposalPage';
import CreateProposal from '@/pages/proposal/CreateProposal/CreateProposal';
import ProposalDetails from '@/pages/proposal/ProposalDetails/ProposalDetails';
import Dashboard from '@/pages/experience/Dashboard/Dashboard';
import AllExperiences from '@/pages/experience/AllExperiences/AllExperiences';
import { Pattern } from '@/components/ui/v-card-17';
import { SpotlightCursor } from '@/components/ui/spotlight-cursor';
import { AnimatePresence, motion } from 'framer-motion';
import { getCustomerExperiences } from '@/api/catalystApi';
import { formatProposalUrl } from '@/utils/helpers';

// Normalize experience object so both camelCase and snake_case properties are supported
const normalizeExperience = (exp) => {
  const rawBiz = exp.business_name || exp.businessName || 'Business Client';
  const biz = rawBiz.replace(/~\d+/g, '').trim() || 'Business Client';
  const proj = exp.project_name || exp.projectName || '';
  const title = exp.experience_title || exp.experienceTitle || `${biz} — Technical Proposal`;
  const stat = (exp.status || 'GENERATED').toUpperCase();
  const expId = exp.experience_id || exp.experienceId || exp.project_id || exp.projectId || String(Date.now());
  const rawUrl = (exp.generated_url || exp.generatedUrl || '').trim();
  const url = formatProposalUrl(rawUrl, expId);
  const date = exp.published_time || exp.created_time || exp.createdAt || exp.modified_time || new Date().toISOString();
  const err = exp.error_message || exp.errorMessage || '';
  const projId = exp.project_id || exp.projectId || '';
  const docId = exp.document_id || exp.documentId || '';

  return {
    id: expId,
    experienceId: expId,
    projectId: projId,
    documentId: docId,
    businessName: biz,
    projectName: proj,
    experienceTitle: title,
    status: stat,
    generatedUrl: url,
    createdAt: date,
    errorMessage: err,
    // Direct snake_case mappings matching Catalyst DB schema
    experience_id: expId,
    project_id: projId,
    document_id: docId,
    business_name: biz,
    project_name: proj,
    experience_title: title,
    generated_url: url,
    created_time: date,
    published_time: exp.published_time || null,
    error_message: err
  };
};

export default function App() {
  // Navigation Routing State
  const [activeModule, setActiveModule] = useState('workspace'); // 'workspace' | 'proposal' | 'experience'
  const [activeSubPage, setActiveSubPage] = useState('hub');     // 'hub' | 'proposal-list' | 'proposal-create' | 'generator' | 'history'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // App Global Feedback & Data State
  const [toast, setToast] = useState(null);
  const [experiences, setExperiences] = useState([]);
  const [isLoadingExperiences, setIsLoadingExperiences] = useState(true);
  const [experiencesError, setExperiencesError] = useState(null);
  // Workspace 2 (Solution Proposals) owns its own proposal/package data via proposalApi -
  // App.jsx only needs to remember which proposal_id to show on the details page.
  const [selectedProposalId, setSelectedProposalId] = useState(null);

  // Authenticated user state
  const [currentUser] = useState({
    name: 'Hariharan R',
    designation: 'Product Consultant'
  });

  const showToast = (message, type = 'success', duration = 6000) => {
    setToast({ message, type, duration });
  };

  // Function 7 Backend Loader
  const loadExperiences = useCallback(async (filters = {}, isSilent = false) => {
    if (!isSilent) {
      setIsLoadingExperiences(true);
    }
    setExperiencesError(null);

    try {
      const response = await getCustomerExperiences(filters);
      if (response && Array.isArray(response.experiences)) {
        const normalized = response.experiences.map(normalizeExperience);
        setExperiences(normalized);
        try {
          if (normalized.length > 0) {
            localStorage.setItem('spikra_experiences', JSON.stringify(normalized));
          } else {
            localStorage.removeItem('spikra_experiences');
          }
        } catch (err) {
          console.warn('Could not update experiences in localStorage:', err);
        }
      }
    } catch (err) {
      console.error('[App] Failed to load experiences from Function 7:', err);
      const errorMsg = err.message || 'Unable to load customer experiences.';
      setExperiencesError(errorMsg);
    } finally {
      setIsLoadingExperiences(false);
    }
  }, []);

  // Fetch experiences from Function 7 on initial mount
  const hasLoadedRef = useRef(false);
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadExperiences();
  }, [loadExperiences]);

  // Handle newly created or published experience
  const handleExperienceCreated = (expData) => {
    if (!expData) return;

    // Optimistically update state so newly generated item appears immediately
    setExperiences((prev) => {
      const normalizedEntry = normalizeExperience(expData);
      const existingIndex = prev.findIndex(
        (e) => (e.projectId && e.projectId === normalizedEntry.projectId) ||
               (e.experienceId && e.experienceId === normalizedEntry.experienceId)
      );

      let updated;
      if (existingIndex >= 0) {
        updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], ...normalizedEntry };
      } else {
        updated = [normalizedEntry, ...prev];
      }

      try {
        localStorage.setItem('spikra_experiences', JSON.stringify(updated));
      } catch (err) {
        console.warn('Failed to save experiences to localStorage', err);
      }
      return updated;
    });

    // Refresh from Function 7 API to sync backend source of truth
    loadExperiences({}, true);
  };

  const handleViewProposal = (proposalId) => {
    if (!proposalId) return;
    setSelectedProposalId(proposalId);
    handleNavigate('proposal', 'proposal-details');
  };

  // Unified router handler
  const handleNavigate = (moduleOrPage, subPage = null) => {
    if (subPage) {
      setActiveModule(moduleOrPage);
      setActiveSubPage(subPage);
    } else {
      // Legacy or single-argument calls
      if (moduleOrPage === 'generator' || moduleOrPage === 'history') {
        setActiveModule('experience');
        setActiveSubPage(moduleOrPage);
      } else if (moduleOrPage === 'proposal' || moduleOrPage === 'proposal-list') {
        setActiveModule('proposal');
        setActiveSubPage('proposal-list');
      } else if (moduleOrPage === 'workspace' || moduleOrPage === 'hub') {
        setActiveModule('workspace');
        setActiveSubPage('hub');
      } else {
        setActiveModule(moduleOrPage);
      }
    }

    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  return (
    <div className="spikra-app-root">
      {/* Interactive Spotlight Cursor for Light Theme */}
      <SpotlightCursor config={{ radius: 260, brightness: 0.08, color: '#FF7A1A', smoothing: 0.15 }} />

      {/* Enterprise Collapsible Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeModule={activeModule}
        activeSubPage={activeSubPage}
        onNavigateModule={handleNavigate}
        onOpenSettings={() => setIsSettingsOpen(true)}
        experiencesCount={experiences.length}
        currentUser={currentUser}
      />

      {/* Universal Enterprise Header */}
      <Header
        activeModule={activeModule}
        activePage={activeSubPage}
        onNavigate={handleNavigate}
        onToggleSidebar={toggleSidebar}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isSidebarOpen={isSidebarOpen}
        totalCount={experiences.length}
        currentUser={currentUser}
      />

      {/* Main Dynamic View Content */}
      <main className="spikra-page-content" id="main-content">
        {activeModule === 'workspace' && (
          <WorkspaceHub
            onNavigate={handleNavigate}
            experiencesCount={experiences.length}
            currentUser={currentUser}
          />
        )}

        {activeModule === 'proposal' && (
          activeSubPage === 'proposal-create' ? (
            <CreateProposal
              onNavigate={handleNavigate}
              onViewProposal={handleViewProposal}
              onToast={showToast}
            />
          ) : activeSubPage === 'proposal-details' ? (
            <ProposalDetails
              proposalId={selectedProposalId}
              onNavigate={handleNavigate}
              onToast={showToast}
            />
          ) : (
            <ProposalPage
              onNavigate={handleNavigate}
              onViewProposal={handleViewProposal}
              onToast={showToast}
            />
          )
        )}

        {activeModule === 'experience' && (
          activeSubPage === 'history' ? (
            <AllExperiences
              onNavigate={handleNavigate}
              experiences={experiences}
              isLoading={isLoadingExperiences}
              error={experiencesError}
              onRefresh={() => loadExperiences({})}
            />
          ) : (
            <Dashboard
              onNavigate={handleNavigate}
              onToast={showToast}
              onExperienceCreated={handleExperienceCreated}
              experiences={experiences}
            />
          )
        )}
      </main>

      {/* Enterprise Footer */}
      <Footer onNavigate={(page) => handleNavigate('experience', page)} />

      {/* Settings / Preferences Dialog with v-card-17 Pattern */}
      <AnimatePresence>
        {isSettingsOpen && (
          <div
            className="fixed inset-0 z-[1050] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
            onClick={() => setIsSettingsOpen(false)}
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={(e) => e.stopPropagation()}
            >
              <Pattern
                theme="spikra"
                onClose={() => setIsSettingsOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast Feedback */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
