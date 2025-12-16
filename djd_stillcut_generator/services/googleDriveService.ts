// Helper to convert input (Blob URL or Data URL) to Blob
const inputToBlob = async (input: string, mimeType: string): Promise<Blob> => {
    // Blob URL인 경우 (blob:http://... 형태)
    if (input.startsWith('blob:')) {
        const response = await fetch(input);
        return await response.blob();
    }

    // Data URL인 경우 (data:image/png;base64,... 형태)
    if (input.startsWith('data:')) {
        const byteCharacters = atob(input.split(',')[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    }

    // 그 외의 경우 (일반 URL) - fetch로 처리
    const response = await fetch(input);
    return await response.blob();
};

// Function to get keys from local storage
const getGoogleKeys = () => {
    try {
        const apiKeyItem = window.localStorage.getItem('google-api-key');
        const clientIdItem = window.localStorage.getItem('google-client-id');

        const apiKey = apiKeyItem ? JSON.parse(apiKeyItem) : null;
        const clientId = clientIdItem ? JSON.parse(clientIdItem) : null;

        if (!apiKey || !clientId) {
            throw new Error("Google API Key 또는 Client ID가 설정되지 않았습니다. '설정' 메뉴에서 키를 입력해주세요.");
        }
        return { apiKey, clientId };
    } catch (error) {
        if (error instanceof Error && error.message.includes("Google API Key")) {
            throw error;
        }
        throw new Error("로컬 스토리지에서 Google 키를 읽는 데 실패했습니다.");
    }
};

let tokenClient: any = null;
let gapiInited = false;
let gsiInited = false;

const initGapiClient = (apiKey: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (gapiInited) {
            resolve();
            return;
        }
        window.gapi.load('client', async () => {
            try {
                await window.gapi.client.init({
                    apiKey: apiKey,
                    discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'],
                });
                gapiInited = true;
                resolve();
            } catch (error) {
                console.error("GAPI client init error:", error);
                reject(new Error("Google API 클라이언트 초기화에 실패했습니다."));
            }
        });
    });
};


const initTokenClient = (clientId: string) => {
    if (gsiInited) return;
    try {
        tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: '', // The callback is handled by the Promise wrapper
        });
        gsiInited = true;
    } catch (error) {
        console.error("Token client init error:", error);
        throw new Error("Google 인증 클라이언트 초기화에 실패했습니다.");
    }
};

const requestAccessToken = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        const callback = (resp: any) => {
            if (resp.error) {
                console.error("Token request error:", resp.error);
                reject(new Error("Google Drive 접근 권한을 얻지 못했습니다."));
            } else {
                resolve();
            }
        };

        if (window.gapi.client.getToken() === null) {
            tokenClient.callback = callback;
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            resolve();
        }
    });
};


export const saveToGoogleDrive = async (base64Image: string): Promise<any> => {
    const { apiKey, clientId } = getGoogleKeys();

    if (typeof window.gapi === 'undefined' || typeof window.google === 'undefined') {
        throw new Error('Google API 스크립트를 로드하지 못했습니다. 페이지를 새로고침하고 다시 시도해주세요.');
    }

    await initGapiClient(apiKey);
    initTokenClient(clientId);
    await requestAccessToken();

    const blob = await inputToBlob(base64Image, 'image/png');
    const metadata = {
        name: `djd-image-${Date.now()}.png`,
        mimeType: 'image/png',
        parents: ['1JFZP6kNztGmplyBWRjaADxwsp-9YbJbn']
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: new Headers({ 'Authorization': `Bearer ${window.gapi.client.getToken().access_token}` }),
        body: form,
    });

    if (!res.ok) {
        const errorBody = await res.json();
        console.error('Google Drive Upload Error:', errorBody);
        throw new Error(`Google Drive에 업로드하지 못했습니다: ${errorBody.error.message}`);
    }

    return await res.json();
};