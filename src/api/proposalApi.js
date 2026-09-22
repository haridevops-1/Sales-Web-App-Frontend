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

  console.log(`%c[Workspace 2 Proposal API] 📡 ${method} ${url}`, 'color: #ff5a1f; font-weight: bold;', body !== undefined ? body : '');

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
    console.error(`[Workspace 2 Proposal API] Network Error on ${method} ${path}:`, fetchErr);
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

  if (!response.ok || data.success === false) {
    const code = data?.error?.code || null;
    const message = data?.error?.message || `Request failed with status ${response.status}.`;
    console.error(`[Workspace 2 Proposal API] ${response.status} Error on ${path}:`, data);
    if (response.status === 401) {
      clearSessionToken();
    }
    throw new ProposalApiError(message, { status: response.status, code, requestId: data?.request_id });
  }

  console.log(`%c[Workspace 2 Proposal API] ✅ 200 OK (${path})`, 'color: #10b981; font-weight: bold;', data);
  return data;
}

async function requestFormData(path, formData, { signal: externalSignal, timeoutMs = 90000 } = {}) {
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

  console.log(`%c[Workspace 2 Proposal API] 📤 POST (multipart) ${url}`, 'color: #ff5a1f; font-weight: bold;');

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
    console.error(`[Workspace 2 Proposal API] Upload Error on ${path}:`, fetchErr);
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
    const message = data?.error?.message || `Upload failed with status ${response.status}.`;
    console.error(`[Workspace 2 Proposal API] Upload Failed (${response.status}) on ${path}:`, data);
    throw new ProposalApiError(message, { status: response.status, code, requestId: data?.request_id });
  }

  console.log(`%c[Workspace 2 Proposal API] ✅ 200 OK Upload (${path})`, 'color: #10b981; font-weight: bold;', data);
  return data;
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
  console.log(`%c[Workspace 2 API] 📤 Uploading discovery package '${packageName}' to Stratus storage...`, 'color: #3b82f6; font-weight: bold;');
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
  console.log(`%c[Workspace 2 API] 🤖 Triggering Customer Proposal Generation Agent & Pipeline for package '${packageId}'...`, 'color: #3b82f6; font-weight: bold;');
  return requestJson(`/proposal/processor/process?package_id=${encodeURIComponent(packageId)}`, {
    method: 'POST',
    timeoutMs: 180000
  });
}

// ---------------------------------------------------------------------------
// Proposals (proposal-api?resource=proposals)
// ---------------------------------------------------------------------------

export function listProposals(packageId, signal) {
  const qs = packageId ? `&package_id=${encodeURIComponent(packageId)}` : '';
  console.log(`%c[Workspace 2 API] 📋 Fetching customer proposals from Catalyst Datastore...`, 'color: #3b82f6; font-weight: bold;');
  return requestJson(`/proposal/api?resource=proposals${qs}`, { signal }).then((res) => {
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
  return requestJson(`/proposal/api?resource=proposals&proposal_id=${encodeURIComponent(proposalId)}`, { signal });
}

export function updateProposalStatus(proposalId, status) {
  return requestJson(`/proposal/api?resource=proposals&proposal_id=${encodeURIComponent(proposalId)}`, {
    method: 'POST',
    body: { status }
  });
}

export { ProposalApiError };
