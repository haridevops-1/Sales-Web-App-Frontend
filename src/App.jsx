import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import Header from '@/components/shared/Header/Header';
import Sidebar from '@/components/shared/Sidebar/Sidebar';
import Footer from '@/components/shared/Footer/Footer';
import Toast from '@/components/shared/Toast/Toast';
import WorkspaceHub from '@/pages/workspace/WorkspaceHub';
import ProposalPage from '@/pages/proposal/ProposalPage';
import CreateProposal from '@/pages/proposal/CreateProposal/CreateProposal';
import Dashboard from '@/pages/experience/Dashboard/Dashboard';
import AllExperiences from '@/pages/experience/AllExperiences/AllExperiences';
import { Pattern } from '@/components/ui/v-card-17';
import { AnimatePresence, motion } from 'framer-motion';
import { getCustomerExperiences } from '@/api/catalystApi';

// Normalize experience object so both camelCase and snake_case properties are supported
const normalizeExperience = (exp) => {
  const rawBiz = exp.business_name || exp.businessName || 'Business Client';
  const biz = rawBiz.replace(/~\d+/g, '').trim() || 'Business Client';
  const proj = exp.project_name || exp.projectName || '';
  const title = exp.experience_title || exp.experienceTitle || `${biz} — Technical Proposal`;
  const stat = (exp.status || 'GENERATED').toUpperCase();
  const url = (exp.generated_url || exp.generatedUrl || '').trim();
  const date = exp.published_time || exp.created_time || exp.createdAt || exp.modified_time || new Date().toISOString();
  const err = exp.error_message || exp.errorMessage || '';
  const expId = exp.experience_id || exp.experienceId || exp.project_id || exp.projectId || String(Date.now());
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

const INITIAL_MOCK_PROPOSALS = [
  {
    id: 'prop-101',
    code: 'PROP-2026-001',
    title: 'Proposal A — Enterprise Zoho CRM Plus Architecture',
    customer: 'Customer A (Global Logistics Corp)',
    industry: 'Supply Chain & Logistics',
    value: 85000,
    status: 'Draft',
    date: '15 Sep 2026',
    owner: 'Hariharan R',
    description: 'Comprehensive CRM overhaul and automated logistics dispatch integration.'
  },
  {
    id: 'prop-102',
    code: 'PROP-2026-002',
    title: 'Proposal B — Omnichannel CX & Service Desk Migration',
    customer: 'Customer B (Apex Health Systems)',
    industry: 'Healthcare & Life Sciences',
    value: 120000,
    status: 'Review',
    date: '14 Sep 2026',
    owner: 'Hariharan R',
    description: 'HIPAA-compliant client service portal with automated ticket routing.'
  },
  {
    id: 'prop-103',
    code: 'PROP-2026-003',
    title: 'Proposal C — Real Estate Lead Engine & ERP Sync',
    customer: 'Customer C (Prestige Skyline Properties)',
    industry: 'Real Estate & Infrastructure',
    value: 65000,
    status: 'Approved',
    date: '12 Sep 2026',
    owner: 'Hariharan R',
    description: 'Full-funnel property inventory tracking and broker commission dashboard.'
  },
  {
    id: 'prop-104',
    code: 'PROP-2026-004',
    title: 'Proposal D — Customer Analytics & Data Pipeline',
    customer: 'Vertex Retail Network',
    industry: 'Retail & Omnichannel E-commerce',
    value: 95000,
    status: 'Approved',
    date: '10 Sep 2026',
    owner: 'Hariharan R',
    description: 'Predictive buyer scoring and automated replenishment engine.'
  },
  {
    id: 'prop-105',
    code: 'PROP-2026-005',
    title: 'Proposal E — Financial Advisory Portal & Zoho Creator',
    customer: 'Capital Crest Investments',
    industry: 'Financial Services & FinTech',
    value: 145000,
    status: 'Review',
    date: '08 Sep 2026',
    owner: 'Hariharan R',
    description: 'Custom wealth management client portal with real-time portfolio analytics.'
  },
  {
    id: 'prop-106',
    code: 'PROP-2026-006',
    title: 'Proposal F — Smart Factory IoT & Maintenance Workflows',
    customer: 'Titanium Industrial Works',
    industry: 'Manufacturing & Industrial',
    value: 110000,
    status: 'Draft',
    date: '05 Sep 2026',
    owner: 'Hariharan R',
    description: 'Predictive machine health alerts and field technician dispatch automation.'
  }
];

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
  const [proposals, setProposals] = useState(INITIAL_MOCK_PROPOSALS);

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

  const handleProposalCreated = (newProp) => {
    setProposals((prev) => [newProp, ...prev]);
    if (newProp?.title) {
      showToast(`Proposal "${newProp.title}" created successfully!`, 'success');
    }
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
      {/* Enterprise Collapsible Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeModule={activeModule}
        activeSubPage={activeSubPage}
        onNavigateModule={handleNavigate}
        onOpenSettings={() => setIsSettingsOpen(true)}
        experiencesCount={experiences.length}
        proposalsCount={6}
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
              onProposalCreated={handleProposalCreated}
              currentUser={currentUser}
              totalProposals={proposals.length}
              draftProposals={proposals.filter((p) => (p.status || '').toUpperCase() === 'DRAFT').length}
            />
          ) : (
            <ProposalPage
              proposals={proposals}
              onProposalCreated={handleProposalCreated}
              onNavigate={handleNavigate}
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
