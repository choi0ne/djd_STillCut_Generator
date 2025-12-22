import React, { useState, useCallback } from 'react';
import Panel from './common/Panel';
import { STYLE_LIBRARY, COLOR_PALETTES, StyleTemplate } from '../data/styleLibrary';
import { SparklesIcon } from './Icons';
import useLocalStorage from '../hooks/useLocalStorage';
import { useImageGenerator } from '../hooks/useImageGenerator';
import { generateImageWithPrompt } from '../services/geminiService';
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

    const [selectedConceptIndex, setSelectedConceptIndex] = useState<number | null>(null);

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
            return await generateImageWithPrompt(baseImage, prompt, 4);
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

    // 컨셉 선택 변경 시 키워드 및 AI 추천 스타일/팔레트 적용
    const handleConceptSelect = (index: number) => {
        setSelectedConceptIndex(index);
        if (initialContext && initialContext.concepts[index]) {
            const concept = initialContext.concepts[index];
            setContent(concept.keywords.join(', '));

            // AI 추천 스타일 자동 적용 (사용자가 나중에 변경 가능)
            if (concept.recommendedStyle) {
                const style = STYLE_LIBRARY.find(s => s.id === concept.recommendedStyle);
                if (style) {
                    setSelectedStyle(style);
                }
            }

            // AI 추천 색상 팔레트 자동 적용 (사용자가 나중에 변경 가능)
            if (concept.recommendedPalette) {
                setSelectedPalette(concept.recommendedPalette);
            }
        }
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

                    {/* 생성된 프롬프트 미리보기 */}
                    {generatedPrompt && !generatedPrompt.startsWith('❌') && (
                        <div className="bg-gray-800/50 rounded-lg p-2 max-h-24 overflow-y-auto">
                            <p className="text-xs text-gray-400 mb-1">📝 생성된 프롬프트:</p>
                            <p className="text-xs text-gray-300 line-clamp-3">{generatedPrompt}</p>
                        </div>
                    )}

                    {/* 이미지 생성 버튼 */}
                    <button
                        onClick={handleGenerateImage}
                        disabled={isImageLoading || !selectedStyle || !topic.trim() || !isApiKeyReady}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 via-indigo-600 to-emerald-600 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isImageLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                <span>이미지 생성 중...</span>
                            </>
                        ) : (
                            <>
                                <SparklesIcon className="w-5 h-5" />
                                <span>🖼️ 이미지 생성</span>
                            </>
                        )}
                    </button>
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
