import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  WORKDRIVE_AUTH_URL,
  buildWorkdriveAuthUrl,
  getWorkdriveStatus,
  disconnectWorkdrive,
  isTrustedWorkDriveOrigin
} from '../api/workdriveApi';
import {
  getWorkdriveSessionToken,
  getWorkdriveSessionEmail,
  setWorkdriveSessionToken,
  clearWorkdriveSessionToken
} from '../utils/workdriveSession';

const WorkDriveContext = createContext(null);

export function WorkDriveProvider({ children }) {
  const [status, setStatus] = useState(() => (getWorkdriveSessionToken() ? 'connected' : 'disconnected'));
  const [email, setEmail] = useState(() => getWorkdriveSessionEmail());
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState(null);

  const popupRef = useRef(null);
  const messageHandlerRef = useRef(null);
  const popupWatchTimerRef = useRef(null);
  const isMountedRef = useRef(true);

  const cleanupPopup = useCallback(() => {
    if (messageHandlerRef.current) {
      window.removeEventListener('message', messageHandlerRef.current);
      messageHandlerRef.current = null;
    }
    if (popupWatchTimerRef.current) {
      clearInterval(popupWatchTimerRef.current);
      popupWatchTimerRef.current = null;
    }
    if (popupRef.current && !popupRef.current.closed) {
      try {
        popupRef.current.close();
      } catch {}
    }
    popupRef.current = null;
    if (isMountedRef.current) {
      setIsConnecting(false);
    }
  }, []);

  const checkStatus = useCallback(async () => {
    setError(null);

    // Check if redirected with session token in URL query params
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const urlToken = urlParams.get('workdrive_token') || urlParams.get('session_token');
        const urlEmail = urlParams.get('workdrive_email') || urlParams.get('email');
        if (urlToken) {
          setWorkdriveSessionToken(urlToken, urlEmail);
          urlParams.delete('workdrive_token');
          urlParams.delete('session_token');
          urlParams.delete('workdrive_email');
          urlParams.delete('email');
          const cleanSearch = urlParams.toString() ? `?${urlParams.toString()}` : '';
          window.history.replaceState(null, '', `${window.location.pathname}${cleanSearch}${window.location.hash}`);
        }
      } catch {}
    }

    const localToken = getWorkdriveSessionToken();
    const localEmail = getWorkdriveSessionEmail();

    if (localToken) {
      setStatus('connected');
      if (localEmail) setEmail(localEmail);
    } else {
      setStatus('disconnected');
      setEmail(null);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    checkStatus();

    const handleSessionExpired = () => {
      if (!isMountedRef.current) return;
      setStatus('disconnected');
      setEmail(null);
      setError('Zoho WorkDrive session expired. Please connect again.');
    };

    const handleSessionUpdated = (e) => {
      if (!isMountedRef.current) return;
      setStatus('connected');
      if (e.detail?.email) setEmail(e.detail.email);
    };

    const handleSessionCleared = () => {
      if (!isMountedRef.current) return;
      setStatus('disconnected');
      setEmail(null);
    };

    window.addEventListener('workdrive:session_expired', handleSessionExpired);
    window.addEventListener('workdrive:session_updated', handleSessionUpdated);
    window.addEventListener('workdrive:session_cleared', handleSessionCleared);

    return () => {
      isMountedRef.current = false;
      cleanupPopup();
      window.removeEventListener('workdrive:session_expired', handleSessionExpired);
      window.removeEventListener('workdrive:session_updated', handleSessionUpdated);
      window.removeEventListener('workdrive:session_cleared', handleSessionCleared);
    };
  }, [checkStatus, cleanupPopup]);

  /**
   * "Open WorkDrive" Handler - Opens OAuth screen in clean 600x700 popup
   */
  const handleOpenWorkDrive = useCallback(() => {
    setError(null);
    setIsConnecting(true);

    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const authUrl = buildWorkdriveAuthUrl();
    const popup = window.open(
      authUrl,
      'ZohoWorkDriveAuth',
      `width=${width},height=${height},top=${top},left=${left},status=no,resizable=yes`
    );

    if (!popup) {
      setError('Popup blocked by browser. Please enable popups for this site and try again.');
      setIsConnecting(false);
      return;
    }

    popupRef.current = popup;

    const handleMessage = async (event) => {
      let data = event.data;
      if (!data) return;

      // Handle cases where data is serialized as a JSON string
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data);
        } catch {
          return;
        }
      }

      if (!data || data.type !== 'workdrive-auth') return;

      // Validate origin against trusted domains if origin is provided
      if (event.origin && !isTrustedWorkDriveOrigin(event.origin)) {
        console.warn('[WorkDriveContext] Ignoring message from untrusted origin:', event.origin);
        return;
      }

      cleanupPopup();

      const sessionToken = data.sessionToken || data.session_token || data.token || data.accessToken;
      const userEmail = data.email || data.user_email || data.user?.email || null;

      if (data.success && sessionToken) {
        console.log('[WorkDriveContext] Connected successfully as:', userEmail);

        // Save sessionToken (sessionStorage only - see utils/workdriveSession.js)
        setWorkdriveSessionToken(sessionToken, userEmail);

        if (userEmail) setEmail(userEmail);
        setStatus('connected');
        setError(null);
      } else {
        const errorDetail =
          (typeof data.error === 'string' && data.error) ||
          data.error?.message ||
          data.message ||
          data.reason ||
          'Failed to connect Zoho WorkDrive. Please try again.';

        console.error('[WorkDriveContext] OAuth callback error payload:', errorDetail, data);
        setError(errorDetail);
        setStatus('disconnected');
        alert(`Zoho WorkDrive Connection: ${errorDetail}`);
      }
    };

    messageHandlerRef.current = handleMessage;
    window.addEventListener('message', handleMessage);

    // Watch for manual popup close
    popupWatchTimerRef.current = setInterval(() => {
      if (popup.closed) {
        cleanupPopup();
      }
    }, 500);
  }, [cleanupPopup]);

  const disconnect = useCallback(async () => {
    setError(null);
    try {
      await disconnectWorkdrive();
    } catch (err) {
      console.warn('[WorkDriveContext] Disconnect API error:', err);
    } finally {
      clearWorkdriveSessionToken(false);
      setStatus('disconnected');
      setEmail(null);
    }
  }, []);

  const value = {
    status,
    email,
    isConnecting,
    isConnected: status === 'connected' && Boolean(getWorkdriveSessionToken()),
    error,
    connect: handleOpenWorkDrive,
    handleOpenWorkDrive,
    disconnect,
    checkStatus,
    clearError: () => setError(null)
  };

  return (
    <WorkDriveContext.Provider value={value}>
      {children}
    </WorkDriveContext.Provider>
  );
}

export function useWorkDrive() {
  const context = useContext(WorkDriveContext);
  if (!context) {
    throw new Error('useWorkDrive must be used within a WorkDriveProvider');
  }
  return context;
}
