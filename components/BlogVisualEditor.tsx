import React, { useState, useCallback, useEffect } from 'react';
import Panel from './common/Panel';
import { STYLE_LIBRARY, COLOR_PALETTES, StyleTemplate } from '../data/styleLibrary';
import { SparklesIcon } from './Icons';
import useLocalStorage from '../hooks/useLocalStorage';
import { useImageGenerator } from '../hooks/useImageGenerator';
import { generateImageWithPrompt } from '../services/geminiService';
import { generateWithOpenAI } from '../services/openaiProvider';
import GenerationResultPanel from './GenerationResultPanel';
import { ImageFile } from '../types';

interface BlogVisualEditorProps {
    isApiKeyReady: boolean;
    openSettings: () => void;
    geminiApiKey: string;
    openaiApiKey: string;
    selectedProvider: 'gemini' | 'openai';
    setSelectedProvider: (provider: 'gemini' | 'openai') => void;
    initialContext?: {
        topic: string;
        concepts: Array<{ title: string; keywords: string[]; recommendedStyle?: string; recommendedPalette?: 'medical' | 'calm' | 'warm' }>;
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
    const [useDirectPrompt, setUseDirectPrompt] = useState(false);

    const [selectedConceptIndex, setSelectedConceptIndex] = useState<number | null>(null);
    const [isEditingPrompt, setIsEditingPrompt] = useState(false);
    const [copiedPrompt, setCopiedPrompt] = useState(false);
    const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false); // 프롬프트 자동 생성 로딩 상태


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
                return await generateImageWithPrompt(baseImage, prompt, 4);
            } else {
                // OpenAI GPT Image 1.5 이미지 생성
                // 순차 호출로 rate limit 방지 (분당 5개 제한)
                const results: string[] = [];
                const imageCount = 4;
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
                                size: '1024x1024',
                                quality: 'standard'
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

    // 블로그글 작성에서 전달받은 컨텍스트 초기화
    React.useEffect(() => {
        if (initialContext) {
            setTopic(initialContext.topic);
            if (initialContext.concepts.length > 0) {
                setContent(initialContext.concepts[0].keywords.join(', '));
                setSelectedConceptIndex(0);
            }
        }
    }, [initialContext]);

    // 컨셉 선택 변경 시 키워드 및 AI 추천 스타일/팔레트 적용 + 자동 프롬프트 생성
    const handleConceptSelect = async (index: number) => {
        setSelectedConceptIndex(index);
        if (initialContext && initialContext.concepts[index]) {
            const concept = initialContext.concepts[index];

            // 주제와 키워드 자동 설정
            setTopic(initialContext.topic);
            setContent(concept.keywords.join(', '));

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
                    const basePrompt = selectedStyleForPrompt.goldStandardExample.BACKGROUND_PROMPT;
                    const negatives = selectedStyleForPrompt.goldStandardExample.NEGATIVES.join(', ');

                    const systemPrompt = `당신은 블로그 시각 자료 프롬프트 전문가입니다. 
사용자가 제공한 주제와 내용을 바탕으로, 주어진 스타일 템플릿을 활용하여 이미지 생성 프롬프트를 작성하세요.

## 스타일: ${selectedStyleForPrompt.displayName}
## 기본 프롬프트 템플릿:
${basePrompt}

## 색상 팔레트:
- Primary: ${palette.primary}
- Secondary: ${palette.secondary}
- Accent: ${palette.accent}
- Background: ${palette.background}

## 제외할 요소 (NEGATIVES):
${negatives}

## 사용자 주제: ${initialContext.topic}
## 컨셉 제목: ${concept.title}
## 키워드: ${concept.keywords.join(', ')}

위 정보를 바탕으로 완성된 이미지 생성 프롬프트를 한 문단으로 작성하세요. 영어로 작성하고, 스타일 키워드와 색상 지침을 포함하세요.`;

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
        let enhancedPrompt = basePrompt;

        // 스타일 정보 추가 (있을 경우)
        if (style) {
            const styleKeywords = style.keywords.join(', ');
            enhancedPrompt += ` Style: ${style.displayName}, ${styleKeywords}.`;
        }

        // 색상 팔레트 정보 추가
        enhancedPrompt += ` Color palette: Primary ${paletteInfo.primary}, Secondary ${paletteInfo.secondary}, Accent ${paletteInfo.accent}, Background ${paletteInfo.background}.`;

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

            const systemPrompt = `당신은 블로그 시각 자료 프롬프트 전문가입니다. 
사용자가 제공한 주제와 내용을 바탕으로, 주어진 스타일 템플릿을 활용하여 이미지 생성 프롬프트를 작성하세요.

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

## 사용자 주제: ${topic}
## 사용자 내용: ${content || '(추가 내용 없음)'}

위 정보를 바탕으로 완성된 이미지 생성 프롬프트를 한 문단으로 작성하세요. 영어로 작성하고, 스타일 키워드와 색상 지침을 포함하세요.`;

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
                        <label className="block text-sm font-medium text-gray-300 mb-1">스타일 선택</label>
                        <div className="grid grid-cols-4 gap-1.5 max-h-32 overflow-y-auto">
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
                                    rows={3}
                                    className="w-full px-3 py-2 bg-gray-700 border border-amber-500/50 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
                                />
                                <div className="flex gap-2 mt-2">
                                    <button
                                        onClick={() => {
                                            if (selectedStyle) {
                                                // 생성된 프롬프트가 있으면 그것을 기반으로, 없으면 템플릿만 사용
                                                let baseContent = generatedPrompt || selectedStyle.goldStandardExample.BACKGROUND_PROMPT;

                                                // 기존 스타일 키워드 제거 (예: "conceptual metaphor style", "digital painting" 등)
                                                STYLE_LIBRARY.forEach(style => {
                                                    const keywords = style.keywords.join('|');
                                                    const regex = new RegExp(`\\b(${keywords})\\b`, 'gi');
                                                    baseContent = baseContent.replace(regex, '');
                                                });

                                                // 중복 공백 정리
                                                baseContent = baseContent.replace(/\s+/g, ' ').trim();

                                                // 새 스타일 템플릿으로 교체하여 직접 입력 필드에 표시
                                                setBaseDirectPrompt(baseContent);
                                                const enhanced = buildEnhancedPrompt(baseContent, selectedStyle, selectedPalette);
                                                setDirectPrompt(enhanced);
                                            }
                                        }}
                                        disabled={!selectedStyle}
                                        className="flex-1 py-1.5 px-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 text-xs rounded transition-colors"
                                    >
                                        📋 스타일 템플릿 불러오기
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (directPrompt.trim()) {
                                                setGeneratedPrompt(directPrompt);
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
                            <div className="w-full px-3 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white text-xs max-h-32 overflow-y-auto">
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

