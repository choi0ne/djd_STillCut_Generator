import React, { useState } from 'react';
import Panel from './common/Panel';
import { SparklesIcon, ClipboardIcon, EditIcon } from './Icons';
import type { ImageProvider } from '../services/types';

interface ReviewManagerEditorProps {
    isApiKeyReady: boolean;
    openSettings: () => void;
    geminiApiKey: string;
    openaiApiKey: string;
    selectedProvider: ImageProvider;
    setSelectedProvider: (provider: ImageProvider) => void;
}

type RiskGrade = 'green' | 'yellow' | 'red' | null;

interface AnalysisResult {
    riskGrade: RiskGrade;
    reviewLength: '단문' | '중문' | '장문';
    reviewType: '경험/서비스' | '치료/의료' | '복합';
    keywords: string[];
    summary: string;
    responses: string[];
}

// 시스템 프롬프트 - CX 매니저 메타 프롬프트
const CX_MANAGER_PROMPT = `# 역할 정의

당신은 {{동제당한의원}}의 환자 경험(CX)을 총괄하는 AI 어시스턴트입니다. 당신의 임무는 기계적인 답변을 넘어, 사람의 마음을 움직이는 진심 어린 소통을 하는 것입니다. 동시에, 위험 리뷰에 대해서는 강력한 '안전 필터' 역할을 수행해야 합니다.

# 업무 수행 프로세스

### 1단계: 리뷰 심층 분석 및 분류

1. **리뷰 길이 측정:** 리뷰의 글자 수를 측정하여 [단문], [중문], [장문]으로 분류.
2. **위험 등급:** 리뷰의 어조, 내용, 별점 등을 종합하여 🟢[Green], 🟡[Yellow], 🔴[Red] 중 하나로 분류.
3. **리뷰 유형:** 핵심 내용이 [경험/서비스], [치료/의료], [복합] 중 어디에 속하는지 판단.
4. **핵심 키워드 및 주요 칭찬/불만 요약**.

### 2단계: 분석 기반 응대 전략 수립

- **답변 길이 조절 원칙:** 생성할 답변의 길이는 1단계에서 분석한 리뷰 길이에 비례해야 한다.
- **🟢[Green] 등급:** 긍정 리뷰 강화 전략을 활용한 최고 품질의 답변 초안 1~2개 생성.
- **🟡[Yellow] 등급:** 다양한 관점의 답변 초안 2~3개 생성.
- **🔴[Red] 등급:** 환자의 '감정'에 깊이 공감하고 '지속적인 관리와 소통 의지'를 표현. 반드시 오프라인 소통 제안 포함.

### [!!절대 원칙!!]
만약 리뷰 유형이 [치료/의료]에 대한 부정적 내용일 경우, 절대 의료적 판단의 '실수'나 '미흡함'을 인정하는 뉘앙스를 사용하지 않는다. 대신, 환자의 '감정'에 깊이 공감하고 '지속적인 관리와 소통 의지'를 표현하는 데 집중한다.

# 페르소나 팔레트

- **공감하는 실장님:** 환자의 감정을 최우선으로 헤아려 마음을 여는 따뜻하고 부드러운 목소리.
- **신뢰를 주는 전문가:** 전문성을 바탕으로 신뢰감을 주는 논리적이고 안정적인 목소리.
- **따뜻한 이웃:** 친근하고 다정하게 안부를 묻고 건강을 기원하는 목소리.

# 출력 형식

반드시 아래 JSON 형식으로만 출력하세요:
{
  "riskGrade": "green" | "yellow" | "red",
  "reviewLength": "단문" | "중문" | "장문",
  "reviewType": "경험/서비스" | "치료/의료" | "복합",
  "keywords": ["키워드1", "키워드2", ...],
  "summary": "리뷰 핵심 요약",
  "responses": ["응대 초안 1", "응대 초안 2", ...]
}`;

const ReviewManagerEditor: React.FC<ReviewManagerEditorProps> = ({
    isApiKeyReady,
    openSettings,
    geminiApiKey,
    openaiApiKey,
    selectedProvider,
    setSelectedProvider
}) => {
    const [reviewText, setReviewText] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editedResponses, setEditedResponses] = useState<{ [key: number]: string }>({});

    const handleAnalyzeReview = async () => {
        if (!reviewText.trim()) {
            setError('리뷰를 입력해주세요.');
            return;
        }

        const apiKey = selectedProvider === 'gemini' ? geminiApiKey : openaiApiKey;
        if (!apiKey) {
            openSettings();
            return;
        }

        setIsAnalyzing(true);
        setError(null);
        setAnalysisResult(null);

        try {
            let result: string;

            if (selectedProvider === 'gemini') {
                const { GoogleGenAI } = await import('@google/genai');
                const ai = new GoogleGenAI({ apiKey });

                const response = await ai.models.generateContent({
                    model: 'gemini-3-pro-preview',
                    contents: {
                        parts: [
                            {
                                text: `${CX_MANAGER_PROMPT}\n\n# 사용자 리뷰\n\n${reviewText}`
                            }
                        ]
                    }
                });
                result = response.text || '';
            } else {
                // OpenAI API 호출
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-5.2',
                        messages: [
                            { role: 'system', content: CX_MANAGER_PROMPT },
                            { role: 'user', content: reviewText }
                        ],
                        temperature: 0.7
                    })
                });

                if (!response.ok) {
                    throw new Error(`API 오류: ${response.status}`);
                }

                const data = await response.json();
                result = data.choices[0]?.message?.content || '';
            }

            // JSON 파싱
            const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/) || result.match(/\{[\s\S]*\}/);
            const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]).trim() : result;

            const parsed = JSON.parse(jsonStr) as AnalysisResult;
            setAnalysisResult(parsed);
        } catch (err) {
            setError(`분석 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleCopyResponse = (response: string, index: number) => {
        const textToCopy = editedResponses[index] || response;
        navigator.clipboard.writeText(textToCopy);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleEditResponse = (index: number) => {
        if (editingIndex === index) {
            setEditingIndex(null);
        } else {
            setEditingIndex(index);
            if (!editedResponses[index] && analysisResult) {
                setEditedResponses(prev => ({ ...prev, [index]: analysisResult.responses[index] }));
            }
        }
    };

    const handleResponseChange = (index: number, value: string) => {
        setEditedResponses(prev => ({ ...prev, [index]: value }));
    };

    const getRiskGradeStyle = (grade: RiskGrade) => {
        switch (grade) {
            case 'green':
                return 'border-green-500/50 bg-green-900/20';
            case 'yellow':
                return 'border-yellow-500/50 bg-yellow-900/20';
            case 'red':
                return 'border-red-500/50 bg-red-900/20';
            default:
                return 'border-gray-600';
        }
    };

    const getRiskGradeIcon = (grade: RiskGrade) => {
        switch (grade) {
            case 'green': return '🟢';
            case 'yellow': return '🟡';
            case 'red': return '🔴';
            default: return '';
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* 좌측: 리뷰 입력 */}
            <Panel>
                <div className="flex flex-col gap-4 h-full">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white">💬 리뷰 입력</h2>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setSelectedProvider('gemini')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedProvider === 'gemini'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                            >
                                🔷 Gemini
                            </button>
                            <button
                                onClick={() => setSelectedProvider('openai')}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedProvider === 'openai'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                            >
                                💚 ChatGPT
                            </button>
                        </div>
                    </div>

                    {/* 리뷰 입력 영역 */}
                    <div className="flex-1 flex flex-col">
                        <label className="text-sm font-semibold text-gray-300 mb-2">환자 리뷰</label>
                        <textarea
                            value={reviewText}
                            onChange={(e) => setReviewText(e.target.value)}
                            placeholder="환자 리뷰를 입력하세요...&#10;&#10;예시:&#10;• '정말 친절하게 잘 봐주셨어요'&#10;• '대기시간이 좀 길었지만 진료는 만족해요'&#10;• '효과를 못 느꼈어요'"
                            className="w-full flex-grow min-h-[300px] bg-gray-900 text-white placeholder-gray-500 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow text-sm resize-none"
                        />
                    </div>

                    {/* 분석 버튼 */}
                    <button
                        onClick={handleAnalyzeReview}
                        disabled={isAnalyzing || !reviewText.trim() || !isApiKeyReady}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                    >
                        {isAnalyzing ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                            <SparklesIcon className="w-6 h-6" />
                        )}
                        <span>{isAnalyzing ? '분석 중...' : '리뷰 분석 및 응대 생성'}</span>
                    </button>

                    {error && (
                        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}
                </div>
            </Panel>

            {/* 우측: 분석 결과 및 응대 초안 */}
            <Panel>
                <div className="flex flex-col gap-4 h-full">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white">📋 분석 결과 및 응대 초안</h2>
                        <div className="flex gap-2">
                            <a
                                href="https://m.place.naver.com/hospital/13240803/review/visitor"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors"
                            >
                                🟢 네이버 리뷰
                            </a>
                            <a
                                href="https://place.map.kakao.com/11090120#review"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 rounded-lg text-sm font-medium bg-yellow-600/20 text-yellow-400 hover:bg-yellow-600/30 transition-colors"
                            >
                                🟡 카카오 리뷰
                            </a>
                        </div>
                    </div>

                    {analysisResult ? (
                        <div className="flex-1 flex flex-col gap-4 overflow-auto">
                            {/* 분석 요약 */}
                            <div className={`border rounded-lg p-4 ${getRiskGradeStyle(analysisResult.riskGrade)}`}>
                                <div className="flex items-center gap-2 mb-3">
                                    <span className="text-2xl">{getRiskGradeIcon(analysisResult.riskGrade)}</span>
                                    <span className="text-lg font-semibold text-white capitalize">
                                        {analysisResult.riskGrade?.toUpperCase()} 등급
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                                    <div>
                                        <span className="text-gray-400">길이: </span>
                                        <span className="text-white">{analysisResult.reviewLength}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">유형: </span>
                                        <span className="text-white">{analysisResult.reviewType}</span>
                                    </div>
                                </div>

                                <div className="mb-3">
                                    <span className="text-gray-400 text-sm">키워드: </span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {analysisResult.keywords.map((keyword, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-white/10 rounded text-xs text-gray-300">
                                                {keyword}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <span className="text-gray-400 text-sm">요약: </span>
                                    <p className="text-white text-sm mt-1">{analysisResult.summary}</p>
                                </div>
                            </div>

                            {/* 🔴 Red 등급 경고 */}
                            {analysisResult.riskGrade === 'red' && (
                                <div className="bg-red-900/30 border-2 border-red-500 rounded-lg p-4">
                                    <div className="text-center mb-3">
                                        <span className="text-2xl">🚨🚨🚨</span>
                                        <span className="text-red-400 font-bold text-lg ml-2">[RED FLAG]</span>
                                        <span className="text-2xl">🚨🚨🚨</span>
                                    </div>
                                    <p className="text-red-300 text-sm text-center font-medium">
                                        [주의] 아래 초안은 매우 민감한 내용이므로, <strong>절대 그대로 사용하지 마십시오.</strong>
                                        <br />반드시 원장님/실장님께서 환자분의 마음을 헤아려 직접 수정 및 재작성하셔야 합니다.
                                    </p>
                                </div>
                            )}

                            {/* 응대 초안 */}
                            <div className="flex-1 space-y-3">
                                <h3 className="text-sm font-semibold text-gray-300">응대 초안</h3>
                                {analysisResult.responses.map((response, index) => (
                                    <div
                                        key={index}
                                        className={`rounded-lg p-4 ${analysisResult.riskGrade === 'red'
                                            ? 'bg-gray-800/50 border border-gray-600'
                                            : 'bg-gray-900/50 border border-gray-600'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <span className="text-xs text-gray-400">초안 {index + 1}</span>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleEditResponse(index)}
                                                    className={`flex items-center gap-1 px-2 py-1 text-white text-xs rounded transition-colors ${editingIndex === index ? 'bg-green-600 hover:bg-green-500' : 'bg-gray-600 hover:bg-gray-500'}`}
                                                >
                                                    <EditIcon className="w-3 h-3" />
                                                    {editingIndex === index ? '완료' : '수정'}
                                                </button>
                                                <button
                                                    onClick={() => handleCopyResponse(response, index)}
                                                    className="flex items-center gap-1 px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded transition-colors"
                                                >
                                                    <ClipboardIcon className="w-3 h-3" />
                                                    {copiedIndex === index ? '복사됨!' : '복사'}
                                                </button>
                                            </div>
                                        </div>
                                        {editingIndex === index ? (
                                            <textarea
                                                value={editedResponses[index] || response}
                                                onChange={(e) => handleResponseChange(index, e.target.value)}
                                                className="w-full min-h-[150px] bg-gray-800 text-white border border-gray-500 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                            />
                                        ) : analysisResult.riskGrade === 'red' ? (
                                            <p className="text-gray-300 text-sm whitespace-pre-wrap">{editedResponses[index] || response}</p>
                                        ) : (
                                            <pre className="text-green-300 text-sm font-mono whitespace-pre-wrap bg-black/30 p-3 rounded">{editedResponses[index] || response}</pre>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center text-gray-500">
                                <span className="text-4xl mb-4 block">💬</span>
                                <p className="text-sm">리뷰를 입력하고 분석 버튼을 클릭하면</p>
                                <p className="text-sm">AI가 맞춤형 응대 초안을 생성합니다</p>
                            </div>
                        </div>
                    )}
                </div>
            </Panel>
        </div>
    );
};

export default ReviewManagerEditor;
