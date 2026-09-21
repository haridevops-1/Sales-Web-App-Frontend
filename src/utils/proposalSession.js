/**
 * Workspace 2 (Solution Proposals) session utility.
 *
 * There is no separate application login for Workspace 2 - the salesperson's Zoho
 * WorkDrive OAuth establishes their identity. This module is the ONE place the
 * resulting signed application session token (never a Zoho token/secret) is stored
 * and read, so no component talks to sessionStorage directly.
 */

const SESSION_TOKEN_KEY = 'workspace2_session_token';
const SESSION_EMAIL_KEY = 'workspace2_session_email';

export function getSessionToken() {
  try {
    return sessionStorage.getItem(SESSION_TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function getSessionEmail() {
  try {
    return sessionStorage.getItem(SESSION_EMAIL_KEY) || null;
  } catch {
    return null;
  }
}

export function setSessionToken(token, email = null) {
  try {
    if (token) {
      sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    }
    if (email) {
      sessionStorage.setItem(SESSION_EMAIL_KEY, email);
    }
  } catch {
    // sessionStorage unavailable (e.g. private mode) - session simply won't persist
  }
}

export function clearSessionToken() {
  try {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(SESSION_EMAIL_KEY);
  } catch {
    // ignore
  }
}

export function isAuthenticated() {
  return Boolean(getSessionToken());
}
