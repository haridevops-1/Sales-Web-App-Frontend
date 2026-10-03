/**
 * Workspace 2 (Solution Proposals) session utility.
 *
 * Re-exports and synchronizes with the shared WorkDrive session utility so that both
 * Workspace 1 and Workspace 2 share the exact same bearer token and auth state.
 */

import {
  getWorkdriveSessionToken,
  getWorkdriveSessionEmail,
  setWorkdriveSessionToken,
  clearWorkdriveSessionToken,
  isWorkdriveAuthenticated
} from './workdriveSession';

export function getSessionToken() {
  return getWorkdriveSessionToken();
}

export function getSessionEmail() {
  return getWorkdriveSessionEmail();
}

export function setSessionToken(token, email = null) {
  setWorkdriveSessionToken(token, email);
}

export function clearSessionToken(isExpired = false) {
  clearWorkdriveSessionToken(isExpired);
}

export function isAuthenticated() {
  return isWorkdriveAuthenticated();
}
