import { useEffect, useRef, useState } from 'react';
import useLocalStorage from './useLocalStorage';

interface GoogleAuthState {
  accessToken: string | null;
  expiresAt: number | null;
  isAuthenticated: boolean;
}

interface GoogleAuthHook {
  isAuthenticated: boolean;
  accessToken: string | null;
  signIn: () => Promise<void>;
  signOut: () => void;
}

const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // Refresh 5 minutes before expiry
const CHECK_INTERVAL = 60 * 1000; // Check every minute

function useGoogleAuth(clientId: string): GoogleAuthHook {
  const [authState, setAuthState] = useLocalStorage<GoogleAuthState>('google-auth-state', {
    accessToken: null,
    expiresAt: null,
    isAuthenticated: false,
  });

  const [isReady, setIsReady] = useState(false);
  const tokenClientRef = useRef<any>(null);

  // Initialize Google Sign-In
  useEffect(() => {
    if (!clientId || typeof window === 'undefined' || !window.google) {
      return;
    }

    try {
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.file',
        callback: (response: any) => {
          if (response.access_token) {
            const expiresAt = Date.now() + (response.expires_in * 1000);
            setAuthState({
              accessToken: response.access_token,
              expiresAt,
              isAuthenticated: true,
            });
          }
        },
      });
      setIsReady(true);
    } catch (error) {
      console.error('Failed to initialize Google Sign-In:', error);
    }
  }, [clientId]);

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!authState.isAuthenticated || !authState.expiresAt) {
      return;
    }

    const checkAndRefresh = () => {
      const now = Date.now();
      const timeUntilExpiry = authState.expiresAt! - now;

      // If token expires soon or has expired, refresh it
      if (timeUntilExpiry < TOKEN_REFRESH_THRESHOLD) {
        console.log('Token expiring soon, refreshing...');
        if (tokenClientRef.current) {
          // Request new token silently
          tokenClientRef.current.requestAccessToken({ prompt: '' });
        }
      }
    };

    // Check immediately
    checkAndRefresh();

    // Set up periodic check
    const intervalId = setInterval(checkAndRefresh, CHECK_INTERVAL);

    return () => clearInterval(intervalId);
  }, [authState.isAuthenticated, authState.expiresAt]);

  const signIn = async (): Promise<void> => {
    if (!isReady || !tokenClientRef.current) {
      throw new Error('Google Sign-In not ready');
    }

    tokenClientRef.current.requestAccessToken({ prompt: 'consent' });
  };

  const signOut = () => {
    if (authState.accessToken && window.google) {
      window.google.accounts.oauth2.revoke(authState.accessToken, () => {
        console.log('Token revoked');
      });
    }

    setAuthState({
      accessToken: null,
      expiresAt: null,
      isAuthenticated: false,
    });
  };

  return {
    isAuthenticated: authState.isAuthenticated,
    accessToken: authState.accessToken,
    signIn,
    signOut,
  };
}

export default useGoogleAuth;
