/**
 * Shared Zoho WorkDrive Session Management for Spikra
 *
 * Manages the signed application session token issued by the Zoho OAuth callback.
 * Shared across both Workspace 1 (Customer Showcases) and Workspace 2 (Solution Proposals).
 *
 * Security: this token is stored ONLY in sessionStorage - never localStorage - so it
 * never outlives the browser tab. A token that persists indefinitely across restarts
 * widens the attack surface for session theft for no real benefit here.
 */

const WORKDRIVE_TOKEN_KEY = 'workdrive_session_token';
const WORKDRIVE_EMAIL_KEY = 'workdrive_session_email';

export function getWorkdriveSessionToken() {
  try {
    return sessionStorage.getItem(WORKDRIVE_TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function getWorkdriveSessionEmail() {
  try {
    return sessionStorage.getItem(WORKDRIVE_EMAIL_KEY) || null;
  } catch {
    return null;
  }
}

export function setWorkdriveSessionToken(token, email = null) {
  try {
    if (token) {
      sessionStorage.setItem(WORKDRIVE_TOKEN_KEY, token);
    }
    if (email) {
      sessionStorage.setItem(WORKDRIVE_EMAIL_KEY, email);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('workdrive:session_updated', {
        detail: { token, email }
      }));
    }
  } catch (err) {
    console.warn('[WorkDrive Session] Could not persist session token:', err);
  }
}

export function clearWorkdriveSessionToken(isExpired = false) {
  try {
    sessionStorage.removeItem(WORKDRIVE_TOKEN_KEY);
    sessionStorage.removeItem(WORKDRIVE_EMAIL_KEY);
    // One-time cleanup of tokens persisted to localStorage by an earlier, less secure
    // version of this module - harmless no-op once migrated.
    localStorage.removeItem(WORKDRIVE_TOKEN_KEY);
    localStorage.removeItem(WORKDRIVE_EMAIL_KEY);

    if (typeof window !== 'undefined') {
      const eventName = isExpired ? 'workdrive:session_expired' : 'workdrive:session_cleared';
      window.dispatchEvent(new CustomEvent(eventName));
    }
  } catch (err) {
    console.warn('[WorkDrive Session] Could not clear session token:', err);
  }
}

export function isWorkdriveAuthenticated() {
  return Boolean(getWorkdriveSessionToken());
}
