
import { useState, useCallback, useEffect } from 'react';

export const useApiKey = () => {
    const [isKeyReady, setIsKeyReady] = useState(false);

    const checkApiKey = useCallback(async () => {
        // The `aistudio` object may not be available in all development environments.
        // If it's not present, we'll assume a key is configured via other means (e.g., env vars)
        // and allow the app to proceed.
        if (window.aistudio) {
            try {
                const hasKey = await window.aistudio.hasSelectedApiKey();
                setIsKeyReady(hasKey);
            } catch (error) {
                console.error("Error checking for API key:", error);
                // If the check fails, default to showing the selection UI.
                setIsKeyReady(false);
            }
        } else {
            console.warn('window.aistudio is not available. Assuming API key is set.');
            setIsKeyReady(true);
        }
    }, []);

    const selectApiKey = useCallback(async () => {
        if (window.aistudio) {
            try {
                await window.aistudio.openSelectKey();
                // Optimistically assume the user selected a key. This helps avoid race
                // conditions where `hasSelectedApiKey` might not immediately return true.
                // A failed API call due to a bad key will guide them to re-select.
                setIsKeyReady(true);
            } catch (error) {
                console.error("Error opening API key selection:", error);
                setIsKeyReady(false);
            }
        } else {
            alert('API 키 선택을 지원하지 않는 환경입니다.');
        }
    }, []);

    useEffect(() => {
        checkApiKey();
    }, [checkApiKey]);

    return { isKeyReady, selectApiKey };
};
