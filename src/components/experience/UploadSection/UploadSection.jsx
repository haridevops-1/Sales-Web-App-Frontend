import React, { useState, useRef, useEffect } from 'react';
import './UploadSection.css';
import UploadDropzone from '../UploadDropzone/UploadDropzone';
import FilePreview from '../FilePreview/FilePreview';
import ProcessingState from '../ProcessingState/ProcessingState';
import UploadResultCard from '../UploadResultCard/UploadResultCard';
import ProcessStatus from '../ProcessStatus/ProcessStatus';
import SpotlightCard from '@/reactbits/SpotlightCard';
import { AnimatePresence, motion } from 'framer-motion';
import { validateFile, inferBusinessName, validateLogoFile } from '@/utils/helpers';
import { uploadTechnicalDocument, processDocument, analyzeDocument, generateCustomerExperience, deployCustomerExperience, getProcessStatus } from '@/api/catalystApi';
import { UPLOAD_STAGES } from '@/utils/constants';

export default function UploadSection({ onStageChange, onUploadSuccess, onExperienceCreated, onError }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [businessName, setBusinessName] = useState('');
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');

  // Business Logo State
  const [businessLogoFile, setBusinessLogoFile] = useState(null);
  const [businessLogoPreview, setBusinessLogoPreview] = useState(null);
  const [businessLogoError, setBusinessLogoError] = useState(null);
  
  // Workflow Pipeline React State
  const [uploadStage, setUploadStage] = useState(UPLOAD_STAGES.READY);
  const [uploadResult, setUploadResult] = useState(null); // Real IDs from Function 1
  const [processResult, setProcessResult] = useState(null); // Output from Function 2
  const [analysisResult, setAnalysisResult] = useState(null); // Output from Function 3
  const [experienceResult, setExperienceResult] = useState(null); // Output from Function 4
  const [deploymentResult, setDeploymentResult] = useState(null); // Real output from Function 5
  const [showStatusTracker, setShowStatusTracker] = useState(false); // Function 6 Status Tracker Switch
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [inlineError, setInlineError] = useState(null);
  const [generationError, setGenerationError] = useState(null);
  const [deployError, setDeployError] = useState(null);

  // Lets the user cancel the client-side wait for Function 3 (AI analysis) without touching the
  // backend job - it just stops this tab from polling; analyzeDocument()'s own in-flight guard is
  // what actually prevents duplicate Agent calls.
  const analysisAbortControllerRef = useRef(null);

  // Guards the Function 6 status poll: a single live timer/abort pair so a slow or
  // unmounted poll can never keep firing overlapping requests in the background.
  const statusPollTimerRef = useRef(null);
  const statusPollAbortRef = useRef(null);

  useEffect(() => {
    return () => {
      if (statusPollTimerRef.current) clearTimeout(statusPollTimerRef.current);
      if (statusPollAbortRef.current) statusPollAbortRef.current.abort();
    };
  }, []);

  const updateStage = (stage) => {
    setUploadStage(stage);
    if (onStageChange) {
      onStageChange(stage);
    }
  };

  const handleFileSelected = (file) => {
    setInlineError(null);
    const validation = validateFile(file);

    if (!validation.valid) {
      setInlineError(validation.error);
      if (onError) onError(validation.error);
      return;
    }

    setSelectedFile(file);
    const inferred = inferBusinessName(file.name);
    if (inferred && !businessName) {
      setBusinessName(inferred);
    }
  };

  const handleLogoSelected = (file) => {
    setBusinessLogoError(null);
    const validation = validateLogoFile(file);

    if (!validation.valid) {
      setBusinessLogoError(validation.error);
      if (businessLogoPreview) {
        URL.revokeObjectURL(businessLogoPreview);
      }
      setBusinessLogoFile(null);
      setBusinessLogoPreview(null);
      if (onError) onError(validation.error);
      return;
    }

    if (businessLogoPreview) {
      URL.revokeObjectURL(businessLogoPreview);
    }
    const previewUrl = URL.createObjectURL(file);
    setBusinessLogoFile(file);
    setBusinessLogoPreview(previewUrl);
    setBusinessLogoError(null);
  };

  const handleRemoveLogo = () => {
    if (businessLogoPreview) {
      URL.revokeObjectURL(businessLogoPreview);
    }
    setBusinessLogoFile(null);
    setBusinessLogoPreview(null);
    setBusinessLogoError(null);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setBusinessName('');
    setProjectName('');
    setProjectDescription('');
    if (businessLogoPreview) {
      URL.revokeObjectURL(businessLogoPreview);
    }
    setBusinessLogoFile(null);
    setBusinessLogoPreview(null);
    setBusinessLogoError(null);
    setUploadResult(null);
    setProcessResult(null);
    setAnalysisResult(null);
    setExperienceResult(null);
    setDeploymentResult(null);
    setShowStatusTracker(false);
    setInlineError(null);
    setGenerationError(null);
    setDeployError(null);
    setIsGenerating(false);
    setIsDeploying(false);
    updateStage(UPLOAD_STAGES.READY);
  };



  const handleUploadSubmit = async () => {
    // 1. Front-end validation checks
    if (!selectedFile) {
      setInlineError('Please select a PDF or Word document (.pdf, .docx).');
      return;
    }

    const fileValidation = validateFile(selectedFile);
    if (!fileValidation.valid) {
      setInlineError(fileValidation.error);
      return;
    }

    const cleanBiz = businessName ? businessName.trim() : '';
    if (!cleanBiz) {
      setInlineError('Business Name is required.');
      return;
    }

    const cleanProj = projectName ? projectName.trim() : '';
    if (!cleanProj) {
      setInlineError('Project Name is required.');
      return;
    }

    // Business logo validation (if provided)
    if (businessLogoError) {
      setInlineError(businessLogoError);
      return;
    }

    if (businessLogoFile) {
      const logoValidation = validateLogoFile(businessLogoFile);
      if (!logoValidation.valid) {
        setBusinessLogoError(logoValidation.error);
        setInlineError(logoValidation.error);
        return;
      }
    }

    setInlineError(null);
    setGenerationError(null);
    setDeployError(null);
    setUploadResult(null);
    setProcessResult(null);
    setAnalysisResult(null);
    setExperienceResult(null);
    setDeploymentResult(null);
    setShowStatusTracker(false);
    setIsGenerating(false);
    setIsDeploying(false);

    // ==========================================
    // STAGE 1: Function 1 Document Upload
    // ==========================================
    updateStage(UPLOAD_STAGES.UPLOADING);

    let fn1Result = null;
    try {
      fn1Result = await uploadTechnicalDocument({
        businessName: cleanBiz,
        projectName: cleanProj,
        projectDescription: projectDescription ? projectDescription.trim() : '',
        file: selectedFile,
        businessLogo: businessLogoFile
      });

      setUploadResult(fn1Result);

      if (!fn1Result?.documentId) {
        throw new Error('Upload incomplete.');
      }
    } catch (fn1Err) {
      console.error('[Function 1 Upload Failed]', fn1Err);
      updateStage(UPLOAD_STAGES.FAILED);
      if (onError) onError('Document upload failed. Please try again.');
      return;
    }


    // ==========================================
    // STAGE 2: Function 2 Document Process
    // ==========================================
    updateStage(UPLOAD_STAGES.EXTRACTING);

    let fn2Result = null;
    try {
      fn2Result = await processDocument({
        documentId: fn1Result.documentId
      });

      setProcessResult(fn2Result);

      if (fn2Result?.processingStatus !== 'EXTRACTED' && fn2Result?.success !== true) {
        throw new Error(fn2Result?.message || 'Text extraction did not complete.');
      }
    } catch (fn2Err) {
      console.error('[Document Extraction Failed]', fn2Err);
      const fn2FailureObj = {
        success: false,
        processingStatus: 'FAILED',
        jobStatus: 'FAILED',
        message: 'Extraction failed.'
      };

      setProcessResult(fn2FailureObj);
      updateStage(UPLOAD_STAGES.FAILED);
      if (onError) onError('Document processing failed. Please try again.');
      return;
    }

    // ==========================================
    // STAGE 3: Function 3 AI Analysis (spikra_ai_analysis)
    // ==========================================
    updateStage(UPLOAD_STAGES.AI_ANALYZING);

    let fn3Result = null;
    try {
      const analysisController = new AbortController();
      analysisAbortControllerRef.current = analysisController;

      fn3Result = await analyzeDocument({
        documentId: fn1Result.documentId,
        signal: analysisController.signal
      });

      analysisAbortControllerRef.current = null;
      setAnalysisResult(fn3Result);

      if (onUploadSuccess) {
        onUploadSuccess({
          upload: fn1Result,
          process: fn2Result,
          analysis: fn3Result,
          businessName: cleanBiz,
          projectName: cleanProj
        });
      }

      // Automatically chain to Function 4 (Experience Generation)
      updateStage(UPLOAD_STAGES.GENERATING_EXPERIENCE);
      setIsGenerating(true);

      let fn4Result = null;
      try {
        fn4Result = await generateCustomerExperience({
          projectId: fn1Result.projectId,
          documentId: fn1Result.documentId
        });

        setExperienceResult(fn4Result);
      } catch (fn4Err) {
        console.error('[Experience Generation Failed]', fn4Err);
        updateStage(UPLOAD_STAGES.FAILED);
        if (onError) onError('Proposal generation failed. Please try again.');
        setIsGenerating(false);
        return;
      } finally {
        setIsGenerating(false);
      }

      // Automatically chain to experience deployment (Step 5)
      updateStage(UPLOAD_STAGES.DEPLOYING);
      setIsDeploying(true);

      try {
        const fn5Result = await deployCustomerExperience({
          projectId: fn1Result.projectId,
          documentId: fn1Result.documentId,
          experienceId: fn4Result.experienceId,
          businessName: cleanBiz
        });

        setDeploymentResult(fn5Result);

        const immediateUrl = (fn5Result?.generatedUrl || fn5Result?.generated_url || '').trim();
        if (immediateUrl) {
          handleStatusPublished(fn5Result);
        } else {
          // Poll silently while remaining on the ProcessingState screen with Step 5 active!
          // Each poll waits for the previous one to finish before scheduling the next, so a
          // slow/timed-out call can never stack up overlapping in-flight requests.
          const maxPolls = 20;
          const pollIntervalMs = 2500;
          const perPollTimeoutMs = 10000;

          const runPoll = async (pollCount) => {
            const controller = new AbortController();
            statusPollAbortRef.current = controller;

            try {
              const statusResponse = await getProcessStatus({
                projectId: fn1Result.projectId,
                documentId: fn1Result.documentId,
                experienceId: fn4Result.experienceId,
                timeoutMs: perPollTimeoutMs,
                signal: controller.signal
              });

              const polledUrl = (statusResponse?.experience?.generated_url || '').trim();
              const currentStatus = String(statusResponse?.current_stage || '').toUpperCase();

              if (currentStatus === 'PUBLISHED' || polledUrl) {
                handleStatusPublished(statusResponse);
                return;
              }
              if (currentStatus === 'FAILED') {
                updateStage(UPLOAD_STAGES.FAILED);
                if (onError) onError('Publication failed. Please try again.');
                return;
              }
              if (pollCount >= maxPolls) {
                handleStatusPublished(statusResponse || fn5Result);
                return;
              }
            } catch (pErr) {
              if (pollCount >= maxPolls) {
                handleStatusPublished(fn5Result);
                return;
              }
            }

            statusPollTimerRef.current = setTimeout(() => runPoll(pollCount + 1), pollIntervalMs);
          };

          runPoll(1);
        }
      } catch (fn5Err) {
        console.error('[Experience Deploy Failed]', fn5Err);
        updateStage(UPLOAD_STAGES.FAILED);
        if (onError) onError('Proposal publication failed. Please try again.');
      } finally {
        setIsDeploying(false);
      }
    } catch (fn3Err) {
      analysisAbortControllerRef.current = null;

      if (fn3Err?.name === 'CancelledError') {
        // User clicked cancel - just return to the form with the file/fields intact, no error toast.
        setAnalysisResult(null);
        updateStage(UPLOAD_STAGES.READY);
        return;
      }

      console.error('[Analysis Failed]', fn3Err);
      const fn3FailureObj = {
        success: false,
        processingStatus: 'FAILED',
        jobStatus: 'FAILED',
        message: 'Analysis failed.'
      };

      setAnalysisResult(fn3FailureObj);
      updateStage(UPLOAD_STAGES.FAILED);
      if (onError) onError('Document analysis failed. Please try again.');
    }
  };

  const handleCancelAnalysis = () => {
    if (analysisAbortControllerRef.current) {
      analysisAbortControllerRef.current.abort();
    }
  };

  // ==========================================
  // Function 6 Status Callbacks (Source of Truth)
  // ==========================================
  const handleStatusPublished = (response) => {
    updateStage(UPLOAD_STAGES.PUBLISHED);
    const pubUrl = (response?.experience?.generated_url || '').trim();
    const cleanBiz = (response?.project?.business_name || uploadResult?.businessName || businessName || '').trim();
    const cleanProj = (response?.project?.project_name || uploadResult?.projectName || projectName || '').trim();
    const expTitle = (response?.experience?.experience_title || `${cleanBiz} — Technical Proposal`).trim();

    setDeploymentResult((prev) => ({
      ...prev,
      status: 'PUBLISHED',
      generatedUrl: pubUrl,
      generated_url: pubUrl,
      projectId: uploadResult?.projectId || response?.project?.project_id,
      documentId: uploadResult?.documentId || response?.document?.document_id,
      experienceId: experienceResult?.experienceId || response?.experience?.experience_id
    }));

    if (onUploadSuccess) {
      onUploadSuccess({
        upload: uploadResult,
        process: processResult,
        analysis: analysisResult,
        experience: experienceResult,
        deployment: {
          status: 'PUBLISHED',
          generatedUrl: pubUrl
        },
        businessName: cleanBiz,
        projectName: cleanProj
      });
    }

    if (onExperienceCreated && pubUrl) {
      onExperienceCreated({
        businessName: cleanBiz,
        projectName: cleanProj,
        experienceTitle: expTitle,
        status: 'PUBLISHED',
        generatedUrl: pubUrl,
        projectId: uploadResult?.projectId || response?.project?.project_id,
        documentId: uploadResult?.documentId || response?.document?.document_id,
        experienceId: experienceResult?.experienceId || response?.experience?.experience_id
      });
    }
  };

  const handleStatusError = (errorMessage) => {
    updateStage(UPLOAD_STAGES.FAILED);
    setDeployError(errorMessage);
    if (onError) {
      onError(errorMessage);
    }
  };

  const handleStatusStageChange = (stage) => {
    if (stage === 'PUBLISHED') {
      updateStage(UPLOAD_STAGES.PUBLISHED);
    } else if (stage === 'FAILED') {
      updateStage(UPLOAD_STAGES.FAILED);
    } else if (stage === 'DEPLOYING') {
      updateStage(UPLOAD_STAGES.DEPLOYING);
    }
  };

  // ==========================================
  // STAGE 4: Function 4 Customer Experience Generate
  // ==========================================
  const handleGenerateExperience = async () => {
    // 1. Validate that project_id exists
    const projectId = uploadResult?.projectId;
    if (!projectId) {
      const err = 'Project ID is missing. Cannot generate customer experience.';
      setInlineError(err);
      if (onError) onError(err);
      return;
    }

    // 2. Validate that document_id exists
    const documentId = uploadResult?.documentId;
    if (!documentId) {
      const err = 'Document ID is missing. Cannot generate customer experience.';
      setInlineError(err);
      if (onError) onError(err);
      return;
    }

    // 3. Validate that Function 3 completed successfully
    const isF3Complete = analysisResult?.processingStatus === 'COMPLETED' || (analysisResult?.success && analysisResult?.processingStatus !== 'FAILED');
    if (!isF3Complete) {
      const err = 'Analysis must complete successfully before generating experience.';
      setInlineError(err);
      if (onError) onError(err);
      return;
    }

    // 4. Disable itself while Function 4 is running, prevent duplicate requests
    if (isGenerating) {
      return;
    }

    setIsGenerating(true);
    setInlineError(null);
    setGenerationError(null);
    updateStage(UPLOAD_STAGES.GENERATING_EXPERIENCE);

    try {
      // 5. Call the Function 4 API with real IDs
      const result = await generateCustomerExperience({
        projectId,
        documentId
      });

      // 6. Handle response and update UI
      setExperienceResult(result);
      updateStage(UPLOAD_STAGES.GENERATED);

      if (onUploadSuccess) {
        onUploadSuccess({
          upload: uploadResult,
          process: processResult,
          analysis: analysisResult,
          experience: result,
          businessName: uploadResult.businessName || businessName,
          projectName: uploadResult.projectName || projectName
        });
      }

      // Automatically deploy to Slate
      setIsDeploying(true);
      updateStage(UPLOAD_STAGES.DEPLOYING);
      try {
        const deployRes = await deployCustomerExperience({
          projectId,
          documentId,
          experienceId: result.experienceId,
          businessName: (uploadResult?.businessName || businessName || '').trim()
        });
        setDeploymentResult(deployRes);
        setShowStatusTracker(true);
      } catch (dErr) {
        console.error('Auto deploy failed:', dErr);
        setDeployError(dErr.message);
        setShowStatusTracker(true);
      } finally {
        setIsDeploying(false);
      }
    } catch (expErr) {
      console.error('[Function 4 Experience Generation Failed]', expErr);
      const errorMsg = expErr.message || 'Customer experience generation failed.';
      setGenerationError(errorMsg);
      updateStage(UPLOAD_STAGES.FAILED);
      setInlineError(`The document was analyzed, but the customer experience could not be generated. (${errorMsg})`);
      if (onError) {
        onError(`The document was analyzed, but the customer experience could not be generated. (${errorMsg})`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // ==========================================
  // STAGE 5: Function 5 Customer Experience Deploy to Slate
  // ==========================================
  const handleDeployExperience = async () => {
    // 1. Check that project_id exists
    const projectId = uploadResult?.projectId;
    if (!projectId) {
      const err = 'Project ID is missing. Cannot deploy customer experience.';
      setInlineError(err);
      if (onError) onError(err);
      return;
    }

    // 2. Check that document_id exists
    const documentId = uploadResult?.documentId;
    if (!documentId) {
      const err = 'Document ID is missing. Cannot deploy customer experience.';
      setInlineError(err);
      if (onError) onError(err);
      return;
    }

    // 3. Check that experience_id exists
    const experienceId = experienceResult?.experienceId;
    if (!experienceId) {
      const err = 'Experience ID is missing. Cannot deploy customer experience.';
      setInlineError(err);
      if (onError) onError(err);
      return;
    }

    // 4. Check that Function 4 returned GENERATED
    if (experienceResult?.status !== 'GENERATED') {
      const err = 'Customer experience must be generated before publishing.';
      setInlineError(err);
      if (onError) onError(err);
      return;
    }

    // 5. Check that business_name exists
    const cleanBiz = (uploadResult?.businessName || businessName || '').trim();
    if (!cleanBiz) {
      const err = 'Business Name is missing. Cannot deploy customer experience.';
      setInlineError(err);
      if (onError) onError(err);
      return;
    }

    // 6. Disable itself while deployment is running (prevent duplicate requests)
    if (isDeploying) {
      return;
    }

    setIsDeploying(true);
    setInlineError(null);
    setDeployError(null);
    updateStage(UPLOAD_STAGES.DEPLOYING);

    try {
      // 7. Call Function 5 with real IDs and actual business name
      const result = await deployCustomerExperience({
        projectId,
        documentId,
        experienceId,
        businessName: cleanBiz
      });

      // 8. Handle actual API response and hand over to Function 6 status tracker
      setDeploymentResult(result);
      setShowStatusTracker(true);
    } catch (deployErr) {
      console.error('[Function 5 Experience Deploy Failed]', deployErr);
      const errorMsg = deployErr.message || 'The experience was generated, but it could not be published.';
      setDeployError(errorMsg);
      setShowStatusTracker(true);
      if (onError) {
        onError(`The experience was generated, but it could not be published. (${errorMsg})`);
      }
    } finally {
      setIsDeploying(false);
    }
  };

  const handleUploadAnother = () => {
    setSelectedFile(null);
    setBusinessName('');
    setProjectName('');
    setProjectDescription('');
    if (businessLogoPreview) {
      URL.revokeObjectURL(businessLogoPreview);
    }
    setBusinessLogoFile(null);
    setBusinessLogoPreview(null);
    setBusinessLogoError(null);
    setUploadResult(null);
    setProcessResult(null);
    setAnalysisResult(null);
    setExperienceResult(null);
    setDeploymentResult(null);
    setShowStatusTracker(false);
    setInlineError(null);
    setGenerationError(null);
    setDeployError(null);
    setIsGenerating(false);
    setIsDeploying(false);
    updateStage(UPLOAD_STAGES.READY);
  };

  const isWorking = [
    UPLOAD_STAGES.UPLOADING,
    UPLOAD_STAGES.EXTRACTING,
    UPLOAD_STAGES.AI_ANALYZING,
    UPLOAD_STAGES.GENERATING_EXPERIENCE,
    UPLOAD_STAGES.DEPLOYING
  ].includes(uploadStage);

  const isCompleted =
    uploadStage === UPLOAD_STAGES.PUBLISHED ||
    Boolean(deploymentResult?.generatedUrl || deploymentResult?.generated_url);

  const activeView = isCompleted
    ? 'complete'
    : isWorking
    ? 'processing'
    : selectedFile
    ? 'preview'
    : 'dropzone';

  return (
    <section className="compact-upload-section" aria-labelledby="upload-section-title">
      <div className="container">
        {isCompleted ? (
          <ProcessStatus
            projectId={uploadResult?.projectId}
            documentId={uploadResult?.documentId}
            experienceId={experienceResult?.experienceId}
            businessName={uploadResult?.businessName || businessName}
            projectName={uploadResult?.projectName || projectName}
            experienceTitle={experienceResult?.experienceTitle}
            generatedUrl={deploymentResult?.generatedUrl || deploymentResult?.generated_url}
            businessLogoPreview={businessLogoPreview}
            businessLogoFile={businessLogoFile}
            analysisData={analysisResult}
            onPublished={handleStatusPublished}
            onError={handleStatusError}
            onUploadAnother={handleUploadAnother}
          />
        ) : (
          <div className="upload-wrapper">
            <SpotlightCard className="upload-container-card" spotlightColor="rgba(44, 124, 184, 0.1)">
              {/* Card Header Row */}
              <div className="upload-header-row">
                <div className="upload-title-area">
                  <h2 id="upload-section-title" className="upload-main-title">
                    Upload Technical Document
                  </h2>
                  <p className="upload-sub-desc">
                    Upload discovery notes and requirements to generate an interactive customer experience proposal.
                  </p>
                </div>
              </div>

              {/* Inline Error Notice */}
              {inlineError && (
                <div className="compact-error-box animate-fade-in" role="alert">
                  <span className="error-icon">⚠️</span>
                  <span className="error-text">{inlineError}</span>
                  <button
                    type="button"
                    className="btn-close-err"
                    onClick={() => setInlineError(null)}
                    aria-label="Dismiss error"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Body State Switcher: Dropzone -> Preview -> Processing */}
              <div className="upload-inner-body">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeView}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                  >
                    {activeView === 'processing' ? (
                      <ProcessingState
                        stage={uploadStage}
                        businessName={businessName}
                        projectName={projectName}
                        hasLogo={Boolean(businessLogoFile)}
                        onCancel={uploadStage === UPLOAD_STAGES.AI_ANALYZING ? handleCancelAnalysis : undefined}
                      />
                    ) : activeView === 'preview' ? (
                      <FilePreview
                        file={selectedFile}
                        businessName={businessName}
                        onBusinessNameChange={setBusinessName}
                        projectName={projectName}
                        onProjectNameChange={setProjectName}
                        projectDescription={projectDescription}
                        onProjectDescriptionChange={setProjectDescription}
                        businessLogoFile={businessLogoFile}
                        businessLogoPreview={businessLogoPreview}
                        businessLogoError={businessLogoError}
                        onLogoSelected={handleLogoSelected}
                        onRemoveLogo={handleRemoveLogo}
                        onRemove={handleRemoveFile}
                        onUpload={handleUploadSubmit}
                        disabled={isWorking}
                      />
                    ) : (
                      <UploadDropzone
                        onFileSelected={handleFileSelected}
                        disabled={isWorking}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            </SpotlightCard>
          </div>
        )}
      </div>
    </section>
  );
}

