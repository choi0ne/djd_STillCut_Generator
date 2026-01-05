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
    const quality = request.options?.quality || 'high';

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
                n: 1
                // gpt-image-1.5는 response_format 미지원
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
            // URL에서 이미지를 가져와서 base64로 변환
            try {
                const imageResponse = await fetch(data.data[0].url);
                const blob = await imageResponse.blob();
                const base64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const result = reader.result as string;
                        // data:image/png;base64, 접두사 제거하여 순수 base64만 반환
                        resolve(result.split(',')[1] || result);
                    };
                    reader.readAsDataURL(blob);
                });
                return {
                    success: true,
                    imageBase64: base64,
                    provider: 'openai',
                    timestamp: Date.now()
                };
            } catch (fetchError) {
                return {
                    success: false,
                    error: 'URL에서 이미지 다운로드 실패',
                    provider: 'openai',
                    timestamp: Date.now()
                };
            }
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

// Rate limit 방지를 위한 딜레이 함수
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * OpenAI GPT Image 1.5로 여러 이미지 생성 (순차 호출)
 * Rate Limit: 분당 5개 → 이미지 간 15초 딜레이 적용
 */
export async function generateMultipleImagesWithOpenAI(
    prompt: string,
    count: number = 1
): Promise<string[]> {
    const apiKey = getOpenAIApiKey();
    const results: string[] = [];
    const DELAY_MS = 20000; // 20초 딜레이 (분당 5개 = 12초에 1개, 충분한 여유)

    // 🔴 필수 NEGATIVES 강제 추가
    const mandatoryNegatives = "IMPORTANT: Do NOT include any doctor, physician, 한의사, medical professional, or person in a white coat. NO medical staff characters.";
    const enhancedPrompt = `${prompt} ${mandatoryNegatives}`;

    for (let i = 0; i < count; i++) {
        // 첫 번째 이미지가 아닌 경우 딜레이 추가
        if (i > 0) {
            console.log(`[OpenAI] Rate limit 방지: ${DELAY_MS / 1000}초 대기 중... (${i + 1}/${count})`);
            await delay(DELAY_MS);
        }

        try {
            console.log(`[OpenAI] 이미지 생성 중... (${i + 1}/${count})`);
            const response = await fetch(`${OPENAI_API_BASE}/images/generations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-image-1.5',
                    prompt: enhancedPrompt,  // 🔴 NEGATIVES 포함된 프롬프트 사용
                    size: '1024x1024',
                    quality: 'high',
                    n: 1
                    // gpt-image-1.5는 response_format 파라미터 미지원, URL로만 반환됨
                })
            });

            if (response.ok) {
                const data = await response.json();
                // gpt-image-1.5는 URL만 반환함
                if (data.data?.[0]?.url) {
                    // URL에서 이미지를 가져와서 base64로 변환
                    try {
                        const imageResponse = await fetch(data.data[0].url);
                        const blob = await imageResponse.blob();
                        const base64 = await new Promise<string>((resolve) => {
                            const reader = new FileReader();
                            reader.onloadend = () => resolve(reader.result as string);
                            reader.readAsDataURL(blob);
                        });
                        results.push(base64);
                        console.log(`[OpenAI] 이미지 ${i + 1}/${count} 생성 완료`);
                    } catch (fetchError) {
                        console.error(`[OpenAI] 이미지 URL 다운로드 실패:`, fetchError);
                    }
                } else if (data.data?.[0]?.b64_json) {
                    results.push(`data:image/png;base64,${data.data[0].b64_json}`);
                    console.log(`[OpenAI] 이미지 ${i + 1}/${count} 생성 완료`);
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.error?.message || `HTTP ${response.status}`;
                console.error(`[OpenAI] 이미지 ${i + 1} 생성 실패:`, errorMessage, errorData);
                // 첫 번째 실패 시 바로 에러 throw하여 사용자에게 빠른 피드백
                if (i === 0) {
                    throw new Error(`OpenAI 이미지 생성 실패: ${errorMessage}`);
                }
            }
        } catch (e) {
            console.error(`Image generation ${i + 1} failed:`, e);
            if (i === 0) {
                throw e; // 첫 번째 실패 시 즉시 throw
            }
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
            max_completion_tokens: 4000
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
            max_completion_tokens: 4000,
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

