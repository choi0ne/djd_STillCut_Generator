import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Panel from './common/Panel';
import { SparklesIcon, ClipboardIcon, EditIcon, PlusIcon } from './Icons';
import useLocalStorage from '../hooks/useLocalStorage';
import ProfileManagerModal from './ProfileManagerModal';
import { BlogProfile, DEFAULT_PROFILES } from '../data/blogProfilePresets';

interface BlogWriterEditorProps {
    isApiKeyReady: boolean;
    openSettings: () => void;
    geminiApiKey: string;
    openaiApiKey: string;
    selectedProvider: 'gemini' | 'openai';
    setSelectedProvider: (provider: 'gemini' | 'openai') => void;
    onStage7Complete?: (data: { topic: string; concepts: Array<{ title: string; keywords: string[]; description?: string; recommendedStyle?: string; recommendedPalette?: 'medical' | 'calm' | 'warm' }> }) => void;
}

type WorkflowStage = 0 | 0.5 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface HashtagCategory {
    category: string;
    tags: string[];
}

interface SectionIllustration {
    sectionNumber: number;
    sectionTitle: string; // "Answer First", "Action" 등
    summary: string; // 섹션 내용 요약 (짧은 버전)
    sectionContent: string; // 실제 원고 섹션 전문 (글 기반 프롬프트용)
    keywords: string[];
    recommendedPalette: 'medical' | 'calm' | 'warm';
}

interface StageData {
    ideation: string[];        // Stage 0
    selectedTopic: string;     // Stage 0.5
    scoredTopics: Array<{ title: string; score: number; summary: string }>;  // Stage 0.5
    selectedTopicIndex: number; // Stage 0.5
    keywords: string[];        // Stage 1
    references: string[];      // Stage 2
    outline: string;           // Stage 3
    draft: string;             // Stage 4
    critique: string;          // Stage 5
    finalDraft: string;        // Stage 6
    imageConcepts: Array<{ title: string; reason: string; keywords: string[]; recommendedStyle?: string; recommendedPalette?: 'medical' | 'calm' | 'warm' }>;  // Stage 7
    recommendedHashtags: HashtagCategory[];  // Stage 7 - AI 생성 해시태그
    sectionIllustrations: SectionIllustration[];  // Stage 7 - 섹션별 일러스트
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

// 프로필 기반 동적 워크플로 프롬프트 생성 함수
const getWorkflowPrompt = (profile: BlogProfile): string => {
    return `당신은 "Patient-First Clinical Blog Production Workflow v9.0"을 따르는 블로그 전문가입니다.

## 페르소나
${profile.persona}

## 공통 규칙 (문체 DNA)
- 시점: 1인칭 관찰자
- 전개 순서: [핵심 결론 → 즉각적 행동 → 위험 신호 → 상세 이유 → 닫기]
- 용어 원칙: 환자 용어 우선
- 문장 길이: 10-18어
- 톤: 친절하지만 단호

## 클리닉 포커스
${JSON.stringify(profile.clinic_focus)}

## 비즈니스 목표
${profile.business_goal}

## 타겟 독자
${profile.audience}`;
};

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
    // stageData를 localStorage에 저장 (탭 전환해도 데이터 유지)
    const [stageData, setStageData] = useLocalStorage<StageData>('blog-writer-stage-data', {
        ideation: [],
        selectedTopic: '',
        scoredTopics: [],
        selectedTopicIndex: 0,
        keywords: [],
        references: [],
        outline: '',
        draft: '',
        critique: '',
        finalDraft: '',
        imageConcepts: [],
        recommendedHashtags: [],
        sectionIllustrations: []
    });
    // currentOutput도 localStorage에 저장
    const [currentOutput, setCurrentOutput] = useLocalStorage<string>('blog-writer-output', '');
    const [copySuccess, setCopySuccess] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [savedDrafts, setSavedDrafts] = useLocalStorage<{ stage: number; content: string; date: string }[]>('blog-drafts', []);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [manualInputMode, setManualInputMode] = useState(false); // Stage 6 수동 입력 모드

    // 프로필 관리 state
    const [profiles, setProfiles] = useLocalStorage<BlogProfile[]>('blog-profiles', DEFAULT_PROFILES);
    const [selectedProfileId, setSelectedProfileId] = useLocalStorage<string>('selected-profile-id', 'default-tkm');
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

    // 현재 선택된 프로필 가져오기
    const selectedProfile = profiles.find(p => p.id === selectedProfileId) || profiles[0];

    // Stage 7 탭 state
    const [stage7Tab, setStage7Tab] = useState<'concepts' | 'sections'>('concepts');

    const getStagePrompt = (stage: WorkflowStage): string => {
        switch (stage) {
            case 0:
                return `${getWorkflowPrompt(selectedProfile)}

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
                return `${getWorkflowPrompt(selectedProfile)}

## Stage 0.5: 주제 스코어링

주제 후보들:
${stageData.ideation.join('\n')}

각 주제를 4대 축으로 평가하세요:
1. 행동성 (Actionability / 5점)
2. 검색 의도 (Intent Match / 5점)
3. 진료 연관성 (Relevancy / 5점)
4. 긴급성/차별성 (Urgency / 5점)

반드시 JSON 배열 형식으로 출력하세요 (점수 높은 순으로 정렬):
[
  {
    "title": "주제명",
    "score": 18,
    "summary": "핵심 질문이나 요약 한 줄"
  }
]`;

            case 1:
                return `${getWorkflowPrompt(selectedProfile)}

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
                return `${getWorkflowPrompt(selectedProfile)}

## Stage 2: 근거 설계

주제: "${stageData.selectedTopic}"

참고 자료 3-6개를 제안하세요:
- WM (서양의학): NICE, BMJ, APA 등
- KM (한의학): 대한한의학회 CPG, NIKOM 등
- 5년 이내 문헌 우선

각 자료의 핵심 내용을 요약하세요.`;

            case 3:
                return `${getWorkflowPrompt(selectedProfile)}

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
                return `${getWorkflowPrompt(selectedProfile)}

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
                return `${getWorkflowPrompt(selectedProfile)}

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
                return `${getWorkflowPrompt(selectedProfile)}

## Stage 6: 탈고

초고:
${stageData.draft}

수정 메모:
${stageData.critique}

수정 메모를 100% 반영하여 최종본을 완성하세요.
문장 흐름과 오탈자를 검토하세요.`;

            case 7:
                // 숏컷 트랙(Stage 6 직접 입력)인 경우 주제가 없을 수 있음
                const hasTopicFromWorkflow = stageData.selectedTopic && stageData.selectedTopic.trim();
                const topicInstruction = hasTopicFromWorkflow
                    ? `주제: "${stageData.selectedTopic}"`
                    : `주제: (아래 최종 글에서 핵심 주제를 추출하세요)`;

                const keywordsInstruction = stageData.keywords.length > 0
                    ? `키워드 클러스터: ${stageData.keywords.slice(0, 15).join(', ')}`
                    : `키워드 클러스터: (아래 최종 글에서 핵심 키워드를 추출하세요)`;

                return `${getWorkflowPrompt(selectedProfile)}

## Stage 7: 시각 프롬프트 설계 + 해시태그 생성

${topicInstruction}
${keywordsInstruction}
최종 글:
${stageData.finalDraft}

### TASK 1: 이미지 컨셉 (3-5개)

### 사용 가능한 스타일 라이브러리 (15종)
1. isometric-infographic: 아이소메트릭 인포그래픽 - 관계, 프로세스, 시스템을 3D 방식으로 시각화
2. infographic-chart: 인포그래픽 차트 - 데이터와 통계를 명확하게 제시
3. empathetic-character: 공감 캐릭터 - 감정, 증상, 자세를 친근하게 표현
4. herbal-sketch: 약재 스케치 - 약재의 식물학적 표현
5. empathetic-cutoon: 공감 컷툰 - 상황이나 감정을 스토리텔링 방식으로 전달
6. artistic-thumbnail: 예술적 썸네일 - 소셜 미디어 또는 블로그 포스트 썸네일
7. hand-drawn-diagram: 손그림 다이어그램 - 사이클, 관계, 간단한 프로세스 설명
8. medical-illustration: 의학 일러스트레이션 - 해부학적 구조 비교 또는 생리학적 프로세스
9. conceptual-metaphor: 개념적 은유 - 추상적인 의학 개념을 상징적인 오브제로 시각화
10. 2d-step-diagram: 2D 스텝 다이어그램 - 환자의 행동 지침, 치료 프로토콜
11. papercraft-illustration: 페이퍼크래프트 일러스트 - 신체 기관이나 프로세스를 따뜻하게 묘사
12. minimal-wellness-photo: 미니멀 웰니스 포토 - 약재, 차, 건강 음식을 감성적으로
13. continuous-line-drawing: 연속적인 한 줄 드로잉 - 세련되고 감성적인 방식으로 표현
14. conceptual-sketch: 개념적 스케치 - 복잡한 철학적/심리적 개념을 위트 있게 시각화
15. textured-digital-painting: 텍스처 디지털 페인팅 - 따뜻하고 아날로그적인 회화 질감
16. precision-medical: 정밀 의학도 - 해부학적 정확도, 색상 코딩, 텍스트 라벨 분리된 교과서 스타일

### 사용 가능한 색상 팔레트 (3종)
1. medical: 의료 톤 (녹색 계열 - #3A5A40 primary)
2. calm: 차분한 톤 (파란색 계열 - #5C7AEA primary)
3. warm: 따뜻한 톤 (베이지 계열 - #D4A373 primary)

### TASK 2: 블로그 게시용 해시태그 (# 제외)
블로그 노출도와 검색 유입을 위한 핵심 해시태그를 5개 분류로 생성하세요:
- 핵심증상: 주요 증상 관련 태그 4-5개 (예: 손목통증, 건초염, 키보드손목통증)
- 타겟상황: 타겟 독자/상황 태그 4-5개 (예: 직장인손목, 사무직통증, 육아맘손목)
- 행동솔루션: 행동/솔루션 태그 4-5개 (예: 손목스트레칭, 손목휴식, 손목보호대)
- 의학한의학: 의학/한의학 관련 태그 4-5개 (예: 건초염치료, 한의원, 침치료)
- 페르소나톤: 페르소나/톤 태그 3-4개 (예: 한의사칼럼, 환자중심, 통증관리)

### TASK 3: 섹션별 일러스트 (6개) - 글 기반 프롬프트

**중요: 최종 글에서 실제 6개 섹션을 파싱하여 각 섹션의 원문 텍스트를 추출하세요.**

최종 글의 6개 섹션을 식별하고, 각 섹션의 **실제 원고 내용**을 sectionContent 필드에 포함하세요.
이 sectionContent는 이미지 생성 시 글 기반 프롬프트로 사용됩니다.

섹션 구조 (## 또는 ### 헤딩으로 구분):
1. Answer First (핵심 결론) - "결론", "핵심", "먼저" 등의 키워드로 식별
2. Action (즉각적 행동) - "행동", "실천", "할 일", "방법" 등으로 식별  
3. Warning (위험 신호) - "주의", "경고", "위험" 등으로 식별
4. The 'Why' (상세 원인) - "원인", "이유", "왜", "기전" 등으로 식별
5. Proof (사례와 근거) - "사례", "근거", "연구" 등으로 식별
6. Closing (요약 및 격려) - "마치며", "요약", "격려" 등으로 식별

각 섹션에 대해:
- **sectionContent**: 해당 섹션의 실제 원고 텍스트 (100-300자, 헤딩 제외한 본문)
- **summary**: 1-2문장으로 요약 (짧은 버전)
- **keywords**: 시각적 키워드 3-5개 (한글)
- **recommendedPalette**: 색상 팔레트 (medical/calm/warm)

**중요**: sectionContent에는 원고의 실제 문장을 그대로 포함하세요. 키워드만 나열하지 마세요.

### 출력 형식 (반드시 JSON)
{
  "extractedTopic": "어지럼증의 원인과 관리법",
  "imageConcepts": [
    {
      "title": "손그림 다이어그램 - 호흡법",
      "reason": "단계별 실행 방법을 직관적으로 표현",
      "keywords": ["호흡", "단계", "손그림"],
      "recommendedStyle": "hand-drawn-diagram",
      "recommendedPalette": "calm"
    }
  ],
  "hashtags": [
    { "category": "핵심증상", "tags": ["손목통증", "건초염", "손목건초염", "키보드손목통증"] },
    { "category": "타겟상황", "tags": ["직장인손목", "사무직통증", "육아맘손목"] },
    { "category": "행동솔루션", "tags": ["손목스트레칭", "손목휴식", "손목찜질"] },
    { "category": "의학한의학", "tags": ["건초염치료", "한의원건초염", "침치료"] },
    { "category": "페르소나톤", "tags": ["한의사칼럼", "환자중심", "통증관리"] }
  ],
  "sectionIllustrations": [
    {
      "sectionNumber": 1,
      "sectionTitle": "Answer First",
      "sectionContent": "공황장애는 갑작스럽게 찾아오는 극심한 불안 발작입니다. 심장이 터질 것 같고, 숨을 쉴 수 없을 것 같은 공포가 밀려옵니다. 하지만 이것은 치료 가능한 증상이며, 적절한 관리로 충분히 조절할 수 있습니다.",
      "summary": "공황장애는 갑작스러운 불안 발작이 특징이며, 적절한 관리로 조절 가능합니다.",
      "keywords": ["불안", "발작", "관리", "희망"],
      "recommendedPalette": "calm"
    },
    {
      "sectionNumber": 2,
      "sectionTitle": "Action",
      "sectionContent": "1. 4-7-8 호흡법: 4초 들이쉬고, 7초 참고, 8초 내쉽니다. 2. 안전한 장소를 미리 정해두세요. 3. 증상이 반복되면 전문가 상담을 받으세요.",
      "summary": "호흡 조절, 안전 장소 확보, 전문가 상담이 즉각적으로 도움이 됩니다.",
      "keywords": ["호흡", "안전", "상담"],
      "recommendedPalette": "medical"
    }
  ]
}`;

            default:
                return '';
        }
    };

    // Helper: Save current output to appropriate stageData field
    const saveCurrentOutputToStageData = () => {
        if (!currentOutput) return;

        switch (currentStage) {
            case 0:
                setStageData(prev => ({ ...prev, ideation: currentOutput.split('\n').filter(l => l.trim()) }));
                break;
            case 0.5:
                // Stage 0.5 uses scoredTopics, which is already managed by handleExecuteStage
                break;
            case 1:
                setStageData(prev => ({ ...prev, keywords: currentOutput.split('\n').filter(l => l.trim()) }));
                break;
            case 2:
                setStageData(prev => ({ ...prev, references: currentOutput.split('\n').filter(l => l.trim()) }));
                break;
            case 3:
                setStageData(prev => ({ ...prev, outline: currentOutput }));
                break;
            case 4:
                setStageData(prev => ({ ...prev, draft: currentOutput }));
                break;
            case 5:
                setStageData(prev => ({ ...prev, critique: currentOutput }));
                break;
            case 6:
                setStageData(prev => ({ ...prev, finalDraft: currentOutput }));
                break;
            case 7:
                // Stage 7 uses imageConcepts, which is already managed by handleExecuteStage
                break;
        }
    };

    // Helper: Load stageData to currentOutput when entering a stage
    const loadStageDataToOutput = (stage: WorkflowStage) => {
        switch (stage) {
            case 0:
                setCurrentOutput(stageData.ideation.join('\n'));
                break;
            case 0.5:
                // Stage 0.5 displays scoredTopics as cards, not in currentOutput
                setCurrentOutput('');
                break;
            case 1:
                setCurrentOutput(stageData.keywords.join('\n'));
                break;
            case 2:
                setCurrentOutput(stageData.references.join('\n'));
                break;
            case 3:
                setCurrentOutput(stageData.outline);
                break;
            case 4:
                setCurrentOutput(stageData.draft);
                break;
            case 5:
                setCurrentOutput(stageData.critique);
                break;
            case 6:
                setCurrentOutput(stageData.finalDraft);
                break;
            case 7:
                // Stage 7 displays imageConcepts as cards, not in currentOutput
                setCurrentOutput('');
                break;
            default:
                setCurrentOutput('');
        }
    };

    const handleExecuteStage = async () => {
        // Stage 6 수동 입력 모드인 경우 AI 호출 없이 바로 처리
        if (currentStage === 6 && manualInputMode) {
            if (!currentOutput.trim()) {
                alert('원고를 입력해주세요. 오른쪽 출력 패널에서 직접 입력하거나 붙여넣기 하세요.');
                return;
            }
            // currentOutput이 이미 입력되어 있으므로 stageData에만 저장
            setStageData(prev => ({ ...prev, finalDraft: currentOutput }));
            return;
        }

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
                    model: 'gemini-3-pro-preview',
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
                        model: 'gpt-5.2',
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
                    try {
                        // JSON 파싱 시도
                        let jsonStr = result;
                        const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
                        if (jsonMatch) {
                            jsonStr = jsonMatch[1].trim();
                        } else {
                            const arrayStart = result.indexOf('[');
                            const arrayEnd = result.lastIndexOf(']');
                            if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
                                jsonStr = result.substring(arrayStart, arrayEnd + 1);
                            }
                        }
                        const scoredTopics = JSON.parse(jsonStr);
                        if (Array.isArray(scoredTopics) && scoredTopics.length > 0) {
                            setStageData(prev => ({
                                ...prev,
                                scoredTopics,
                                selectedTopicIndex: 0,
                                selectedTopic: scoredTopics[0].title
                            }));
                        }
                    } catch {
                        // JSON 파싱 실패 시 결과 그대로 저장
                        setStageData(prev => ({ ...prev, selectedTopic: result }));
                    }
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
                        // 마크다운 코드블록 제거 (```json ... ```)
                        let jsonStr = result;
                        const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
                        if (jsonMatch) {
                            jsonStr = jsonMatch[1].trim();
                        } else {
                            // 코드블록이 없으면 JSON 객체/배열 시작점 찾기
                            const objStart = result.indexOf('{');
                            const objEnd = result.lastIndexOf('}');
                            if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
                                jsonStr = result.substring(objStart, objEnd + 1);
                            }
                        }

                        // JSON 파싱 시도
                        const parsed = JSON.parse(jsonStr);

                        // 새 형식 (imageConcepts + hashtags + sectionIllustrations 객체)
                        if (parsed.imageConcepts && Array.isArray(parsed.imageConcepts)) {
                            setStageData(prev => ({
                                ...prev,
                                // 숏컷 트랙에서 주제가 없을 경우 AI가 추출한 주제 사용
                                selectedTopic: prev.selectedTopic || parsed.extractedTopic || '',
                                imageConcepts: parsed.imageConcepts,
                                recommendedHashtags: parsed.hashtags || [],
                                sectionIllustrations: parsed.sectionIllustrations || []
                            }));
                        }
                        // 이전 형식 호환 (배열만 있는 경우)
                        else if (Array.isArray(parsed)) {
                            setStageData(prev => ({ ...prev, imageConcepts: parsed }));
                        }
                    } catch {
                        // JSON 파싱 실패 시 결과 그대로 저장 (이미 setCurrentOutput은 위에서 호출됨)
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
            // Save current output to stageData before moving
            saveCurrentOutputToStageData();
            const nextStage = stages[currentIndex + 1];
            setCurrentStage(nextStage);
            // Load existing data for next stage
            loadStageDataToOutput(nextStage);
        }
    };

    const handlePrevStage = () => {
        const stages: WorkflowStage[] = [0, 0.5, 1, 2, 3, 4, 5, 6, 7];
        const currentIndex = stages.indexOf(currentStage);
        if (currentIndex > 0) {
            // Save current output to stageData before moving
            saveCurrentOutputToStageData();
            const prevStage = stages[currentIndex - 1];
            setCurrentStage(prevStage);
            // Load existing data for previous stage
            loadStageDataToOutput(prevStage);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(currentOutput);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    // 리치 텍스트 복사 (백록담 블로그 스타일 - 네이버 블로그에 바로 붙여넣기 가능)
    const handleCopyRichText = async () => {
        // Stage 7에서도 finalDraft를 사용하도록 수정
        const textToCopy = stageData.finalDraft || currentOutput;
        if (!textToCopy) return;

        // 마크다운을 백록담 블로그 스타일 HTML로 변환
        let html = textToCopy
            // H2 제목: 깔끔하고 눈에 띄는 섹션 제목
            .replace(/^## (.+)$/gm, '<h2 style="font-size:22px;font-weight:700;color:#1a1a1a;margin:32px 0 16px 0;padding-bottom:8px;border-bottom:2px solid #e0e0e0;">$1</h2>')
            // H3 소제목
            .replace(/^### (.+)$/gm, '<h3 style="font-size:18px;font-weight:600;color:#333;margin:24px 0 12px 0;">$1</h3>')
            // H1 대제목
            .replace(/^# (.+)$/gm, '<h1 style="font-size:28px;font-weight:700;color:#1a1a1a;margin:40px 0 20px 0;">$1</h1>')
            // 굵게/기울임
            .replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:600;color:#1a1a1a;">$1</strong>')
            .replace(/\*(.+?)\*/g, '<em style="font-style:italic;">$1</em>')
            // 인용문: 백록담 스타일
            .replace(/^> (.+)$/gm, '<blockquote style="border-left:4px solid #4a90a4;background:#f8fafb;padding:16px 20px;margin:20px 0;color:#555;font-style:italic;border-radius:0 8px 8px 0;">$1</blockquote>')
            // 목록
            .replace(/^- (.+)$/gm, '<li style="margin:8px 0;padding-left:8px;">$1</li>')
            .replace(/^\d+\. (.+)$/gm, '<li style="margin:8px 0;padding-left:8px;">$1</li>')
            // 코드
            .replace(/`(.+?)`/g, '<code style="background:#f4f4f4;padding:3px 8px;border-radius:4px;font-family:monospace;font-size:14px;color:#e83e8c;">$1</code>')
            // 문단 구분 (빈 줄)
            .replace(/\n\n/g, '</p><p style="margin:20px 0;line-height:1.9;color:#333;font-size:16px;">')
            // 줄바꿈
            .replace(/\n/g, '<br>');

        // li 태그를 ul로 감싸기
        html = html.replace(/(<li[^>]*>.*?<\/li>(?:<br>)?)+/g, (match) => {
            return '<ul style="margin:16px 0;padding-left:24px;list-style-type:disc;">' + match.replace(/<br>/g, '') + '</ul>';
        });

        // 전체 래퍼
        html = `<div style="font-family:'Pretendard','Noto Sans KR',-apple-system,BlinkMacSystemFont,'Malgun Gothic',sans-serif;line-height:1.9;color:#333;max-width:720px;"><p style="margin:20px 0;line-height:1.9;color:#333;font-size:16px;">${html}</p></div>`;

        try {
            const blob = new Blob([html], { type: 'text/html' });
            const clipboardItem = new ClipboardItem({ 'text/html': blob });
            await navigator.clipboard.write([clipboardItem]);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch {
            navigator.clipboard.writeText(textToCopy);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        }
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
        // AI가 생성한 해시태그를 로컬 텍스트 파일로 자동 저장 (# 제외)
        if (stageData.recommendedHashtags.length > 0) {
            // 분류별로 해시태그 정리
            let content = '🏷️ 블로그 게시용 추천 태그\n\n';

            stageData.recommendedHashtags.forEach(category => {
                // # 제거하고 태그만 추출
                const cleanedTags = category.tags.map(tag =>
                    tag.replace(/^#/, '').trim()
                ).filter(tag => tag.length > 0);

                content += `[${category.category}]\n`;
                content += cleanedTags.join(', ') + '\n\n';
            });

            // 모든 태그를 한 줄로 (복사 편의용)
            const allTags = stageData.recommendedHashtags
                .flatMap(cat => cat.tags.map(tag => tag.replace(/^#/, '').trim()))
                .filter(tag => tag.length > 0);
            content += '\n[전체 태그 - 복사용]\n';
            content += allTags.join(' ');

            // 파일명 생성 (해시태그_YYYYMMDD_HHmmss.txt)
            const now = new Date();
            const timestamp = now.getFullYear().toString() +
                (now.getMonth() + 1).toString().padStart(2, '0') +
                now.getDate().toString().padStart(2, '0') + '_' +
                now.getHours().toString().padStart(2, '0') +
                now.getMinutes().toString().padStart(2, '0') +
                now.getSeconds().toString().padStart(2, '0');
            const filename = `해시태그_${timestamp}.txt`;

            // Blob으로 파일 다운로드
            const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        // 최종 글(finalDraft)도 마크다운 파일로 자동 저장
        if (stageData.finalDraft) {
            // 마크다운 파일 내용 구성
            let mdContent = `# ${stageData.selectedTopic || '블로그 글'}\n\n`;
            mdContent += `> 작성일: ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;
            mdContent += '---\n\n';
            mdContent += stageData.finalDraft;

            // 파일명 생성 (최종글_YYYYMMDD_HHmmss.md)
            const now = new Date();
            const timestamp = now.getFullYear().toString() +
                (now.getMonth() + 1).toString().padStart(2, '0') +
                now.getDate().toString().padStart(2, '0') + '_' +
                now.getHours().toString().padStart(2, '0') +
                now.getMinutes().toString().padStart(2, '0') +
                now.getSeconds().toString().padStart(2, '0');
            const mdFilename = `최종글_${timestamp}.md`;

            // Blob으로 마크다운 파일 다운로드
            const mdBlob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
            const mdUrl = URL.createObjectURL(mdBlob);
            const mdLink = document.createElement('a');
            mdLink.href = mdUrl;
            mdLink.download = mdFilename;
            document.body.appendChild(mdLink);
            mdLink.click();
            document.body.removeChild(mdLink);
            URL.revokeObjectURL(mdUrl);
        }

        // 추천 이미지 컨셉 + 섹션 일러스트 카드 모두 합쳐서 전달
        if (onStage7Complete && (stageData.imageConcepts.length > 0 || stageData.sectionIllustrations.length > 0)) {
            // 추천 이미지 컨셉 (3-5개)
            const conceptCards = stageData.imageConcepts.map(c => ({
                title: c.title,
                keywords: c.keywords,
                recommendedStyle: c.recommendedStyle,
                recommendedPalette: c.recommendedPalette
            }));

            // 섹션 일러스트 카드 (6개) - section-illustration 스타일 적용
            // 글 기반 프롬프트: sectionContent 전체를 description으로 전달
            const sectionCards = stageData.sectionIllustrations.map(s => ({
                title: `${s.sectionNumber}. ${s.sectionTitle}`,
                keywords: s.keywords,
                description: s.sectionContent || s.summary, // 실제 원고 섹션 전문
                recommendedStyle: 'section-illustration' as const,
                recommendedPalette: s.recommendedPalette
            }));

            // 모두 합쳐서 전달
            onStage7Complete({
                topic: stageData.selectedTopic,
                concepts: [...conceptCards, ...sectionCards]
            });
        }
    };

    // 섹션 일러스트 개별 생성 (section-illustration 스타일 사용)
    const handleGenerateSectionIllustration = (section: SectionIllustration) => {
        if (onStage7Complete) {
            // 글 기반 프롬프트: sectionContent 전체를 description으로 전달
            const conceptData = {
                title: `${section.sectionNumber}. ${section.sectionTitle}`,
                keywords: section.keywords,
                description: section.sectionContent || section.summary, // 실제 원고 섹션 전문
                recommendedStyle: 'section-illustration' as const,
                recommendedPalette: section.recommendedPalette
            };

            onStage7Complete({
                topic: `${stageData.selectedTopic} - ${section.sectionTitle}`,
                concepts: [conceptData]
            });
        }
    };

    // 프로필 관리 핸들러
    const handleSaveProfile = (profile: BlogProfile) => {
        const existingIndex = profiles.findIndex(p => p.id === profile.id);
        if (existingIndex >= 0) {
            const updatedProfiles = [...profiles];
            updatedProfiles[existingIndex] = profile;
            setProfiles(updatedProfiles);
        } else {
            setProfiles([...profiles, profile]);
            setSelectedProfileId(profile.id);
        }
    };

    const handleDeleteProfile = (profileId: string) => {
        const filteredProfiles = profiles.filter(p => p.id !== profileId);
        setProfiles(filteredProfiles);
        if (selectedProfileId === profileId && filteredProfiles.length > 0) {
            setSelectedProfileId(filteredProfiles[0].id);
        }
    };

    const handleSelectTopic = (index: number) => {
        setStageData(prev => ({
            ...prev,
            selectedTopicIndex: index,
            selectedTopic: prev.scoredTopics[index].title
        }));
    };

    const stageInfo = STAGE_INFO[currentStage];
    const stages: WorkflowStage[] = [0, 0.5, 1, 2, 3, 4, 5, 6, 7];

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
                <Panel>
                    <div className="flex flex-col gap-4 flex-grow">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-300">워크플로 진행</h3>
                            <div className="flex gap-2 items-center">
                                {/* 프로필 선택 */}
                                <select
                                    value={selectedProfileId}
                                    onChange={(e) => setSelectedProfileId(e.target.value)}
                                    className="px-2 py-1 text-xs bg-gray-700 text-white rounded border border-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                >
                                    {profiles.map(p => (
                                        <option key={p.id} value={p.id}>{p.name}</option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => setIsProfileModalOpen(true)}
                                    className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
                                    title="프로필 관리"
                                >
                                    ⚙️
                                </button>
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
                        </div>

                        {/* Stage Progress */}
                        <div className="flex gap-1 overflow-x-auto pb-2">
                            {stages.map((stage, idx) => (
                                <button
                                    key={stage}
                                    onClick={() => {
                                        saveCurrentOutputToStageData();
                                        setCurrentStage(stage);
                                        loadStageDataToOutput(stage);
                                    }}
                                    className={`flex-shrink-0 px-2 py-1 rounded text-xs transition-all ${currentStage === stage
                                        ? 'bg-indigo-600 text-white'
                                        : stage < currentStage || (stage === 0.5 && currentStage > 0.5)
                                            ? 'bg-green-600/30 text-green-300'
                                            : 'bg-gray-700 text-gray-400'
                                        }`}
                                >
                                    {STAGE_INFO[stage].icon} {stage}
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

                        {/* Stage 6: Manual Input Mode */}
                        {currentStage === 6 && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="block text-sm font-medium text-gray-300">
                                        입력 방식 선택
                                    </label>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setManualInputMode(false)}
                                            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${!manualInputMode ? 'bg-indigo-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                                        >
                                            🤖 AI 생성
                                        </button>
                                        <button
                                            onClick={() => {
                                                setManualInputMode(true);
                                                setIsEditMode(true); // 수동 입력 모드 활성화 시 자동으로 편집 모드 활성화
                                            }}
                                            className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${manualInputMode ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                                        >
                                            ✍️ 직접 입력
                                        </button>
                                    </div>
                                </div>

                                {manualInputMode && (
                                    <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
                                        <p className="text-sm text-green-300">
                                            💡 <strong>직접 입력 모드</strong>: 오른쪽 출력 패널에서 원고를 직접 입력/붙여넣기 하세요.
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            입력 후 "다음 →" 버튼을 클릭하면 7단계에서 이미지 카드와 태그가 생성됩니다.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Stage 0.5: Topic Selection Cards */}
                        {currentStage === 0.5 && stageData.scoredTopics.length > 0 && (
                            <div className="space-y-2">
                                <p className="text-sm text-gray-400">평가된 주제 ({stageData.scoredTopics.length}개):</p>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {stageData.scoredTopics.map((topic, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => handleSelectTopic(idx)}
                                            className={`cursor-pointer p-3 rounded-lg border transition-all ${stageData.selectedTopicIndex === idx
                                                ? 'border-green-500 bg-green-900/30 shadow-lg'
                                                : 'border-gray-600 bg-gray-800/30 hover:border-indigo-500 hover:bg-indigo-900/20'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-semibold text-white flex-1">{topic.title}</span>
                                                <span className="text-yellow-400 font-bold ml-2">{topic.score}점</span>
                                            </div>
                                            <p className="text-sm text-gray-400">{topic.summary}</p>
                                            <div className="flex items-center gap-2 mt-2">
                                                {idx === 0 && <span className="text-xs text-green-400">🥇 AI 추천</span>}
                                                {stageData.selectedTopicIndex === idx && (
                                                    <span className="text-xs text-green-300">✅ 선택됨</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Stage Data Summary */}
                        {currentStage > 0.5 && currentStage !== 7 && stageData.selectedTopic && (
                            <div className="bg-gray-800/50 rounded-lg p-3 text-sm">
                                <p className="text-gray-400">선정된 주제:</p>
                                <p className="text-white truncate">{stageData.selectedTopic.substring(0, 100)}...</p>
                            </div>
                        )}

                        {/* Stage 7: Tabs and Cards */}
                        {currentStage === 7 && (stageData.imageConcepts.length > 0 || stageData.sectionIllustrations.length > 0) && (
                            <div className="space-y-3">
                                {/* Tab Navigation */}
                                <div className="flex gap-2 border-b border-gray-700">
                                    <button
                                        onClick={() => setStage7Tab('concepts')}
                                        className={`px-4 py-2 text-sm font-medium transition-colors ${stage7Tab === 'concepts'
                                            ? 'text-indigo-400 border-b-2 border-indigo-400'
                                            : 'text-gray-400 hover:text-gray-300'
                                            }`}
                                    >
                                        🎨 추천 이미지 컨셉 ({stageData.imageConcepts.length})
                                    </button>
                                    <button
                                        onClick={() => setStage7Tab('sections')}
                                        className={`px-4 py-2 text-sm font-medium transition-colors ${stage7Tab === 'sections'
                                            ? 'text-green-400 border-b-2 border-green-400'
                                            : 'text-gray-400 hover:text-gray-300'
                                            }`}
                                    >
                                        📚 섹션별 일러스트 ({stageData.sectionIllustrations.length})
                                    </button>
                                </div>

                                {/* Tab Content: Image Concepts */}
                                {stage7Tab === 'concepts' && stageData.imageConcepts.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-sm text-gray-400">생성된 이미지 컨셉 ({stageData.imageConcepts.length}개):</p>
                                        <div className="space-y-2 max-h-96 overflow-y-auto">
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
                                                    {concept.recommendedStyle && (
                                                        <p className="text-xs text-purple-300 mt-2">🎨 {concept.recommendedStyle}</p>
                                                    )}
                                                    {concept.recommendedPalette && (
                                                        <p className="text-xs text-purple-300">🎨 {concept.recommendedPalette} 팔레트</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Tab Content: Section Illustrations */}
                                {stage7Tab === 'sections' && stageData.sectionIllustrations.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-sm text-gray-400">섹션별 일러스트 ({stageData.sectionIllustrations.length}개):</p>
                                        <div className="space-y-3 max-h-96 overflow-y-auto">
                                            {stageData.sectionIllustrations.map((section, idx) => (
                                                <div key={idx} className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-lg p-4">
                                                    {/* 섹션 헤더 */}
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="flex items-center justify-center w-6 h-6 bg-green-600 text-white text-xs font-bold rounded-full">
                                                            {section.sectionNumber}
                                                        </span>
                                                        <h4 className="text-white font-semibold text-sm">{section.sectionTitle}</h4>
                                                    </div>

                                                    {/* 요약 */}
                                                    <p className="text-gray-300 text-xs mb-2 leading-relaxed">{section.summary}</p>

                                                    {/* 키워드 */}
                                                    <div className="flex flex-wrap gap-1 mb-2">
                                                        {section.keywords.map((kw, kidx) => (
                                                            <span key={kidx} className="px-2 py-0.5 bg-green-600/40 text-green-200 text-xs rounded">
                                                                🏷️ {kw}
                                                            </span>
                                                        ))}
                                                    </div>

                                                    {/* 팔레트 및 스타일 */}
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex gap-2 text-xs">
                                                            <span className="text-green-300">🎨 {section.recommendedPalette} 팔레트</span>
                                                            <span className="text-green-300">📖 section-illustration</span>
                                                        </div>
                                                        <button
                                                            onClick={() => handleGenerateSectionIllustration(section)}
                                                            className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded transition-colors"
                                                        >
                                                            → 이미지 생성
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
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
                                disabled={
                                    isLoading ||
                                    (currentStage === 6 && manualInputMode ? !currentOutput.trim() : !isApiKeyReady) ||
                                    (currentStage === 0 && !userInput.trim())
                                }
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
                            {currentStage === 7 && (stageData.imageConcepts.length > 0 || stageData.sectionIllustrations.length > 0) && (
                                <div className="flex flex-col items-end gap-1">
                                    <span className="text-xs text-yellow-400">💡 서식 복사 먼저 하세요!</span>
                                    <button
                                        onClick={handleCompleteStage7}
                                        className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
                                        title="먼저 '서식 복사' 버튼으로 최종 글을 복사하세요"
                                    >
                                        🎨 블로그 이미지에 카드 생성
                                    </button>
                                </div>
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
                            {(currentOutput || (currentStage === 6 && manualInputMode)) && (
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
                                        onClick={handleCopyRichText}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-500 transition-colors"
                                        title="네이버 블로그에 바로 붙여넣기 가능"
                                    >
                                        <ClipboardIcon className="w-4 h-4" />
                                        <span>서식 복사</span>
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
                            ) : (currentOutput || (currentStage === 6 && manualInputMode)) ? (
                                (isEditMode || (currentStage === 6 && manualInputMode && !currentOutput)) ? (
                                    <textarea
                                        value={currentOutput}
                                        onChange={(e) => setCurrentOutput(e.target.value)}
                                        placeholder={currentStage === 6 && manualInputMode ? "원고를 직접 입력하거나 붙여넣기 하세요..." : ""}
                                        className="w-full h-full min-h-[300px] bg-gray-800 text-gray-200 text-sm font-mono p-2 rounded border border-yellow-500/50 focus:outline-none focus:ring-1 focus:ring-yellow-500 resize-none"
                                    />
                                ) : currentStage === 6 ? (
                                    <div className="notion-style-output prose prose-invert max-w-none">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkGfm]}
                                            components={{
                                                h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 text-white border-b border-gray-700 pb-2">{children}</h1>,
                                                h2: ({ children }) => <h2 className="text-xl font-semibold mb-3 text-gray-100 mt-6">{children}</h2>,
                                                h3: ({ children }) => <h3 className="text-lg font-medium mb-2 text-gray-200 mt-4">{children}</h3>,
                                                p: ({ children }) => <p className="text-base text-gray-300 mb-3 leading-relaxed">{children}</p>,
                                                ul: ({ children }) => <ul className="list-disc pl-6 mb-3 text-gray-300 space-y-1">{children}</ul>,
                                                ol: ({ children }) => <ol className="list-decimal pl-6 mb-3 text-gray-300 space-y-1">{children}</ol>,
                                                li: ({ children }) => <li className="text-gray-300">{children}</li>,
                                                strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                                                em: ({ children }) => <em className="italic text-gray-200">{children}</em>,
                                                blockquote: ({ children }) => (
                                                    <blockquote className="border-l-4 border-indigo-500 pl-4 py-2 my-3 bg-gray-800/50 text-gray-300 italic rounded-r">{children}</blockquote>
                                                ),
                                                code: ({ children, className }) => {
                                                    const isInline = !className;
                                                    return isInline
                                                        ? <code className="bg-gray-800 px-1.5 py-0.5 rounded text-sm text-indigo-300">{children}</code>
                                                        : <code className="block bg-gray-800 p-3 rounded my-2 text-sm text-gray-200 overflow-x-auto">{children}</code>;
                                                },
                                                hr: () => <hr className="my-6 border-gray-700" />,
                                            }}
                                        >
                                            {currentOutput}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    <pre className="text-sm text-gray-200 whitespace-pre-wrap font-mono">
                                        {currentOutput}
                                    </pre>
                                )
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                                    <span className="text-4xl mb-2">{stageInfo.icon}</span>
                                    <p>{stageInfo.name} 단계</p>
                                    {currentStage === 6 && manualInputMode ? (
                                        <div className="text-center mt-4">
                                            <p className="text-sm text-green-400">✍️ 직접 입력 모드</p>
                                            <p className="text-xs text-gray-400 mt-2">
                                                [수정] 버튼을 클릭하여 원고를 입력하세요
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-sm">[실행] 버튼을 클릭하세요</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </Panel>
            </div>

            {/* 프로필 관리 모달 */}
            <ProfileManagerModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                profiles={profiles}
                selectedProfileId={selectedProfileId}
                onSelectProfile={setSelectedProfileId}
                onSaveProfile={handleSaveProfile}
                onDeleteProfile={handleDeleteProfile}
            />
        </>
    );
};

export default BlogWriterEditor;
