/**
 * Workspace 2 (Solution Proposals) API Client
 *
 * Centralized API layer for the proposal-* Catalyst functions (proposal-api,
 * proposal-discovery, proposal-processor). Supports local file and folder
 * uploads via multipart/form-data directly to Stratus, as well as proposal
 * listing, detail retrieval, status progression, and document viewing.
 */

import { getCatalystBaseUrl, resolveEndpointUrl, DEFAULT_CATALYST_BASE_URL } from './catalystApi';
import { getSessionToken, clearSessionToken } from '../utils/proposalSession';
import { executeGuardedApiCall, getApiKey } from './apiCallGuard';

export function getProposalBackendOrigin() {
  const base = getCatalystBaseUrl();
  if (base) {
    try {
      return new URL(base).origin;
    } catch {
      return base;
    }
  }
  try {
    return new URL(DEFAULT_CATALYST_BASE_URL).origin;
  } catch {
    return DEFAULT_CATALYST_BASE_URL;
  }
}

/** A human-readable message for a thrown API error, never raw JSON/stack traces. */
export function getFriendlyErrorMessage(err) {
  if (!err) return 'Something went wrong. Please try again.';
  if (err.status === 401) return 'Session expired. Please try again.';
  if (err.status === 403) return 'You do not have permission to access this resource.';
  if (err.status === 404) return 'The requested proposal item was not found.';
  if (err.status >= 500) return 'Server error. Please try again shortly.';
  return err.message || 'Something went wrong. Please try again.';
}

class ProposalApiError extends Error {
  constructor(message, { status, code, requestId } = {}) {
    super(message);
    this.name = 'ProposalApiError';
    this.status = status || 0;
    this.code = code || null;
    this.requestId = requestId || null;
  }
}

async function requestJson(path, { method = 'GET', body, timeoutMs = 45000, signal: externalSignal } = {}) {
  // Only the AI-triggering endpoints get a hard call cap, to avoid duplicate generation
  // requests for the same package - everything else (status/list/read calls, polled and
  // refreshed repeatedly across a normal session) must stay uncapped.
  // Strictly single call limit across all endpoints with zero retries
  const maxCalls = 1;
  const paramKey = body ? (body.package_id || body.proposal_id || JSON.stringify(body).slice(0, 80)) : null;
  const apiKey = getApiKey(method, path, paramKey);

  return executeGuardedApiCall(apiKey, async () => {
    const url = resolveEndpointUrl(path, null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      else externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    const headers = { Accept: 'application/json' };
    const token = getSessionToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    console.log('[Workspace 2] ' + method + ' ' + url + ' (single execution guaranteed)', body !== undefined ? body : '');

    let response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      console.error('[Workspace 2] Network error on ' + method + ' ' + path + ':', fetchErr);
      if (fetchErr.name === 'AbortError') {
        throw new ProposalApiError('The request timed out. Please try again.', { status: 408 });
      }
      throw new ProposalApiError('Unable to reach the server. Please check your connection.', { status: 0 });
    }
    clearTimeout(timeoutId);

    let data = null;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    // still_processing is an expected, non-error outcome the caller polls/tolerates - never a
    // failure to throw (and never something the guard should permanently lock this key over).
    if (response.ok && data.success === false && data.still_processing === true) {
      console.log('[Workspace 2] ' + path + ' still processing:', data);
      return data;
    }

    if (!response.ok || data.success === false) {
      const code = data?.error?.code || null;
      const message = data?.error?.message || ('Request failed with status ' + response.status + '.');
      console.error('[Workspace 2] ' + response.status + ' error on ' + path + ':', data);
      if (response.status === 401) {
        clearSessionToken();
      }
      throw new ProposalApiError(message, { status: response.status, code, requestId: data?.request_id });
    }

    console.log('[Workspace 2] 200 OK ' + path, data);
    return data;
  }, { maxCalls });
}

async function requestFormData(path, formData, { signal: externalSignal, timeoutMs = 90000 } = {}) {
  const pkgName = formData?.get ? formData.get('package_name') : 'form_upload';
  const apiKey = getApiKey('POST', path, pkgName);

  return executeGuardedApiCall(apiKey, async () => {
    const url = resolveEndpointUrl(path, null);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    if (externalSignal) {
      if (externalSignal.aborted) controller.abort();
      else externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }

    const headers = { Accept: 'application/json' };
    const token = getSessionToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    // Browser will automatically set multipart/form-data and boundary

    console.log('[Workspace 2] POST (multipart/form-data) ' + url + ' (single execution guaranteed)');

    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        signal: controller.signal
      });
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      console.error('[Workspace 2] Upload error on ' + path + ':', fetchErr);
      if (fetchErr.name === 'AbortError') {
        throw new ProposalApiError('Upload timed out. Please try with smaller files or retry.', { status: 408 });
      }
      throw new ProposalApiError('Unable to reach the upload server. Please check your connection.', { status: 0 });
    }
    clearTimeout(timeoutId);

    let data = null;
    try {
      const text = await response.text();
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    if (!response.ok || data.success === false) {
      const code = data?.error?.code || null;
      const message = data?.error?.message || ('Upload failed with status ' + response.status + '.');
      console.error('[Workspace 2] Upload failed (' + response.status + ') on ' + path + ':', data);
      throw new ProposalApiError(message, { status: response.status, code, requestId: data?.request_id });
    }

    console.log('[Workspace 2] 200 OK upload ' + path, data);
    return data;
  }, { maxCalls: 1 });
}

// ---------------------------------------------------------------------------
// Connection status check (returns connected: true for direct upload)
// ---------------------------------------------------------------------------

export function getWorkdriveStatus(signal) {
  return requestJson('/proposal/workdrive/status', { signal }).catch(() => ({
    success: true,
    connected: true,
    provider: 'Local Direct Upload',
    email: 'local-user@spikra.com'
  }));
}

export function getWorkdriveAuthorizeUrl(signal) {
  return requestJson('/proposal/workdrive/authorize?action=authorize', { signal });
}

export function disconnectWorkdrive() {
  return requestJson('/proposal/workdrive/disconnect?action=disconnect', { method: 'POST' });
}

export function listWorkdriveFolders() {
  return Promise.resolve({ success: true, folders: [] });
}

export function getWorkdriveFile() {
  return Promise.resolve({ success: true, file: null });
}

// ---------------------------------------------------------------------------
// Discovery packages (proposal-discovery)
// ---------------------------------------------------------------------------

export function createDiscoveryPackage(packageName, files) {
  console.log('[Workspace 2] Creating discovery package: ' + packageName);
  if (files instanceof FormData) {
    if (packageName && !files.has('package_name')) {
      files.append('package_name', packageName);
    }
    return requestFormData('/proposal/discovery', files);
  }

  if (Array.isArray(files) && files.length > 0 && (files[0] instanceof File || (files[0] && files[0].file instanceof File))) {
    const formData = new FormData();
    formData.append('package_name', packageName);
    files.forEach((item) => {
      const realFile = item instanceof File ? item : item.file;
      const customName = (item && item.path) ? item.path : realFile.name;
      formData.append('files', realFile, customName);
    });
    return requestFormData('/proposal/discovery', formData);
  }

  return requestJson('/proposal/discovery', {
    method: 'POST',
    body: { package_name: packageName, files }
  });
}

export function listDiscoveryPackages(signal) {
  return requestJson('/proposal/discovery', { signal });
}

export function getDiscoveryPackage(packageId, signal) {
  return requestJson(`/proposal/discovery?package_id=${encodeURIComponent(packageId)}`, { signal });
}

export function addFilesToPackage(packageId, files) {
  if (files instanceof FormData) {
    return requestFormData(`/proposal/discovery?package_id=${encodeURIComponent(packageId)}&action=add_files`, files);
  }

  if (Array.isArray(files) && files.length > 0 && (files[0] instanceof File || (files[0] && files[0].file instanceof File))) {
    const formData = new FormData();
    formData.append('action', 'add_files');
    formData.append('package_id', packageId);
    files.forEach((item) => {
      const realFile = item instanceof File ? item : item.file;
      const customName = (item && item.path) ? item.path : realFile.name;
      formData.append('files', realFile, customName);
    });
    return requestFormData(`/proposal/discovery?package_id=${encodeURIComponent(packageId)}&action=add_files`, formData);
  }

  return requestJson(`/proposal/discovery?package_id=${encodeURIComponent(packageId)}&action=add_files`, {
    method: 'POST',
    body: { files }
  });
}

export function removeFileFromPackage(packageId, fileId) {
  return requestJson(`/proposal/discovery?package_id=${encodeURIComponent(packageId)}&file_id=${encodeURIComponent(fileId)}`, {
    method: 'DELETE'
  });
}

// ---------------------------------------------------------------------------
// Processing (proposal-processor).
// ---------------------------------------------------------------------------

export function processDiscoveryPackage(packageId) {
  console.log('[Workspace 2] POST /proposal/processor/process — package_id: ' + packageId);
  return requestJson('/proposal/processor/process?package_id=' + encodeURIComponent(packageId), {
    method: 'POST',
    timeoutMs: 180000
  });
}

// ---------------------------------------------------------------------------
// Discovery Session (proposal-discovery-session-post-api)
// ---------------------------------------------------------------------------

export function createDiscoverySession(packageId, sessionData = {}) {
  console.log('[Workspace 2] POST /proposal/session — package_id: ' + packageId);
  return requestJson('/proposal/session', {
    method: 'POST',
    body: { package_id: packageId, ...sessionData }
  });
}

export function getDiscoverySession(sessionId, signal) {
  console.log('[Workspace 2] GET /proposal/session — session_id: ' + sessionId);
  return requestJson('/proposal/session?session_id=' + encodeURIComponent(sessionId), { signal });
}

// ---------------------------------------------------------------------------
// Proposal Agent (proposal-agent-api)
// ---------------------------------------------------------------------------

export function runProposalAgent(packageId, sessionId, extraData = {}) {
  const qs = sessionId
    ? 'package_id=' + encodeURIComponent(packageId) + '&session_id=' + encodeURIComponent(sessionId)
    : 'package_id=' + encodeURIComponent(packageId);
  console.log('[Workspace 2] POST /proposal/agent — ' + qs);
  const body = {
    package_id: packageId,
    discovery_content: extraData.file_names?.length
      ? 'Discovery package for ' + (extraData.customer_name || 'client') + '. Files: ' + extraData.file_names.join(', ')
      : 'Discovery package for ' + (extraData.customer_name || 'client'),
    customer_name: extraData.customer_name || '',
    ...extraData
  };
  return requestJson('/proposal/agent?' + qs, {
    method: 'POST',
    body,
    timeoutMs: 180000
  });
}

// ---------------------------------------------------------------------------
// Proposals (proposal-api?resource=proposals)
// ---------------------------------------------------------------------------

export function listProposals(packageId, signal) {
  const qs = packageId ? '&package_id=' + encodeURIComponent(packageId) : '';
  console.log('[Workspace 2] GET /proposal/api?resource=proposals' + qs);
  return requestJson('/proposal/api?resource=proposals' + qs, { signal }).then((res) => {
    if (res && Array.isArray(res.proposals)) {
      res.proposals = res.proposals.map(sanitizeProposalObj);
    }
    return res;
  });
}

function sanitizeProposalObj(p) {
  if (!p) return p;
  const id = p.proposal_id || p.ROWID || '';
  let url = p.generated_url || p.proposal_url || p.slate_url || `https://spikra-w2-proposal-jmdbymcs.onslate.com/?proposal_id=${id}`;
  if (url.includes('spikra-customer-prop-msdrrgbk.onslate.com')) {
    url = url.replace('spikra-customer-prop-msdrrgbk.onslate.com', 'spikra-w2-proposal-jmdbymcs.onslate.com');
  }
  return {
    ...p,
    generated_url: url,
    proposal_url: url
  };
}

export function getProposal(proposalId, signal) {
  console.log('[Workspace 2] GET /proposal/api?resource=proposals&proposal_id=' + proposalId);
  return requestJson('/proposal/api?resource=proposals&proposal_id=' + encodeURIComponent(proposalId), { signal });
}

export function updateProposalStatus(proposalId, status) {
  return requestJson(`/proposal/api?resource=proposals&proposal_id=${encodeURIComponent(proposalId)}`, {
    method: 'POST',
    body: { status }
  });
}

export { ProposalApiError };
