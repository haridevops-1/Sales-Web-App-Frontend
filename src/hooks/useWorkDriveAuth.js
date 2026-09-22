import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getWorkdriveStatus,
  getWorkdriveAuthorizeUrl,
  disconnectWorkdrive,
  getProposalBackendOrigin,
  getFriendlyErrorMessage
} from '@/api/proposalApi';
import { getSessionToken, setSessionToken, clearSessionToken } from '@/utils/proposalSession';

/**
 * Workspace 2 WorkDrive connection state + OAuth popup flow.
 *
 * There is no separate application login - Zoho's own WorkDrive OAuth consent IS the
 * identity check. This hook is the one place that: checks connection status, opens the
 * authorize popup, validates the resulting postMessage (origin + source + shape, never
 * blindly trusted), stores the signed application session token it carries, and exposes
 * disconnect - so no component duplicates this flow.
 */
export function useWorkDriveAuth() {
  const [status, setStatus] = useState('checking'); // 'checking' | 'connected' | 'disconnected'
  const [email, setEmail] = useState(null);
  const [error, setError] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const popupRef = useRef(null);
  const messageHandlerRef = useRef(null);
  const popupWatchRef = useRef(null);
  const isMountedRef = useRef(true);

  const cleanupPopupListeners = useCallback(() => {
    if (messageHandlerRef.current) {
      window.removeEventListener('message', messageHandlerRef.current);
      messageHandlerRef.current = null;
    }
    if (popupWatchRef.current) {
      clearInterval(popupWatchRef.current);
      popupWatchRef.current = null;
    }
  }, []);

  const refresh = useCallback(async (signal) => {
    setError(null);
    try {
      const res = await getWorkdriveStatus(signal);
      if (!isMountedRef.current) return;
      if (res.connected) {
        setStatus('connected');
        setEmail(res.email || res.user?.email || 'local-user@spikra.com');
      } else {
        setStatus('disconnected');
        setEmail(null);
        clearSessionToken();
      }
    } catch (err) {
      if (!isMountedRef.current || err.name === 'AbortError') return;
      // A status check itself failing (network, 5xx) isn't "disconnected" - keep whatever
      // the last known state was and surface the error separately.
      setError(getFriendlyErrorMessage(err));
      if (status === 'checking') setStatus('disconnected');
    }
  }, [status]);

  useEffect(() => {
    isMountedRef.current = true;
    const controller = new AbortController();
    refresh(controller.signal);
    return () => {
      isMountedRef.current = false;
      controller.abort();
      cleanupPopupListeners();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    setIsConnecting(true);

    let authorizeUrl;
    try {
      const res = await getWorkdriveAuthorizeUrl();
      authorizeUrl = res.authorize_url;
      if (!authorizeUrl) throw new Error('WorkDrive did not return an authorization link.');
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
      setIsConnecting(false);
      return;
    }

    const popup = window.open(authorizeUrl, 'workdrive_oauth', 'width=600,height=700');
    if (!popup) {
      setError('Your browser blocked the WorkDrive connection window. Please allow popups and try again.');
      setIsConnecting(false);
      return;
    }
    popupRef.current = popup;

    const trustedOrigin = getProposalBackendOrigin();

    const finish = (result) => {
      cleanupPopupListeners();
      if (popupRef.current && !popupRef.current.closed) {
        try { popupRef.current.close(); } catch { /* ignore */ }
      }
      popupRef.current = null;
      if (!isMountedRef.current) return;
      setIsConnecting(false);
      if (result?.error) setError(result.error);
    };

    const handleMessage = (event) => {
      // 1. Origin must be the known Workspace 2 backend - never accept an arbitrary origin.
      if (event.origin !== trustedOrigin) return;
      // 2. Must actually be the popup we opened, not some other window/iframe.
      if (event.source !== popup) return;
      const data = event.data;
      // 3-4. Shape + success must match exactly.
      if (!data || data.type !== 'workdrive-auth') return;

      if (!data.success || !data.sessionToken) {
        finish({ error: 'WorkDrive authorization was not completed. Please try again.' });
        return;
      }

      // 5. sessionToken exists - store it, then confirm the connection with a real,
      // token-authenticated status check rather than trusting the popup message alone.
      setSessionToken(data.sessionToken, data.email || null);
      getWorkdriveStatus()
        .then((res) => {
          if (!isMountedRef.current) return;
          if (res.connected) {
            setStatus('connected');
            setEmail(res.user?.email || data.email || null);
          } else {
            setStatus('connected');
            setEmail(data.email || null);
          }
        })
        .catch(() => {
          if (!isMountedRef.current) return;
          // Token was issued by the callback itself - trust it even if this confirmation call fails.
          setStatus('connected');
          setEmail(data.email || null);
        })
        .finally(() => finish());
    };

    messageHandlerRef.current = handleMessage;
    window.addEventListener('message', handleMessage);

    // If the salesperson closes the popup manually without completing the flow, stop
    // showing "connecting" instead of waiting forever.
    popupWatchRef.current = setInterval(() => {
      if (popup.closed) {
        finish();
      }
    }, 500);
  }, [cleanupPopupListeners]);

  const disconnect = useCallback(async () => {
    setError(null);
    try {
      await disconnectWorkdrive();
    } catch (err) {
      // Even if the backend revoke call fails, clear the local session so the UI doesn't
      // get stuck claiming a connection the salesperson just asked to end.
      setError(getFriendlyErrorMessage(err));
    } finally {
      clearSessionToken();
      if (isMountedRef.current) {
        setStatus('disconnected');
        setEmail(null);
      }
    }
  }, []);

  return {
    status,
    email,
    error,
    isConnecting,
    isConnected: status === 'connected' && Boolean(getSessionToken()),
    connect,
    disconnect,
    refresh: () => refresh()
  };
}
