/**
 * Workspace 2 (Solution Proposals) API Client
 *
 * Centralized API layer for the proposal-* Catalyst functions (proposal-api,
 * proposal-workdrive-auth-v2, proposal-discovery, proposal-processor). Same Catalyst
 * project/domain as Workspace 1 - reuses catalystApi's base URL resolution rather than
 * duplicating it, just with a different route prefix (/proposal/* instead of /spikra/*).
 *
 * Every request goes through requestJson() below: attaches the signed application
 * session token (never a Zoho token/secret - see utils/proposalSession.js) as
 * "Authorization: Bearer <token>", parses the backend's {success,...} / {success:false,
 * error:{code,message}} shape, and normalizes failures into a thrown Error carrying
 * .code/.status/.requestId so callers get a consistent, human-readable message instead
 * of raw JSON.
 */

import { getCatalystBaseUrl, resolveEndpointUrl, DEFAULT_CATALYST_BASE_URL } from './catalystApi';
import { getSessionToken, clearSessionToken } from '../utils/proposalSession';

/**
 * The trusted origin for the Workspace 2 backend - used to validate the WorkDrive OAuth
 * popup's postMessage (never trust an arbitrary origin/source for that).
 */
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
  if (err.status === 401) return 'Your session has expired. Please reconnect WorkDrive.';
  if (err.status === 403) return 'You do not have permission to access this resource.';
  if (err.status === 404) return 'The requested item was not found.';
  if (err.status >= 500) return 'Something went wrong. Please try again.';
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

async function requestJson(path, { method = 'GET', body, timeoutMs = 30000, signal: externalSignal } = {}) {
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
    if (response.status === 401) {
      clearSessionToken();
    }
    throw new ProposalApiError(message, { status: response.status, code, requestId: data?.request_id });
  }

  return data;
}

// ---------------------------------------------------------------------------
// WorkDrive connection (proposal-workdrive-auth-v2) - status/authorize/disconnect.
// The OAuth callback itself is a browser redirect target, never called directly here.
// ---------------------------------------------------------------------------

export function getWorkdriveStatus(signal) {
  return requestJson('/proposal/workdrive/status', { signal });
}

export function getWorkdriveAuthorizeUrl(signal) {
  return requestJson('/proposal/workdrive/authorize?action=authorize', { signal });
}

export function disconnectWorkdrive() {
  return requestJson('/proposal/workdrive/disconnect?action=disconnect', { method: 'POST' });
}

// ---------------------------------------------------------------------------
// WorkDrive browsing (proposal-api?resource=workdrive) - available once connected.
// ---------------------------------------------------------------------------

export function listWorkdriveFolders(folderId, signal) {
  const qs = folderId ? `&folder_id=${encodeURIComponent(folderId)}` : '';
  return requestJson(`/proposal/api?resource=workdrive&action=folders${qs}`, { signal });
}

export function getWorkdriveFile(fileId, signal) {
  return requestJson(`/proposal/api?resource=workdrive&action=file&file_id=${encodeURIComponent(fileId)}`, { signal });
}

// ---------------------------------------------------------------------------
// Discovery packages (proposal-discovery).
// ---------------------------------------------------------------------------

export function createDiscoveryPackage(packageName, files) {
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
// Processing (proposal-processor). Starts extraction + hands off to proposal-agent in
// the background - the response is never "the proposal is ready," only that processing
// started (see proposal-processor's agent_handoff.still_processing).
// ---------------------------------------------------------------------------

export function processDiscoveryPackage(packageId) {
  return requestJson(`/proposal/processor/process?package_id=${encodeURIComponent(packageId)}`, {
    method: 'POST',
    timeoutMs: 120000
  });
}

// ---------------------------------------------------------------------------
// Proposals (proposal-api?resource=proposals, the default resource).
// ---------------------------------------------------------------------------

export function listProposals(packageId, signal) {
  const qs = packageId ? `&package_id=${encodeURIComponent(packageId)}` : '';
  return requestJson(`/proposal/api?resource=proposals${qs}`, { signal });
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
