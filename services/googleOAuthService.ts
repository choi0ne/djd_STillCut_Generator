/**
 * Google OAuth 2.0 Service with PKCE
 * 
 * Authorization Code Flow + PKCE (Proof Key for Code Exchange)
 * - Refresh Token 지원으로 장기간 재로그인 불필요
 * - 백엔드 서버 없이 프론트엔드에서 안전하게 OAuth 처리
 */

// Token 저장 구조
export interface OAuthTokens {
    access_token: string;
    refresh_token: string;
    expires_at: number; // Unix timestamp (ms)
    scope: string;
}

// localStorage 키
const TOKEN_STORAGE_KEY = 'google_oauth_tokens';
const PKCE_VERIFIER_KEY = 'google_oauth_pkce_verifier';
const OAUTH_STATE_KEY = 'google_oauth_state';

// OAuth 설정
const OAUTH_CONFIG = {
    authEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    revokeEndpoint: 'https://oauth2.googleapis.com/revoke',
    scope: 'https://www.googleapis.com/auth/drive.file',
};

// Token 만료 전 갱신 시작 시간 (5분)
const TOKEN_REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

/**
 * Base64 URL-safe 인코딩
 */
function base64UrlEncode(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

/**
 * 랜덤 문자열 생성 (code_verifier용)
 */
function generateRandomString(length: number): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    const randomValues = new Uint8Array(length);
    crypto.getRandomValues(randomValues);
    return Array.from(randomValues, (byte) => charset[byte % charset.length]).join('');
}

/**
 * SHA-256 해시 생성 (code_challenge용)
 */
async function sha256(plain: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    return await crypto.subtle.digest('SHA-256', data);
}

/**
 * PKCE code_verifier 및 code_challenge 생성
 */
async function generatePKCE(): Promise<{ verifier: string; challenge: string }> {
    const verifier = generateRandomString(64);
    const hashed = await sha256(verifier);
    const challenge = base64UrlEncode(hashed);
    return { verifier, challenge };
}

/**
 * 저장된 토큰 가져오기
 */
export function getStoredTokens(): OAuthTokens | null {
    try {
        const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
        if (!stored) return null;
        return JSON.parse(stored) as OAuthTokens;
    } catch {
        return null;
    }
}

/**
 * 토큰 저장
 */
function saveTokens(tokens: OAuthTokens): void {
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

/**
 * 토큰 삭제
 */
function clearTokens(): void {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(PKCE_VERIFIER_KEY);
    localStorage.removeItem(OAUTH_STATE_KEY);
}

/**
 * Client ID 가져오기 (안전한 버전 - 없으면 null 반환)
 */
function getClientIdSafe(): string | null {
    try {
        const stored = localStorage.getItem('google-client-id');
        if (!stored) return null;
        const parsed = JSON.parse(stored);
        return parsed || null;
    } catch {
        return null;
    }
}

/**
 * Client ID 가져오기 (필수 - 없으면 에러)
 */
function getClientId(): string {
    const clientId = getClientIdSafe();
    if (!clientId) {
        throw new Error('Google Client ID가 설정되지 않았습니다. 설정 메뉴에서 입력해주세요.');
    }
    return clientId;
}

/**
 * 토큰이 유효한지 확인
 */
export function isTokenValid(): boolean {
    const tokens = getStoredTokens();
    if (!tokens) return false;
    return Date.now() < tokens.expires_at;
}

/**
 * 토큰 갱신이 필요한지 확인
 */
export function needsTokenRefresh(): boolean {
    const tokens = getStoredTokens();
    if (!tokens) return false;
    return Date.now() >= tokens.expires_at - TOKEN_REFRESH_THRESHOLD_MS;
}

/**
 * OAuth 로그인 시작 (Authorization Code Flow with PKCE)
 */
export async function initiateOAuthFlow(): Promise<void> {
    const clientId = getClientId();
    const redirectUri = window.location.origin + '/';

    // PKCE 생성
    const { verifier, challenge } = await generatePKCE();

    // State 생성 (CSRF 방지)
    const state = generateRandomString(32);

    // PKCE verifier와 state 저장 (callback에서 사용)
    localStorage.setItem(PKCE_VERIFIER_KEY, verifier);
    localStorage.setItem(OAUTH_STATE_KEY, state);

    // OAuth URL 생성
    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: OAUTH_CONFIG.scope,
        code_challenge: challenge,
        code_challenge_method: 'S256',
        state: state,
        access_type: 'offline', // Refresh token 요청
        prompt: 'consent', // 항상 동의 화면 표시 (refresh token 발급 보장)
    });

    // Google 인증 페이지로 리다이렉트
    window.location.href = `${OAUTH_CONFIG.authEndpoint}?${params.toString()}`;
}

/**
 * OAuth callback 파싱
 */
export function parseOAuthCallback(): { code: string; state: string } | null {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (!code || !state) return null;

    return { code, state };
}

/**
 * State 검증 (CSRF 방지)
 */
export function verifyState(receivedState: string): boolean {
    const savedState = localStorage.getItem(OAUTH_STATE_KEY);
    return savedState === receivedState;
}

/**
 * Authorization Code를 Token으로 교환
 */
export async function exchangeCodeForTokens(code: string): Promise<OAuthTokens> {
    const clientId = getClientId();
    const redirectUri = window.location.origin + '/';
    const verifier = localStorage.getItem(PKCE_VERIFIER_KEY);

    if (!verifier) {
        throw new Error('PKCE verifier를 찾을 수 없습니다. 다시 로그인해주세요.');
    }

    const params = new URLSearchParams({
        client_id: clientId,
        code: code,
        code_verifier: verifier,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
    });

    const response = await fetch(OAUTH_CONFIG.tokenEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
    });

    if (!response.ok) {
        const error = await response.json();
        console.error('Token exchange error:', error);
        throw new Error(`토큰 교환 실패: ${error.error_description || error.error}`);
    }

    const data = await response.json();

    const tokens: OAuthTokens = {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Date.now() + (data.expires_in * 1000),
        scope: data.scope,
    };

    // 토큰 저장
    saveTokens(tokens);

    // PKCE verifier와 state 정리
    localStorage.removeItem(PKCE_VERIFIER_KEY);
    localStorage.removeItem(OAUTH_STATE_KEY);

    // URL에서 code 파라미터 제거
    window.history.replaceState({}, document.title, window.location.pathname);

    return tokens;
}

/**
 * Refresh Token으로 Access Token 갱신
 */
export async function refreshAccessToken(): Promise<OAuthTokens> {
    const tokens = getStoredTokens();
    if (!tokens?.refresh_token) {
        throw new Error('Refresh token이 없습니다. 다시 로그인해주세요.');
    }

    const clientId = getClientId();

    const params = new URLSearchParams({
        client_id: clientId,
        refresh_token: tokens.refresh_token,
        grant_type: 'refresh_token',
    });

    const response = await fetch(OAUTH_CONFIG.tokenEndpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
    });

    if (!response.ok) {
        const error = await response.json();
        console.error('Token refresh error:', error);
        // Refresh token이 만료되었거나 무효화된 경우
        if (error.error === 'invalid_grant') {
            clearTokens();
            throw new Error('세션이 만료되었습니다. 다시 로그인해주세요.');
        }
        throw new Error(`토큰 갱신 실패: ${error.error_description || error.error}`);
    }

    const data = await response.json();

    const newTokens: OAuthTokens = {
        access_token: data.access_token,
        // Refresh token은 보통 새로 발급되지 않음, 기존 것 유지
        refresh_token: data.refresh_token || tokens.refresh_token,
        expires_at: Date.now() + (data.expires_in * 1000),
        scope: data.scope || tokens.scope,
    };

    saveTokens(newTokens);
    console.log('[OAuth] Access token 갱신 완료');

    return newTokens;
}

/**
 * 유효한 Access Token 확보 (자동 갱신 포함)
 */
export async function ensureValidAccessToken(): Promise<string> {
    const tokens = getStoredTokens();

    if (!tokens) {
        throw new Error('로그인이 필요합니다.');
    }

    // 토큰이 아직 유효하고 갱신 시점 전이면 그대로 반환
    if (Date.now() < tokens.expires_at - TOKEN_REFRESH_THRESHOLD_MS) {
        return tokens.access_token;
    }

    // 갱신 필요
    console.log('[OAuth] Access token 갱신 중...');
    const newTokens = await refreshAccessToken();
    return newTokens.access_token;
}

/**
 * 로그아웃 (토큰 취소 및 삭제)
 */
export async function signOut(): Promise<void> {
    const tokens = getStoredTokens();

    if (tokens?.access_token) {
        try {
            // Google에 토큰 취소 요청
            await fetch(`${OAUTH_CONFIG.revokeEndpoint}?token=${tokens.access_token}`, {
                method: 'POST',
            });
            console.log('[OAuth] 토큰 취소 완료');
        } catch (error) {
            console.warn('[OAuth] 토큰 취소 중 오류 (무시됨):', error);
        }
    }

    // 로컬 토큰 삭제
    clearTokens();
}

/**
 * OAuth Callback 처리 (앱 시작 시 호출)
 * URL에 code 파라미터가 있으면 토큰 교환 수행
 */
export async function handleOAuthCallback(): Promise<boolean> {
    const callback = parseOAuthCallback();

    if (!callback) {
        return false; // callback이 아님
    }

    // Client ID 체크 - 없으면 콜백 처리 불가
    const clientId = getClientIdSafe();
    if (!clientId) {
        console.warn('[OAuth] Client ID가 없어 콜백 처리를 건너뜁니다.');
        // URL 정리
        window.history.replaceState({}, document.title, window.location.pathname);
        return false;
    }

    // State 검증
    if (!verifyState(callback.state)) {
        console.error('[OAuth] State 검증 실패 - CSRF 공격 가능성');
        // URL 정리
        window.history.replaceState({}, document.title, window.location.pathname);
        throw new Error('보안 검증 실패. 다시 로그인해주세요.');
    }

    // 토큰 교환
    await exchangeCodeForTokens(callback.code);
    console.log('[OAuth] 로그인 성공!');

    return true;
}

/**
 * 인증 상태 확인
 */
export function isAuthenticated(): boolean {
    const tokens = getStoredTokens();
    // refresh_token이 있으면 인증된 것으로 간주 (access_token은 갱신 가능)
    return !!tokens?.refresh_token;
}
