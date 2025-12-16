// Gemini 2.0 Flash 이미지 생성 Provider

import type { ImageGenerationRequest, ImageGenerationResponse } from './types';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export async function generateWithGemini(
    request: ImageGenerationRequest,
    apiKey: string
): Promise<ImageGenerationResponse> {
    const model = request.options?.model || 'gemini-2.0-flash-exp';

    try {
        const response = await fetch(
            `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: request.prompt }]
                    }],
                    generationConfig: {
                        responseModalities: ['image', 'text']
                    }
                })
            }
        );

        if (!response.ok) {
            const error = await response.json();
            return {
                success: false,
                error: error.error?.message || 'Gemini API 오류',
                provider: 'gemini',
                timestamp: Date.now()
            };
        }

        const data = await response.json();

        // 이미지 데이터 추출
        const imagePart = data.candidates?.[0]?.content?.parts?.find(
            (part: any) => part.inlineData?.mimeType?.startsWith('image/')
        );

        if (imagePart?.inlineData?.data) {
            return {
                success: true,
                imageBase64: imagePart.inlineData.data,
                provider: 'gemini',
                timestamp: Date.now()
            };
        }

        return {
            success: false,
            error: '이미지 생성 실패: 응답에 이미지가 없습니다',
            provider: 'gemini',
            timestamp: Date.now()
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : '알 수 없는 오류',
            provider: 'gemini',
            timestamp: Date.now()
        };
    }
}
