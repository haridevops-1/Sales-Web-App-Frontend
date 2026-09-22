import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
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

// Helper component to extract URL proposal ID param
function ProposalDetailsRoute({ onNavigate, onToast }) {
  const { id } = useParams();
  return (
    <ProposalDetails
      proposalId={id}
      onNavigate={onNavigate}
      onToast={onToast}
    />
  );
}

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
  const location = useLocation();
  const navigate = useNavigate();

  // Derive activeModule and activeSubPage from current location path for perfect header/sidebar synchronization
  const getActiveModuleAndPage = (pathname) => {
    const p = (pathname || '/').replace(/\/+$/, '') || '/';
    if (p === '/proposals/create') return { module: 'proposal', page: 'proposal-create' };
    if (p.startsWith('/proposals/') && p !== '/proposals') return { module: 'proposal', page: 'proposal-details' };
    if (p === '/proposals') return { module: 'proposal', page: 'proposal-list' };
    if (p === '/showcases/create') return { module: 'experience', page: 'generator' };
    if (p === '/showcases') return { module: 'experience', page: 'history' };
    if (p === '/workspace' || p === '') return { module: 'workspace', page: 'hub' };
    return { module: 'workspace', page: 'hub' };
  };

  const { module: activeModule, page: activeSubPage } = getActiveModuleAndPage(location.pathname);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // App Global Feedback & Data State
  const [toast, setToast] = useState(null);
  const [experiences, setExperiences] = useState([]);
  const [isLoadingExperiences, setIsLoadingExperiences] = useState(true);
  const [experiencesError, setExperiencesError] = useState(null);
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
    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    navigate(`/proposals/${proposalId}`);
  };

  // Unified router handler: maps module/subpage requests directly to URL paths
  const handleNavigate = (moduleOrPage, subPage = null) => {
    let target = '/workspace';

    if (moduleOrPage === 'workspace' || moduleOrPage === 'hub') {
      target = '/workspace';
    } else if (moduleOrPage === 'proposal') {
      if (subPage === 'proposal-create') {
        target = '/proposals/create';
      } else if (subPage === 'proposal-details') {
        target = selectedProposalId ? `/proposals/${selectedProposalId}` : '/proposals';
      } else {
        target = '/proposals';
      }
    } else if (moduleOrPage === 'experience') {
      if (subPage === 'generator') {
        target = '/showcases/create';
      } else {
        target = '/showcases';
      }
    } else if (moduleOrPage === 'generator') {
      target = '/showcases/create';
    } else if (moduleOrPage === 'history') {
      target = '/showcases';
    } else if (moduleOrPage === 'proposal-list') {
      target = '/proposals';
    } else if (moduleOrPage === 'proposal-create') {
      target = '/proposals/create';
    }

    setIsSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    navigate(target);
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

      {/* Main Dynamic View Content with React Router */}
      <main className="spikra-page-content" id="main-content">
        <Routes>
          <Route path="/" element={<Navigate to="/workspace" replace />} />
          <Route
            path="/workspace"
            element={
              <WorkspaceHub
                onNavigate={handleNavigate}
                experiencesCount={experiences.length}
                currentUser={currentUser}
              />
            }
          />
          <Route
            path="/proposals"
            element={
              <ProposalPage
                onNavigate={handleNavigate}
                onViewProposal={handleViewProposal}
                onToast={showToast}
              />
            }
          />
          <Route
            path="/proposals/create"
            element={
              <CreateProposal
                onNavigate={handleNavigate}
                onViewProposal={handleViewProposal}
                onToast={showToast}
              />
            }
          />
          <Route
            path="/proposals/:id"
            element={
              <ProposalDetailsRoute
                onNavigate={handleNavigate}
                onToast={showToast}
              />
            }
          />
          <Route
            path="/showcases"
            element={
              <AllExperiences
                onNavigate={handleNavigate}
                experiences={experiences}
                isLoading={isLoadingExperiences}
                error={experiencesError}
                onRefresh={() => loadExperiences({})}
              />
            }
          />
          <Route
            path="/showcases/create"
            element={
              <Dashboard
                onNavigate={handleNavigate}
                onToast={showToast}
                onExperienceCreated={handleExperienceCreated}
                experiences={experiences}
              />
            }
          />
          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/workspace" replace />} />
        </Routes>
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
