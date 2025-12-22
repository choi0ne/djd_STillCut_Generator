// OpenAI GPT-5 / gpt-image-1.5 이미지 생성 Provider

import type { ImageGenerationRequest, ImageGenerationResponse } from './types';

const OPENAI_API_BASE = 'https://api.openai.com/v1';

const getOpenAIApiKey = (): string => {
    let apiKey: string | undefined;
    try {
        const item = window.localStorage.getItem('openai-api-key');
        if (item) {
            apiKey = JSON.parse(item);
        }
    } catch (error) {
        console.error("로컬 스토리지에서 OpenAI API 키를 파싱할 수 없습니다:", error);
    }

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
        throw new Error("OpenAI API 키가 설정되지 않았습니다. '설정' 메뉴에서 OpenAI API 키를 입력해주세요.");
    }

    return apiKey;
};

export async function generateWithOpenAI(
    request: ImageGenerationRequest,
    apiKey: string
): Promise<ImageGenerationResponse> {
    const model = request.options?.model || 'gpt-image-1.5';
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

/**
 * OpenAI GPT Image 1.5로 여러 이미지 생성 (순차 호출)
 */
export async function generateMultipleImagesWithOpenAI(
    prompt: string,
    count: number = 4
): Promise<string[]> {
    const apiKey = getOpenAIApiKey();
    const results: string[] = [];

    for (let i = 0; i < count; i++) {
        try {
            const response = await fetch(`${OPENAI_API_BASE}/images/generations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-image-1.5',
                    prompt: prompt,
                    size: '1024x1024',
                    quality: 'standard',
                    n: 1,
                    response_format: 'b64_json'
                })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.data?.[0]?.b64_json) {
                    results.push(`data:image/png;base64,${data.data[0].b64_json}`);
                }
            }
        } catch (e) {
            console.error(`Image generation ${i + 1} failed:`, e);
        }
    }

    if (results.length === 0) {
        throw new Error("OpenAI로 이미지 생성에 실패했습니다.");
    }

    return results;
}

/**
 * OpenAI GPT-5.2 Vision으로 이미지 분석하여 프롬프트 생성
 */
export async function analyzeImageWithGPT(
    imageBase64: string,
    analysisPrompt: string
): Promise<string> {
    const apiKey = getOpenAIApiKey();

    // base64에서 data URL prefix 제거
    const base64Data = imageBase64.includes(',')
        ? imageBase64.split(',')[1]
        : imageBase64;

    const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-5.2',
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:image/jpeg;base64,${base64Data}`
                            }
                        },
                        {
                            type: 'text',
                            text: analysisPrompt
                        }
                    ]
                }
            ],
            max_tokens: 4000
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `OpenAI API 오류: HTTP ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices?.[0]?.message?.content || '';

    if (!result.trim()) {
        throw new Error("GPT-5.2가 응답을 생성하지 못했습니다.");
    }

    return result.trim();
}

/**
 * OpenAI GPT-5.2로 텍스트 기반 프롬프트 생성
 */
export async function generateTextWithGPT(
    userPrompt: string
): Promise<string> {
    const apiKey = getOpenAIApiKey();

    const response = await fetch(`${OPENAI_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-5.2',
            messages: [
                {
                    role: 'user',
                    content: userPrompt
                }
            ],
            max_tokens: 4000,
            temperature: 0.7
        })
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `OpenAI API 오류: HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

