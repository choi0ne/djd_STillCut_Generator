import { useEffect, useState, useCallback, useRef } from 'react';
import {
  isAuthenticated as checkIsAuthenticated,
  handleOAuthCallback,
  initiateOAuthFlow,
  signOut as oauthSignOut,
  ensureValidAccessToken,
  needsTokenRefresh,
  refreshAccessToken,
  getStoredTokens,
} from '../services/googleOAuthService';

interface GoogleAuthHook {
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  getValidAccessToken: () => Promise<string>;
}

// 토큰 자동 갱신 주기 (5분)
const TOKEN_CHECK_INTERVAL = 5 * 60 * 1000;

function useGoogleAuth(clientId: string): GoogleAuthHook {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const refreshIntervalRef = useRef<number | null>(null);

  // 초기화 및 OAuth callback 처리
  useEffect(() => {
    const initialize = async () => {
      try {
        // URL에 code 파라미터가 있으면 OAuth callback 처리
        const wasCallback = await handleOAuthCallback();

        if (wasCallback) {
          console.log('[Auth] OAuth callback 처리 완료');
        }

        // 인증 상태 확인
        const authenticated = checkIsAuthenticated();
        setIsAuthenticated(authenticated);

        if (authenticated) {
          const tokens = getStoredTokens();
          setAccessToken(tokens?.access_token || null);
        }
      } catch (error) {
        console.error('[Auth] 초기화 오류:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // 토큰 자동 갱신 타이머
  useEffect(() => {
    if (!isAuthenticated) {
      // 인증되지 않았으면 타이머 정리
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    const checkAndRefreshToken = async () => {
      try {
        if (needsTokenRefresh()) {
          console.log('[Auth] 토큰 갱신 필요, 갱신 중...');
          const newTokens = await refreshAccessToken();
          setAccessToken(newTokens.access_token);
        }
      } catch (error) {
        console.error('[Auth] 자동 토큰 갱신 실패:', error);
        // 갱신 실패 시 로그아웃 처리
        setIsAuthenticated(false);
        setAccessToken(null);
      }
    };

    // 즉시 한 번 체크
    checkAndRefreshToken();

    // 주기적 체크 설정
    refreshIntervalRef.current = window.setInterval(checkAndRefreshToken, TOKEN_CHECK_INTERVAL);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
    };
  }, [isAuthenticated]);

  // 로그인
  const signIn = useCallback(async (): Promise<void> => {
    if (!clientId) {
      throw new Error('Google Client ID가 설정되지 않았습니다. 설정 메뉴에서 입력해주세요.');
    }

    // PKCE OAuth 플로우 시작 (리다이렉트됨)
    await initiateOAuthFlow();
  }, [clientId]);

  // 로그아웃
  const signOut = useCallback(async (): Promise<void> => {
    await oauthSignOut();
    setIsAuthenticated(false);
    setAccessToken(null);
    console.log('[Auth] 로그아웃 완료');
  }, []);

  // 유효한 Access Token 가져오기 (필요시 자동 갱신)
  const getValidAccessToken = useCallback(async (): Promise<string> => {
    const token = await ensureValidAccessToken();
    setAccessToken(token);
    return token;
  }, []);

  return {
    isAuthenticated,
    isLoading,
    accessToken,
    signIn,
    signOut,
    getValidAccessToken,
  };
}

export default useGoogleAuth;
