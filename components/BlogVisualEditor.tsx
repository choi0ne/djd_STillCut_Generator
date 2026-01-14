import React, { useState, useCallback, useEffect } from 'react';
import Panel from './common/Panel';
import { STYLE_LIBRARY, COLOR_PALETTES, StyleTemplate } from '../data/styleLibrary';
import { STYLE_PROMPT_BLOCKS, SECTION_TITLE_KOREAN } from '../data/sectionPromptTemplate';
import { SparklesIcon } from './Icons';
import useLocalStorage from '../hooks/useLocalStorage';
import { useImageGenerator } from '../hooks/useImageGenerator';
import { generateImageWithPrompt } from '../services/geminiService';
import { generateWithOpenAI } from '../services/openaiProvider';
import GenerationResultPanel from './GenerationResultPanel';
import { ImageFile } from '../types';
import { BlogProfile, DEFAULT_PROFILES, PATIENT_PRESETS, PATIENT_EMOTION_GUIDE } from '../data/blogProfilePresets';

interface BlogVisualEditorProps {
    isApiKeyReady: boolean;
    openSettings: () => void;
    geminiApiKey: string;
    openaiApiKey: string;
    selectedProvider: 'gemini' | 'openai';
    setSelectedProvider: (provider: 'gemini' | 'openai') => void;
    initialContext?: {
        topic: string;
        finalDraft?: string;  // 원고 전문 (이미지 프롬프트 생성 시 참조)
        concepts: Array<{
            title: string;
            keywords: string[];
            description?: string;
            recommendedStyle?: string;
            recommendedPalette?: 'medical' | 'calm' | 'warm';
            negatives?: string[];  // 🔴 Stage 7에서 전달된 NEGATIVES
            patientCharacterPrompt?: string;  // 🔴 프로필 기반 환자 캐릭터
        }>;
    } | null;
}

const BlogVisualEditor: React.FC<BlogVisualEditorProps> = ({
    isApiKeyReady,
    openSettings,
    geminiApiKey,
    openaiApiKey,
    selectedProvider,
    setSelectedProvider,
    initialContext
}) => {
    const [selectedStyle, setSelectedStyle] = useState<StyleTemplate | null>(null);
    const [topic, setTopic] = useState('');
    const [content, setContent] = useState('');
    const [selectedPalette, setSelectedPalette] = useState<'medical' | 'calm' | 'warm'>('medical');
    const [generatedPrompt, setGeneratedPrompt] = useState('');

    // 직접 프롬프트 입력 모드
    const [directPrompt, setDirectPrompt] = useState('');
    const [baseDirectPrompt, setBaseDirectPrompt] = useState(''); // 사용자가 입력한 원본 프롬프트
    const [useDirectPrompt, setUseDirectPrompt] = useState(true); // 🔴 기본값: 직접 프롬프트 입력 ON

    const [selectedConceptIndex, setSelectedConceptIndex] = useState<number | null>(null);
    const [isEditingPrompt, setIsEditingPrompt] = useState(false);
    const [copiedPrompt, setCopiedPrompt] = useState(false);
    const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false); // 프롬프트 자동 생성 로딩 상태

    // ✨ 프로필 연동 (BlogWriterEditor와 동일한 localStorage 키 사용)
    const [profiles] = useLocalStorage<BlogProfile[]>('blog-profiles', DEFAULT_PROFILES);
    const [selectedProfileId] = useLocalStorage<string>('selected-profile-id', 'default-tkm');
    const selectedProfile = profiles.find(p => p.id === selectedProfileId) || profiles[0];



    // Rate limit 방지용 딜레이
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const OPENAI_DELAY_MS = 20000; // OpenAI: 20초 딜레이 (분당 5개 제한, 충분한 여유)

    // 이미지 생성 훅
    const {
        isLoading: isImageLoading,
        error: imageError,
        generatedImages,
        selectedImage,
        setSelectedImage,
        generate: generateImage,
        regenerate,
        canRegenerate,
    } = useImageGenerator<ImageFile | null | string>({
        generationFn: async (baseImage: ImageFile | null, prompt: string) => {
            if (selectedProvider === 'gemini') {
                // Gemini 이미지 생성
                return await generateImageWithPrompt(baseImage, prompt, 1);
            } else {
                // OpenAI GPT Image 1.5 이미지 생성
                // 순차 호출로 rate limit 방지 (분당 5개 제한)
                const results: string[] = [];
                const imageCount = 1;
                for (let i = 0; i < imageCount; i++) {
                    // 첫 번째가 아닌 경우 딜레이 추가
                    if (i > 0) {
                        console.log(`[BlogVisualEditor] Rate limit 방지: ${OPENAI_DELAY_MS / 1000}초 대기 중... (${i + 1}/${imageCount})`);
                        await delay(OPENAI_DELAY_MS);
                    }
                    console.log(`[BlogVisualEditor] OpenAI 이미지 생성 중... (${i + 1}/${imageCount})`);
                    const result = await generateWithOpenAI(
                        {
                            provider: 'openai',
                            prompt,
                            options: {
                                model: 'gpt-image-1.5',
                                size: '1536x1024',
                                quality: 'high'
                            }
                        },
                        openaiApiKey
                    );
                    if (result.success && result.imageBase64) {
                        results.push(`data:image/png;base64,${result.imageBase64}`);
                        console.log(`[BlogVisualEditor] OpenAI 이미지 ${i + 1}/${imageCount} 생성 완료`);
                    }
                }
                return results;
            }
        }
    });

    // 🔴 자동 컨셉 선택 트리거 플래그
    const [autoSelectPending, setAutoSelectPending] = useState(false);

    // 블로그글 작성에서 전달받은 컨텍스트 초기화
    React.useEffect(() => {
        if (initialContext) {
            setTopic(initialContext.topic);
            if (initialContext.concepts.length > 0) {
                // 초기 상태만 설정 (프롬프트 생성은 별도 useEffect에서 처리)
                setContent(initialContext.concepts[0].keywords.join(', '));
                setSelectedConceptIndex(0);
                setAutoSelectPending(true);  // 🔴 자동 선택 트리거 플래그 활성화
            }
        }
    }, [initialContext]);

    // 🔴 자동 컨셉 선택 시 프롬프트 생성 트리거
    React.useEffect(() => {
        if (autoSelectPending && initialContext && initialContext.concepts.length > 0) {
            // 자동 선택 플래그 해제 후 첫 번째 컨셉 선택 핸들러 호출
            setAutoSelectPending(false);
            // 약간의 딜레이 후 handleConceptSelect 호출 (상태 업데이트 완료 대기)
            const timer = setTimeout(() => {
                handleConceptSelect(0);
            }, 100);
            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [autoSelectPending, initialContext]);

    // 컨셉 선택 변경 시 키워드 및 AI 추천 스타일/팔레트 적용 + 자동 프롬프트 생성
    const handleConceptSelect = async (index: number) => {
        setSelectedConceptIndex(index);
        if (initialContext && initialContext.concepts[index]) {
            const concept = initialContext.concepts[index];

            // 🔴 핵심 변경: 키워드가 아닌 원고 요약(description)을 주 입력으로 사용
            // description = manuscriptSummary (원고 기반 서술형 요약)
            setTopic(initialContext.topic);
            // 원고 요약이 있으면 주 입력으로 사용, 없으면 키워드로 fallback
            const manuscriptContent = concept.description || concept.keywords.join(', ');
            setContent(manuscriptContent);

            // AI 추천 스타일 자동 적용 (사용자가 나중에 변경 가능)
            let selectedStyleForPrompt: StyleTemplate | null = null;
            if (concept.recommendedStyle) {
                const style = STYLE_LIBRARY.find(s => s.id === concept.recommendedStyle);
                if (style) {
                    setSelectedStyle(style);
                    selectedStyleForPrompt = style;
                }
            }

            // AI 추천 색상 팔레트 자동 적용 (사용자가 나중에 변경 가능)
            const selectedPaletteForPrompt = concept.recommendedPalette || 'medical';
            if (concept.recommendedPalette) {
                setSelectedPalette(concept.recommendedPalette);
            }

            // ✨ 섹션 타입 감지 및 PATIENT_EMOTION_GUIDE 적용
            const detectSectionType = (title: string): string => {
                const lowerTitle = title.toLowerCase();
                if (lowerTitle.includes('answer') || lowerTitle.includes('핵심') || lowerTitle.includes('결론')) return 'answer-first';
                if (lowerTitle.includes('warning') || lowerTitle.includes('주의') || lowerTitle.includes('위험')) return 'warning';
                if (lowerTitle.includes('action') || lowerTitle.includes('실천') || lowerTitle.includes('방법')) return 'action';
                if (lowerTitle.includes('symptom') || lowerTitle.includes('증상')) return 'symptoms';
                if (lowerTitle.includes('proof') || lowerTitle.includes('근거') || lowerTitle.includes('연구')) return 'proof';
                if (lowerTitle.includes('closing') || lowerTitle.includes('마무리') || lowerTitle.includes('요약')) return 'closing';
                return 'general';
            };

            const sectionType = detectSectionType(concept.title);
            const emotionGuide = PATIENT_EMOTION_GUIDE[sectionType] || { emotion: 'neutral', pose: 'natural standing' };

            // 🔴 캐릭터가 필요한 스타일 목록
            const CHARACTER_STYLES = [
                'empathetic-character',
                'empathetic-cutoon',
                'section-illustration',
                'flat-illustration'
            ];
            // 🔴 스타일 기반 캐릭터 포함 여부 결정
            const includePatient = CHARACTER_STYLES.includes(selectedStyleForPrompt?.id || '');

            // 자동으로 프롬프트 생성
            if (selectedStyleForPrompt && initialContext.topic) {
                setIsGeneratingPrompt(true);
                setGeneratedPrompt('🔄 프롬프트 자동 생성 중...');

                try {
                    const apiKey = selectedProvider === 'gemini' ? geminiApiKey : openaiApiKey;
                    if (!apiKey) {
                        setGeneratedPrompt('⚠️ API 키가 설정되지 않았습니다. 설정에서 API 키를 입력해주세요.');
                        setIsGeneratingPrompt(false);
                        return;
                    }

                    const palette = COLOR_PALETTES[selectedPaletteForPrompt];

                    // 🔴 STYLE_PROMPT_BLOCKS에서 한글 블록화 프롬프트 가져오기
                    const styleBlock = STYLE_PROMPT_BLOCKS[selectedStyleForPrompt.id] || '';
                    const sectionTitleKorean = SECTION_TITLE_KOREAN[concept.title] || concept.title;

                    // 🔴 Stage 7에서 전달된 negatives 우선 사용, 없으면 스타일 라이브러리에서 가져옴
                    const conceptNegatives = concept.negatives || [];
                    const styleNegatives = selectedStyleForPrompt.goldStandardExample.NEGATIVES || [];
                    const allNegatives = [...new Set([...conceptNegatives, ...styleNegatives])].join(', ');

                    // 🔴 Stage 7에서 전달된 patientCharacterPrompt 우선 사용
                    const patientPrompt = concept.patientCharacterPrompt || selectedProfile.patientCharacterPrompt || PATIENT_PRESETS['default-tkm'];

                    // 🔴 한글 블록화 형식으로 프롬프트 직접 생성 (AI 호출 없이)
                    // 블록 순서: 【사이즈】→【섹션】→【스타일】→【색상 팔레트】→【환자 캐릭터】→【장면 묘사】→【필수 제외】
                    const directPrompt = `【사이즈】
1024x558px, 가로형 1.83:1 비율
블로그 본문 최적화 가로 배너

【섹션】 ${sectionTitleKorean}

【스타일】
${styleBlock}

【색상 팔레트】
- 주 색상: ${palette.primary}
- 보조 색상: ${palette.secondary}
- 강조 색상: ${palette.accent}
- 배경 색상: ${palette.background}

${includePatient ? `【환자 캐릭터】
- 프로필: ${selectedProfile.name}
- 외형: ${patientPrompt}
- 감정: ${emotionGuide.emotion}
- 포즈: ${emotionGuide.pose}` : `【환자 캐릭터】
없음 (데이터/연구 중심 섹션)`}

【장면 묘사】
${concept.description || concept.keywords.join(', ')}

【필수 제외】
${allNegatives}, NO doctor, NO 한의사, NO medical professional, NO white coat`;

                    // AI 호출하여 장면 묘사 보강 (선택적)
                    const systemPrompt = `당신은 블로그 시각 자료 프롬프트 전문가입니다.

## 🎯 핵심 원칙
아래 프롬프트 템플릿의 【장면 묘사】 부분만 보강해주세요.
원고 내용을 바탕으로 구체적인 시각적 장면을 한글로 작성하세요.

## 📄 원고 내용:
${initialContext.finalDraft || concept.description || '원고 내용 없음'}

## 현재 섹션: ${concept.title} (${sectionTitleKorean})
## 스타일: ${selectedStyleForPrompt.displayName}

## 현재 프롬프트 템플릿:
${directPrompt}

## 작업 지시:
1. 【장면 묘사】 부분을 원고 내용에 맞게 구체적으로 작성하세요
2. 나머지 섹션(【스타일】, 【색상】 등)은 그대로 유지하세요
3. **전체 프롬프트를 한글 블록 형식으로 출력하세요**
4. 영어 프롬프트 금지 - 모든 내용은 한글로 작성`;

                    let prompt = '';
                    if (selectedProvider === 'gemini') {
                        const { GoogleGenAI } = await import('@google/genai');
                        const ai = new GoogleGenAI({ apiKey: geminiApiKey });
                        const response = await ai.models.generateContent({
                            model: 'gemini-3-pro-preview',
                            contents: { parts: [{ text: systemPrompt }] }
                        });
                        prompt = response.text || '';
                    } else {
                        const response = await fetch('https://api.openai.com/v1/chat/completions', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${openaiApiKey}`
                            },
                            body: JSON.stringify({
                                model: 'gpt-5.2',
                                messages: [{ role: 'user', content: systemPrompt }],
                                max_tokens: 2000
                            })
                        });
                        const data = await response.json();
                        prompt = data.choices?.[0]?.message?.content || '';
                    }

                    setGeneratedPrompt(prompt);
                } catch (error: any) {
                    setGeneratedPrompt(`❌ 프롬프트 생성 오류: ${error.message}`);
                } finally {
                    setIsGeneratingPrompt(false);
                }
            }
        }
    };

    // 직접 프롬프트에 스타일/색상 정보를 주입하는 헬퍼 함수
    const buildEnhancedPrompt = useCallback((basePrompt: string, style: StyleTemplate | null, palette: 'medical' | 'calm' | 'warm') => {
        if (!basePrompt.trim()) return '';

        const paletteInfo = COLOR_PALETTES[palette];

        // 🔴 기존 Style: 및 Color palette: 정보 제거
        let cleanedPrompt = basePrompt;
        cleanedPrompt = cleanedPrompt.replace(/\n*Style:.*$/gm, '');
        cleanedPrompt = cleanedPrompt.replace(/\n*Color palette:.*$/gm, '');
        cleanedPrompt = cleanedPrompt.replace(/\n{3,}/g, '\n\n').trim();

        let enhancedPrompt = cleanedPrompt;

        // 🔴 새로 선택한 스타일 정보 추가
        if (style) {
            const styleKeywords = style.keywords.join(', ');
            enhancedPrompt += `\n\nStyle: ${style.displayName}, ${styleKeywords}.`;
        }

        // 🔴 새로 선택한 색상 팔레트 정보 추가
        enhancedPrompt += `\nColor palette: Primary ${paletteInfo.primary}, Secondary ${paletteInfo.secondary}, Accent ${paletteInfo.accent}, Background ${paletteInfo.background}.`;

        return enhancedPrompt;
    }, []);

    // 스타일/팔레트 변경 시 직접 프롬프트 자동 업데이트
    useEffect(() => {
        if (useDirectPrompt && baseDirectPrompt.trim()) {
            const enhanced = buildEnhancedPrompt(baseDirectPrompt.trim(), selectedStyle, selectedPalette);
            setDirectPrompt(enhanced);
        }
    }, [selectedStyle, selectedPalette, useDirectPrompt, baseDirectPrompt, buildEnhancedPrompt]);

    // 직접 프롬프트로 이미지 생성 (생성된 프롬프트 사용)
    const handleGenerateWithDirectPrompt = async () => {
        if (!generatedPrompt.trim()) return;

        const apiKey = selectedProvider === 'gemini' ? geminiApiKey : openaiApiKey;
        if (!apiKey) {
            openSettings();
            return;
        }

        // 생성된 프롬프트로 이미지 생성
        generateImage(null, generatedPrompt);
    };

    // 이미지 생성 (프롬프트 자동 생성 포함)
    const handleGenerateImage = async () => {
        if (!selectedStyle || !topic.trim()) return;
        const apiKey = selectedProvider === 'gemini' ? geminiApiKey : openaiApiKey;
        if (!apiKey) {
            openSettings();
            return;
        }

        // 프롬프트 자동 생성
        try {
            const palette = COLOR_PALETTES[selectedPalette];
            const basePrompt = selectedStyle.goldStandardExample.BACKGROUND_PROMPT;
            const negatives = selectedStyle.goldStandardExample.NEGATIVES.join(', ');

            // ✨ 선택된 컨셉이 있으면 섹션 타입 감지
            const selectedConcept = selectedConceptIndex !== null && initialContext?.concepts[selectedConceptIndex];
            const detectSectionType = (title: string): string => {
                const lowerTitle = title.toLowerCase();
                if (lowerTitle.includes('answer') || lowerTitle.includes('핵심') || lowerTitle.includes('결론')) return 'answer-first';
                if (lowerTitle.includes('warning') || lowerTitle.includes('주의') || lowerTitle.includes('위험')) return 'warning';
                if (lowerTitle.includes('action') || lowerTitle.includes('실천') || lowerTitle.includes('방법')) return 'action';
                if (lowerTitle.includes('symptom') || lowerTitle.includes('증상')) return 'symptoms';
                if (lowerTitle.includes('proof') || lowerTitle.includes('근거') || lowerTitle.includes('연구')) return 'proof';
                if (lowerTitle.includes('closing') || lowerTitle.includes('마무리') || lowerTitle.includes('요약')) return 'closing';
                return 'general';
            };

            const sectionType = selectedConcept ? detectSectionType(selectedConcept.title) : 'general';
            const emotionGuide = PATIENT_EMOTION_GUIDE[sectionType] || { emotion: 'neutral', pose: 'natural standing' };

            // 🔴 캐릭터가 필요한 스타일 목록
            const CHARACTER_STYLES = [
                'empathetic-character',
                'empathetic-cutoon',
                'section-illustration',
                'flat-illustration'
            ];
            // 🔴 스타일 기반 캐릭터 포함 여부 결정
            const includePatient = CHARACTER_STYLES.includes(selectedStyle?.id || '');

            const systemPrompt = `당신은 블로그 시각 자료 프롬프트 전문가입니다. 
**원고 전문을 읽고 핵심 내용을 파악한 뒤**, 주어진 스타일 템플릿을 활용하여 이미지 생성 프롬프트를 작성하세요.

## 🎯 핵심 원칙: 원고 기반 이미지 생성
**키워드 나열이 아닌, 원고의 실제 내용과 메시지를 시각화해야 합니다.**
1. 아래 원고/내용을 꼼꼼히 읽으세요
2. 핵심 메시지를 파악하세요
3. 그 메시지를 시각적으로 표현하는 이미지 프롬프트를 작성하세요

## 스타일: ${selectedStyle.displayName}
## 기본 프롬프트 템플릿:
${basePrompt}

## 색상 팔레트:
- Primary: ${palette.primary}
- Secondary: ${palette.secondary}
- Accent: ${palette.accent}
- Background: ${palette.background}

## 제외할 요소 (NEGATIVES):
${negatives}

## 🎨 환자 캐릭터 (독자 대리인) - 프로필: ${selectedProfile.name}
**섹션 타입**: ${sectionType}
**캐릭터 포함 여부**: ${includePatient ? '✅ 포함' : '❌ 제외'}

${includePatient ? `**캐릭터 기본 외형:**
${selectedProfile.patientCharacterPrompt || PATIENT_PRESETS['default-tkm']}

**이 섹션에서의 감정/포즈:**
- 감정: ${emotionGuide.emotion}
- 포즈: ${emotionGuide.pose}
` : '**데이터/연구 중심 섹션 - 환자 캐릭터 없이 구성하세요.**'}

**⚠️ 중요 규칙:**
- 의사/한의사 캐릭터는 절대 이미지에 포함하지 않습니다 (권위는 텍스트에서 확보)
- 환자 캐릭터는 "설명하는" 역할이 아닌 "반응하는" 역할입니다
- 독자가 글을 읽을 때 느끼는 감정/상황을 시각적으로 표현합니다

## 📄 원고/내용 (아래 내용을 기반으로 이미지 프롬프트 생성):
---
${initialContext?.finalDraft || content || '원고 내용 없음'}
---

## 주제: ${topic}
${content ? `## 추가 키워드/내용: ${content}` : ''}

**프롬프트 작성 지침:**
1. 원고의 핵심 메시지를 찾아 시각화하세요
2. 원고의 구체적인 표현과 메시지를 이미지로 표현하세요
3. 단순 키워드 나열이 아닌, 의미 있는 장면을 묘사하세요
4. ${includePatient ? `환자 캐릭터 포함: 감정(${emotionGuide.emotion})과 포즈(${emotionGuide.pose}) 반영` : '환자 캐릭터 없이 데이터/다이어그램 중심 구성'}
5. **🔴 필수: 생성되는 프롬프트에 아래 내용을 반드시 포함하세요:**
   - POSITIVE: 위에 명시된 환자 캐릭터 외형, 감정, 포즈를 프롬프트에 그대로 포함
   - NEGATIVE: "NO doctor, NO 한의사, NO medical professional, NO white coat, NO medical staff" 문구를 프롬프트 끝에 반드시 추가

위 정보를 바탕으로 완성된 이미지 생성 프롬프트를 한 문단으로 작성하세요. 영어로 작성하고, 이미지 내에 표시될 텍스트는 한글로 지정하세요.
**프롬프트 마지막에 반드시 NEGATIVE 요소를 명시하세요.**

**단일 이미지 최적화 지침:**
- 하나의 명확한 초점(focal point)을 가진 구도 설계
- 여러 요소가 있다면 시각적 계층(hierarchy)으로 통합
- 복잡한 개념은 아이콘/심볼로 단순화
- 배경과 전경의 조화로운 레이어링

**한글 텍스트 렌더링 최적화 지침:**
- 한글 텍스트는 명확하고 읽기 쉬운 산세리프 폰트로 지정 (clear, legible sans-serif Korean font)
- 텍스트는 크고 굵게 표시 (large, bold text for high visibility)
- 가능한 짧고 단순한 단어나 구문 사용 (simple, short phrases preferred)
- 텍스트 위치를 명확히 지정 (clearly specify text placement: centered, top, bottom, etc.)`;

            let prompt = '';
            if (selectedProvider === 'gemini') {
                const { GoogleGenAI } = await import('@google/genai');
                const ai = new GoogleGenAI({ apiKey: geminiApiKey });
                const response = await ai.models.generateContent({
                    model: 'gemini-3-pro-preview',
                    contents: { parts: [{ text: systemPrompt }] }
                });
                prompt = response.text || '';
            } else {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${openaiApiKey}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-5.2',
                        messages: [{ role: 'user', content: systemPrompt }],
                        max_tokens: 2000
                    })
                });
                const data = await response.json();
                prompt = data.choices?.[0]?.message?.content || '';
            }

            setGeneratedPrompt(prompt);

            // 생성된 프롬프트로 바로 이미지 생성
            if (prompt && !prompt.startsWith('❌')) {
                generateImage(null, prompt);
            }
        } catch (error: any) {
            setGeneratedPrompt(`❌ 오류: ${error.message}`);
        }
    };

    const hasConceptCards = initialContext && initialContext.concepts.length > 0;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            <Panel>
                <div className="flex flex-col gap-4 flex-grow">
                    {/* 헤더 + AI 제공자 선택 */}
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-300">블로그 이미지 생성</h3>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setSelectedProvider('gemini')}
                                className={`px-2 py-1 text-xs rounded transition-colors ${selectedProvider === 'gemini' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                            >
                                💎 Gemini
                            </button>
                            <button
                                onClick={() => setSelectedProvider('openai')}
                                className={`px-2 py-1 text-xs rounded transition-colors ${selectedProvider === 'openai' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                            >
                                🤖 ChatGPT
                            </button>
                        </div>
                    </div>

                    {/* 1. 컨셉 카드 섹션 */}
                    {hasConceptCards && (
                        <div className="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg">📋</span>
                                <h4 className="text-sm font-semibold text-purple-300">전달받은 컨셉 카드</h4>
                                <span className="px-2 py-0.5 bg-purple-600/40 text-purple-200 text-xs rounded">
                                    {initialContext!.concepts.length}개
                                </span>
                                {isGeneratingPrompt && (
                                    <div className="flex items-center gap-1 ml-auto">
                                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-400"></div>
                                        <span className="text-xs text-purple-300">프롬프트 생성 중...</span>
                                    </div>
                                )}
                            </div>
                            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
                                {initialContext!.concepts.map((concept, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleConceptSelect(idx)}
                                        className={`w-full text-left p-2 rounded-lg transition-all text-sm ${selectedConceptIndex === idx
                                            ? 'bg-purple-600/50 border-2 border-purple-400'
                                            : 'bg-gray-800/50 border border-gray-700 hover:border-purple-500/50'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-white font-medium">{concept.title}</span>
                                            {selectedConceptIndex === idx && (
                                                <span className="text-green-400 text-xs">✓ 선택</span>
                                            )}
                                        </div>
                                        <div className="flex gap-1 mt-1 flex-wrap">
                                            {concept.keywords.slice(0, 3).map((kw, kidx) => (
                                                <span key={kidx} className="px-1.5 py-0.5 bg-indigo-600/40 text-indigo-200 text-xs rounded">
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                        {/* AI 추천 스타일 및 색상 팔레트 표시 */}
                                        {(concept.recommendedStyle || concept.recommendedPalette) && (
                                            <div className="flex gap-1 mt-1.5 flex-wrap items-center">
                                                <span className="text-xs text-gray-400">🤖 AI 추천:</span>
                                                {concept.recommendedStyle && (
                                                    <span className="px-1.5 py-0.5 bg-emerald-600/40 text-emerald-200 text-xs rounded">
                                                        🎨 {STYLE_LIBRARY.find(s => s.id === concept.recommendedStyle)?.displayName || concept.recommendedStyle}
                                                    </span>
                                                )}
                                                {concept.recommendedPalette && (
                                                    <span className="px-1.5 py-0.5 bg-amber-600/40 text-amber-200 text-xs rounded flex items-center gap-1">
                                                        <span
                                                            className="w-2 h-2 rounded-full"
                                                            style={{ backgroundColor: COLOR_PALETTES[concept.recommendedPalette]?.primary }}
                                                        />
                                                        {concept.recommendedPalette}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 2. 스타일 선택 */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-medium text-gray-300">스타일 선택</label>
                            {/* 빠른 선택 토글 */}
                            <div className="flex items-center gap-1">
                                <span className="text-xs text-gray-500">빠른 선택:</span>
                                <button
                                    onClick={() => {
                                        const style = STYLE_LIBRARY.find(s => s.id === 'section-illustration');
                                        if (style) setSelectedStyle(style);
                                    }}
                                    className={`px-2 py-1 text-xs rounded transition-colors ${selectedStyle?.id === 'section-illustration'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                        }`}
                                >
                                    📖 섹션 일러스트
                                </button>
                                <button
                                    onClick={() => {
                                        const style = STYLE_LIBRARY.find(s => s.id === 'flat-illustration');
                                        if (style) setSelectedStyle(style);
                                    }}
                                    className={`px-2 py-1 text-xs rounded transition-colors ${selectedStyle?.id === 'flat-illustration'
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                        }`}
                                >
                                    🎭 플랫 일러스트
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto">
                            {STYLE_LIBRARY.map((style) => (
                                <button
                                    key={style.id}
                                    onClick={() => setSelectedStyle(style)}
                                    className={`p-1.5 rounded text-center transition-all ${selectedStyle?.id === style.id
                                        ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                                        : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                                        }`}
                                >
                                    <span className="text-base">{style.icon}</span>
                                    <p className="text-xs truncate">{style.displayName}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 3. 주제 입력 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">주제</label>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="예: 공황장애 관리, 수면 위생"
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    {/* 4. 내용/키워드 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">키워드/내용</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="이미지가 표현해야 할 구체적인 키워드..."
                            rows={2}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                        />
                    </div>

                    {/* 5. 색상 팔레트 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">색상 팔레트</label>
                        <div className="flex gap-2">
                            {(Object.keys(COLOR_PALETTES) as Array<keyof typeof COLOR_PALETTES>).map((palette) => (
                                <button
                                    key={palette}
                                    onClick={() => setSelectedPalette(palette)}
                                    className={`flex-1 py-1.5 px-2 rounded text-xs transition-colors ${selectedPalette === palette
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        <span
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: COLOR_PALETTES[palette].primary }}
                                        />
                                        <span className="capitalize">{palette}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 6. 직접 프롬프트 입력 섹션 */}
                    <div className="bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-500/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-lg">✏️</span>
                                <h4 className="text-sm font-semibold text-amber-300">직접 프롬프트 입력</h4>
                            </div>
                            <button
                                onClick={() => setUseDirectPrompt(!useDirectPrompt)}
                                className={`relative w-10 h-5 rounded-full transition-colors ${useDirectPrompt ? 'bg-amber-500' : 'bg-gray-600'}`}
                            >
                                <span
                                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-all ${useDirectPrompt ? 'translate-x-5' : 'translate-x-0'}`}
                                />
                            </button>
                        </div>

                        {useDirectPrompt && (
                            <>
                                <p className="text-xs text-gray-400 mb-2">
                                    💡 위에서 선택한 <span className="text-amber-300">스타일</span>과 <span className="text-amber-300">색상 팔레트</span>를 변경하면 아래 프롬프트가 자동으로 업데이트됩니다.
                                </p>
                                <textarea
                                    value={directPrompt}
                                    onChange={(e) => {
                                        const input = e.target.value;
                                        // 사용자가 입력한 텍스트에서 Style:과 Color palette: 부분 제거하여 원본만 저장
                                        let base = input;
                                        base = base.replace(/\s*Style:.*?(?=\s*Color palette:|$)/g, '');
                                        base = base.replace(/\s*Color palette:.*$/g, '');
                                        setBaseDirectPrompt(base.trim());
                                        setDirectPrompt(input);
                                    }}
                                    placeholder="직접 프롬프트를 입력하세요... (예: A calm isometric infographic showing mental wellness)"
                                    rows={8}
                                    className="w-full px-3 py-2 bg-gray-700 border border-amber-500/50 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-1 focus:ring-amber-400 resize-y whitespace-pre-wrap"
                                />
                                <div className="flex gap-2 mt-2">
                                    <button
                                        onClick={() => {
                                            if (selectedStyle) {
                                                // 🔴 STYLE_PROMPT_BLOCKS에서 가져오거나, 없거나 비어있으면 goldStandardExample 사용
                                                const blockPrompt = STYLE_PROMPT_BLOCKS[selectedStyle.id];
                                                const styleTemplate = (blockPrompt && blockPrompt.trim())
                                                    ? blockPrompt
                                                    : selectedStyle.goldStandardExample.BACKGROUND_PROMPT;

                                                console.log('스타일 템플릿:', selectedStyle.id, styleTemplate.substring(0, 100));

                                                // 스타일 템플릿을 기반으로 프롬프트 생성
                                                setBaseDirectPrompt(styleTemplate);
                                                const enhanced = buildEnhancedPrompt(styleTemplate, selectedStyle, selectedPalette);
                                                setDirectPrompt(enhanced);
                                            }
                                        }}
                                        disabled={!selectedStyle}
                                        className="flex-1 py-1.5 px-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 text-xs rounded transition-colors"
                                    >
                                        📥 스타일 템플릿 불러오기
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (directPrompt.trim()) {
                                                let cleanedPrompt = directPrompt;

                                                // 🔴 1. 【스타일】 블록 전체 삭제 (다음 【 까지)
                                                cleanedPrompt = cleanedPrompt.replace(/【스타일】[\s\S]*?(?=【|$)/g, '');

                                                // 🔴 1.5. 【스타일】 헤더 없이 존재하는 [그림체], [구성], [색상], [배경] 블록도 삭제
                                                // 각 태그부터 다음 태그 또는 다음 【 블록까지 삭제
                                                cleanedPrompt = cleanedPrompt.replace(/\[그림체\][\s\S]*?(?=\[구성\]|\[색상\]|\[배경\]|【|$)/g, '');
                                                cleanedPrompt = cleanedPrompt.replace(/\[구성\][\s\S]*?(?=\[색상\]|\[배경\]|【|$)/g, '');
                                                cleanedPrompt = cleanedPrompt.replace(/\[색상\][\s\S]*?(?=\[배경\]|【|$)/g, '');
                                                cleanedPrompt = cleanedPrompt.replace(/\[배경\][\s\S]*?(?=【|$)/g, '');

                                                // 🔴 2. 【색상 팔레트】 블록 전체 삭제 (다음 【 까지)
                                                cleanedPrompt = cleanedPrompt.replace(/【색상 팔레트】[\s\S]*?(?=【|$)/g, '');

                                                // 🔴 3. Style:, Color palette: 줄도 삭제 (혹시 남아있으면)
                                                const lines = cleanedPrompt.split('\n');
                                                const filtered = lines.filter(line => {
                                                    const trimmed = line.trim();
                                                    if (trimmed.startsWith('Style:')) return false;
                                                    if (trimmed.startsWith('Color palette:')) return false;
                                                    return true;
                                                });

                                                cleanedPrompt = filtered.join('\n');
                                                // 연속된 빈 줄 정리
                                                cleanedPrompt = cleanedPrompt.replace(/\n{3,}/g, '\n\n').trim();

                                                // 🔴 4. 선택한 스타일 정보 추가
                                                const paletteInfo = COLOR_PALETTES[selectedPalette];

                                                if (selectedStyle) {
                                                    // 🔴 블록화된 형식으로 스타일 추가
                                                    const blockPrompt = STYLE_PROMPT_BLOCKS[selectedStyle.id];
                                                    const styleContent = (blockPrompt && blockPrompt.trim())
                                                        ? blockPrompt.trim()
                                                        : `${selectedStyle.displayName}\n${selectedStyle.keywords.map(k => `- ${k}`).join('\n')}`;

                                                    cleanedPrompt += `\n\n【스타일】\n${styleContent}`;
                                                }

                                                // 🔴 블록화된 형식으로 색상 팔레트 추가
                                                cleanedPrompt += `\n\n【색상 팔레트】\n- 주 색상: ${paletteInfo.primary}\n- 보조 색상: ${paletteInfo.secondary}\n- 강조 색상: ${paletteInfo.accent}\n- 배경 색상: ${paletteInfo.background}`;

                                                setGeneratedPrompt(cleanedPrompt);
                                            }
                                        }}
                                        disabled={!directPrompt.trim()}
                                        className="flex-1 py-1.5 px-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white text-xs rounded transition-colors"
                                    >
                                        ↓ 생성된 프롬프트로 적용
                                    </button>
                                    <button
                                        onClick={() => {
                                            setDirectPrompt('');
                                            setBaseDirectPrompt('');
                                        }}
                                        className="py-1.5 px-3 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded transition-colors"
                                    >
                                        🗑️ 초기화
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* 생성된 프롬프트 편집 */}
                    {generatedPrompt && !generatedPrompt.startsWith('❌') && (
                        <div className="bg-gray-800/50 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-medium text-gray-400">📝 생성된 프롬프트:</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={async () => {
                                            try {
                                                await navigator.clipboard.writeText(generatedPrompt);
                                                setCopiedPrompt(true);
                                                setTimeout(() => setCopiedPrompt(false), 2000);
                                            } catch (err) {
                                                console.error('복사 실패:', err);
                                            }
                                        }}
                                        className="text-xs text-gray-500 hover:text-green-400 transition-colors"
                                        title="클립보드에 복사"
                                    >
                                        {copiedPrompt ? '✅ 복사됨!' : '📋 복사'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setGeneratedPrompt('');
                                        }}
                                        className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                                        title="프롬프트 초기화"
                                    >
                                        🗑️ 초기화
                                    </button>
                                </div>
                            </div>
                            <div className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-xs font-mono max-h-64 overflow-y-auto whitespace-pre-wrap">
                                {generatedPrompt}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">👁️ 읽기 전용: 수정하려면 위의 '직접 프롬프트 입력'을 사용하세요.</p>
                        </div>
                    )}

                    {/* 이미지 생성 버튼 - 직접 프롬프트 모드에 따라 분기 */}
                    {useDirectPrompt ? (
                        <button
                            onClick={handleGenerateWithDirectPrompt}
                            disabled={isImageLoading || !generatedPrompt.trim() || !isApiKeyReady}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 via-orange-600 to-red-600 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isImageLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    <span>이미지 생성 중...</span>
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-5 h-5" />
                                    <span>✏️ 직접 프롬프트로 생성</span>
                                </>
                            )}
                        </button>
                    ) : (
                        <button
                            onClick={handleGenerateImage}
                            disabled={isImageLoading || isGeneratingPrompt || !selectedStyle || !topic.trim() || !isApiKeyReady}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 via-indigo-600 to-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isImageLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    <span>이미지 생성 중...</span>
                                </>
                            ) : isGeneratingPrompt ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    <span>프롬프트 생성 중...</span>
                                </>
                            ) : (
                                <>
                                    <SparklesIcon className="w-5 h-5" />
                                    <span>🖼️ 이미지 생성</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </Panel>

            {/* 우측: 이미지 생성 결과 패널 */}
            <GenerationResultPanel
                isLoading={isImageLoading}
                error={imageError}
                generatedImages={generatedImages}
                selectedImage={selectedImage}
                onSelectImage={setSelectedImage}
                onRegenerate={regenerate}
                canRegenerate={canRegenerate}
            />
        </div>
    );
};

export default BlogVisualEditor;

