/**
 * Zoho WorkDrive API Client for Spikra
 * 
 * Centralized API service for communicating with the shared "workdrive-auth" Catalyst function.
 * Shared by both Workspace 1 (Customer Showcases) and Workspace 2 (Solution Proposals).
 */

import { resolveEndpointUrl, getCatalystBaseUrl, DEFAULT_CATALYST_BASE_URL } from './catalystApi';
import {
  getWorkdriveSessionToken,
  setWorkdriveSessionToken,
  clearWorkdriveSessionToken
} from '../utils/workdriveSession';

export class WorkDriveApiError extends Error {
  constructor(message, { status, code, data } = {}) {
    super(message);
    this.name = 'WorkDriveApiError';
    this.status = status || 0;
    this.code = code || null;
    this.data = data || null;
  }
}

/**
 * Returns the backend origin for OAuth popup validation.
 */
export function getWorkDriveBackendOrigins() {
  const trusted = new Set();
  if (typeof window !== 'undefined') {
    trusted.add(window.location.origin);
  }

  const base = getCatalystBaseUrl() || DEFAULT_CATALYST_BASE_URL;
  try {
    trusted.add(new URL(base).origin);
  } catch {}

  const defaultOrigin = new URL(DEFAULT_CATALYST_BASE_URL).origin;
  trusted.add(defaultOrigin);

  return trusted;
}

/**
 * Check if a postMessage origin is trusted for the WorkDrive OAuth callback.
 */
export function isTrustedWorkDriveOrigin(origin) {
  if (!origin) return false;
  const origins = getWorkDriveBackendOrigins();
  if (origins.has(origin)) return true;

  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();
    if (
      host.endsWith('catalystserverless.com') ||
      host.endsWith('zohocatalyst.com') ||
      host.endsWith('zoho.com') ||
      host.endsWith('zoho.in') ||
      host.endsWith('zoho.eu') ||
      host.endsWith('zoho.com.au') ||
      host.endsWith('onslate.com') ||
      host === 'localhost' ||
      host === '127.0.0.1'
    ) {
      return true;
    }
  } catch {}

  return false;
}

/**
 * Shared fetch helper for WorkDrive endpoints.
 */
async function workdriveRequest(path, { method = 'GET', body, timeoutMs = 30000, signal: externalSignal } = {}) {
  const url = resolveEndpointUrl(path, null);
  const controller = new AbortController();
  let isTimedOut = false;
  const timeoutId = setTimeout(() => {
    isTimedOut = true;
    controller.abort();
  }, timeoutMs);

  if (externalSignal) {
    if (externalSignal.aborted) controller.abort();
    else externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
  }

  const token = getWorkdriveSessionToken();
  const headers = { Accept: 'application/json' };
  let effectiveUrl = url;
  if (token) {
    // For GET requests, passing token in query string avoids triggering preflight OPTIONS
    if (method !== 'GET') {
      headers['X-Workdrive-Token'] = token;
      headers['X-Session-Token'] = token;
    }
    const sep = effectiveUrl.includes('?') ? '&' : '?';
    effectiveUrl = `${effectiveUrl}${sep}session_token=${encodeURIComponent(token)}`;
  }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  let response;
  try {
    response = await fetch(effectiveUrl, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal
    });
  } catch (fetchErr) {
    clearTimeout(timeoutId);
    if (fetchErr.name === 'AbortError') {
      if (isTimedOut) {
        throw new WorkDriveApiError('WorkDrive request timed out.', { status: 408 });
      }
      throw fetchErr;
    }
    throw new WorkDriveApiError('Unable to connect to WorkDrive service. Please check your connection.', { status: 0 });
  }
  clearTimeout(timeoutId);

  let data = null;
  try {
    const text = await response.text();
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  const errorCode = data?.error?.code || data?.code;
  // Handle 401 or auth failures: token expired, revoked, or account not connected
  if (response.status === 401 || errorCode === 'WORKDRIVE_AUTH_FAILED' || errorCode === 'WORKDRIVE_TOKEN_EXPIRED') {
    clearWorkdriveSessionToken(true);
    const message = data?.message || data?.error?.message || 'WorkDrive is not connected or session expired. Please connect.';
    throw new WorkDriveApiError(message, { status: response.status, data });
  }

  if (!response.ok || (data && data.success === false)) {
    const message = data?.message || data?.error?.message || `WorkDrive request failed with status ${response.status}.`;
    throw new WorkDriveApiError(message, { status: response.status, data });
  }

  return data;
}

/**
 * GET /workdrive/status
 * No auth needed. Returns { success, connected, email? }
 */
export async function getWorkdriveStatus(signal) {
  try {
    const res = await workdriveRequest('/workdrive/status?action=status', { method: 'GET', signal });
    return {
      success: true,
      connected: Boolean(res?.connected),
      email: res?.email || res?.user?.email || null,
      raw: res
    };
  } catch (err) {
    // If not connected or error, return friendly fallback
    if (err.status === 401) {
      return { success: true, connected: false, email: null };
    }
    throw err;
  }
}

export const WORKDRIVE_AUTH_URL =
  'https://spikra-ai-proposal-698386704.development.catalystserverless.com/workdrive/authorize?action=authorize&dc=in';

/**
 * Builds the Zoho WorkDrive OAuth authorization URL with origin tracking.
 */
export function buildWorkdriveAuthUrl(originOverride = null) {
  const base = getCatalystBaseUrl() || DEFAULT_CATALYST_BASE_URL;
  const origin = originOverride || (typeof window !== 'undefined' ? window.location.origin : '');
  const url = new URL(`${base}/workdrive/authorize`);
  url.searchParams.set('action', 'authorize');
  url.searchParams.set('dc', 'in');
  if (origin) {
    url.searchParams.set('origin', origin);
  }
  return url.toString();
}

/**
 * GET /workdrive/authorize?action=authorize&dc=in
 */
export async function getWorkdriveAuthorizeUrl(signal) {
  return { success: true, authorize_url: buildWorkdriveAuthUrl() };
}

/**
 * POST /workdrive/disconnect?action=disconnect
 * Needs bearer session token. Returns { success, connected: false }
 */
export async function disconnectWorkdrive() {
  try {
    const res = await workdriveRequest('/workdrive/disconnect?action=disconnect', { method: 'POST' });
    clearWorkdriveSessionToken(false);
    return res;
  } catch (err) {
    // Even if disconnect fails on backend, ensure local session is cleared
    clearWorkdriveSessionToken(false);
    throw err;
  }
}

/**
 * GET /workdrive/list?action=list&folder_id=<id>
 * Needs bearer session token. Omit folder_id for root items.
 * Returns { success, folder_id, items }
 */
export async function listWorkdriveItems(folderId = null, signal) {
  const query = folderId
    ? `?action=list&folder_id=${encodeURIComponent(folderId)}`
    : '?action=list';
  const res = await workdriveRequest(`/workdrive/list${query}`, { method: 'GET', signal });
  return {
    success: true,
    folderId: res?.folder_id || folderId || null,
    items: Array.isArray(res?.items) ? res.items : (Array.isArray(res?.data) ? res.data : [])
  };
}

/**
 * GET /workdrive/metadata?file_id=<id>
 * Needs bearer session token.
 * Returns { success, file }
 */
export async function getWorkdriveMetadata(fileId, signal) {
  if (!fileId) {
    throw new WorkDriveApiError('File ID is required to retrieve WorkDrive metadata.');
  }
  const res = await workdriveRequest(`/workdrive/metadata?file_id=${encodeURIComponent(fileId)}`, { method: 'GET', signal });
  return {
    success: true,
    file: res?.file || res?.data || res
  };
}

