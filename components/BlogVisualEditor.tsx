import React, { useState } from 'react';
import Panel from './common/Panel';
import { STYLE_LIBRARY, COLOR_PALETTES, StyleTemplate } from '../data/styleLibrary';
import { SparklesIcon, ClipboardIcon, PlusIcon } from './Icons';
import useLocalStorage from '../hooks/useLocalStorage';

interface BlogVisualEditorProps {
    isApiKeyReady: boolean;
    openSettings: () => void;
    geminiApiKey: string;
    openaiApiKey: string;
    selectedProvider: 'gemini' | 'openai';
    setSelectedProvider: (provider: 'gemini' | 'openai') => void;
    initialContext?: {
        topic: string;
        concepts: Array<{ title: string; keywords: string[] }>;
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
    const [isLoading, setIsLoading] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [savedPrompts, setSavedPrompts] = useLocalStorage<{ style: string; topic: string; prompt: string; date: string }[]>('blog-image-prompts', []);
    const [selectedConceptIndex, setSelectedConceptIndex] = useState(0);

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

    // 컨셉 선택 변경 시 키워드 업데이트
    const handleConceptChange = (index: number) => {
        setSelectedConceptIndex(index);
        if (initialContext && initialContext.concepts[index]) {
            setContent(initialContext.concepts[index].keywords.join(', '));
        }
    };

    const handleGenerate = async () => {
        if (!selectedStyle || !topic.trim()) return;
        const apiKey = selectedProvider === 'gemini' ? geminiApiKey : openaiApiKey;
        if (!apiKey) {
            openSettings();
            return;
        }

        setIsLoading(true);
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

            let result = '';

            if (selectedProvider === 'gemini') {
                const { GoogleGenAI } = await import('@google/genai');
                const ai = new GoogleGenAI({ apiKey: geminiApiKey });
                const response = await ai.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: { parts: [{ text: systemPrompt }] }
                });
                result = response.text || '';
            } else {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${openaiApiKey}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [{ role: 'user', content: systemPrompt }],
                        max_tokens: 2000
                    })
                });
                const data = await response.json();
                result = data.choices?.[0]?.message?.content || '';
            }

            // Format output
            const finalOutput = `## 🎨 이미지 프롬프트

**스타일:** ${selectedStyle.displayName}
**주제:** ${topic}

### BACKGROUND_PROMPT:
${result}

### NEGATIVES:
${negatives}

### 색상 팔레트:
- Primary: ${palette.primary}
- Secondary: ${palette.secondary}
- Accent: ${palette.accent}`;

            setGeneratedPrompt(finalOutput);
        } catch (error: any) {
            setGeneratedPrompt(`❌ 오류: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedPrompt);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const handleSave = () => {
        if (!generatedPrompt || !selectedStyle) return;
        const newPrompt = {
            style: selectedStyle.displayName,
            topic,
            prompt: generatedPrompt,
            date: new Date().toISOString()
        };
        setSavedPrompts([...savedPrompts, newPrompt]);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            <Panel>
                <div className="flex flex-col gap-4 flex-grow">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-300">1. 스타일 선택</h3>
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

                    {/* Style Grid */}
                    <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                        {STYLE_LIBRARY.map((style) => (
                            <button
                                key={style.id}
                                onClick={() => setSelectedStyle(style)}
                                className={`p-2 rounded-lg text-left transition-all ${selectedStyle?.id === style.id
                                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50'
                                    }`}
                            >
                                <span className="text-lg">{style.icon}</span>
                                <p className="text-xs mt-1 truncate">{style.displayName}</p>
                            </button>
                        ))}
                    </div>

                    {selectedStyle && (
                        <p className="text-sm text-gray-400 bg-gray-800/50 p-2 rounded">
                            {selectedStyle.description}
                        </p>
                    )}

                    {/* Topic Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">2. 주제</label>
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder="예: 공황장애 관리, 수면 위생"
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                    </div>

                    {/* Content Input */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">3. 문단 내용 (선택)</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="이미지가 표현해야 할 구체적인 개념이나 내용..."
                            rows={3}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                        />
                    </div>

                    {/* Color Palette Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">4. 색상 팔레트</label>
                        <div className="flex gap-2">
                            {(Object.keys(COLOR_PALETTES) as Array<keyof typeof COLOR_PALETTES>).map((palette) => (
                                <button
                                    key={palette}
                                    onClick={() => setSelectedPalette(palette)}
                                    className={`flex-1 py-2 px-3 rounded-lg text-sm transition-colors ${selectedPalette === palette
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    <div className="flex items-center justify-center gap-1">
                                        <span
                                            className="w-3 h-3 rounded-full"
                                            style={{ backgroundColor: COLOR_PALETTES[palette].primary }}
                                        />
                                        <span className="capitalize">{palette}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Concept Cards - 블로그글 작성에서 전달받은 경우에만 표시 */}
                    {initialContext && initialContext.concepts.length > 0 && (
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <label className="block text-sm font-medium text-gray-300">✍️ 전달받은 컨셉</label>
                                <span className="px-2 py-0.5 bg-green-600/30 text-green-300 text-xs rounded">
                                    {initialContext.concepts.length}개
                                </span>
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {initialContext.concepts.map((concept, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleConceptChange(idx)}
                                        className={`w-full text-left p-3 rounded-lg transition-all ${selectedConceptIndex === idx
                                                ? 'bg-gradient-to-r from-purple-600/40 to-indigo-600/40 border-2 border-purple-400'
                                                : 'bg-gray-800/50 border border-gray-700 hover:border-gray-600'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-white font-semibold text-sm">{concept.title}</h4>
                                            {selectedConceptIndex === idx && (
                                                <span className="text-green-400 text-xs">✓ 선택됨</span>
                                            )}
                                        </div>
                                        <div className="flex gap-1 mt-1.5 flex-wrap">
                                            {concept.keywords.map((kw, kidx) => (
                                                <span key={kidx} className="px-2 py-0.5 bg-indigo-600/40 text-indigo-200 text-xs rounded">
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !selectedStyle || !topic.trim() || !isApiKeyReady}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                            <SparklesIcon className="w-5 h-5" />
                        )}
                        <span>{isLoading ? '생성 중...' : '프롬프트 생성'}</span>
                    </button>
                </div>
            </Panel>

            <Panel>
                <div className="flex flex-col gap-4 flex-grow h-full">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-300">생성된 프롬프트</h3>
                        {generatedPrompt && (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopy}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-500 transition-colors"
                                >
                                    <ClipboardIcon className="w-4 h-4" />
                                    <span>{copySuccess ? '복사됨!' : '복사'}</span>
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-500 transition-colors"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    <span>{saveSuccess ? '저장됨!' : '저장'}</span>
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-grow bg-gray-900/50 rounded-lg p-4 overflow-auto">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mr-2"></div>
                                <span>Gemini 3.0으로 프롬프트 생성 중...</span>
                            </div>
                        ) : generatedPrompt ? (
                            <pre className="text-sm text-gray-200 whitespace-pre-wrap font-mono">
                                {generatedPrompt}
                            </pre>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <span className="text-4xl mb-2">📖</span>
                                <p>스타일과 주제를 선택하고</p>
                                <p>프롬프트를 생성하세요</p>
                            </div>
                        )}
                    </div>
                </div>
            </Panel>
        </div>
    );
};

export default BlogVisualEditor;
