import React, { useState } from 'react';
import Panel from './common/Panel';
import { SparklesIcon, ClipboardIcon, EditIcon, PlusIcon } from './Icons';
import useLocalStorage from '../hooks/useLocalStorage';

interface BlogWriterEditorProps {
    isApiKeyReady: boolean;
    openSettings: () => void;
    geminiApiKey: string;
    openaiApiKey: string;
    selectedProvider: 'gemini' | 'openai';
    setSelectedProvider: (provider: 'gemini' | 'openai') => void;
    onStage7Complete?: (data: { topic: string; concepts: Array<{ title: string; keywords: string[] }> }) => void;
}

type WorkflowStage = 0 | 0.5 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface StageData {
    ideation: string[];        // Stage 0
    selectedTopic: string;     // Stage 0.5
    keywords: string[];        // Stage 1
    references: string[];      // Stage 2
    outline: string;           // Stage 3
    draft: string;             // Stage 4
    critique: string;          // Stage 5
    finalDraft: string;        // Stage 6
    imageConcepts: Array<{ title: string; reason: string; keywords: string[] }>;  // Stage 7
}

const STAGE_INFO: { [key: number]: { name: string; description: string; icon: string } } = {
    0: { name: '아이디에이션', description: '주제 후보 5-10개 생성', icon: '💡' },
    0.5: { name: '주제 스코어링', description: '4대 축 기준 주제 선정', icon: '📊' },
    1: { name: '키워드 클러스터', description: 'SEO 롱테일 키워드 20개+', icon: '🔍' },
    2: { name: '근거 설계', description: 'WM/KM 참고 자료 수집', icon: '📚' },
    3: { name: '아웃라인', description: '12 블록 맵핑', icon: '📝' },
    4: { name: '집필', description: '초고 작성', icon: '✍️' },
    5: { name: '초고 비평', description: '5C 체크리스트 검증', icon: '🔎' },
    6: { name: '탈고', description: '최종본 완성', icon: '✅' },
    7: { name: '시각 프롬프트 설계', description: '3-5개 이미지 컨셉 추천', icon: '🎨' }
};

const WORKFLOW_PROMPT = `당신은 "Patient-First Clinical Blog Production Workflow v9.0"을 따르는 한의원 블로그 전문가입니다.

## 공통 규칙 (문체 DNA)
- 시점: 1인칭 관찰자(한의사)
- 전개 순서: [핵심 결론 → 즉각적 행동 → 위험 신호 → 상세 이유 → 닫기]
- 용어 원칙: 환자 용어 우선
- 문장 길이: 10-18어
- 톤: 친절하지만 단호

## 클리닉 포커스
["공황장애", "메니에르병", "불면", "두드러기", "소화불량"]

## 타겟 독자
20-50대 직장인 환자`;

const BlogWriterEditor: React.FC<BlogWriterEditorProps> = ({
    isApiKeyReady,
    openSettings,
    geminiApiKey,
    openaiApiKey,
    selectedProvider,
    setSelectedProvider,
    onStage7Complete
}) => {
    const [currentStage, setCurrentStage] = useState<WorkflowStage>(0);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [stageData, setStageData] = useState<StageData>({
        ideation: [],
        selectedTopic: '',
        keywords: [],
        references: [],
        outline: '',
        draft: '',
        critique: '',
        finalDraft: '',
        imageConcepts: []
    });
    const [currentOutput, setCurrentOutput] = useState('');
    const [copySuccess, setCopySuccess] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [savedDrafts, setSavedDrafts] = useLocalStorage<{ stage: number; content: string; date: string }[]>('blog-drafts', []);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const getStagePrompt = (stage: WorkflowStage): string => {
        switch (stage) {
            case 0:
                return `${WORKFLOW_PROMPT}

## Stage 0: 아이디에이션

사용자 입력: "${userInput}"

위 키워드/아이디어를 바탕으로 블로그 주제 후보 5개를 생성하세요.
각 후보에 대해:
1. 핵심 독자 질문 (검색 의도)
2. 즉각적 결론 (1줄)
3. 핵심 관리 루틴 Top 3
4. 환자 친화적 원인 설명 2개
5. 위험 신호 1개

JSON 형식으로 출력하세요.`;

            case 0.5:
                return `${WORKFLOW_PROMPT}

## Stage 0.5: 주제 스코어링

주제 후보들:
${stageData.ideation.join('\n')}

각 주제를 4대 축으로 평가하세요:
1. 행동성 (Actionability / 5점)
2. 검색 의도 (Intent Match / 5점)
3. 진료 연관성 (Relevancy / 5점)
4. 긴급성/차별성 (Urgency / 5점)

총점이 가장 높은 주제 1개를 선정하고 이유를 설명하세요.`;

            case 1:
                return `${WORKFLOW_PROMPT}

## Stage 1: 키워드 클러스터

선정된 주제: "${stageData.selectedTopic}"

롱테일 키워드 20개 이상을 생성하세요:
- 약물 관련 5개
- 한약 관련 5개
- 증상 관련 5개
- 상황 관련 5개
- 생활요법 관련 5개

문단별 배치 맵도 함께 작성하세요.`;

            case 2:
                return `${WORKFLOW_PROMPT}

## Stage 2: 근거 설계

주제: "${stageData.selectedTopic}"

참고 자료 3-6개를 제안하세요:
- WM (서양의학): NICE, BMJ, APA 등
- KM (한의학): 대한한의학회 CPG, NIKOM 등
- 5년 이내 문헌 우선

각 자료의 핵심 내용을 요약하세요.`;

            case 3:
                return `${WORKFLOW_PROMPT}

## Stage 3: 아웃라인 & 12 블록 맵핑

주제: "${stageData.selectedTopic}"
키워드: ${stageData.keywords.slice(0, 10).join(', ')}

환자 중심 6단락 구조로 아웃라인을 작성하세요:
1. Answer First (핵심 결론)
2. Action (즉각적 행동) - PATH Top 3
3. Warning (위험 신호) - CONTRA
4. The 'Why' (상세 원인)
5. Proof (사례와 근거)
6. Closing (요약 및 격려)

12 블록 중 사용할 블록을 지정하세요:
필수: VOC, PATH, CONTRA
선택: DRUG, METAPHOR, ANALOGY, ANCHOR, REF, INTERACTION, MEAS, CASE, DEEP_DIVE`;

            case 4:
                return `${WORKFLOW_PROMPT}

## Stage 4: 집필

주제: "${stageData.selectedTopic}"
아웃라인:
${stageData.outline}

위 아웃라인을 바탕으로 블로그 초고를 작성하세요.

집필 규칙:
- 병리/기전은 'DEEP_DIVE' 블록으로 분리
- 증상–루틴–결과가 한 문단 내 인과로 연결
- 수치 예시 포함
- 레드플래그/내원 기준 명시
- 느낌표 ≤2
- 전문 용어 70% 이상 중학생 수준으로`;

            case 5:
                return `${WORKFLOW_PROMPT}

## Stage 5: 초고 비평

초고:
${stageData.draft}

5C 체크리스트로 비평하세요:
1. Clarity (명료성): 전문 용어가 순화되었는가?
2. Compassion (공감): 톤이 공감적이면서 단호한가?
3. Actionability (행동성): Top 3 루틴이 즉시 실행 가능한가?
4. Structure (구조): Answer First 구조가 지켜졌는가?
5. Urgency (긴급성): Red Flag가 명확히 강조되었는가?

수정이 필요한 부분을 구체적으로 지적하는 '수정 메모' 리스트를 작성하세요.`;

            case 6:
                return `${WORKFLOW_PROMPT}

## Stage 6: 탈고

초고:
${stageData.draft}

수정 메모:
${stageData.critique}

수정 메모를 100% 반영하여 최종본을 완성하세요.
문장 흐름과 오탈자를 검토하세요.`;

            case 7:
                return `${WORKFLOW_PROMPT}

## Stage 7: 시각 프롬프트 설계

주제: "${stageData.selectedTopic}"
최종 글:
${stageData.finalDraft}

위 블로그 글에 적합한 이미지 컨셉을 3-5개 추천하세요.

각 컨셉마다 다음을 포함:
1. 컨셉 제목 (간결하게, 15자 이내)
2. 이유 (왜 이 주제에 적합한지, 한 문장)
3. 핵심 키워드 3개 (시각적 요소 중심)

반드시 JSON 배열 형식으로 출력:
[
  {
    "title": "손그림 다이어그램 - 호흡법",
    "reason": "단계별 실행 방법을 직관적으로 표현",
    "keywords": ["호흡", "단계", "손그림"]
  }
]`;

            default:
                return '';
        }
    };

    const handleExecuteStage = async () => {
        if (!geminiApiKey) {
            openSettings();
            return;
        }

        setIsLoading(true);
        try {
            const prompt = getStagePrompt(currentStage);
            let result = '';

            if (selectedProvider === 'gemini') {
                const { GoogleGenAI } = await import('@google/genai');
                const ai = new GoogleGenAI({ apiKey: geminiApiKey });
                const response = await ai.models.generateContent({
                    model: 'gemini-2.0-flash',
                    contents: { parts: [{ text: prompt }] }
                });
                result = response.text || '';
            } else {
                // OpenAI
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${openaiApiKey}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [{ role: 'user', content: prompt }],
                        max_tokens: 4000
                    })
                });
                const data = await response.json();
                result = data.choices?.[0]?.message?.content || '';
            }

            setCurrentOutput(result);

            // Update stage data based on current stage
            switch (currentStage) {
                case 0:
                    setStageData(prev => ({ ...prev, ideation: result.split('\n').filter(l => l.trim()) }));
                    break;
                case 0.5:
                    setStageData(prev => ({ ...prev, selectedTopic: result }));
                    break;
                case 1:
                    setStageData(prev => ({ ...prev, keywords: result.split('\n').filter(l => l.trim()) }));
                    break;
                case 2:
                    setStageData(prev => ({ ...prev, references: result.split('\n').filter(l => l.trim()) }));
                    break;
                case 3:
                    setStageData(prev => ({ ...prev, outline: result }));
                    break;
                case 4:
                    setStageData(prev => ({ ...prev, draft: result }));
                    break;
                case 5:
                    setStageData(prev => ({ ...prev, critique: result }));
                    break;
                case 6:
                    setStageData(prev => ({ ...prev, finalDraft: result }));
                    break;
                case 7:
                    try {
                        // JSON 파싱 시도
                        const concepts = JSON.parse(result);
                        if (Array.isArray(concepts)) {
                            setStageData(prev => ({ ...prev, imageConcepts: concepts }));
                        }
                    } catch {
                        // JSON 파싱 실패 시 결과 그대로 저장
                        setCurrentOutput(result);
                    }
                    break;
            }
        } catch (error: any) {
            setCurrentOutput(`❌ 오류: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleNextStage = () => {
        const stages: WorkflowStage[] = [0, 0.5, 1, 2, 3, 4, 5, 6, 7];
        const currentIndex = stages.indexOf(currentStage);
        if (currentIndex < stages.length - 1) {
            setCurrentStage(stages[currentIndex + 1]);
            setCurrentOutput('');
        }
    };

    const handlePrevStage = () => {
        const stages: WorkflowStage[] = [0, 0.5, 1, 2, 3, 4, 5, 6, 7];
        const currentIndex = stages.indexOf(currentStage);
        if (currentIndex > 0) {
            setCurrentStage(stages[currentIndex - 1]);
            setCurrentOutput('');
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(currentOutput);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const handleSave = () => {
        if (!currentOutput) return;
        const newDraft = {
            stage: currentStage,
            content: currentOutput,
            date: new Date().toISOString()
        };
        setSavedDrafts([...savedDrafts, newDraft]);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
    };

    const handleToggleEdit = () => {
        setIsEditMode(!isEditMode);
    };

    const handleCompleteStage7 = () => {
        if (onStage7Complete && stageData.imageConcepts.length > 0) {
            onStage7Complete({
                topic: stageData.selectedTopic,
                concepts: stageData.imageConcepts.map(c => ({
                    title: c.title,
                    keywords: c.keywords
                }))
            });
        }
    };

    const stageInfo = STAGE_INFO[currentStage];
    const stages: WorkflowStage[] = [0, 0.5, 1, 2, 3, 4, 5, 6, 7];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            <Panel>
                <div className="flex flex-col gap-4 flex-grow">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-300">워크플로 진행</h3>
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

                    {/* Stage Progress */}
                    <div className="flex gap-1 overflow-x-auto pb-2">
                        {stages.map((stage, idx) => (
                            <button
                                key={stage}
                                onClick={() => { setCurrentStage(stage); setCurrentOutput(''); }}
                                className={`flex-shrink-0 px-2 py-1 rounded text-xs transition-all ${currentStage === stage
                                    ? 'bg-indigo-600 text-white'
                                    : stage < currentStage || (stage === 0.5 && currentStage > 0.5)
                                        ? 'bg-green-600/30 text-green-300'
                                        : 'bg-gray-700 text-gray-400'
                                    }`}
                            >
                                {STAGE_INFO[stage].icon} {idx}
                            </button>
                        ))}
                    </div>

                    {/* Current Stage Info */}
                    <div className="bg-indigo-600/20 border border-indigo-500/30 rounded-lg p-3">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">{stageInfo.icon}</span>
                            <div>
                                <h4 className="font-semibold text-white">Stage {currentStage}: {stageInfo.name}</h4>
                                <p className="text-sm text-gray-300">{stageInfo.description}</p>
                            </div>
                        </div>
                    </div>

                    {/* Input Area */}
                    {currentStage === 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                아이디어/키워드 입력
                            </label>
                            <textarea
                                value={userInput}
                                onChange={(e) => setUserInput(e.target.value)}
                                placeholder="예: 공황장애, 출근길 불안, 30대 직장인..."
                                rows={3}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                            />
                        </div>
                    )}

                    {/* Stage Data Summary */}
                    {currentStage > 0 && currentStage !== 7 && stageData.selectedTopic && (
                        <div className="bg-gray-800/50 rounded-lg p-3 text-sm">
                            <p className="text-gray-400">선정된 주제:</p>
                            <p className="text-white truncate">{stageData.selectedTopic.substring(0, 100)}...</p>
                        </div>
                    )}

                    {/* Stage 7: Concept Cards */}
                    {currentStage === 7 && stageData.imageConcepts.length > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm text-gray-400">생성된 이미지 컨셉 ({stageData.imageConcepts.length}개):</p>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {stageData.imageConcepts.map((concept, idx) => (
                                    <div key={idx} className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-500/30 rounded-lg p-3">
                                        <h4 className="text-white font-semibold text-sm">{concept.title}</h4>
                                        <p className="text-gray-300 text-xs mt-1">{concept.reason}</p>
                                        <div className="flex gap-1 mt-2">
                                            {concept.keywords.map((kw, kidx) => (
                                                <span key={kidx} className="px-2 py-0.5 bg-indigo-600/40 text-indigo-200 text-xs rounded">
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                        <button
                            onClick={handlePrevStage}
                            disabled={currentStage === 0}
                            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            ← 이전
                        </button>
                        <button
                            onClick={handleExecuteStage}
                            disabled={isLoading || !isApiKeyReady || (currentStage === 0 && !userInput.trim()) || currentStage === 7}
                            className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-2 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <SparklesIcon className="w-5 h-5" />
                            )}
                            <span>{isLoading ? '생성 중...' : '실행'}</span>
                        </button>
                        <button
                            onClick={handleNextStage}
                            disabled={currentStage === 7 || !currentOutput}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            다음 →
                        </button>
                        {currentStage === 7 && stageData.imageConcepts.length > 0 && (
                            <button
                                onClick={handleCompleteStage7}
                                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
                            >
                                🎨 모든 컨셉으로 이미지 생성
                            </button>
                        )}
                    </div>
                </div>
            </Panel>

            <Panel>
                <div className="flex flex-col gap-4 flex-grow h-full">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-gray-300">
                            {stageInfo.icon} {stageInfo.name} 결과
                        </h3>
                        {currentOutput && (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleToggleEdit}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${isEditMode ? 'bg-yellow-600 text-white' : 'bg-gray-600 text-white hover:bg-gray-500'}`}
                                >
                                    <EditIcon className="w-4 h-4" />
                                    <span>{isEditMode ? '수정 중' : '수정'}</span>
                                </button>
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

                    <div className="flex-grow bg-gray-900/50 rounded-lg p-4 overflow-auto max-h-[60vh]">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full text-gray-400">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mr-2"></div>
                                <span>Gemini 3.0으로 생성 중...</span>
                            </div>
                        ) : currentOutput ? (
                            isEditMode ? (
                                <textarea
                                    value={currentOutput}
                                    onChange={(e) => setCurrentOutput(e.target.value)}
                                    className="w-full h-full min-h-[300px] bg-gray-800 text-gray-200 text-sm font-mono p-2 rounded border border-yellow-500/50 focus:outline-none focus:ring-1 focus:ring-yellow-500 resize-none"
                                />
                            ) : (
                                <pre className="text-sm text-gray-200 whitespace-pre-wrap font-mono">
                                    {currentOutput}
                                </pre>
                            )
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                <span className="text-4xl mb-2">{stageInfo.icon}</span>
                                <p>{stageInfo.name} 단계</p>
                                <p className="text-sm">[실행] 버튼을 클릭하세요</p>
                            </div>
                        )}
                    </div>
                </div>
            </Panel>
        </div>
    );
};

export default BlogWriterEditor;
