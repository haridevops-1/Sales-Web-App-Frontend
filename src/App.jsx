import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import Header from './components/Header/Header';
import Footer from './components/Footer/Footer';
import Dashboard from './pages/Dashboard/Dashboard';
import AllExperiences from './pages/AllExperiences/AllExperiences';
import Toast from './components/Toast/Toast';
import { getCustomerExperiences } from './api/catalystApi';

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

export default function App() {
  const [activePage, setActivePage] = useState('generator'); // 'generator' | 'history'
  const [toast, setToast] = useState(null);
  const [experiences, setExperiences] = useState([]);
  const [isLoadingExperiences, setIsLoadingExperiences] = useState(true);
  const [experiencesError, setExperiencesError] = useState(null);

  // Authenticated user state
  const [currentUser] = useState({
    name: 'Hariharan R',
    designation: 'Product Consultant'
  });

  const showToast = (message, type = 'success', duration = 7000) => {
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

  // Fetch experiences from Function 7 on initial mount.
  // hasLoadedRef guards against React StrictMode's intentional double-invoke
  // of effects in development, which would otherwise fire this call twice.
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

  const handleNavigate = (page) => {
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="spikra-app-root">
      {/* Universal Header with Navigation Tabs & User Profile */}
      <Header
        activePage={activePage}
        onNavigate={handleNavigate}
        totalCount={experiences.length}
        currentUser={currentUser}
      />

      {/* Main Page Router Switcher */}
      <main className="spikra-page-content">
        {activePage === 'generator' ? (
          <Dashboard
            onToast={showToast}
            onExperienceCreated={handleExperienceCreated}
            experiences={experiences}
          />
        ) : (
          <AllExperiences
            onNavigate={handleNavigate}
            experiences={experiences}
            isLoading={isLoadingExperiences}
            error={experiencesError}
            onRefresh={() => loadExperiences({})}
          />
        )}
      </main>

      {/* Enterprise Footer */}
      <Footer onNavigate={handleNavigate} />

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
