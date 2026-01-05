import { GoogleGenAI, Modality } from "@google/genai";
import { ImageFile } from '../types';
import type { ImageProvider } from './types';
import { generateMultipleImagesWithOpenAI, analyzeImageWithGPT, generateTextWithGPT } from './openaiProvider';

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
    count: number = 1,
    provider: ImageProvider = 'gemini'
): Promise<string[]> => {
    // 🔴 필수 NEGATIVES 강제 추가 - 이미지 API에 직접 전달
    const mandatoryNegatives = "IMPORTANT: Do NOT include any doctor, physician, 한의사, medical professional, or person in a white coat. NO medical staff characters.";

    // 이미지가 있으면 얼굴 유지 프롬프트, 없으면 순수 텍스트 프롬프트
    const fullPrompt = baseImage
        ? `Using the provided image as a base, keep the person's face and facial features exactly the same. Then, modify the image according to the following instruction: "${prompt}". ${mandatoryNegatives}`
        : `Create a high-quality, beautiful image based on the following instruction: "${prompt}". ${mandatoryNegatives}`;

    // OpenAI 분기 (GPT Image 1.5는 이미지 참조 불가, 텍스트만 사용)
    if (provider === 'openai') {
        console.log('[geminiService] OpenAI 분기 진입, 프롬프트:', fullPrompt.substring(0, 100) + '...');
        try {
            const result = await generateMultipleImagesWithOpenAI(fullPrompt, count);
            console.log('[geminiService] OpenAI 이미지 생성 완료, 결과 수:', result.length);
            return result;
        } catch (error) {
            console.error('[geminiService] OpenAI 에러:', error);
            throw error;
        }
    }

    // Gemini 분기
    try {
        const ai = getAiClient();
        const model = 'gemini-3-pro-image-preview';  // 이미지 생성 전용 모델

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
    inputText: string,
    provider: ImageProvider = 'gemini'
): Promise<string[]> => {
    // JSON인지 일반 텍스트 프롬프트인지 감지
    let isJson = false;
    try {
        JSON.parse(inputText.trim());
        isJson = true;
    } catch {
        isJson = false;
    }

    // 프롬프트 생성
    let fullPrompt: string;
    if (isJson) {
        fullPrompt = `Create the highest quality, most beautiful image possible based on the following JSON object for the image's specific content and attributes. Do not use any Korean characters.\n\n${inputText}`;
    } else {
        fullPrompt = `Create the highest quality, most beautiful image possible based on the following instruction. Do not use any Korean characters.\n\n${inputText}`;
    }

    // OpenAI 분기 (GPT Image 1.5는 이미지 참조 불가)
    if (provider === 'openai') {
        try {
            return await generateMultipleImagesWithOpenAI(fullPrompt, 1);
        } catch (error) {
            throw error;
        }
    }

    // Gemini 분기
    try {
        const ai = getAiClient();
        const model = 'gemini-3-pro-image-preview';  // 이미지 생성 전용 모델

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
    provider: ImageProvider = 'gemini'
): Promise<string> => {
    const analysisPrompt = `Analyze this image in detail and create a comprehensive image generation prompt in English. Include ALL of the following aspects:

1. **Subject**: Main subject, people, characters, objects
2. **Composition**: Framing, angle (close-up, wide shot, bird's eye view, etc.), rule of thirds, leading lines
3. **Style**: Art style, photography style, rendering style (photorealistic, anime, oil painting, watercolor, etc.)
4. **Color Palette**: Dominant colors, color harmony, warm/cool tones, saturation, contrast
5. **Lighting**: Light source, direction, quality (soft, hard, dramatic), shadows, highlights, golden hour, neon
6. **Background/Setting**: Environment, location, atmosphere, depth
7. **Mood/Atmosphere**: Emotional tone (peaceful, mysterious, energetic, romantic, dark, etc.)
8. **Details**: Textures, patterns, fine details, quality descriptors

Output format: A single paragraph of comma-separated keywords and phrases in English, organized from most important to least important. Make it detailed and specific for high-quality image generation.

Example: "majestic lion standing on rocky outcrop, golden hour lighting, warm orange and amber color palette, dramatic side lighting with deep shadows, African savanna background, photorealistic style, powerful and regal mood, detailed fur texture, shallow depth of field, cinematic composition, rule of thirds, 8k ultra detailed"

Generate only the prompt, no explanations.`;

    // OpenAI 분기 (GPT-5.2 Vision)
    if (provider === 'openai') {
        try {
            return await analyzeImageWithGPT(image.base64, analysisPrompt);
        } catch (error) {
            throw error;
        }
    }

    // Gemini 분기
    try {
        const ai = getAiClient();
        const model = 'gemini-3-pro-preview';

        const response = await ai.models.generateContent({
            model,
            contents: {
                parts: [
                    base64ToPart(image.base64, image.mimeType),
                    { text: analysisPrompt },
                ],
            },
        });

        const text = response.text;
        if (!text) {
            throw new Error("API가 텍스트 응답을 반환하지 않았습니다.");
        }

        return text.trim();

    } catch (error) {
        throw handleApiError(error);
    }
};

export const generateJsonFromImage = async (
    image: ImageFile,
    provider: ImageProvider = 'gemini'
): Promise<string> => {
    const analysisPrompt = `Analyze this image and create a structured JSON object for image generation. The JSON should include:
- "subject": main subject/person in the image
- "style": artistic style, photography style, or rendering style
- "setting": background, location, environment
- "colors": dominant color palette
- "mood": overall mood or atmosphere
- "composition": framing, angle, perspective
- "details": other notable details

Provide ONLY the JSON object, no markdown formatting, no explanations. Use English for all values.`;

    // OpenAI 분기 (GPT-5.2 Vision)
    if (provider === 'openai') {
        try {
            let result = await analyzeImageWithGPT(image.base64, analysisPrompt);
            // Remove markdown code blocks if present
            result = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            // Validate JSON
            try {
                JSON.parse(result);
            } catch (e) {
                throw new Error("생성된 JSON이 유효하지 않습니다.");
            }
            return result;
        } catch (error) {
            throw error;
        }
    }

    // Gemini 분기
    try {
        const ai = getAiClient();
        const model = 'gemini-3-pro-preview';

        const response = await ai.models.generateContent({
            model,
            contents: {
                parts: [
                    base64ToPart(image.base64, image.mimeType),
                    { text: analysisPrompt },
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

/**
 * 텍스트 입력을 받아 이미지 생성용 프롬프트를 생성합니다.
 * @param textInput 사용자가 입력한 텍스트 설명
 * @param outputMode 'text' 또는 'json' 형식
 * @param provider 'gemini' 또는 'openai'
 */
export const generatePromptFromTextInput = async (
    textInput: string,
    outputMode: 'text' | 'json' = 'text',
    provider: ImageProvider = 'gemini'
): Promise<string> => {
    let prompt: string;

    if (outputMode === 'json') {
        prompt = `사용자가 원하는 이미지에 대한 설명을 보고, 이미지 생성 API에 사용할 수 있는 JSON 코드를 생성하세요.

사용자 입력: "${textInput}"

다음 형식으로 출력하세요:
{
  "subject": "주요 피사체 (영어로 작성)",
  "style": "스타일 (예: photorealistic, cartoon, watercolor, oil painting, anime, cyberpunk 등)",
  "setting": "배경/장소 (영어로 작성)",
  "lighting": "조명 (예: natural light, dramatic, soft, golden hour, neon 등)",
  "mood": "분위기 (예: peaceful, energetic, mysterious, romantic, dark 등)"
}

중요 지침:
1. 사용자의 한국어 입력을 영어 프롬프트로 번역하세요.
2. 각 필드는 구체적이고 상세하게 작성하세요.
3. 반드시 유효한 JSON 형식으로만 출력하고, 다른 설명은 하지 마세요.`;
    } else {
        prompt = `사용자가 원하는 이미지에 대한 설명을 보고, 이미지 생성 AI에 사용할 수 있는 매우 상세한 영어 프롬프트를 생성하세요.

사용자 입력: "${textInput}"

다음 요소들을 반드시 포함하세요:
1. Subject (주요 피사체): 메인 주제, 인물, 캐릭터, 오브젝트 상세 묘사
2. Composition (구도): 프레이밍, 앵글, 시점 (클로즈업, 와이드샷, 버드아이뷰 등)
3. Style (스타일): 아트 스타일, 사진 스타일, 렌더링 스타일
4. Color Palette (색감): 주요 색상, 색조 조화, 따뜻함/차가움, 채도, 대비
5. Lighting (조명): 광원, 방향, 품질 (소프트, 하드, 드라마틱), 그림자
6. Setting (배경): 환경, 장소, 깊이감
7. Mood (분위기): 감정적 톤, 전체적인 느낌
8. Details (디테일): 텍스처, 패턴, 품질 묘사 (8k, ultra detailed 등)

출력 형식: 콤마로 구분된 영어 키워드와 구문으로 구성된 단일 문단. 중요도 순으로 정리하세요.

예시: "lone wolf standing beneath starry night sky, majestic and solitary, photorealistic style, deep blue and silver color palette with purple nebula accents, moonlit backlighting with soft ambient glow, vast wilderness forest setting, mysterious and melancholic atmosphere, detailed fur texture, shallow depth of field, cinematic wide shot composition, 8k ultra detailed, dramatic contrast"

프롬프트만 출력하고 다른 설명은 하지 마세요.`;
    }

    // OpenAI 분기 (GPT-5.2)
    if (provider === 'openai') {
        try {
            let result = await generateTextWithGPT(prompt);
            if (outputMode === 'json') {
                const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
                if (jsonMatch) {
                    result = jsonMatch[1].trim();
                }
                try {
                    JSON.parse(result);
                } catch (e) {
                    throw new Error("생성된 JSON이 유효하지 않습니다.");
                }
            }
            if (!result.trim()) {
                throw new Error("프롬프트 생성에 실패했습니다.");
            }
            return result.trim();
        } catch (error) {
            throw error;
        }
    }

    // Gemini 분기
    try {
        const ai = getAiClient();
        const model = 'gemini-3-pro-preview';

        const response = await ai.models.generateContent({
            model,
            contents: {
                parts: [{ text: prompt }],
            },
        });

        let result = response.text || '';

        if (outputMode === 'json') {
            // 마크다운 코드블록 제거
            const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                result = jsonMatch[1].trim();
            }

            // JSON 유효성 검증
            try {
                JSON.parse(result);
            } catch (e) {
                throw new Error("생성된 JSON이 유효하지 않습니다.");
            }
        }

        if (!result.trim()) {
            throw new Error("프롬프트 생성에 실패했습니다.");
        }

        return result.trim();

    } catch (error) {
        throw handleApiError(error);
    }
};

/**
 * 이미지와 텍스트를 함께 분석하여 프롬프트를 생성합니다.
 * @param image 분석할 이미지
 * @param textInput 사용자가 입력한 추가 설명/키워드
 * @param outputMode 'text' 또는 'json' 형식
 * @param provider 'gemini' 또는 'openai'
 */
export const generateCombinedPrompt = async (
    image: ImageFile,
    textInput: string,
    outputMode: 'text' | 'json' = 'text',
    provider: ImageProvider = 'gemini'
): Promise<string> => {
    let analysisPrompt: string;

    if (outputMode === 'json') {
        analysisPrompt = `이미지를 분석하고 사용자의 추가 설명을 함께 고려하여 이미지 생성용 JSON을 만드세요.

사용자 추가 설명: "${textInput}"

다음 형식으로 출력하세요:
{
  "subject": "주요 피사체 (영어로 작성, 이미지+사용자 입력 종합)",
  "style": "스타일 (photorealistic, cartoon, watercolor, oil painting, anime, cyberpunk 등)",
  "setting": "배경/장소 (영어로 작성)",
  "composition": "구도 (프레이밍, 앵글, 시점 등)",
  "colors": "색감 (주요 색상, 색조, 따뜻함/차가움)",
  "lighting": "조명 (광원, 방향, 품질, 그림자)",
  "mood": "분위기 (감정적 톤)",
  "details": "디테일 (텍스처, 품질 묘사)"
}

중요 지침:
1. 이미지에서 분석한 내용과 사용자 입력을 결합하세요.
2. 사용자 입력에서 강조한 부분을 우선시하세요.
3. 반드시 유효한 JSON 형식으로만 출력하세요.`;
    } else {
        analysisPrompt = `이미지를 분석하고 사용자의 추가 설명을 함께 고려하여 매우 상세한 이미지 생성 프롬프트를 만드세요.

사용자 추가 설명: "${textInput}"

다음 요소들을 반드시 포함하세요:
1. Subject (주요 피사체): 이미지와 사용자 입력을 종합하여 상세 묘사
2. Composition (구도): 프레이밍, 앵글, 시점
3. Style (스타일): 아트 스타일, 사진 스타일, 렌더링 스타일
4. Color Palette (색감): 주요 색상, 색조 조화, 따뜻함/차가움, 채도
5. Lighting (조명): 광원, 방향, 품질, 그림자
6. Setting (배경): 환경, 장소, 깊이감
7. Mood (분위기): 감정적 톤, 전체적인 느낌
8. Details (디테일): 텍스처, 패턴, 품질 묘사

중요 지침:
- 이미지에서 분석한 내용과 사용자 입력을 자연스럽게 결합하세요.
- 사용자가 강조한 부분을 우선시하세요.
- 콤마로 구분된 영어 키워드로 출력하세요.
- 프롬프트만 출력하고 다른 설명은 하지 마세요.`;
    }

    // OpenAI 분기 (GPT-5.2 Vision)
    if (provider === 'openai') {
        try {
            let result = await analyzeImageWithGPT(image.base64, analysisPrompt);
            if (outputMode === 'json') {
                const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
                if (jsonMatch) {
                    result = jsonMatch[1].trim();
                }
                try {
                    JSON.parse(result);
                } catch (e) {
                    throw new Error("생성된 JSON이 유효하지 않습니다.");
                }
            }
            if (!result.trim()) {
                throw new Error("프롬프트 생성에 실패했습니다.");
            }
            return result.trim();
        } catch (error) {
            throw error;
        }
    }

    // Gemini 분기
    try {
        const ai = getAiClient();
        const model = 'gemini-3-pro-preview';

        const response = await ai.models.generateContent({
            model,
            contents: {
                parts: [
                    base64ToPart(image.base64, image.mimeType),
                    { text: analysisPrompt },
                ],
            },
        });

        let result = response.text || '';

        if (outputMode === 'json') {
            const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                result = jsonMatch[1].trim();
            }

            try {
                JSON.parse(result);
            } catch (e) {
                throw new Error("생성된 JSON이 유효하지 않습니다.");
            }
        }

        if (!result.trim()) {
            throw new Error("프롬프트 생성에 실패했습니다.");
        }

        return result.trim();

    } catch (error) {
        throw handleApiError(error);
    }
};

/**
 * ✨ 섹션 일러스트용 프롬프트 생성 (환자 캐릭터 = 독자 대리인)
 * 한의사는 텍스트에서 1인칭으로 서술, 이미지에서는 환자 캐릭터가 독자를 대변
 * 
 * @param sectionTitle 섹션 제목
 * @param sectionContent 섹션 내용 (요약)
 * @param patientCharacterPrompt 프로필 기반 환자 캐릭터 프롬프트
 * @param sectionType 섹션 유형 (answer-first, warning, symptoms, action, proof, closing)
 * @param provider 'gemini' 또는 'openai'
 */
export interface SectionIllustrationResult {
    includePatient: boolean;
    patientEmotion: string;
    patientPose: string;
    contentVisualization: string;
    recommendedStyle: string;
    prompt: string;
}

export const generateSectionIllustrationPrompt = async (
    sectionTitle: string,
    sectionContent: string,
    patientCharacterPrompt: string,
    sectionType: string = 'general',
    provider: ImageProvider = 'gemini'
): Promise<SectionIllustrationResult> => {

    const systemPrompt = `You are an expert at creating illustration prompts for medical blog sections.

## Core Structure
- Blog text = Doctor narrates in first person (text only)
- Section image = Content visualization + Patient character (reader surrogate)
- ⚠️ NEVER include doctor/medical professional characters (authority is in the text)

## Patient Character Role
- NOT explaining ❌ → REACTING ✅
- Visually represents the reader's emotions when reading this section
- Appears alongside content, experiencing/understanding the situation

## Section Info
- Section Title: ${sectionTitle}
- Section Content: ${sectionContent}
- Section Type: ${sectionType}

## Patient Character Base Prompt (use this for character appearance):
${patientCharacterPrompt}

## Section-specific Patient Emotion/Pose Guide
| Section Type | Content Visualization | Patient Character Role |
|-------------|----------------------|----------------------|
| answer-first | Key point icons | Nodding, understanding expression |
| warning | Warning icons/list | Concerned, worried expression |
| symptoms | Anatomy/symptom diagram | Expressing discomfort, holding affected area |
| action | Step guide | Performing the exercise/action |
| proof | Infographic | ❌ NO CHARACTER (data is the focus) |
| closing | Encouraging message | Bright smile, hopeful expression |

## Output Format (JSON only, no markdown)
{
    "includePatient": true,
    "patientEmotion": "understanding, nodding",
    "patientPose": "slight head tilt, attentive posture",
    "contentVisualization": "3 key points displayed as icons with short Korean labels",
    "recommendedStyle": "content-with-patient",
    "prompt": "Full English prompt for image generation including patient character and content visualization"
}

Important:
1. If sectionType is "proof", set includePatient to false
2. Combine the patient character prompt with appropriate emotion/pose
3. Include content visualization in the same image (split layout: content left, character right)
4. Use warm cream background (#F5F0E8), minimalist cartoon style
5. Add "No doctor or medical professional" to the prompt
6. Output ONLY valid JSON, no explanations`;

    // OpenAI 분기
    if (provider === 'openai') {
        try {
            let result = await generateTextWithGPT(systemPrompt);
            result = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

            try {
                return JSON.parse(result) as SectionIllustrationResult;
            } catch (e) {
                // JSON 파싱 실패 시 기본값 반환
                return {
                    includePatient: sectionType !== 'proof',
                    patientEmotion: 'neutral',
                    patientPose: 'standing',
                    contentVisualization: sectionTitle,
                    recommendedStyle: 'content-with-patient',
                    prompt: `Medical blog illustration. ${sectionTitle}. ${patientCharacterPrompt} Warm cream background (#F5F0E8). Minimalist cartoon style. No doctor or medical professional.`
                };
            }
        } catch (error) {
            throw error;
        }
    }

    // Gemini 분기
    try {
        const ai = getAiClient();
        const model = 'gemini-3-pro-preview';

        const response = await ai.models.generateContent({
            model,
            contents: {
                parts: [{ text: systemPrompt }],
            },
        });

        let result = response.text || '';
        result = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

        try {
            return JSON.parse(result) as SectionIllustrationResult;
        } catch (e) {
            // JSON 파싱 실패 시 기본값 반환
            return {
                includePatient: sectionType !== 'proof',
                patientEmotion: 'neutral',
                patientPose: 'standing',
                contentVisualization: sectionTitle,
                recommendedStyle: 'content-with-patient',
                prompt: `Medical blog illustration. ${sectionTitle}. ${patientCharacterPrompt} Warm cream background (#F5F0E8). Minimalist cartoon style. No doctor or medical professional.`
            };
        }

    } catch (error) {
        throw handleApiError(error);
    }
};
