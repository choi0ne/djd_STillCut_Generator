// OpenAI GPT-4o / gpt-image-1 이미지 생성 Provider

import type { ImageGenerationRequest, ImageGenerationResponse } from './types';

const OPENAI_API_BASE = 'https://api.openai.com/v1';

export async function generateWithOpenAI(
    request: ImageGenerationRequest,
    apiKey: string
): Promise<ImageGenerationResponse> {
    const model = request.options?.model || 'gpt-image-1';
    const size = request.options?.size || '1024x1024';
    const quality = request.options?.quality || 'standard';

    try {
        const response = await fetch(`${OPENAI_API_BASE}/images/generations`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model,
                prompt: request.prompt,
                size,
                quality,
                n: 1,
                response_format: 'b64_json'
            })
        });

        if (!response.ok) {
            const error = await response.json();
            return {
                success: false,
                error: error.error?.message || 'OpenAI API 오류',
                provider: 'openai',
                timestamp: Date.now()
            };
        }

        const data = await response.json();

        if (data.data?.[0]?.b64_json) {
            return {
                success: true,
                imageBase64: data.data[0].b64_json,
                provider: 'openai',
                timestamp: Date.now()
            };
        }

        if (data.data?.[0]?.url) {
            return {
                success: true,
                imageUrl: data.data[0].url,
                provider: 'openai',
                timestamp: Date.now()
            };
        }

        return {
            success: false,
            error: '이미지 생성 실패: 응답에 이미지가 없습니다',
            provider: 'openai',
            timestamp: Date.now()
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : '알 수 없는 오류',
            provider: 'openai',
            timestamp: Date.now()
        };
    }
}
