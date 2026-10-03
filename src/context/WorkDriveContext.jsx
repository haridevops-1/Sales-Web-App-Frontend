import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  getWorkdriveStatus,
  getWorkdriveAuthorizeUrl,
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
  const [status, setStatus] = useState('checking'); // 'checking' | 'connected' | 'disconnected'
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

  const checkStatus = useCallback(async (signal) => {
    setError(null);
    try {
      const res = await getWorkdriveStatus(signal);
      if (!isMountedRef.current) return;

      const hasLocalToken = Boolean(getWorkdriveSessionToken());
      if (res.connected && (hasLocalToken || res.email)) {
        setStatus('connected');
        const resolvedEmail = res.email || getWorkdriveSessionEmail();
        setEmail(resolvedEmail);
      } else {
        setStatus('disconnected');
        setEmail(null);
        clearWorkdriveSessionToken(false);
      }
    } catch (err) {
      if (!isMountedRef.current || err.name === 'AbortError') return;
      console.warn('[WorkDriveContext] Status check error:', err);
      // If error occurs, keep last known state or mark disconnected if checking
      if (status === 'checking') {
        setStatus('disconnected');
      }
    }
  }, [status]);

  useEffect(() => {
    isMountedRef.current = true;
    const controller = new AbortController();
    checkStatus(controller.signal);

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
      controller.abort();
      cleanupPopup();
      window.removeEventListener('workdrive:session_expired', handleSessionExpired);
      window.removeEventListener('workdrive:session_updated', handleSessionUpdated);
      window.removeEventListener('workdrive:session_cleared', handleSessionCleared);
    };
  }, [checkStatus, cleanupPopup]);

  const connect = useCallback(async () => {
    setError(null);
    setIsConnecting(true);

    let authorizeUrl;
    try {
      const res = await getWorkdriveAuthorizeUrl();
      authorizeUrl = res?.authorize_url;
      if (!authorizeUrl) {
        throw new Error('WorkDrive did not return an authorization URL.');
      }
    } catch (err) {
      const msg = err.message || 'Failed to initiate Zoho WorkDrive authorization.';
      setError(msg);
      setIsConnecting(false);
      return;
    }

    // Open OAuth popup window
    const width = 640;
    const height = 740;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      authorizeUrl,
      'zoho_workdrive_oauth',
      `width=${width},height=${height},left=${left},top=${top},status=0,toolbar=0,menubar=0,location=1`
    );

    if (!popup) {
      setError('Popup blocked by browser. Please enable popups for this site and try again.');
      setIsConnecting(false);
      return;
    }

    popupRef.current = popup;

    const handleMessage = async (event) => {
      // 1. Origin verification
      if (!isTrustedWorkDriveOrigin(event.origin)) {
        console.warn('[WorkDrive OAuth] Received message from untrusted origin:', event.origin);
        return;
      }

      // 2. Validate payload shape
      const data = event.data;
      if (!data || data.type !== 'workdrive-auth') return;

      cleanupPopup();

      if (!data.success || !data.sessionToken) {
        setError(data.error || 'WorkDrive authorization was cancelled or failed.');
        return;
      }

      // 3. Store session token & update status
      setWorkdriveSessionToken(data.sessionToken, data.email || null);
      if (data.email) setEmail(data.email);
      setStatus('connected');

      // 4. Re-check status from backend to verify token works
      try {
        await checkStatus();
      } catch {
        // Fallback to connected if token was received
        setStatus('connected');
      }
    };

    messageHandlerRef.current = handleMessage;
    window.addEventListener('message', handleMessage);

    // Watch for manual popup close
    popupWatchTimerRef.current = setInterval(() => {
      if (popup.closed) {
        cleanupPopup();
      }
    }, 600);
  }, [cleanupPopup, checkStatus]);

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
    connect,
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
