import React, { useState } from 'react';
import './Dashboard.css';
import HeroSection from '@/components/experience/HeroSection/HeroSection';
import UploadSection from '@/components/experience/UploadSection/UploadSection';
import QuickStats from '@/components/experience/QuickStats/QuickStats';
import { UPLOAD_STAGES } from '@/utils/constants';
import { ArrowLeft } from 'lucide-react';

export default function Dashboard({
  onNavigate,
  onToast,
  onExperienceCreated,
  experiences = []
}) {
  const [pipelineStage, setPipelineStage] = useState(UPLOAD_STAGES.READY);

  const totalCount = experiences.length;
  const publishedCount = experiences.filter((e) => (e.status || '').toUpperCase() === 'PUBLISHED').length;

  const handleUploadSuccess = (result) => {
    if (!onToast) return;

    if (result?.deployment?.status === 'PUBLISHED') {
      onToast('Customer proposal experience created successfully!', 'success', 6000);
    } else if (result?.experience?.status === 'GENERATED') {
      onToast('Customer experience proposal is ready!', 'success', 6000);
    } else {
      onToast('Customer experience created successfully!', 'success', 6000);
    }
  };

  const handleUploadError = (errorMsg) => {
    if (onToast) {
      onToast(errorMsg || 'Unable to generate customer experience. Please try again.', 'error', 6000);
    }
  };

  return (
    <div className="generator-dashboard-view animate-fade-in">
      <div className="container dashboard-back-row">
        <button
          type="button"
          className="btn-back-link"
          onClick={() => onNavigate && onNavigate('workspace', 'hub')}
        >
          <ArrowLeft size={15} className="btn-back-arrow" />
          <span>Back to Sales Workspace</span>
        </button>
      </div>

      <HeroSection />

      <QuickStats totalCount={totalCount} publishedCount={publishedCount} />

      <div className="generator-body-container">
        <UploadSection
          onStageChange={setPipelineStage}
          onUploadSuccess={handleUploadSuccess}
          onExperienceCreated={onExperienceCreated}
          onError={handleUploadError}
        />
      </div>
    </div>
  );
}
