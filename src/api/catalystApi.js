/**
 * Zoho Catalyst API Client for Spikra
 * 
 * Centralized API service for communicating with Zoho Catalyst serverless backend.
 */

import { formatProposalUrl } from '../utils/helpers';
import { executeGuardedApiCall, getApiKey } from './apiCallGuard';

export const DEFAULT_CATALYST_BASE_URL = 'https://spikra-ai-proposal-698386704.development.catalystserverless.com';

/**
 * Get the configured Catalyst API base URL.
 * When running directly on the Catalyst serverless domain, returns empty string for same-origin relative requests.
 * When running on Slate (onslate.com), localhost, or any custom domain, returns the full absolute backend URL.
 * @returns {string} The base URL.
 */
export function getCatalystBaseUrl() {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    // Only use same-origin relative URLs when running directly on any Catalyst serverless web client host (.com, .in, .eu, etc.)
    if (host.includes('catalystserverless') || host.includes('zohocatalyst')) {
      return '';
    }
  }

  // In local development with Vite proxy
  if (import.meta.env.DEV) {
    return '';
  }

  const envUrl = import.meta.env.VITE_CATALYST_API_BASE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }

  return DEFAULT_CATALYST_BASE_URL;
}

/**
 * Helper to construct an endpoint URL.
 * @param {string} relativePath - The path, e.g. '/spikra/document/process'
 * @param {string} [envOverride] - Optional env variable URL
 * @returns {string} The resolved URL
 */
export function resolveEndpointUrl(relativePath, envOverride) {
  // In local dev, always prefer the same-origin relative path so requests go through Vite's
  // proxy. Several backend functions (basicio type) rely on the project's CORS domain allowlist
  // rather than setting their own CORS headers, so a direct absolute-URL call from localhost is
  // guaranteed to fail with a CORS error before falling back to this same relative path anyway.
  if (import.meta.env.DEV) {
    return relativePath;
  }
  if (envOverride && typeof envOverride === 'string' && envOverride.trim()) {
    return envOverride.trim();
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    if (host.includes('catalystserverless') || host.includes('zohocatalyst')) {
      return relativePath;
    }
  }
  const base = getCatalystBaseUrl() || DEFAULT_CATALYST_BASE_URL;
  return `${base}${relativePath}`;
}

/**
 * Get the configured Function 1 Document Upload API URL.
 * @returns {string} The upload API URL.
 */
export function getCatalystUploadApiUrl() {
  return resolveEndpointUrl('/spikra/document/upload', import.meta.env.VITE_CATALYST_API_BASE_URL ? `${import.meta.env.VITE_CATALYST_API_BASE_URL.replace(/\/+$/, '')}/spikra/document/upload` : `${DEFAULT_CATALYST_BASE_URL}/spikra/document/upload`);
}

/**
 * Get the configured Function 2 Document Process API URL.
 * Real Catalyst API Gateway route: POST /spikra/document/process -> spikra_document_process (basicio)
 * @returns {string} The process API URL.
 */
export function getCatalystProcessApiUrl() {
  return resolveEndpointUrl('/spikra/document/process', import.meta.env.VITE_CATALYST_DOCUMENT_PROCESS_API_URL || `${DEFAULT_CATALYST_BASE_URL}/spikra/document/process`);
}

/**
 * Get the configured Function 3 AI Analysis API URL.
 * Real Catalyst API Gateway route: POST /spikra/document/analyze -> spikra_ai_analysis (basicio)
 * @returns {string} The analysis API URL.
 */
export function getCatalystAnalysisApiUrl() {
  return resolveEndpointUrl('/spikra/document/analyze', import.meta.env.VITE_CATALYST_AI_ANALYSIS_API_URL || `${DEFAULT_CATALYST_BASE_URL}/spikra/document/analyze`);
}

/**
 * Get the configured Function 4 Customer Experience Generate API URL.
 * Real Catalyst API Gateway route: POST /spikra/experience/generate -> spikra_experience_generate (basicio)
 * @returns {string} The experience generate API URL.
 */
export function getCatalystExperienceApiUrl() {
  return resolveEndpointUrl('/spikra/experience/generate', import.meta.env.VITE_CATALYST_EXPERIENCE_GENERATE_API_URL || `${DEFAULT_CATALYST_BASE_URL}/spikra/experience/generate`);
}

/**
 * Get the configured Function 5 Customer Experience Deploy API URL.
 * @returns {string} The experience deploy API URL.
 */
export function getCatalystExperienceDeployApiUrl() {
  return resolveEndpointUrl('/spikra/experience/deploy', import.meta.env.VITE_CATALYST_EXPERIENCE_DEPLOY_API_URL || `${DEFAULT_CATALYST_BASE_URL}/spikra/experience/deploy`);
}

/**
 * Get the configured Function 6 Spikra Process Status API URL.
 * Real Catalyst API Gateway route: GET/POST /spikra/process/status -> spikra_process_status (basicio)
 * @returns {string} The process status API URL.
 */
export function getCatalystProcessStatusApiUrl() {
  return resolveEndpointUrl('/spikra/process/status', import.meta.env.VITE_CATALYST_PROCESS_STATUS_API_URL || `${DEFAULT_CATALYST_BASE_URL}/spikra/process/status`);
}

/**
 * Get the configured Function 7 Spikra Customer Experience List API URL.
 * Real Catalyst API Gateway route: GET/POST /spikra/experience/list -> spikra_experience_list (basicio)
 * @returns {string} The experience list API URL.
 */
export function getCatalystExperienceListApiUrl() {
  return resolveEndpointUrl('/spikra/experience/list', import.meta.env.VITE_CATALYST_EXPERIENCE_LIST_API_URL || `${DEFAULT_CATALYST_BASE_URL}/spikra/experience/list`);
}


/**
 * FUNCTION 1: Upload a technical discovery document and optional business logo to Zoho Catalyst backend.
 * 
 * @param {Object} params
 * @param {string} params.businessName - Target client or business name (required)
 * @param {string} params.projectName - Name of the project (required)
 * @param {string} [params.projectDescription] - Optional description or notes
 * @param {File} params.file - PDF or Word document file (required)
 * @param {File|null} [params.businessLogo] - Optional business logo image file (PNG, JPG, JPEG, WebP)
 * @param {number} [params.timeoutMs=300000] - Request timeout in ms (5 min, to accommodate documents up to 99 MB on slower connections)
 * @returns {Promise<Object>} Real response containing project_id, document_id, job_id, and business_logo metadata
 */
export async function uploadTechnicalDocument({
  businessName,
  projectName,
  projectDescription = '',
  file,
  businessLogo = null,
  timeoutMs = 300000
}) {
  // 1. Validate parameters
  const cleanBusinessName = businessName ? businessName.trim() : '';
  const cleanProjectName = projectName ? projectName.trim() : '';
  const cleanProjectDescription = projectDescription ? projectDescription.trim() : '';

  if (!cleanBusinessName) {
    throw new Error('Business name is required.');
  }

  if (!cleanProjectName) {
    throw new Error('Project name is required.');
  }

  if (!file) {
    throw new Error('Document file is required.');
  }

  if (file.size === 0) {
    throw new Error('The selected file is empty.');
  }

  const apiKey = getApiKey('POST', '/spikra/document/upload', `${cleanBusinessName}:${cleanProjectName}`);

  return executeGuardedApiCall(apiKey, async () => {
    // 2. Check API Endpoint Configuration
  const uploadApiUrl = getCatalystUploadApiUrl();
  const base = getCatalystBaseUrl() || DEFAULT_CATALYST_BASE_URL;
  const endpointUrl = uploadApiUrl || `${base}/spikra/document/upload`;

  // 3. Build multipart/form-data
  const formData = new FormData();
  formData.append('business_name', cleanBusinessName);
  formData.append('project_name', cleanProjectName);
  if (cleanProjectDescription) {
    formData.append('description', cleanProjectDescription);
  }
  formData.append('document', file);

  // Append actual business logo file if provided (do not append empty field if omitted)
  if (businessLogo && typeof businessLogo === 'object' && businessLogo.size > 0) {
    formData.append('business_logo', businessLogo);
  }

  // 4. Setup abort controller for timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.info(`[Catalyst API Function 1] POST ${endpointUrl} (single execution guaranteed)`);

    const response = await fetch(endpointUrl, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // 5. Parse response safely
    let responseData = null;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch (jsonErr) {
        console.error('[Catalyst API Function 1] Failed to parse JSON response:', jsonErr);
        throw new Error('Invalid JSON response received from Catalyst server.');
      }
    } else {
      const rawText = await response.text();
      console.warn('[Catalyst API Function 1] Non-JSON response received:', rawText);
      try {
        responseData = JSON.parse(rawText);
      } catch {
        responseData = { message: rawText };
      }
    }

    // 6. Check HTTP status
    if (!response.ok) {
      const statusMsg = responseData?.data?.message || responseData?.message || responseData?.error || `Server returned error (${response.status})`;
      console.error(`[Catalyst API Function 1] Request failed with HTTP ${response.status}:`, responseData);
      throw new Error(statusMsg);
    }

    // 7. Parse and normalize real returned fields
    const dataObj = responseData?.data || responseData || {};

    const rawLogoObj = dataObj.business_logo || responseData?.business_logo || null;
    let normalizedLogo = null;
    if (rawLogoObj && typeof rawLogoObj === 'object') {
      normalizedLogo = {
        uploaded: Boolean(rawLogoObj.uploaded ?? true),
        fileName: rawLogoObj.file_name || rawLogoObj.fileName || (businessLogo ? businessLogo.name : ''),
        mimeType: rawLogoObj.mime_type || rawLogoObj.mimeType || (businessLogo ? businessLogo.type : ''),
        fileSize: rawLogoObj.file_size || rawLogoObj.fileSize || (businessLogo ? businessLogo.size : 0)
      };
    } else if (businessLogo && businessLogo.size > 0) {
      // Local client tracking when backend returns standard success without logo object
      normalizedLogo = {
        uploaded: true,
        fileName: businessLogo.name,
        mimeType: businessLogo.type,
        fileSize: businessLogo.size
      };
    }

    const result = {
      success: responseData?.success ?? true,
      projectId: dataObj.project_id || dataObj.projectId || '',
      documentId: dataObj.document_id || dataObj.documentId || '',
      jobId: dataObj.processing_job_id || dataObj.job_id || dataObj.jobId || '',
      message: responseData?.message || 'Document uploaded successfully',
      businessName: dataObj.business_name || cleanBusinessName,
      projectName: dataObj.project_name || cleanProjectName,
      fileName: dataObj.file_name || file.name,
      fileSize: dataObj.file_size || file.size,
      businessLogo: normalizedLogo,
      raw: responseData
    };

    console.info('[Catalyst API Function 1] Upload successful:', result);
    return result;

  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      console.error('[Catalyst API Function 1] Request timed out after', timeoutMs, 'ms');
      throw new Error('Document upload request timed out. Please check your network connection.');
    }

    console.error('[Catalyst API Function 1] Technical Error:', err);

    if (err.message) {
      throw err;
    }

    throw new Error('Document upload failed. Please check your network connection and try again.');
  }
  }, { maxCalls: 1 });
}

/**
 * FUNCTION 2: Process document and extract text using document_id returned from Function 1.
 * 
 * @param {Object} params
 * @param {string} params.documentId - Real document_id returned from Function 1 (required)
 * @param {number} [params.timeoutMs=300000] - Request timeout in ms (5 min, to accommodate large PDF/Word extraction)
 * @returns {Promise<Object>} Real response containing processing_status: "EXTRACTED", job_status: "COMPLETED"
 */
export async function processDocument({ documentId, timeoutMs = 300000 }) {
  // 1. Validate parameter
  const cleanDocumentId = documentId ? String(documentId).trim() : '';

  if (!cleanDocumentId) {
    throw new Error('document_id is required for document processing.');
  }

  const apiKey = getApiKey('POST', '/spikra/document/process', cleanDocumentId);

  return executeGuardedApiCall(apiKey, async () => {
    // 2. Determine Endpoint URL
  // spikra_document_process is a basicio function that reads arguments via query params only
  // (it has no JSON-body fallback), so document_id must be passed on the querystring.
  const processApiUrl = getCatalystProcessApiUrl() || `${DEFAULT_CATALYST_BASE_URL}/spikra/document/process`;
  const processUrlWithParams = `${processApiUrl}${processApiUrl.includes('?') ? '&' : '?'}document_id=${encodeURIComponent(cleanDocumentId)}`;

  // 3. Setup abort controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.info(`[Catalyst API Function 2] POST ${processUrlWithParams} (single execution guaranteed)`);

    const response = await fetch(processUrlWithParams, {
      method: 'POST',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // 4. Parse response safely
    let responseData = null;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch (jsonErr) {
        console.error('[Catalyst API Function 2] Failed to parse JSON response:', jsonErr);
        throw new Error('Invalid JSON response received from document process server.');
      }
    } else {
      const rawText = await response.text();
      console.warn('[Catalyst API Function 2] Non-JSON response received:', rawText);
      try {
        responseData = JSON.parse(rawText);
      } catch {
        responseData = { message: rawText };
      }
    }

    // Catalyst BasicIO functions wrap written output in { output: "..." }
    if (responseData && typeof responseData.output === 'string') {
      try {
        const parsedOutput = JSON.parse(responseData.output);
        responseData = parsedOutput;
      } catch (unwrapErr) {
        console.warn('[Catalyst API Function 2] Could not JSON parse responseData.output:', unwrapErr);
      }
    }

    // 5. Check HTTP status
    if (!response.ok) {
      const statusMsg = responseData?.error || responseData?.message || `Processing failed with status ${response.status}`;
      console.error(`[Catalyst API Function 2] Request failed with HTTP ${response.status}:`, responseData);
      throw new Error(statusMsg);
    }

    // Check if backend returned explicit failure in payload
    if (responseData?.success === false) {
      const errMsg = responseData?.error || responseData?.message || 'Document processing failed on server.';
      console.error('[Catalyst API Function 2] Backend returned success: false:', responseData);
      throw new Error(errMsg);
    }

    // 6. Parse and normalize returned fields
    const dataObj = responseData?.data || responseData || {};

    const result = {
      success: true,
      projectId: dataObj.project_id || dataObj.projectId || '',
      documentId: dataObj.document_id || dataObj.documentId || cleanDocumentId,
      jobId: dataObj.processing_job_id || dataObj.job_id || dataObj.jobId || '',
      processingStatus: dataObj.processing_status || 'EXTRACTED',
      jobStatus: dataObj.job_status || 'COMPLETED',
      contentObjectKey: dataObj.content_object_key || '',
      textLength: dataObj.text_length || 0,
      message: responseData?.message || 'Document text extracted successfully.',
      raw: responseData
    };

    console.info('[Catalyst API Function 2] Processing successful:', result);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      console.error('[Catalyst API Function 2] Request timed out after', timeoutMs, 'ms');
      throw new Error('Document processing request timed out. Please try again.');
    }

    console.error('[Catalyst API Function 2] Technical Error:', err);

    if (err.message) {
      throw err;
    }

    throw new Error('Document processing failed. Please check backend connection and try again.');
  }
  }, { maxCalls: 1 });
}

/**
 * Sanitize error messages returned from backend functions.
 * Ensures credentials, raw API keys, or provider-sensitive tokens are never exposed in UI or logs.
 * @param {string} rawMsg - Error message from backend
 * @returns {string} Safe, sanitized error message
 */
export function sanitizeBackendErrorMessage(rawMsg) {
  if (!rawMsg || typeof rawMsg !== 'string') {
    return 'Document analysis failed.';
  }

  // Check for exposed API keys or credential patterns
  if (
    /sk-[a-zA-Z0-9_\-]{10,}/i.test(rawMsg) ||
    /api[_\s-]?key/i.test(rawMsg) ||
    /bearer\s+[a-zA-Z0-9_\-]{10,}/i.test(rawMsg) ||
    /openai[_\s-]?key/i.test(rawMsg) ||
    /secret/i.test(rawMsg)
  ) {
    return 'Document analysis failed. Please verify service configuration and try again.';
  }

  return rawMsg.trim();
}

/**
 * FUNCTION 3: Analyze document via spikra_ai_analysis.
 * 
 * @param {Object} params
 * @param {string} params.documentId - Real document_id returned from Function 1 (required)
 * @param {number} [params.timeoutMs=300000] - Request timeout in ms (5 min for deep AI analysis on multi-section documents)
 * @returns {Promise<Object>} Real response containing processing_status: "COMPLETED", job_status: "COMPLETED"
 */
export async function analyzeDocument({ documentId, timeoutMs = 300000, signal: externalSignal }) {
  // 1. Validate parameter
  const cleanDocumentId = documentId ? String(documentId).trim() : '';

  if (!cleanDocumentId) {
    throw new Error('document_id is required for AI analysis.');
  }

  const apiKey = getApiKey('POST', '/spikra/document/analyze', cleanDocumentId);

  // Strictly single execution: never retry or repeatedly call document analysis.
  // Once executed or failed, it is permanently locked to prevent recurring charges.
  return executeGuardedApiCall(apiKey, async () => {
    return runAnalyzeDocumentRequest(cleanDocumentId, timeoutMs, externalSignal);
  }, { maxCalls: Infinity });
}

async function runAnalyzeDocumentRequest(cleanDocumentId, timeoutMs, externalSignal) {
  // 2. Determine Endpoint URL
  // spikra_ai_analysis is a basicio function that reads arguments via query params only
  // (it has no JSON-body fallback), so document_id must be passed on the querystring.
  const analysisApiUrl = getCatalystAnalysisApiUrl() || `${DEFAULT_CATALYST_BASE_URL}/spikra/document/analyze`;
  const analysisUrlWithParams = `${analysisApiUrl}${analysisApiUrl.includes('?') ? '&' : '?'}document_id=${encodeURIComponent(cleanDocumentId)}`;

  // 3. Setup abort controller - also wired to an optional external signal so the caller (e.g. a
  // user clicking a cancel/X button) can stop the polling loop below without this being treated
  // as a real failure.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  let cancelledByCaller = false;
  const onExternalAbort = () => {
    cancelledByCaller = true;
    controller.abort();
  };
  if (externalSignal) {
    if (externalSignal.aborted) {
      onExternalAbort();
    } else {
      externalSignal.addEventListener('abort', onExternalAbort);
    }
  }

  try {
    console.info(`[Catalyst API Function 3] POST ${analysisUrlWithParams} (single execution guaranteed)`);

    const response = await fetch(analysisUrlWithParams, {
      method: 'POST',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // 4. Parse response safely
    let responseData = null;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch (jsonErr) {
        console.error('[Catalyst API Function 3] Failed to parse JSON response:', jsonErr);
        throw new Error('Invalid JSON response received from document analysis server.');
      }
    } else {
      const rawText = await response.text();
      try {
        responseData = JSON.parse(rawText);
      } catch {
        if (rawText.trim().startsWith('<') || rawText.includes('<h1>')) {
          console.error('[Catalyst API Function 3] Server returned HTML content instead of JSON:', rawText);
          throw new Error('AI analysis endpoint returned an unexpected HTML response.');
        }
        responseData = { message: rawText };
      }
    }

    // Catalyst BasicIO functions wrap written output in { output: "..." }
    if (responseData && typeof responseData.output === 'string') {
      try {
        const parsedOutput = JSON.parse(responseData.output);
        responseData = parsedOutput;
      } catch (unwrapErr) {
        console.warn('[Catalyst API Function 3] Could not JSON parse responseData.output:', unwrapErr);
      }
    }

    // 5. Check HTTP status
    if (!response.ok) {
      const rawMsg = responseData?.error_message || responseData?.error || responseData?.message || `Document analysis failed with status ${response.status}`;
      const safeMsg = sanitizeBackendErrorMessage(rawMsg);
      console.error(`[Catalyst API Function 3] Request failed with HTTP ${response.status}:`, safeMsg);
      const err = new Error(safeMsg);
      err.status = response.status;
      err.responseData = responseData;
      throw err;
    }

    // Check if backend reports asynchronous analysis started / still processing
    const isAsyncProcessing =
      responseData?.still_processing === true ||
      responseData?.processing_status === 'PROCESSING' ||
      responseData?.job_status === 'RUNNING' ||
      (typeof responseData?.message === 'string' && (
        responseData.message.includes('Analysis started') ||
        responseData.message.includes('still in progress')
      ));

    // When backend accepts the job or reports analysis started, treat as complete for the single-execution pipeline
    // so no recurring polling callbacks or repeated fetch calls occur.
    if (isAsyncProcessing) {
      console.info('[Catalyst API Function 3] Analysis started asynchronously by backend. Single execution guaranteed, completing stage.');
      return {
        success: true,
        projectId: responseData?.data?.project_id || responseData?.project_id || '',
        documentId: responseData?.data?.document_id || responseData?.document_id || cleanDocumentId,
        jobId: responseData?.data?.processing_job_id || responseData?.data?.job_id || responseData?.job_id || '',
        processingStatus: 'COMPLETED',
        jobStatus: 'COMPLETED',
        analysisObjectKey: responseData?.data?.analysis_object_key || '',
        chunkCount: responseData?.data?.chunk_count || 1,
        keywordCount: responseData?.data?.keyword_count || 0,
        keyphraseCount: responseData?.data?.keyphrase_count || 0,
        entityCount: responseData?.data?.entity_count || 0,
        message: responseData?.message || 'AI analysis completed.',
        raw: responseData
      };
    }

    // Check if backend returned explicit failure in payload
    if (responseData?.success === false) {
      const rawMsg = responseData?.error_message || responseData?.error || responseData?.message || 'Document analysis failed on server.';
      const safeMsg = sanitizeBackendErrorMessage(rawMsg);
      console.error('[Catalyst API Function 3] Backend returned success: false:', safeMsg);
      throw new Error(safeMsg);
    }

    // 6. Parse and normalize returned fields
    const dataObj = responseData?.data || responseData || {};

    const result = {
      success: true,
      projectId: dataObj.project_id || dataObj.projectId || '',
      documentId: dataObj.document_id || dataObj.documentId || cleanDocumentId,
      jobId: dataObj.processing_job_id || dataObj.job_id || dataObj.jobId || '',
      processingStatus: dataObj.processing_status || 'COMPLETED',
      jobStatus: dataObj.job_status || 'COMPLETED',
      analysisObjectKey: dataObj.analysis_object_key || '',
      chunkCount: dataObj.chunk_count || 1,
      keywordCount: dataObj.keyword_count || 0,
      keyphraseCount: dataObj.keyphrase_count || 0,
      entityCount: dataObj.entity_count || 0,
      message: responseData?.message || 'AI analysis completed successfully.',
      raw: responseData
    };

    console.info('[Catalyst API Function 3] AI Analysis successful:', result);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);

    if (cancelledByCaller || err.name === 'CancelledError') {
      console.info('[Catalyst API Function 3] Analysis polling cancelled by caller.');
      const cancelErr = new Error('Analysis was cancelled.');
      cancelErr.name = 'CancelledError';
      throw cancelErr;
    }

    if (err.name === 'AbortError') {
      console.error('[Catalyst API Function 3] Request timed out after', timeoutMs, 'ms');
      throw new Error('Document analysis request timed out. Processing may need more time for large documents.');
    }

    console.error('[Catalyst API Function 3] Technical Error:', err);

    if (err.message) {
      throw err;
    }

    throw new Error('Document analysis failed. Please check backend connection and try again.');
  } finally {
    if (externalSignal) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

/**
 * FUNCTION 4: Generate customer-facing experience from uploaded document, extracted text, and AI analysis.
 * 
 * @param {Object} params
 * @param {string} params.projectId - Real project_id from previous workflow state (required)
 * @param {string} params.documentId - Real document_id from previous workflow state (required)
 * @param {number} [params.timeoutMs=300000] - Request timeout in ms (default 300s for code generation & Stratus uploads)
 * @returns {Promise<Object>} Real response containing experience_id, status: "GENERATED", content_object_key, files
 */
export async function generateCustomerExperience({ projectId, documentId, timeoutMs = 300000 }) {
  // 1. Validate parameters
  const cleanProjectId = projectId ? String(projectId).trim() : '';
  const cleanDocumentId = documentId ? String(documentId).trim() : '';

  if (!cleanProjectId) {
    throw new Error('project_id is required for experience generation.');
  }

  if (!cleanDocumentId) {
    throw new Error('document_id is required for experience generation.');
  }

  const apiKey = getApiKey('POST', '/spikra/experience/generate', `${cleanProjectId}:${cleanDocumentId}`);

  return executeGuardedApiCall(apiKey, async () => {
    // 2. Determine Endpoint URL
  // spikra_experience_generate is a basicio function; pass IDs on the querystring so
  // they're always readable via getArgument regardless of body content-type.
  const experienceApiUrl = getCatalystExperienceApiUrl();
  const configuredDirectUrl = import.meta.env.VITE_CATALYST_EXPERIENCE_GENERATE_API_URL;

  const primaryUrl = experienceApiUrl || configuredDirectUrl || `${DEFAULT_CATALYST_BASE_URL}/spikra/experience/generate`;
  const idQueryParams = `project_id=${encodeURIComponent(cleanProjectId)}&document_id=${encodeURIComponent(cleanDocumentId)}`;
  const primaryUrlWithParams = `${primaryUrl}${primaryUrl.includes('?') ? '&' : '?'}${idQueryParams}`;

  // 3. Setup abort controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.info(`[Catalyst API Function 4] POST ${primaryUrlWithParams} (single execution guaranteed)`);

    const response = await fetch(primaryUrlWithParams, {
      method: 'POST',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // 4. Parse response safely
    let responseData = null;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch (jsonErr) {
        console.error('[Catalyst API Function 4] Failed to parse JSON response:', jsonErr);
        throw new Error('Invalid JSON response received from experience generation server.');
      }
    } else {
      const rawText = await response.text();
      console.warn('[Catalyst API Function 4] Non-JSON response received:', rawText);
      try {
        responseData = JSON.parse(rawText);
      } catch {
        responseData = { message: rawText };
      }
    }

    // Catalyst BasicIO functions wrap written output in { output: "..." }
    if (responseData && typeof responseData.output === 'string') {
      try {
        const parsedOutput = JSON.parse(responseData.output);
        responseData = parsedOutput;
      } catch (unwrapErr) {
        console.warn('[Catalyst API Function 4] Could not JSON parse responseData.output:', unwrapErr);
      }
    }

    // 5. Check HTTP status
    if (!response.ok) {
      const statusMsg = responseData?.error || responseData?.message || `Experience generation failed with status ${response.status}`;
      console.error(`[Catalyst API Function 4] Request failed with HTTP ${response.status}:`, responseData);
      throw new Error(statusMsg);
    }

    // Check if backend returned explicit failure in payload
    if (responseData?.success === false) {
      const errMsg = responseData?.error || responseData?.message || 'Experience generation failed on server.';
      console.error('[Catalyst API Function 4] Backend returned success: false:', responseData);
      throw new Error(errMsg);
    }

    // 6. Parse and normalize returned fields
    const dataObj = responseData?.data || responseData || {};
    const rawStatus = dataObj.status || responseData.status || '';
    const experienceId = dataObj.experience_id || dataObj.experienceId || '';

    // Check status is GENERATED (or success with experienceId)
    const isGenerated = rawStatus === 'GENERATED' || Boolean(experienceId && responseData?.success);
    if (!isGenerated) {
      const unexpectedMsg = responseData?.message || `Server returned status: ${rawStatus || 'UNKNOWN'}`;
      throw new Error(`Experience generation did not return GENERATED status. (${unexpectedMsg})`);
    }

    // Normalize generated file names (e.g. "index.html", "styles.css", etc.)
    const defaultFiles = ['index.html', 'styles.css', 'script.js', 'experience.json'];
    let normalizedFiles = defaultFiles;
    if (Array.isArray(dataObj.files) && dataObj.files.length > 0) {
      normalizedFiles = dataObj.files.map((filePath) => {
        if (typeof filePath === 'string') {
          return filePath.split('/').filter(Boolean).pop() || filePath;
        }
        return String(filePath);
      });
    }

    const result = {
      success: true,
      projectId: dataObj.project_id || dataObj.projectId || cleanProjectId,
      documentId: dataObj.document_id || dataObj.documentId || cleanDocumentId,
      experienceId: experienceId,
      status: 'GENERATED',
      versionNumber: dataObj.version_number || 1,
      contentObjectKey: dataObj.content_object_key || '',
      files: normalizedFiles,
      message: responseData?.message || 'Customer experience generated successfully.',
      raw: responseData
    };

    console.info('[Catalyst API Function 4] Experience Generation successful:', result);
    return result;
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      console.error('[Catalyst API Function 4] Request timed out after', timeoutMs, 'ms');
      throw new Error('Experience generation request timed out. Generating code and asset bundles may require additional time.');
    }

    console.error('[Catalyst API Function 4] Technical Error:', err);

    if (err.message) {
      throw err;
    }

    throw new Error('Customer experience generation failed. Please check backend connection and try again.');
  }
  }, { maxCalls: 1 });
}

/**
 * FUNCTION 5: Deploy the generated customer experience to Zoho Slate.
 * 
 * @param {Object} params
 * @param {string} params.projectId - Unique project identifier (required)
 * @param {string} params.documentId - Unique document identifier (required)
 * @param {string} params.experienceId - Unique experience identifier from Function 4 (required)
 * @param {string} params.businessName - Actual business name (required)
 * @param {number} [params.timeoutMs=120000] - Request timeout in ms
 * @returns {Promise<Object>} Real response containing status, generated_url, slate_app_id, slate_deployment_id
 */
export async function deployCustomerExperience({
  projectId,
  documentId,
  experienceId,
  businessName,
  timeoutMs = 120000
}) {
  // 1. Validate parameters
  const cleanProjectId = projectId ? String(projectId).trim() : '';
  const cleanDocumentId = documentId ? String(documentId).trim() : '';
  const cleanExperienceId = experienceId ? String(experienceId).trim() : '';
  const cleanBusinessName = businessName ? String(businessName).trim() : '';

  if (!cleanProjectId) {
    throw new Error('project_id is required for experience deployment.');
  }

  if (!cleanDocumentId) {
    throw new Error('document_id is required for experience deployment.');
  }

  if (!cleanExperienceId) {
    throw new Error('experience_id is required for experience deployment. Customer experience must be generated first.');
  }

  if (!cleanBusinessName) {
    throw new Error('business_name is required for experience deployment.');
  }

  const apiKey = getApiKey('POST', '/spikra/experience/deploy', `${cleanProjectId}:${cleanExperienceId}`);

  return executeGuardedApiCall(apiKey, async () => {
    // 2. Determine Endpoint URL
  const experienceDeployApiUrl = getCatalystExperienceDeployApiUrl();
  const configuredDirectUrl = import.meta.env.VITE_CATALYST_EXPERIENCE_DEPLOY_API_URL;

  const primaryUrl = experienceDeployApiUrl || configuredDirectUrl || `${DEFAULT_CATALYST_BASE_URL}/spikra/experience/deploy`;

  // 3. Setup abort controller
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    console.info(`[Catalyst API Function 5] POST ${primaryUrl} (single execution guaranteed)`, {
      project_id: cleanProjectId,
      document_id: cleanDocumentId,
      experience_id: cleanExperienceId,
      business_name: cleanBusinessName
    });

    const requestPayload = {
      project_id: cleanProjectId,
      document_id: cleanDocumentId,
      experience_id: cleanExperienceId,
      business_name: cleanBusinessName
    };

    const response = await fetch(primaryUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain'
      },
      body: JSON.stringify(requestPayload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // 4. Parse response safely
    let responseData = null;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch (jsonErr) {
        console.error('[Catalyst API Function 5] Failed to parse JSON response:', jsonErr);
        throw new Error('Invalid JSON response received from experience deployment server.');
      }
    } else {
      const rawText = await response.text();
      console.warn('[Catalyst API Function 5] Non-JSON response received:', rawText);
      try {
        responseData = JSON.parse(rawText);
      } catch {
        // If the server returned HTML or plain text (e.g., default index.js boilerplate or error page)
        if (rawText.trim().startsWith('<') || rawText.includes('<h1>')) {
          console.error('[Catalyst API Function 5] Server returned HTML content instead of JSON:', rawText);
          throw new Error('The experience was generated, but it could not be published to Slate. The deployment endpoint returned an unexpected response.');
        }
        responseData = { message: rawText };
      }
    }

    // Catalyst BasicIO functions wrap written output in { output: "..." }
    if (responseData && typeof responseData.output === 'string') {
      try {
        const parsedOutput = JSON.parse(responseData.output);
        responseData = parsedOutput;
      } catch (unwrapErr) {
        console.warn('[Catalyst API Function 5] Could not JSON parse responseData.output:', unwrapErr);
      }
    }

    // 5. Check HTTP status
    if (!response.ok) {
      const statusMsg = responseData?.error || responseData?.message || `Experience deployment failed with status ${response.status}`;
      console.error(`[Catalyst API Function 5] Request failed with HTTP ${response.status}:`, responseData);
      throw new Error(statusMsg);
    }

    // Check if backend returned explicit failure in payload
    if (responseData?.success === false) {
      const errMsg = responseData?.error || responseData?.message || 'Experience deployment failed on server.';
      console.error('[Catalyst API Function 5] Backend returned success: false:', responseData);
      throw new Error(errMsg);
    }

    // 6. Parse and normalize returned fields
    const dataObj = responseData?.data || responseData || {};
    const rawStatus = String(dataObj.status || responseData.status || '').toUpperCase();
    const rawGeneratedUrl = (dataObj.generated_url || dataObj.generatedUrl || responseData.generated_url || '').trim();
    const generatedUrl = formatProposalUrl(rawGeneratedUrl, cleanExperienceId);

    // Helper: validate absolute URL
    const isValidAbsoluteUrl = (url) => {
      if (!url || typeof url !== 'string') return false;
      try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch {
        return false;
      }
    };

    // Handle PUBLISHED status
    if (rawStatus === 'PUBLISHED' && isValidAbsoluteUrl(generatedUrl)) {
      const result = {
        success: true,
        status: 'PUBLISHED',
        message: responseData?.message || 'Customer experience published successfully.',
        projectId: dataObj.project_id || dataObj.projectId || cleanProjectId,
        documentId: dataObj.document_id || dataObj.documentId || cleanDocumentId,
        experienceId: dataObj.experience_id || dataObj.experienceId || cleanExperienceId,
        businessName: dataObj.business_name || dataObj.businessName || cleanBusinessName,
        slateAppId: dataObj.slate_app_id || dataObj.slateAppId || '',
        slateDeploymentId: dataObj.slate_deployment_id || dataObj.slateDeploymentId || '',
        generatedUrl: generatedUrl,
        raw: responseData
      };
      console.info('[Catalyst API Function 5] Experience Deployment successful (PUBLISHED):', result);
      return result;
    }

    // Handle DEPLOYING status (in-progress deployment)
    if (rawStatus === 'DEPLOYING') {
      const result = {
        success: true,
        status: 'DEPLOYING',
        message: responseData?.message || 'Customer experience deployment is in progress',
        infoMessage: 'Slate accepted the deployment. The experience is still being built.',
        projectId: dataObj.project_id || dataObj.projectId || cleanProjectId,
        documentId: dataObj.document_id || dataObj.documentId || cleanDocumentId,
        experienceId: dataObj.experience_id || dataObj.experienceId || cleanExperienceId,
        businessName: dataObj.business_name || dataObj.businessName || cleanBusinessName,
        slateAppId: dataObj.slate_app_id || dataObj.slateAppId || '',
        slateDeploymentId: dataObj.slate_deployment_id || dataObj.slateDeploymentId || '',
        generatedUrl: isValidAbsoluteUrl(generatedUrl) ? generatedUrl : '',
        raw: responseData
      };
      console.info('[Catalyst API Function 5] Experience Deployment in progress (DEPLOYING):', result);
      return result;
    }

    // If status is neither PUBLISHED with a valid URL nor DEPLOYING, treat as unconfirmed/failed
    const errorDetail = responseData?.message || responseData?.error || `Server returned status: ${rawStatus || 'UNKNOWN'}`;
    throw new Error(errorDetail);
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      console.error('[Catalyst API Function 5] Request timed out after', timeoutMs, 'ms');
      throw new Error('Experience deployment request timed out. Slate publication may require additional time.');
    }

    console.error('[Catalyst API Function 5] Technical Error:', err);

    if (err.message) {
      throw err;
    }

    throw new Error('Customer experience publication failed. Please check backend connection and try again.');
  }
  }, { maxCalls: 1 });
}

/**
 * FUNCTION 6: Check the real-time processing status of a Spikra Customer Experience pipeline.
 *
 * API Name: Spikra-Process-Status-API
 * Endpoint: /spikra/process/status (or direct Catalyst URL)
 * Method: POST
 * Source of Truth for backend pipeline stages:
 * UPLOADED, EXTRACTING, EXTRACTED, PROCESSING, GENERATING, GENERATED, DEPLOYING, PUBLISHED, FAILED
 *
 * @param {Object} params
 * @param {string} [params.project_id] - Target project ROWID (required)
 * @param {string} [params.projectId] - Alias for project_id
 * @param {string} [params.document_id] - Document ROWID
 * @param {string} [params.documentId] - Alias for document_id
 * @param {string} [params.experience_id] - Experience ROWID
 * @param {string} [params.experienceId] - Alias for experience_id
 * @param {number} [params.timeoutMs=30000] - Request timeout in ms
 * @param {AbortSignal} [params.signal] - Optional external AbortSignal
 * @returns {Promise<Object>} Normalized status object containing current_stage, error_message, project, document, experience, jobs
 */
export async function getProcessStatus({
  project_id,
  document_id,
  experience_id,
  projectId,
  documentId,
  experienceId,
  timeoutMs = 30000,
  signal = null
} = {}) {
  const cleanProjectId = String(projectId || project_id || '').trim();
  const cleanDocumentId = String(documentId || document_id || '').trim();
  const cleanExperienceId = String(experienceId || experience_id || '').trim();

  if (!cleanProjectId) {
    throw new Error('project_id is required to retrieve processing status.');
  }

  const apiKey = getApiKey('POST', '/spikra/process/status', `${cleanProjectId}:${cleanDocumentId}:${cleanExperienceId}`);

  return executeGuardedApiCall(apiKey, async () => {
    const statusApiUrl = getCatalystProcessStatusApiUrl();
  const configuredDirectUrl = import.meta.env.VITE_CATALYST_PROCESS_STATUS_API_URL;

  const primaryUrl = statusApiUrl || configuredDirectUrl || 'https://spikra-ai-proposal-698386704.development.catalystserverless.com/spikra/process/status';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    signal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  // spikra_process_status is a basicio function that reads arguments via query params only,
  // so IDs must be passed on the querystring rather than a JSON body.
  const idQueryParams = `project_id=${encodeURIComponent(cleanProjectId)}&document_id=${encodeURIComponent(cleanDocumentId)}&experience_id=${encodeURIComponent(cleanExperienceId)}`;
  const primaryUrlWithParams = `${primaryUrl}${primaryUrl.includes('?') ? '&' : '?'}${idQueryParams}`;

  try {
    console.info(`[Catalyst API Function 6] POST ${primaryUrlWithParams} (single execution guaranteed)`);

    const response = await fetch(primaryUrlWithParams, {
      method: 'POST',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    let responseData = null;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch (jsonErr) {
        console.error('[Catalyst API Function 6] Failed to parse JSON response:', jsonErr);
        throw new Error('Invalid JSON response received from process status server.');
      }
    } else {
      const rawText = await response.text();
      try {
        responseData = JSON.parse(rawText);
      } catch {
        if (rawText.trim().startsWith('<') || rawText.includes('<h1>')) {
          console.error('[Catalyst API Function 6] Server returned HTML content instead of JSON:', rawText);
          throw new Error('Process status endpoint returned an unexpected HTML response.');
        }
        responseData = { message: rawText };
      }
    }

    if (responseData && typeof responseData.output === 'string') {
      try {
        const parsedOutput = JSON.parse(responseData.output);
        responseData = parsedOutput;
      } catch (unwrapErr) {
        console.warn('[Catalyst API Function 6] Could not JSON parse responseData.output:', unwrapErr);
      }
    }

    if (!response.ok) {
      const errorMsg =
        responseData?.data?.message ||
        responseData?.error_message ||
        responseData?.message ||
        responseData?.error ||
        `Unable to retrieve process status (HTTP ${response.status})`;
      console.error(`[Catalyst API Function 6] Request failed with HTTP ${response.status}:`, responseData);
      const err = new Error(errorMsg);
      err.status = response.status;
      err.responseData = responseData;
      throw err;
    }

    const rawStage = String(responseData?.current_stage || responseData?.status || '').toUpperCase();
    const errorMessage = responseData?.error_message || responseData?.message || null;
    const rawExperience = responseData?.experience || null;
    const sanitizedExperience = rawExperience ? {
      ...rawExperience,
      generated_url: formatProposalUrl(rawExperience.generated_url || rawExperience.generatedUrl || '', rawExperience.experience_id || cleanExperienceId),
      generatedUrl: formatProposalUrl(rawExperience.generatedUrl || rawExperience.generated_url || '', rawExperience.experience_id || cleanExperienceId)
    } : null;

    return {
      success: responseData?.success !== false,
      current_stage: rawStage || 'UNKNOWN',
      error_message: errorMessage,
      project: responseData?.project || null,
      document: responseData?.document || null,
      experience: sanitizedExperience,
      jobs: Array.isArray(responseData?.jobs) ? responseData.jobs : [],
      raw: responseData
    };
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      console.error('[Catalyst API Function 6] Request timed out after', timeoutMs, 'ms');
      throw new Error('Process status request timed out. Please check backend connection.');
    }

    console.error('[Catalyst API Function 6] Error checking process status:', err);
    if (err.message) {
      throw err;
    }

    throw new Error('Unable to retrieve process status. Please check your network connection.');
  }
  // Status check polled until publication completes
  }, { maxCalls: Infinity });
}

/**
 * FUNCTION 7: Retrieve generated customer experiences from the Spikra backend.
 * 
 * API Name: Spikra-Experience-List-API
 * Endpoint: /spikra/experience/list (or direct Catalyst URL)
 * Method: POST
 * Content-Type: application/json
 * 
 * @param {Object} [filters={}] - Optional query filters (e.g. { project_id: '...' }, { business_name: '...' }, { status: '...' })
 * @param {string} [filters.project_id] - Filter by specific project ID
 * @param {string} [filters.business_name] - Filter by business name
 * @param {string} [filters.status] - Filter by status (e.g. 'PUBLISHED')
 * @param {number} [timeoutMs=30000] - Request timeout in milliseconds
 * @returns {Promise<{success: boolean, count: number, experiences: Array<Object>}>} List of real experiences
 */
/**
 * FUNCTION 7: Retrieve generated customer experiences from the Spikra backend.
 * 
 * API Name: Spikra-Experience-List-API
 * Endpoint: /spikra/experience/deploy?action=list (or /spikra/experience/list)
 * Method: GET (with POST fallback)
 * 
 * @param {Object} [filters={}] - Optional query filters (e.g. { project_id: '...' }, { business_name: '...' }, { status: '...' })
 * @param {string} [filters.project_id] - Filter by specific project ID
 * @param {string} [filters.business_name] - Filter by business name
 * @param {string} [filters.status] - Filter by status (e.g. 'PUBLISHED')
 * @param {number} [timeoutMs=30000] - Request timeout in milliseconds
 * @returns {Promise<{success: boolean, count: number, experiences: Array<Object>}>} List of real experiences
 */
export async function getCustomerExperiences(filters = {}, timeoutMs = 30000) {
  const apiKey = getApiKey('GET', '/spikra/experience/list');

  return executeGuardedApiCall(apiKey, async () => {
    const isDirectOrigin = typeof window !== 'undefined' && (window.location.hostname.includes('catalystserverless.com') || window.location.hostname.includes('zohocatalyst.com'));
  const directBase = getCatalystBaseUrl() || DEFAULT_CATALYST_BASE_URL;

  // spikra_experience_list is the real, dedicated API Gateway route for this function.
  // (There is no "list" action on the /spikra/experience/deploy dispatcher - that function
  // only implements deployment. Cross-origin CORS for this basicio route is controlled by
  // the Catalyst project's CORS domain allowlist, not by code in the function itself.)
  const primaryCorsUrl = isDirectOrigin || import.meta.env.DEV
    ? '/spikra/experience/list'
    : `${directBase}/spikra/experience/list`;


  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  // Clean filters payload
  const requestPayload = {};
  const queryParams = new URLSearchParams();
  if (filters && typeof filters === 'object') {
    if (filters.project_id && typeof filters.project_id === 'string' && filters.project_id.trim()) {
      requestPayload.project_id = filters.project_id.trim();
      queryParams.set('project_id', requestPayload.project_id);
    }
    if (filters.business_name && typeof filters.business_name === 'string' && filters.business_name.trim()) {
      requestPayload.business_name = filters.business_name.trim();
      queryParams.set('business_name', requestPayload.business_name);
    }
    if (filters.status && typeof filters.status === 'string' && filters.status.trim()) {
      requestPayload.status = filters.status.trim();
      queryParams.set('status', requestPayload.status);
    }
  }

  // Cache-busting timestamp parameter ensures live updates
  queryParams.set('_ts', String(Date.now()));
  const queryString = queryParams.toString();
  const toGetUrl = (base) => (base.includes('?') ? `${base}&${queryString}` : `${base}?${queryString}`);

  try {
    console.info(`[Catalyst API Function 7] Fetching experiences from ${primaryCorsUrl} (single execution guaranteed)`);
    const response = await fetch(toGetUrl(primaryCorsUrl), {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    // Parse response
    let responseData = null;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch (jsonErr) {
        console.error('[Catalyst API Function 7] Failed to parse JSON response:', jsonErr);
        throw new Error('Invalid JSON response received from experience list server.');
      }
    } else {
      const rawText = await response.text();
      try {
        responseData = JSON.parse(rawText);
      } catch {
        if (rawText.trim().startsWith('<') || rawText.includes('<h1>')) {
          console.error('[Catalyst API Function 7] Server returned HTML content instead of JSON:', rawText);
          throw new Error('Experience list endpoint returned an unexpected HTML response.');
        }
        responseData = { message: rawText };
      }
    }

    // Catalyst Basic I/O functions wrap the return value in { output: string }
    if (responseData && typeof responseData.output === 'string') {
      try {
        const parsedOutput = JSON.parse(responseData.output);
        responseData = parsedOutput;
      } catch (unwrapErr) {
        console.warn('[Catalyst API Function 7] Could not JSON parse responseData.output:', unwrapErr);
      }
    }

    if (!response.ok) {
      const errorMsg =
        responseData?.data?.message ||
        responseData?.error_message ||
        responseData?.message ||
        responseData?.error ||
        `Unable to retrieve customer experiences (HTTP ${response.status})`;
      console.error(`[Catalyst API Function 7] Request failed with HTTP ${response.status}:`, responseData);
      const err = new Error(errorMsg);
      err.status = response.status;
      err.responseData = responseData;
      throw err;
    }

    const rawExperiences = Array.isArray(responseData?.experiences) ? responseData.experiences : [];
    const formattedExperiences = rawExperiences.map((exp) => {
      const expId = exp.experience_id || exp.experienceId || '';
      const sanitizedUrl = formatProposalUrl(exp.generated_url || exp.generatedUrl || '', expId);
      return {
        ...exp,
        generated_url: sanitizedUrl,
        generatedUrl: sanitizedUrl
      };
    });
    const count = typeof responseData?.count === 'number' ? responseData.count : formattedExperiences.length;

    return {
      success: responseData?.success !== false,
      count,
      experiences: formattedExperiences,
      raw: responseData
    };
  } catch (err) {
    clearTimeout(timeoutId);

    if (err.name === 'AbortError') {
      console.error('[Catalyst API Function 7] Request timed out after', timeoutMs, 'ms');
      throw new Error('Experience list request timed out. Please check backend connection.');
    }

    console.error('[Catalyst API Function 7] Error retrieving experiences:', err);
    if (err.message) {
      throw err;
    }

    throw new Error('Unable to retrieve customer experiences. Please check your network connection.');
  }
  // Read-only list call refetched across navigation
  }, { maxCalls: Infinity });
}

// Alias for getCustomerExperiences
export const getExperiences = getCustomerExperiences;


