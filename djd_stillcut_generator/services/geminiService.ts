import { GoogleGenAI, Modality } from "@google/genai";
import { ImageFile } from '../types';

// Rate limit 방지를 위한 딜레이 함수
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const GEMINI_DELAY_MS = 15000; // Gemini: 15초 딜레이

const getAiClient = () => {
    let apiKey: string | undefined;
    try {
        // useLocalStorage hook stores the string with quotes, so JSON.parse is needed.
        const item = window.localStorage.getItem('gemini-api-key');
        if (item) {
            apiKey = JSON.parse(item);
        }
    } catch (error) {
        console.error("로컬 스토리지에서 API 키를 파싱할 수 없습니다:", error);
    }

    // Fallback to environment variable if not in local storage
    if (!apiKey) {
        apiKey = process.env.API_KEY;
    }

    if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
        throw new Error("API 키가 설정되지 않았습니다. '설정' 메뉴에서 Gemini API 키를 입력해주세요.");
    }

    return new GoogleGenAI({ apiKey });
}

// Utility to convert base64 string to the format expected by the API
const base64ToPart = (base64: string, mimeType: string) => {
    return {
        inlineData: {
            data: base64.split(',')[1], // remove the "data:mime/type;base64," part
            mimeType,
        },
    };
};

const handleApiError = (error: unknown) => {
    console.error("Gemini API Error:", error);
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes("quota")) {
            return new Error("API 사용량 할당량을 초과했습니다. 다른 API 키를 선택하거나 나중에 다시 시도해주세요.");
        }
        if (message.includes("api key") || message.includes("requested entity was not found")) {
            return new Error("API 키가 잘못되었거나 유효하지 않습니다. '설정' 메뉴에서 키를 확인하고 다시 입력해주세요.");
        }
        if (message.includes("blocked") || message.includes("safety")) {
            return new Error("안전 설정으로 인해 콘텐츠가 차단되었습니다. 프롬프트를 수정하여 다시 시도해주세요.");
        }
        // Fallback for other known API errors
        return new Error("이미지 생성에 실패했습니다. 자세한 내용은 콘솔을 확인해주세요.");
    }
    // Fallback for non-Error objects and other exceptions
    return new Error("알 수 없는 오류로 이미지 생성에 실패했습니다. 자세한 내용은 콘솔을 확인해주세요.");
}

export const generateImageWithPrompt = async (
    baseImage: ImageFile | null,
    prompt: string,
    count: number = 1
): Promise<string[]> => {
    try {
        const ai = getAiClient();
        const model = 'gemini-3-pro-image-preview';  // 이미지 생성 전용 모델

        // 이미지가 있으면 얼굴 유지 프롬프트, 없으면 순수 텍스트 프롬프트
        const fullPrompt = baseImage
            ? `Using the provided image as a base, keep the person's face and facial features exactly the same. Then, modify the image according to the following instruction: "${prompt}".`
            : `Create a high-quality, beautiful image based on the following instruction: "${prompt}".`;

        const generateSingleImage = async () => {
            const parts: ({ inlineData: { data: string; mimeType: string; } } | { text: string })[] = [];

            if (baseImage) {
                parts.push(base64ToPart(baseImage.base64, baseImage.mimeType));
            }
            parts.push({ text: fullPrompt });

            const response = await ai.models.generateContent({
                model,
                contents: {
                    parts,
                },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });

            if (!response.candidates || response.candidates.length === 0) {
                return null;
            }

            const firstPart = response.candidates[0].content?.parts?.[0];
            if (firstPart && 'inlineData' in firstPart && firstPart.inlineData) {
                return `data:${firstPart.inlineData.mimeType};base64,${firstPart.inlineData.data}`;
            }
            return null;
        }

        // 순차 호출로 rate limit 방지 (병렬 호출 대신)
        const validImages: string[] = [];
        for (let i = 0; i < count; i++) {
            // 첫 번째가 아닌 경우 딜레이 추가
            if (i > 0) {
                console.log(`[Gemini] Rate limit 방지: ${GEMINI_DELAY_MS / 1000}초 대기 중... (${i + 1}/${count})`);
                await delay(GEMINI_DELAY_MS);
            }
            console.log(`[Gemini] 이미지 생성 중... (${i + 1}/${count})`);
            const result = await generateSingleImage();
            if (result) {
                validImages.push(result);
                console.log(`[Gemini] 이미지 ${i + 1}/${count} 생성 완료`);
            }
        }

        if (validImages.length === 0) {
            throw new Error("이미지가 생성되지 않았습니다. 응답이 차단되었을 수 있습니다.");
        }

        return validImages;
    } catch (error) {
        throw handleApiError(error);
    }
};


export const generateImageWithCode = async (
    refImage: ImageFile | null,
    inputText: string
): Promise<string[]> => {
    try {
        const ai = getAiClient();
        const model = 'gemini-3-pro-image-preview';  // 이미지 생성 전용 모델

        // JSON인지 일반 텍스트 프롬프트인지 감지
        let isJson = false;
        try {
            JSON.parse(inputText.trim());
            isJson = true;
        } catch {
            isJson = false;
        }

        const parts: ({ inlineData: { data: string; mimeType: string; } } | { text: string })[] = [];
        let prompt: string;

        if (refImage) {
            parts.push(base64ToPart(refImage.base64, refImage.mimeType));
            if (isJson) {
                prompt = "Create the highest quality, most beautiful image possible. Do not use any Korean characters. Use the provided reference image for artistic style, composition, and context. Adhere to the following JSON object for the new image's specific content and attributes:";
            } else {
                prompt = "Create the highest quality, most beautiful image possible. Do not use any Korean characters. Use the provided reference image for artistic style, composition, and context. Follow this instruction:";
            }
        } else {
            if (isJson) {
                prompt = "Create the highest quality, most beautiful image possible based on the following JSON object for the image's specific content and attributes. Do not use any Korean characters.";
            } else {
                prompt = "Create the highest quality, most beautiful image possible based on the following instruction. Do not use any Korean characters.";
            }
        }
        parts.push({ text: `${prompt}\n\n${inputText}` });

        const generateSingleImage = async () => {
            const response = await ai.models.generateContent({
                model,
                contents: {
                    parts: parts,
                },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });

            if (!response.candidates || response.candidates.length === 0) {
                return null;
            }

            const firstPart = response.candidates[0].content?.parts?.[0];
            if (firstPart && 'inlineData' in firstPart && firstPart.inlineData) {
                return `data:${firstPart.inlineData.mimeType};base64,${firstPart.inlineData.data}`;
            }
            return null;
        };

        // 순차 호출로 rate limit 방지 (병렬 호출 대신)
        const validImages: string[] = [];
        const imageCount = 1;
        for (let i = 0; i < imageCount; i++) {
            // 첫 번째가 아닌 경우 딜레이 추가
            if (i > 0) {
                console.log(`[Gemini] Rate limit 방지: ${GEMINI_DELAY_MS / 1000}초 대기 중... (${i + 1}/${imageCount})`);
                await delay(GEMINI_DELAY_MS);
            }
            console.log(`[Gemini] 이미지 생성 중... (${i + 1}/${imageCount})`);
            const result = await generateSingleImage();
            if (result) {
                validImages.push(result);
                console.log(`[Gemini] 이미지 ${i + 1}/${imageCount} 생성 완료`);
            }
        }

        if (validImages.length === 0) {
            throw new Error("후보에서 이미지를 생성하지 못했습니다. 응답이 차단되었을 수 있습니다.");
        }

        return validImages;
    } catch (error) {
        throw handleApiError(error);
    }
};

export const generatePromptFromImage = async (
    image: ImageFile,
): Promise<string> => {
    try {
        const ai = getAiClient();
        const model = 'gemini-3-pro-preview';

        const prompt = "Describe this image for an image generation prompt. Focus on the subject, style, setting, and composition. Provide a detailed, comma-separated list of keywords in English.";

        const response = await ai.models.generateContent({
            model,
            contents: {
                parts: [
                    base64ToPart(image.base64, image.mimeType),
                    { text: prompt },
                ],
            },
        });

        const text = response.text;
        if (!text) {
            throw new Error("API가 텍스트 응답을 반환하지 않았습니다.");
        }

        return text;

    } catch (error) {
        throw handleApiError(error);
    }
};

export const generateJsonFromImage = async (
    image: ImageFile,
): Promise<string> => {
    try {
        const ai = getAiClient();
        const model = 'gemini-3-pro-preview';

        const prompt = `Analyze this image and create a structured JSON object for image generation. The JSON should include:
- "subject": main subject/person in the image
- "style": artistic style, photography style, or rendering style
- "setting": background, location, environment
- "colors": dominant color palette
- "mood": overall mood or atmosphere
- "composition": framing, angle, perspective
- "details": other notable details

Provide ONLY the JSON object, no markdown formatting, no explanations. Use English for all values.`;

        const response = await ai.models.generateContent({
            model,
            contents: {
                parts: [
                    base64ToPart(image.base64, image.mimeType),
                    { text: prompt },
                ],
            },
        });

        let text = response.text;
        if (!text) {
            throw new Error("API가 텍스트 응답을 반환하지 않았습니다.");
        }

        // Remove markdown code blocks if present
        text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        // Validate JSON
        try {
            JSON.parse(text);
        } catch (e) {
            throw new Error("생성된 JSON이 유효하지 않습니다.");
        }

        return text;

    } catch (error) {
        throw handleApiError(error);
    }
};