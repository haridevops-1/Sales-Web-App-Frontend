/**
 * Shared Zoho WorkDrive Session Management for Spikra
 * 
 * Manages the signed application session token issued by the Zoho OAuth callback.
 * Shared across both Workspace 1 (Customer Showcases) and Workspace 2 (Solution Proposals).
 */

const WORKDRIVE_TOKEN_KEY = 'workdrive_session_token';
const WORKDRIVE_EMAIL_KEY = 'workdrive_session_email';
// Legacy key fallback
const LEGACY_TOKEN_KEY = 'workspace2_session_token';
const LEGACY_EMAIL_KEY = 'workspace2_session_email';

export function getWorkdriveSessionToken() {
  try {
    const token = localStorage.getItem(WORKDRIVE_TOKEN_KEY) || sessionStorage.getItem(WORKDRIVE_TOKEN_KEY);
    if (token) return token;
    // Fallback to legacy keys if present
    return sessionStorage.getItem(LEGACY_TOKEN_KEY) || localStorage.getItem(LEGACY_TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function getWorkdriveSessionEmail() {
  try {
    const email = localStorage.getItem(WORKDRIVE_EMAIL_KEY) || sessionStorage.getItem(WORKDRIVE_EMAIL_KEY);
    if (email) return email;
    return sessionStorage.getItem(LEGACY_EMAIL_KEY) || localStorage.getItem(LEGACY_EMAIL_KEY) || null;
  } catch {
    return null;
  }
}

export function setWorkdriveSessionToken(token, email = null) {
  try {
    if (token) {
      localStorage.setItem(WORKDRIVE_TOKEN_KEY, token);
      sessionStorage.setItem(WORKDRIVE_TOKEN_KEY, token);
      sessionStorage.setItem(LEGACY_TOKEN_KEY, token);
    }
    if (email) {
      localStorage.setItem(WORKDRIVE_EMAIL_KEY, email);
      sessionStorage.setItem(WORKDRIVE_EMAIL_KEY, email);
      sessionStorage.setItem(LEGACY_EMAIL_KEY, email);
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
    localStorage.removeItem(WORKDRIVE_TOKEN_KEY);
    localStorage.removeItem(WORKDRIVE_EMAIL_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_EMAIL_KEY);
    sessionStorage.removeItem(WORKDRIVE_TOKEN_KEY);
    sessionStorage.removeItem(WORKDRIVE_EMAIL_KEY);
    sessionStorage.removeItem(LEGACY_TOKEN_KEY);
    sessionStorage.removeItem(LEGACY_EMAIL_KEY);

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
