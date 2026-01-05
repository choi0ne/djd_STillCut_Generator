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
    onStage7Complete?: (data: { topic: string; finalDraft: string; concepts: Array<{ title: string; keywords: string[]; description?: string; recommendedStyle?: string; recommendedPalette?: 'medical' | 'calm' | 'warm' }> }) => void;
}

type WorkflowStage = 0 | 0.5 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface HashtagCategory {
    category: string;
    tags: string[];
}

interface SectionIllustration {
    sectionNumber: number;
    sectionTitle: string; // "Answer First", "Action" 등
    summary: string; // 섹션 내용 요약 (짧은 버전) - 이미지 제목용
    manuscriptSummary: string; // ⭐ 원고 기반 2-3문장 서술형 요약 (100-250자) - 새 필드
    sectionContent?: string; // 역호환용 (deprecated, manuscriptSummary 사용 권장)
    keywords: string[];
    recommendedPalette: 'medical' | 'calm' | 'warm';
}

// ⭐ 클러스터 시리즈 제안 인터페이스
interface ClusterSuggestion {
    type: 'main' | 'drill-down' | 'lateral' | 'follow-up';
    title: string;
    reason: string;
    estimatedSearchVolume: 'high' | 'medium' | 'low';
    priority: number;  // 1-4 (1이 가장 높음)
}

// ⭐ 확장된 ScoredTopic 인터페이스
interface ScoredTopic {
    title: string;
    score: number;
    summary: string;
    seriesHint?: string;                    // 시리즈 확장 가능성 힌트
    clusterSuggestions?: ClusterSuggestion[];  // AI 생성 시리즈 제안
}

interface StageData {
    ideation: string[];        // Stage 0
    selectedTopic: string;     // Stage 0.5
    scoredTopics: ScoredTopic[];  // Stage 0.5 - 확장된 타입
    selectedTopicIndex: number; // Stage 0.5
    // ⭐ 클러스터 관련 필드 추가
    selectedCluster?: {
        main: string;
        series: ClusterSuggestion[];
    };
    currentSeriesContext?: {
        type: 'main' | 'drill-down' | 'lateral' | 'follow-up';
        cluster: ClusterSuggestion[];
    };
    keywords: string[];        // Stage 1
    references: string[];      // Stage 2
    outline: string;           // Stage 3
    draft: string;             // Stage 4
    critique: string;          // Stage 5
    finalDraft: string;        // Stage 6
    imageConcepts: Array<{ title: string; reason: string; keywords: string[]; recommendedStyle?: string; recommendedPalette?: 'medical' | 'calm' | 'warm' }>;  // Stage 7
    recommendedHashtags: HashtagCategory[];  // Stage 7 - AI 생성 해시태그
    sectionIllustrations: SectionIllustration[];  // Stage 7 - 섹션별 일러스트
    seriesKeywords: Array<{ title: string; type: string; reason: string }>;  // Stage 7 - 시리즈 키워드
}

const STAGE_INFO: { [key: number]: { name: string; description: string; icon: string } } = {
    0: { name: '아이디에이션', description: '주제 후보 5-10개 생성', icon: '💡' },
    0.5: { name: '주제 스코어링', description: '4대 축 기준 주제 선정', icon: '📊' },
    1: { name: '키워드 클러스터', description: 'SEO 롱테일 키워드 20개+', icon: '🔍' },
    2: { name: '근거 설계', description: 'WM/KM 참고 자료 수집', icon: '📚' },
    3: { name: '아웃라인', description: '8섹션 + 12블록 맵핑', icon: '📝' },
    4: { name: '집필', description: '8섹션 + FAQ + 참고자료', icon: '✍️' },
    5: { name: '초고 비평', description: '5C 체크리스트 검증', icon: '🔎' },
    6: { name: '탈고', description: '최종본 완성', icon: '✅' },
    7: { name: '시각 프롬프트 설계', description: '이미지 + 시리즈 키워드', icon: '🎨' }
};

// ✨ 고정 작성자 정보 (프로필이 변해도 항상 동일)
const FIXED_AUTHOR = {
    name: '최장혁',
    title: '한의사',
    clinic: '동제당한의원',
    gender: '남성',
    age: '40대',
    role: '원장',
    signature: '✍️ 동제당한의원 원장 최장혁 감수'
};

// 프로필 기반 동적 워크플로 프롬프트 생성 함수
const getWorkflowPrompt = (profile: BlogProfile): string => {
    return `당신은 "Patient-First Clinical Blog Production Workflow v9.0"을 따르는 블로그 전문가입니다.

## 🔴🔴🔴 절대 규칙: 고정 작성자 (어떤 프로필을 선택해도 이 정보만 사용!)
**⛔ 다른 이름 생성 절대 금지 ⛔**

| 항목 | 값 (고정) |
|------|----------|
| 작성자 이름 | ${FIXED_AUTHOR.name} |
| 직함 | ${FIXED_AUTHOR.title} |
| 소속 | ${FIXED_AUTHOR.clinic} |
| 직위 | ${FIXED_AUTHOR.role} |
| 성별 | ${FIXED_AUTHOR.gender} |
| 서명 | "${FIXED_AUTHOR.signature}" |

⚠️ 글에서 **"저는 한의사 최장혁입니다"**, **"동제당한의원 원장 최장혁입니다"** 이렇게만 사용하세요.
⚠️ 다른 이름(김OO, 박OO, 최지영, 이OO 등) 절대 사용 금지!
⚠️ "여성전문한의사", "통증전문한의사" 같은 표현 뒤에 다른 이름 붙이지 마세요!
⚠️ 글 마무리에 항상 "${FIXED_AUTHOR.signature}" 문구를 포함하세요.

## 페르소나 (글쓰기 스타일/포커스 - 프로필에 따라 변경)
${profile.persona}
(⚠️ 위 페르소나가 무엇이든 작성자 이름은 반드시 "${FIXED_AUTHOR.name}"만 사용!)

## 🔴 글톤 고정 규칙 (어떤 프로필이든 이 규칙은 변하지 않음!)
**1️⃣ 시점: 반드시 1인칭 (저, 제가, 제 경험)**
- ✅ "저는 동제당한의원 원장 최장혁입니다"
- ✅ "제가 임상에서 본 환자들 중..."
- ✅ "저의 경험상..."
- ❌ "최장혁 원장은..." (3인칭 금지)
- ❌ "한의사가 말하길..." (3인칭 금지)

**2️⃣ 전개 순서 (고정)**
핵심 결론 → 즉각적 행동 → 위험 신호 → 상세 이유 → 닫기

**3️⃣ 문체 (고정)**
- 용어: 환자 용어 우선 (전문 용어 ❌)
- 문장 길이: 10-18어
- 톤: 친절하지만 단호
- 존칭: "~하세요", "~입니다"

## 클리닉 포커스
${JSON.stringify(profile.clinic_focus)}

## 비즈니스 목표
${profile.business_goal}

## 타겟 독자
${profile.audience}

## 🎨 환자 캐릭터 프롬프트 (이미지 생성용)
이미지 생성 시 아래 환자 캐릭터 특성을 반영하세요:
${profile.patientCharacterPrompt || '기본 환자 캐릭터 (30대 중반, 성별 중립, 오피스 캐주얼)'}

⚠️ 이미지에 의사/한의사 캐릭터는 사용하지 않습니다 (권위는 텍스트에서 확보).
환자 캐릭터는 독자 대리인 역할로, 글을 읽을 때 느끼는 감정/상황을 시각적으로 표현합니다.`;
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
        selectedCluster: undefined,
        currentSeriesContext: undefined,
        keywords: [],
        references: [],
        outline: '',
        draft: '',
        critique: '',
        finalDraft: '',
        imageConcepts: [],
        recommendedHashtags: [],
        sectionIllustrations: [],
        seriesKeywords: []
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

    // 일괄처리 state
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);
    const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

    // 숏컷 처리 state (완성 원고 → Stage 7만 실행)
    const [isShortcutProcessing, setIsShortcutProcessing] = useState(false);

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

## Stage 0.5: 주제 스코어링 + 시리즈 클러스터

주제 후보들:
${stageData.ideation.join('\n')}

각 주제를 **5대 축**으로 평가하세요:
1. 행동성 (Actionability / 5점) - 즉시 실천 가능한 정보 제공
2. 검색 의도 (Intent Match / 5점) - 환자 검색 의도와 일치
3. 진료 연관성 (Relevancy / 5점) - 클리닉 포커스와 연관
4. 긴급성/차별성 (Urgency / 5점) - 경쟁 콘텐츠 대비 차별성
5. **시리즈화 적합성 (Serializability / 5점)** - 후속 글로 확장 가능성

⭐ **각 주제에 대해 4개 시리즈 클러스터를 제안하세요:**
- main: 핵심 주제 (허브 역할)
- drill-down: 더 구체적인 세부 주제
- lateral: 관련 상황/타겟 확장
- follow-up: 다음 단계 (치료/관리/예방)

반드시 JSON 배열 형식으로 출력하세요 (총점 높은 순으로 정렬):
[
  {
    "title": "주제명",
    "score": 23,
    "summary": "핵심 질문이나 요약 한 줄",
    "seriesHint": "시리즈 확장 가능성 한 줄 설명",
    "clusterSuggestions": [
      {
        "type": "main",
        "title": "공황장애 초기증상 - 이런 증상이면 의심하세요",
        "reason": "핵심 키워드, 시리즈 허브 역할",
        "estimatedSearchVolume": "high",
        "priority": 1
      },
      {
        "type": "drill-down",
        "title": "공황장애 자가 진단법 - 체크리스트 10가지",
        "reason": "초기증상 확인 후 자연스러운 다음 질문",
        "estimatedSearchVolume": "medium",
        "priority": 2
      },
      {
        "type": "lateral",
        "title": "직장인 출근길 공황 대처법",
        "reason": "타겟 독자(직장인) 상황 확장",
        "estimatedSearchVolume": "medium",
        "priority": 3
      },
      {
        "type": "follow-up",
        "title": "공황장애 약 없이 관리 가능할까?",
        "reason": "약물 거부감 있는 환자 대응, 한방 치료 연결",
        "estimatedSearchVolume": "high",
        "priority": 4
      }
    ]
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

환자 중심 **8단락 구조**로 아웃라인을 작성하세요:

### 본문 섹션 (1-6)
1. Answer First (핵심 결론)
2. Action (즉각적 행동) - PATH Top 3
3. Warning (위험 신호) - CONTRA
4. The 'Why' (상세 원인)
5. Proof (사례와 근거)
6. Closing (요약 및 격려) + 마지막에 "${FIXED_AUTHOR.signature}" 표시

### 7. FAQ (자주 묻는 질문) - JSON-LD FAQPage 호환

**필수 요소:**
- 환자 질문형 소제목 **최소 3개**
- 각 질문의 첫 문장에서 **핵심 답변 제시**

**형식:**
## Q. 공황장애 초기증상은 무엇인가요?
갑작스러운 심장 뛰, 호흡 곤란, 어지러움이 대표적입니다.
(상세 설명 2-3문장...)

## Q. 약 없이 공황장애 관리가 가능한가요?
네, 생활 루틴과 호흡법으로 증상 완화가 가능합니다.
(상세 설명 2-3문장...)

## Q. 한의원에서 공황장애 치료가 가능한가요?
네, 침치료와 한약으로 자율신경 안정에 효과가 있습니다.
(상세 설명 2-3문장...)

### 8. 참고 자료 (글 하단 일괄 명시)

**형식:**
---
## 📚 참고 자료

**[서양의학 (WM)]** - 최소 1개
- NICE (2023). "Generalised anxiety disorder and panic disorder"
- BMJ Best Practice (2022). "Panic disorder - Management"

**[한의학 (KM)]** - 최소 1개
- 대한한의학회 CPG (2021). "공황장애 한의 임상진료지침"
- NIKOM (2020). "불안장애의 한의학적 치료"
---

12 블록 중 사용할 블록을 지정하세요:
필수: VOC, PATH, CONTRA
선택: DRUG, METAPHOR, ANALOGY, ANCHOR, REF, INTERACTION, MEAS, CASE, DEEP_DIVE`;

            case 4:
                return `${getWorkflowPrompt(selectedProfile)}

## Stage 4: 집필 (8섹션 완전체)

주제: "${stageData.selectedTopic}"
아웃라인:
${stageData.outline}

위 아웃라인을 바탕으로 **8개 섹션 완전체** 블로그 초고를 작성하세요.

### 집필 규칙
- 병리/기전은 'DEEP_DIVE' 블록으로 분리
- 증상–루틴–결과가 한 문단 내 인과로 연결
- 수치 예시 포함
- 레드플래그/내원 기준 명시
- 느낌표 ≤2
- 전문 용어 70% 이상 중학생 수준으로

### 글 내 참고문헌 인용 형식
- 핵심 주장 뒤에 출처 번호: "...효과가 있습니다[1]."
- 또는 괄호 형식: "...(NICE 2023)"

### 8개 섹션 구조 (반드시 모두 포함)

**[본문 섹션 1-6]**
1. **Answer First** - 핵심 결론
2. **Action** - PATH Top 3 즉각 실천
3. **Warning** - CONTRA 위험 신호
4. **The 'Why'** - 상세 원인/기전
5. **Proof** - 사례와 근거
6. **Closing** - 요약 및 격려 + 마지막에 "${FIXED_AUTHOR.signature}" 표시

**[텍스트 전용 섹션 7-8]**

7. **FAQ** (최소 3개 질문)
   - 각 질문은 "## Q. [질문]?" 형식
   - 첫 문장에서 핵심 답변 제시
   - 이어서 상세 설명 2-3문장

8. **참고 자료** (글 하단 일괄)
---
## 📚 참고 자료

**[서양의학 (WM)]**
[1] 출처명 (연도). "제목"
[2] 출처명 (연도). "제목"

**[한의학 (KM)]**
[3] 출처명 (연도). "제목"
[4] 출처명 (연도). "제목"
---`;

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

## Stage 6: 탈고 (Notion 편집 모드)

---
# 📘 Notion Editing Instruction v2.3
(Content-Preserving Editor Only)
---

## 0. 역할 정의
- 역할은 **편집자(Editor)** 한 가지뿐이다.
- 저자 / 해설자 / 요약자 역할 금지.
- 입력된 모든 원문은 **의미·정보·뉘앙스 100% 보존**이 원칙이다.

## 1. 절대 규칙 (Critical Rules)
아래 항목 위반 시 결과물은 무효다.
1. 내용 추가 금지
2. 내용 삭제 금지
3. 의미 변경 금지
4. 해석·의견·의학적 판단 금지
5. 요약·결론 문장 생성 금지
6. 표현 순화·완곡화 금지
7. 중요도 재배열 금지

## 2. 공통 금지 규칙
- \`•\` 불릿 마크 사용 금지
- 제목에 숫자 사용 금지
- 제목에 괄호 \`()\` 사용 금지

## 3. 서식 고정 규칙 (Notion 기준)
- 글꼴: **나눔명조**
- 글자 크기: **19**
- 전 영역 동일 적용

## 4. 섹션 헤더 규칙
- **아이콘 + 칸막이 한 줄**만 섹션 헤더로 사용
- 중복 제목 생성 금지

## 5. 의료 블로그 전용 섹션 아이콘 매핑 (고정)

| 섹션 | 섹션 헤더 |
|---|---|
| Answer First | 🧾 Answer First \\| 핵심 결론 |
| Action | ✅ Action \\| 즉각 실천 |
| Warning | 🚨 Warning \\| 반드시 체크해야 할 위험 신호 |
| The Why | 🧠 The Why |
| Deep Dive | 🔬 Deep Dive \\| 주제 요약 |
| Proof | 📊 Proof \\| 사례와 근거 |
| Closing | 🔚 Closing \\| 요약 및 격려 |
| FAQ | ❓ FAQ |
| 참고 자료 | 📚 참고 자료 |

## 6. Action 섹션 규칙
- 항상 **3가지 항목**
- 노션 숫자 아이콘 사용: \`1️⃣ 2️⃣ 3️⃣\`
- 체크박스 사용 금지

## 7. 🚨 Warning 섹션 전용 규칙 (핵심 · v2.3)

### ❗ 절대 규칙
- Warning의 **각 증상 항목은 반드시 \`제목 + 설명\`을 함께 유지**한다.
- 제목만 남기고 설명을 삭제하는 행위는 **중대 규칙 위반**이다.

### 아이콘 규칙
- 각 증상 항목 맨 앞에 **\`✔\` 단일 아이콘만 사용**
- \`✔\` 외 모든 아이콘/도형/색상 사용 금지
- \`🔴 주의\` 문구 및 아이콘 사용 금지

### 출력 형식 (고정)
\`\`\`
✔ 증상 제목
증상 설명 문장.

✔ 증상 제목
증상 설명 문장.
\`\`\`

- 제목과 설명은 **의미 단위로 분리 불가**
- 줄바꿈은 허용하되 삭제 금지

## 8. Deep Dive 섹션 규칙
- \`설명 | 서양의학적 관점\` / \`설명 | 한의학적 관점\` 유지
- 본문에서 \`🔵\` 아이콘 사용 금지
- 마침표 기준 한 문장 한 줄

## 9. 문단 가독성 규칙
- **마침표(\`.\`) 기준 → 한 문장 한 줄**
- 문장 병합·삭제 금지

## 10. 주석(각주) 규칙
- 본문 \`[숫자]\` 형식 유지
- 참고자료 번호와 1:1 매칭

## 11. 출력 규칙
- 노션에 즉시 붙여넣기 가능
- 메타 설명 출력 금지

---

### 입력 데이터

**초고:**
${stageData.draft}

**수정 메모:**
${stageData.critique}

---

### 작업 지시

1. 수정 메모를 100% 반영하여 초고를 편집하세요.
2. 위 Notion Editing Instruction v2.3의 모든 규칙을 적용하세요.
3. 각 섹션에 지정된 아이콘 헤더를 적용하세요.
4. 한 문장 한 줄 원칙을 준수하세요.
5. 문장 흐름과 오탈자를 검토하세요.
${stageData.currentSeriesContext ? `
### 📌 시리즈 글 연결 (필수 추가)

이 글은 시리즈의 일부입니다. 글의 마지막 부분(Closing 섹션 이후)에 아래 섹션을 추가하세요:

---
📌 **같이 읽으면 좋은 글**

${stageData.currentSeriesContext.cluster
                            .filter(s => s.title !== stageData.selectedTopic)
                            .map(s => `- ${s.title}`)
                            .join('\n')}

---

(위 제목들을 그대로 복사하세요. 링크는 블로그 업로드 후 수동 설정 예정)
` : ''}
### 내부 검증 체크리스트 (출력 전 반드시 확인)
- [ ] Warning 항목에서 제목+설명이 모두 존재하는가
- [ ] \`✔\` 단일 아이콘만 사용했는가
- [ ] 내용 삭제가 없는가
- [ ] 한 문장 한 줄을 지켰는가
- [ ] Action 항목이 3개이며 1️⃣2️⃣3️⃣을 사용했는가
- [ ] 주석 번호가 참고자료와 일치하는가${stageData.currentSeriesContext ? '\n- [ ] "같이 읽으면 좋은 글" 섹션이 Closing 이후에 추가되었는가' : ''}`;

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

### 🔴 이미지 생성 필수 규칙 (모든 컨셉에 적용)

**환자 캐릭터 프롬프트 (프로필 기반):**
${selectedProfile.patientCharacterPrompt || '기본 환자 캐릭터 (30대 중반, 성별 중립, 오피스 캐주얼)'}

**⛔ NEGATIVES (모든 이미지에서 절대 금지):**
- 의사/한의사/의료진 캐릭터 절대 금지 (NO doctor, NO 한의사, NO medical professional)
- 흰 가운 입은 인물 금지 (NO white coat)
- 의료진이 설명하는 장면 금지
- 환자가 의사에게 진료받는 장면 금지

**✅ 환자 캐릭터 역할:**
- 독자 대리인으로서 글을 읽을 때 느끼는 감정/상황을 표현
- "설명하는" 역할 ❌ → "반응하는" 역할 ✅
- Proof(근거) 섹션에서는 캐릭터 없이 데이터/인포그래픽만

### TASK 1: 이미지 컨셉 (3-5개)

⚠️ **필수 규칙: 첫 번째 컨셉은 반드시 "블로그 썸네일" (blog-thumbnail) 스타일!**
- 블로그 대표 이미지/헤더로 사용 (AI가 다른 콘텐츠에 사용 금지)
- **글 제목을 이미지에 반드시 포함**: "${stageData.selectedTopic || '(글 제목)'}"
- 도현체 스타일 한글 제목(굵은 고딕체) + 상징적 시각 요소 조합
- title 필드에 반드시 글 제목 포함, keywords에도 제목 키워드 추가
- 나머지 2-4개는 섹션 콘텐츠에 맞는 다양한 스타일 선택

### 사용 가능한 스타일 라이브러리 (19종)
1. **blog-thumbnail: 블로그 썸네일** ⭐ 첫 번째 필수 - 대표 이미지용 (제목 + 상징적 시각) - AI가 다른 용도로 사용 금지
2. artistic-thumbnail: 예술적 썸네일 - 미니멀/세련된 소셜 미디어 썸네일 (범용)
3. infographic-chart: 인포그래픽 차트 - 데이터와 통계를 명확하게 제시
4. empathetic-character: 공감 캐릭터 - 감정, 증상, 자세를 친근하게 표현 (말풍선 없음)
5. herbal-sketch: 약재 스케치 - 약재, 한약, 약국 도구의 빈티지 일러스트
6. empathetic-cutoon: 공감 컷툰 - 상황이나 감정을 스토리텔링 방식으로 전달 (말풍선 있음)
7. hand-drawn-diagram: 손그림 다이어그램 - 사이클, 관계, 간단한 프로세스 설명
8. medical-illustration: 의학 일러스트레이션 - 해부학적 구조 비교 또는 생리학적 프로세스
9. conceptual-metaphor: 개념적 은유 - 추상적인 의학 개념을 상징적인 오브제로 시각화
10. 2d-step-diagram: 2D 스텝 다이어그램 - 환자의 행동 지침, 치료 프로토콜
11. papercraft-illustration: 페이퍼크래프트 일러스트 - 신체 기관이나 프로세스를 따뜻하게 묘사
12. minimal-wellness-photo: 미니멀 웰니스 포토 - 약재, 차, 건강 음식을 감성적으로
13. continuous-line-drawing: 연속적인 한 줄 드로잉 - 세련되고 감성적인 방식으로 표현
14. conceptual-sketch: 개념적 스케치 - 복잡한 철학적/심리적 개념을 위트 있게 시각화
15. textured-digital-painting: 텍스처 디지털 페인팅 - 따뜻하고 아날로그적인 회화 질감
16. precision-medical: 정밀 의학도 - 해부학적 정확도, 색상 코딩, 텍스트 라벨 교과서 스타일
17. poster: 포스터 - 클리닉 홍보/이벤트/캠페인용 (3단 구조, 네이비 배경)
18. exercise-guide: 운동법 가이드 - 스트레칭/재활운동 동작 가이드 (라인 드로잉, 화살표)

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


### TASK 3: 섹션별 일러스트 (6개) - 🔴 원고 직접 요약 방식 (Anti-Keyword Rule)

## ⛔ 절대 금지 (위반 시 결과물 폐기)
1. 키워드/단어만 나열하는 방식 (예: "불안, 발작, 심장 두근거림")
2. 쉼표로 구분된 단어 목록
3. 원고 내용 없이 추상적 개념만 나열

## ✅ 필수 규칙: 원고 직접 발췌 + 요약

**작업 프로세스 (반드시 이 순서대로):**

### Step 1: 원고에서 해당 섹션 찾기
위 최종 글에서 각 섹션에 해당하는 문단을 **직접 찾으세요**:
- 1. Answer First: 글 도입부 (첫 1-2문단, 핵심 결론)
- 2. Action: 실천법/루틴/방법 설명 부분
- 3. Warning: 주의사항/위험신호/레드플래그 부분
- 4. The 'Why': 원인/기전/이유 설명 부분
- 5. Proof: 사례/연구/근거 언급 부분
- 6. Closing: 마무리/요약/격려 부분 (마지막 1-2문단)

### Step 2: 원고 내용을 2-3문장으로 압축
찾은 문단의 **실제 내용**을 기반으로 2-3개의 완전한 문장으로 요약하세요.

**올바른 요약이란:**
- 원고에 실제로 있는 정보를 담은 문장
- 주어-목적어-서술어가 있는 완전한 문장
- 읽었을 때 "아, 이 글은 이런 내용이구나"하고 이해되는 문장
- 100자 이상 250자 이하

### Step 3: 시각적 키워드 추출
요약 문장에서 **이미지로 표현 가능한 구체적 사물/행동/표정**을 3-5개 추출하세요.

## 출력 형식 (각 섹션)
\`\`\`json
{
  "sectionNumber": 1,
  "sectionTitle": "Answer First",
  "manuscriptSummary": "[원고 내용을 2-3문장으로 요약한 서술형 문장. 100-250자. 원고에 실제로 있는 정보 기반]",
  "summary": "[1문장 핵심 요약. 30-50자. 이미지 제목 용도]",
  "keywords": ["[시각적 표현 가능한 구체적 요소 3-5개]"],
  "recommendedPalette": "medical | calm | warm"
}
\`\`\`

---
## ❌ 잘못된 예시 (절대 금지):
\`\`\`json
{
  "manuscriptSummary": "불안, 발작, 심장 두근거림, 호흡 곤란, 식은땀",
  "summary": "공황장애 증상"
}
\`\`\`
**왜 잘못되었나:** 키워드 나열일 뿐, 문장이 아님. 원고 내용 전달 안 됨.

## ✅ 올바른 예시:
\`\`\`json
{
  "sectionNumber": 1,
  "sectionTitle": "Answer First",
  "manuscriptSummary": "공황장애는 예고 없이 찾아오는 극심한 불안 발작입니다. 갑자기 심장이 터질 듯 뛰고, 숨을 쉴 수 없을 것 같은 공포가 밀려옵니다. 하지만 이 증상은 심장마비가 아니며, 약물과 생활관리를 병행하면 충분히 조절할 수 있습니다.",
  "summary": "공황장애는 무섭지만 관리 가능한 질환입니다",
  "keywords": ["떨리는 손을 가슴에 댄 사람", "심호흡하는 모습", "안도하는 표정", "평온한 일상 복귀"],
  "recommendedPalette": "calm"
}
\`\`\`
**왜 올바른가:** 원고에서 발췌한 실제 정보가 완전한 문장으로 요약됨.

---
## 자가 검증 (출력 전 반드시 확인):
✓ manuscriptSummary가 쉼표로 구분된 단어 나열이 아닌가?
✓ manuscriptSummary에 주어와 서술어가 있는가?
✓ manuscriptSummary가 100자 이상인가?
✓ manuscriptSummary를 읽으면 원고 내용이 전달되는가?
✓ keywords가 "슬픔", "희망" 같은 추상 개념이 아닌 구체적 시각 요소인가?

### TASK 4: 시리즈 키워드 (다음 글 후보)

현재 글: "${stageData.selectedTopic || '(최종 글에서 추출)'}"

**꼬리를 무는 연속 주제 5개**를 제안하세요:
- drill-down: 더 구체적인 세부 주제
- lateral: 관련 상황/타겟 확장
- follow-up: 후속 질문 형태
- treatment: 치료/해결 방법
- management: 장기 관리/예방

예시:
현재 글: "공황장애 초기증상"
→ 시리즈 후보:
  - "공황장애 자가 진단 방법" (drill-down)
  - "직장인 출근길 공황 대처법" (lateral)
  - "공황장애 약 없이 치료 가능할까" (follow-up)

### 출력 형식 (반드시 JSON)
{
  "extractedTopic": "어지럼증의 원인과 관리법",
  "imageConcepts": [
    {
      "title": "손그림 다이어그램 - 호흡법",
      "reason": "단계별 실행 방법을 직관적으로 표현",
      "keywords": ["호흡", "단계", "손그림"],
      "recommendedStyle": "hand-drawn-diagram",
      "recommendedPalette": "calm",
      "negatives": ["doctor", "한의사", "medical professional", "white coat", "진료 장면"]
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
      "manuscriptSummary": "공황장애는 갑작스럽게 찾아오는 극심한 불안 발작입니다. 예고 없이 심장이 터질 듯 뛰고, 숨을 쉴 수 없을 것 같은 공포가 밀려옵니다. 하지만 적절한 관리로 충분히 조절 가능합니다.",
      "summary": "공황장애는 갑작스러운 불안 발작이 특징",
      "keywords": ["가슴을 움켜쥔 사람", "심호흡하는 모습", "안도하는 표정"],
      "recommendedPalette": "calm"
    }
  ],
  "seriesKeywords": [
    { "title": "공황장애 자가 진단 방법", "type": "drill-down", "reason": "초기증상 확인 후 자가 체크 욕구" },
    { "title": "직장인 출근길 공황 대처법", "type": "lateral", "reason": "타겟 독자 상황 확장" },
    { "title": "공황장애 약 없이 치료 가능할까", "type": "follow-up", "reason": "약물 거부감 있는 환자 대응" },
    { "title": "공황장애 한의원 치료 효과", "type": "treatment", "reason": "한방 치료 관심 환자" },
    { "title": "공황장애 재발 방지법", "type": "management", "reason": "장기 관리 정보 욕구" }
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
                                sectionIllustrations: parsed.sectionIllustrations || [],
                                seriesKeywords: parsed.seriesKeywords || []
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

    // Notion 편집 지침 v2.4에 맞는 마크다운 포맷터
    const formatForNotion = (text: string): string => {
        let formatted = text;

        // 0. 이중 제목 방지: H1 제목 바로 다음에 같은 내용의 H2가 있으면 H2 제거
        const h1Match = formatted.match(/^# (.+)$/m);
        if (h1Match) {
            const h1Title = h1Match[1].trim();
            const escapedTitle = h1Title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            formatted = formatted.replace(new RegExp(`\\n\\n## ${escapedTitle}\\n`, 'g'), '\n\n');
        }

        // 0-1. 최종글 시작에 제목이 없으면 추가 (selectedTopic 사용)
        if (!formatted.startsWith('# ') && stageData.selectedTopic) {
            formatted = `# ${stageData.selectedTopic}\n\n${formatted}`;
        }

        // 1. 섹션 헤더 아이콘 매핑 (## 섹션명 -> ## 아이콘 섹션명 | 부제)
        const sectionIconMap: { [key: string]: string } = {
            'Answer First': '🧾 Answer First | 핵심 결론',
            '핵심 결론': '🧾 Answer First | 핵심 결론',
            'Action': '✅ Action | 즉각 실천',
            '즉각 실천': '✅ Action | 즉각 실천',
            '즉각적 행동': '✅ Action | 즉각 실천',
            'Warning': '🚨 Warning | 반드시 체크해야 할 위험 신호',
            '위험 신호': '🚨 Warning | 반드시 체크해야 할 위험 신호',
            'The Why': '🧠 The Why',
            '상세 원인': '🧠 The Why | 상세 원인',
            'Deep Dive': '🔬 Deep Dive',
            'Proof': '📊 Proof | 사례와 근거',
            '사례와 근거': '📊 Proof | 사례와 근거',
            'Closing': '🔚 Closing | 요약 및 격려',
            '요약 및 격려': '🔚 Closing | 요약 및 격려',
            'FAQ': '❓ FAQ',
            '참고 자료': '📚 참고 자료',
            '같이 보시면 좋은 글': '📌 같이 보시면 좋은 글',
        };

        // H2 섹션 헤더에 아이콘 적용 (구분선 없이)
        Object.entries(sectionIconMap).forEach(([key, value]) => {
            const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            formatted = formatted.replace(
                new RegExp(`^## (?:${escapedKey})(?:\\s*[|:].*)?$`, 'gm'),
                `## ${value}`
            );
        });

        // 섹션 헤더 바로 다음에 있는 잘못된 구분선 제거
        formatted = formatted.replace(/^(## [^\n]+)\n---$/gm, '$1');

        // 섹션 앞에 구분선 추가 (첫 번째 섹션 제외)
        let firstSectionFound = false;
        formatted = formatted.replace(/^(## [🧾✅🚨🧠🔬📊🔚❓📚📌][^\n]+)$/gm, (match) => {
            if (!firstSectionFound) {
                firstSectionFound = true;
                return match; // 첫 섹션은 구분선 없이
            }
            return `---\n\n${match}`;
        });

        // 2. • 불릿 마크 제거 (- 로 변경)
        formatted = formatted.replace(/^[•●○◦⦁]\s*/gm, '- ');

        // 3. 제목에서 숫자 제거 (## 1. 제목 -> ## 제목)
        formatted = formatted.replace(/^(#+)\s*\d+[.)]\s*/gm, '$1 ');

        // 4. 제목에서 괄호 제거
        formatted = formatted.replace(/^(#+\s*[^\n]+)\s*\([^)]+\)\s*$/gm, '$1');

        // 5. 마침표 기준 한 문장 한 줄 (문단 내 처리)
        // 문단 구분자(빈줄)는 유지하면서 문장 단위로 분리
        formatted = formatted.split('\n\n').map(paragraph => {
            // 제목, 목록, 인용문 등은 건드리지 않음
            if (paragraph.startsWith('#') ||
                paragraph.startsWith('-') ||
                paragraph.startsWith('>') ||
                paragraph.startsWith('1') ||
                paragraph.startsWith('2') ||
                paragraph.startsWith('3') ||
                paragraph.startsWith('[') ||
                paragraph.startsWith('✔') ||
                paragraph.startsWith('✍️') ||
                paragraph.startsWith('1️⃣') ||
                paragraph.startsWith('2️⃣') ||
                paragraph.startsWith('3️⃣')) {
                return paragraph;
            }
            // 일반 문단: 마침표 뒤에 줄바꿈 추가
            return paragraph
                .replace(/\.\s+(?=[가-힣A-Za-z])/g, '.\n')
                .replace(/\?\s+(?=[가-힣A-Za-z])/g, '?\n')
                .replace(/!\s+(?=[가-힣A-Za-z])/g, '!\n');
        }).join('\n\n');

        // 6. FAQ 아래 "같이 보시면 좋은 글" 섹션 추가 (시리즈 컨텍스트 있으면 채움)
        // FAQ 검색 패턴을 더 유연하게 (아이콘 유무 모두 처리)
        if (!formatted.includes('같이 보시면 좋은 글')) {
            // 다양한 FAQ 패턴 검색
            const faqPatterns = ['## ❓ FAQ', '## FAQ', '## ❓FAQ'];
            const refPatterns = ['## 📚 참고 자료', '## 참고 자료', '## 📚참고 자료'];

            let faqIndex = -1;
            let refIndex = -1;

            for (const pattern of faqPatterns) {
                const idx = formatted.indexOf(pattern);
                if (idx !== -1) {
                    faqIndex = idx;
                    break;
                }
            }

            for (const pattern of refPatterns) {
                const idx = formatted.indexOf(pattern);
                if (idx !== -1) {
                    refIndex = idx;
                    break;
                }
            }

            if (faqIndex !== -1 && refIndex !== -1 && refIndex > faqIndex) {
                // 시리즈 컨텍스트가 있으면 실제 제목 사용
                let seriesContent = '- (관련 글 제목 1)\n- (관련 글 제목 2)\n- (관련 글 제목 3)\n';

                if (stageData.currentSeriesContext?.cluster && stageData.currentSeriesContext.cluster.length > 0) {
                    const seriesTitles = stageData.currentSeriesContext.cluster
                        .filter(s => s.title !== stageData.selectedTopic)
                        .slice(0, 3)
                        .map(s => `- ${s.title}`)
                        .join('\n');
                    if (seriesTitles) {
                        seriesContent = seriesTitles + '\n';
                    }
                } else if (stageData.seriesKeywords && stageData.seriesKeywords.length > 0) {
                    // Stage 7에서 생성된 시리즈 키워드 사용
                    const seriesTitles = stageData.seriesKeywords
                        .slice(0, 3)
                        .map(s => `- ${s.title}`)
                        .join('\n');
                    if (seriesTitles) {
                        seriesContent = seriesTitles + '\n';
                    }
                }

                // FAQ 섹션 끝과 참고자료 섹션 사이에 삽입
                const beforeRef = formatted.substring(0, refIndex);
                const afterRef = formatted.substring(refIndex);
                formatted = beforeRef + '\n\n## 📌 같이 보시면 좋은 글\n' + seriesContent + '\n' + afterRef;
            }
        }

        // 7. 고정 작성자/감수자 정보 추가 (Closing 섹션 끝 또는 글 끝에)
        if (!formatted.includes(FIXED_AUTHOR.name)) {
            // 참고 자료 섹션 앞에 추가하거나, 없으면 글 끝에 추가
            const refPatterns = ['## 📚 참고 자료', '## 참고 자료', '## 📌 같이 보시면 좋은 글'];
            let insertIndex = -1;

            for (const pattern of refPatterns) {
                const idx = formatted.indexOf(pattern);
                if (idx !== -1) {
                    insertIndex = idx;
                    break;
                }
            }

            const supervisorText = `\n\n---\n\n${FIXED_AUTHOR.signature}\n\n`;

            if (insertIndex !== -1) {
                formatted = formatted.substring(0, insertIndex) + supervisorText + formatted.substring(insertIndex);
            } else {
                formatted += supervisorText;
            }
        }

        return formatted;
    };
    // 리치 텍스트 복사 (Notion 편집 지침 v2.4 + 네이버 블로그 호환)
    const handleCopyRichText = async () => {
        // Stage 7에서도 finalDraft를 사용하도록 수정
        const rawText = stageData.finalDraft || currentOutput;
        if (!rawText) return;

        // Notion 편집 지침 v2.4 적용
        const textToCopy = formatForNotion(rawText);

        // 마크다운을 HTML로 변환
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
            // 1차 시도: ClipboardItem API (모던 브라우저)
            const blob = new Blob([html], { type: 'text/html' });
            const clipboardItem = new ClipboardItem({ 'text/html': blob });
            await navigator.clipboard.write([clipboardItem]);
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        } catch {
            // 2차 시도: execCommand 방식 (localhost/HTTP 환경용)
            try {
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = html;
                tempDiv.style.position = 'fixed';
                tempDiv.style.left = '-9999px';
                tempDiv.style.opacity = '0';
                document.body.appendChild(tempDiv);

                const range = document.createRange();
                range.selectNodeContents(tempDiv);
                const selection = window.getSelection();
                if (selection) {
                    selection.removeAllRanges();
                    selection.addRange(range);
                    document.execCommand('copy');
                    selection.removeAllRanges();
                }
                document.body.removeChild(tempDiv);

                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000);
            } catch {
                // 3차 시도: 일반 텍스트 복사
                navigator.clipboard.writeText(textToCopy);
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000);
            }
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
        // AI가 생성한 해시태그를 로컬 마크다운 파일로 자동 저장 (# 제외)
        if (stageData.recommendedHashtags.length > 0) {
            // 마크다운 형식으로 해시태그 정리
            let content = `# 🏷️ 블로그 게시용 추천 태그\n\n`;
            content += `> 주제: ${stageData.selectedTopic || '미정'}\n`;
            content += `> 생성일: ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}\n\n`;
            content += `---\n\n`;

            stageData.recommendedHashtags.forEach(category => {
                // # 제거하고 태그만 추출
                const cleanedTags = category.tags.map(tag =>
                    tag.replace(/^#/, '').trim()
                ).filter(tag => tag.length > 0);

                content += `## ${category.category}\n\n`;
                content += cleanedTags.map(tag => `- ${tag}`).join('\n') + '\n\n';
            });

            // 모든 태그를 한 줄로 (복사 편의용)
            const allTags = stageData.recommendedHashtags
                .flatMap(cat => cat.tags.map(tag => tag.replace(/^#/, '').trim()))
                .filter(tag => tag.length > 0);
            content += `---\n\n`;
            content += `## 📋 전체 태그 (복사용)\n\n`;
            content += '```\n' + allTags.join(' ') + '\n```\n';

            // 시리즈 키워드 추가 (다음 글 후보)
            if (stageData.seriesKeywords && stageData.seriesKeywords.length > 0) {
                content += `\n---\n\n`;
                content += `## 📌 다음 글 시리즈 키워드\n\n`;
                stageData.seriesKeywords.forEach((kw, i) => {
                    content += `${i + 1}. **${kw.title}** _(${kw.type})_\n`;
                    content += `   - ${kw.reason}\n\n`;
                });
            }

            // 파일명 생성 (해시태그_YYYYMMDD_HHmmss.md)
            const now = new Date();
            const timestamp = now.getFullYear().toString() +
                (now.getMonth() + 1).toString().padStart(2, '0') +
                now.getDate().toString().padStart(2, '0') + '_' +
                now.getHours().toString().padStart(2, '0') +
                now.getMinutes().toString().padStart(2, '0') +
                now.getSeconds().toString().padStart(2, '0');
            const filename = `해시태그_${timestamp}.md`;

            // Blob으로 마크다운 파일 다운로드
            const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        // 최종 글(finalDraft)도 마크다운 파일로 자동 저장 (Notion 편집 지침 v2.4 적용)
        if (stageData.finalDraft) {
            // Notion 편집 지침 v2.4 적용 (formatForNotion이 이미 제목 추가함)
            const formattedDraft = formatForNotion(stageData.finalDraft);

            // 마크다운 파일 내용 구성 - formatForNotion이 이미 제목 포함하므로 직접 사용
            let mdContent = `> 작성일: ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;
            mdContent += '---\n\n';
            mdContent += formattedDraft;

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
            // 🔴 공통 NEGATIVES (모든 이미지에 적용)
            const commonNegatives = ['doctor', '한의사', 'medical professional', 'white coat', 'physician', '진료 장면', 'medical staff'];

            // 🔴 환자 캐릭터 프롬프트 (프로필 기반)
            const patientPrompt = selectedProfile.patientCharacterPrompt || '기본 환자 캐릭터 (30대 중반, 성별 중립, 오피스 캐주얼)';

            // 추천 이미지 컨셉 (3-5개) - negatives와 patientPrompt 포함
            const conceptCards = stageData.imageConcepts.map(c => ({
                title: c.title,
                keywords: c.keywords,
                recommendedStyle: c.recommendedStyle,
                recommendedPalette: c.recommendedPalette,
                negatives: (c as any).negatives || commonNegatives,  // Stage 7에서 생성된 negatives 또는 공통값
                patientCharacterPrompt: patientPrompt  // 프로필 기반 환자 캐릭터
            }));

            // 섹션 일러스트 카드 (6개) - section-illustration 스타일 적용
            // 원고 기반 프롬프트: manuscriptSummary(서술형 요약)를 description으로 전달
            const sectionCards = stageData.sectionIllustrations.map(s => ({
                title: `${s.sectionNumber}. ${s.sectionTitle}`,
                keywords: s.keywords,
                description: s.manuscriptSummary || s.sectionContent || s.summary, // manuscriptSummary 우선 사용
                recommendedStyle: 'section-illustration' as const,
                recommendedPalette: s.recommendedPalette,
                negatives: commonNegatives,  // 공통 NEGATIVES 적용
                patientCharacterPrompt: patientPrompt  // 프로필 기반 환자 캐릭터
            }));

            // 모두 합쳐서 전달 (원고 전문 포함)
            onStage7Complete({
                topic: stageData.selectedTopic,
                finalDraft: stageData.finalDraft,
                concepts: [...conceptCards, ...sectionCards]
            });
        }
    };

    // 섹션 일러스트 개별 생성 (section-illustration 스타일 사용)
    const handleGenerateSectionIllustration = (section: SectionIllustration) => {
        if (onStage7Complete) {
            // 원고 기반 프롬프트: manuscriptSummary(서술형 요약)를 description으로 전달
            const conceptData = {
                title: `${section.sectionNumber}. ${section.sectionTitle}`,
                keywords: section.keywords,
                description: section.manuscriptSummary || section.sectionContent || section.summary, // manuscriptSummary 우선 사용
                recommendedStyle: 'section-illustration' as const,
                recommendedPalette: section.recommendedPalette
            };

            onStage7Complete({
                topic: `${stageData.selectedTopic} - ${section.sectionTitle}`,
                finalDraft: stageData.finalDraft,
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

    // 1~7단계 일괄처리 함수 (이미지 카드 생성 + MD 저장까지 자동화)
    const handleBatchProcess = async () => {
        if (!geminiApiKey) {
            openSettings();
            return;
        }

        // Stage 0.5에서 선택된 주제가 있어야 시작 가능
        if (!stageData.selectedTopic) {
            alert('먼저 Stage 0.5에서 주제를 선택해주세요.');
            return;
        }

        if (!confirm('1~7단계를 일괄 실행합니다. (이미지 카드 생성 + MD 파일 저장까지 자동화)\n\n진행하시겠습니까?')) {
            return;
        }

        const batchStages: WorkflowStage[] = [1, 2, 3, 4, 5, 6, 7];
        setIsBatchProcessing(true);
        setBatchProgress({ current: 0, total: batchStages.length });

        // 로컬 accumulator로 중간 결과 추적 (React 상태의 비동기 업데이트 문제 해결)
        const batchAccumulator = {
            keywords: stageData.keywords,
            references: stageData.references,
            outline: stageData.outline,
            draft: stageData.draft,
            critique: stageData.critique,
            finalDraft: stageData.finalDraft,
            imageConcepts: stageData.imageConcepts,
            recommendedHashtags: stageData.recommendedHashtags,
            sectionIllustrations: stageData.sectionIllustrations,
            seriesKeywords: stageData.seriesKeywords
        };

        // 일괄처리용 프롬프트 생성 함수 (로컬 accumulator 참조)
        const getBatchStagePrompt = (stage: WorkflowStage): string => {
            switch (stage) {
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
키워드: ${batchAccumulator.keywords.slice(0, 10).join(', ')}

환자 중심 **8단락 구조**로 아웃라인을 작성하세요:

### 본문 섹션 (1-6)
1. Answer First (핵심 결론)
2. Action (즉각적 행동) - PATH Top 3
3. Warning (위험 신호) - CONTRA
4. The 'Why' (상세 원인)
5. Proof (사례와 근거)
6. Closing (요약 및 격려) + 마지막에 "${FIXED_AUTHOR.signature}" 표시

### 7. FAQ (자주 묻는 질문) - JSON-LD FAQPage 호환

**필수 요소:**
- 환자 질문형 소제목 **최소 3개**
- 각 질문의 첫 문장에서 **핵심 답변 제시**

**형식:**
## Q. 공황장애 초기증상은 무엇인가요?
갑작스러운 심장 뛰, 호흡 곤란, 어지러움이 대표적입니다.
(상세 설명 2-3문장...)

## Q. 약 없이 공황장애 관리가 가능한가요?
네, 생활 루틴과 호흡법으로 증상 완화가 가능합니다.
(상세 설명 2-3문장...)

## Q. 한의원에서 공황장애 치료가 가능한가요?
네, 침치료와 한약으로 자율신경 안정에 효과가 있습니다.
(상세 설명 2-3문장...)

### 8. 참고 자료 (글 하단 일괄 명시)

**형식:**
---
## 📚 참고 자료

**[서양의학 (WM)]** - 최소 1개
- NICE (2023). "Generalised anxiety disorder and panic disorder"
- BMJ Best Practice (2022). "Panic disorder - Management"

**[한의학 (KM)]** - 최소 1개
- 대한한의학회 CPG (2021). "공황장애 한의 임상진료지침"
- NIKOM (2020). "불안장애의 한의학적 치료"
---

12 블록 중 사용할 블록을 지정하세요:
필수: VOC, PATH, CONTRA
선택: DRUG, METAPHOR, ANALOGY, ANCHOR, REF, INTERACTION, MEAS, CASE, DEEP_DIVE`;

                case 4:
                    return `${getWorkflowPrompt(selectedProfile)}

## Stage 4: 집필 (8섹션 완전체)

주제: "${stageData.selectedTopic}"
아웃라인:
${batchAccumulator.outline}

위 아웃라인을 바탕으로 **8개 섹션 완전체** 블로그 초고를 작성하세요.

### 집필 규칙
- 병리/기전은 'DEEP_DIVE' 블록으로 분리
- 증상–루틴–결과가 한 문단 내 인과로 연결
- 수치 예시 포함
- 레드플래그/내원 기준 명시
- 느낌표 ≤2
- 전문 용어 70% 이상 중학생 수준으로

### 글 내 참고문헌 인용 형식
- 핵심 주장 뒤에 출처 번호: "...효과가 있습니다[1]."
- 또는 괄호 형식: "...(NICE 2023)"

### 8개 섹션 구조 (반드시 모두 포함)

**[본문 섹션 1-6]**
1. **Answer First** - 핵심 결론
2. **Action** - PATH Top 3 즉각 실천
3. **Warning** - CONTRA 위험 신호
4. **The 'Why'** - 상세 원인/기전
5. **Proof** - 사례와 근거
6. **Closing** - 요약 및 격려 + 마지막에 "${FIXED_AUTHOR.signature}" 표시

**[텍스트 전용 섹션 7-8]**

7. **FAQ** (최소 3개 질문)
   - 각 질문은 "## Q. [질문]?" 형식
   - 첫 문장에서 핵심 답변 제시
   - 이어서 상세 설명 2-3문장

8. **참고 자료** (글 하단 일괄)
---
## 📚 참고 자료

**[서양의학 (WM)]**
[1] 출처명 (연도). "제목"
[2] 출처명 (연도). "제목"

**[한의학 (KM)]**
[3] 출처명 (연도). "제목"
[4] 출처명 (연도). "제목"
---`;

                case 5:
                    return `${getWorkflowPrompt(selectedProfile)}

## Stage 5: 초고 비평

초고:
${batchAccumulator.draft}

5C 체크리스트로 비평하세요:
1. Clarity (명료성): 전문 용어가 순화되었는가?
2. Compassion (공감): 톤이 공감적이면서 단호한가?
3. Actionability (행동성): Top 3 루틴이 즉시 실행 가능한가?
4. Structure (구조): Answer First 구조가 지켜졌는가?
5. Urgency (긴급성): Red Flag가 명확히 강조되었는가?

수정이 필요한 부분을 구체적으로 지적하는 '수정 메모' 리스트를 작성하세요.`;

                case 6:
                    return `${getWorkflowPrompt(selectedProfile)}

## Stage 6: 탈고 (Notion 편집 모드)

---
# 📘 Notion Editing Instruction v2.3
(Content-Preserving Editor Only)
---

## 0. 역할 정의
- 역할은 **편집자(Editor)** 한 가지뿐이다.
- 저자 / 해설자 / 요약자 역할 금지.
- 입력된 모든 원문은 **의미·정보·뉘앙스 100% 보존**이 원칙이다.

## 1. 절대 규칙 (Critical Rules)
아래 항목 위반 시 결과물은 무효다.
1. 내용 추가 금지
2. 내용 삭제 금지
3. 의미 변경 금지
4. 해석·의견·의학적 판단 금지
5. 요약·결론 문장 생성 금지
6. 표현 순화·완곡화 금지
7. 중요도 재배열 금지

## 2. 공통 금지 규칙
- \`•\` 불릿 마크 사용 금지
- 제목에 숫자 사용 금지
- 제목에 괄호 \`()\` 사용 금지

## 3. 서식 고정 규칙 (Notion 기준)
- 글꼴: **나눔명조**
- 글자 크기: **19**
- 전 영역 동일 적용

## 4. 섹션 헤더 규칙
- **아이콘 + 칸막이 한 줄**만 섹션 헤더로 사용
- 중복 제목 생성 금지

## 5. 의료 블로그 전용 섹션 아이콘 매핑 (고정)

| 섹션 | 섹션 헤더 |
|---|---|
| Answer First | 🧾 Answer First \\| 핵심 결론 |
| Action | ✅ Action \\| 즉각 실천 |
| Warning | 🚨 Warning \\| 반드시 체크해야 할 위험 신호 |
| The Why | 🧠 The Why |
| Deep Dive | 🔬 Deep Dive \\| 주제 요약 |
| Proof | 📊 Proof \\| 사례와 근거 |
| Closing | 🔚 Closing \\| 요약 및 격려 |
| FAQ | ❓ FAQ |
| 참고 자료 | 📚 참고 자료 |

## 6. Action 섹션 규칙
- 항상 **3가지 항목**
- 노션 숫자 아이콘 사용: \`1️⃣ 2️⃣ 3️⃣\`
- 체크박스 사용 금지

## 7. 🚨 Warning 섹션 전용 규칙 (핵심 · v2.3)

### ❗ 절대 규칙
- Warning의 **각 증상 항목은 반드시 \`제목 + 설명\`을 함께 유지**한다.
- 제목만 남기고 설명을 삭제하는 행위는 **중대 규칙 위반**이다.

### 아이콘 규칙
- 각 증상 항목 맨 앞에 **\`✔\` 단일 아이콘만 사용**
- \`✔\` 외 모든 아이콘/도형/색상 사용 금지
- \`🔴 주의\` 문구 및 아이콘 사용 금지

### 출력 형식 (고정)
\`\`\`
✔ 증상 제목
증상 설명 문장.

✔ 증상 제목
증상 설명 문장.
\`\`\`

- 제목과 설명은 **의미 단위로 분리 불가**
- 줄바꿈은 허용하되 삭제 금지

## 8. Deep Dive 섹션 규칙
- \`설명 | 서양의학적 관점\` / \`설명 | 한의학적 관점\` 유지
- 본문에서 \`🔵\` 아이콘 사용 금지
- 마침표 기준 한 문장 한 줄

## 9. 문단 가독성 규칙
- **마침표(\`.\`) 기준 → 한 문장 한 줄**
- 문장 병합·삭제 금지

## 10. 주석(각주) 규칙
- 본문 \`[숫자]\` 형식 유지
- 참고자료 번호와 1:1 매칭

## 11. 출력 규칙
- 노션에 즉시 붙여넣기 가능
- 메타 설명 출력 금지

---

### 입력 데이터

**초고:**
${batchAccumulator.draft}

**수정 메모:**
${batchAccumulator.critique}

---

### 작업 지시

1. 수정 메모를 100% 반영하여 초고를 편집하세요.
2. 위 Notion Editing Instruction v2.3의 모든 규칙을 적용하세요.
3. 각 섹션에 지정된 아이콘 헤더를 적용하세요.
4. 한 문장 한 줄 원칙을 준수하세요.
5. 문장 흐름과 오탈자를 검토하세요.

### 내부 검증 체크리스트 (출력 전 반드시 확인)
- [ ] Warning 항목에서 제목+설명이 모두 존재하는가
- [ ] \`✔\` 단일 아이콘만 사용했는가
- [ ] 내용 삭제가 없는가
- [ ] 한 문장 한 줄을 지켰는가
- [ ] Action 항목이 3개이며 1️⃣2️⃣3️⃣을 사용했는가
- [ ] 주석 번호가 참고자료와 일치하는가`;

                case 7:
                    // 숏컷 트랙(Stage 6 직접 입력)인 경우 주제가 없을 수 있음
                    const batchHasTopicFromWorkflow = stageData.selectedTopic && stageData.selectedTopic.trim();
                    const batchTopicInstruction = batchHasTopicFromWorkflow
                        ? `주제: "${stageData.selectedTopic}"`
                        : `주제: (아래 최종 글에서 핵심 주제를 추출하세요)`;

                    const batchKeywordsInstruction = batchAccumulator.keywords.length > 0
                        ? `키워드 클러스터: ${batchAccumulator.keywords.slice(0, 15).join(', ')}`
                        : `키워드 클러스터: (아래 최종 글에서 핵심 키워드를 추출하세요)`;

                    return `${getWorkflowPrompt(selectedProfile)}

## Stage 7: 시각 프롬프트 설계 + 해시태그 생성

${batchTopicInstruction}
${batchKeywordsInstruction}
최종 글:
${batchAccumulator.finalDraft}

### 🔴 이미지 생성 필수 규칙 (모든 컨셉에 적용)

**환자 캐릭터 프롬프트 (프로필 기반):**
${selectedProfile.patientCharacterPrompt || '기본 환자 캐릭터 (30대 중반, 성별 중립, 오피스 캐주얼)'}

**⛔ NEGATIVES (모든 이미지에서 절대 금지):**
- 의사/한의사/의료진 캐릭터 절대 금지 (NO doctor, NO 한의사, NO medical professional)
- 흰 가운 입은 인물 금지 (NO white coat)
- 의료진이 설명하는 장면 금지
- 환자가 의사에게 진료받는 장면 금지

**✅ 환자 캐릭터 역할:**
- 독자 대리인으로서 글을 읽을 때 느끼는 감정/상황을 표현
- "설명하는" 역할 ❌ → "반응하는" 역할 ✅
- Proof(근거) 섹션에서는 캐릭터 없이 데이터/인포그래픽만

### TASK 1: 이미지 컨셉 (3-5개)

⚠️ **필수 규칙: 첫 번째 컨셉은 반드시 "블로그 썸네일" (blog-thumbnail) 스타일!**
- 블로그 대표 이미지/헤더로 사용
- **글 제목을 이미지에 반드시 포함**: "${stageData.selectedTopic || '(글 제목)'}"
- 도현체 스타일 한글 제목(굵은 고딕체) + 상징적 시각 요소 조합

### 사용 가능한 스타일 라이브러리 (19종)
1. **blog-thumbnail: 블로그 썸네일** ⭐ 첫 번째 필수
2. artistic-thumbnail / infographic-chart / empathetic-character
3. herbal-sketch / empathetic-cutoon / hand-drawn-diagram
4. medical-illustration / conceptual-metaphor / 2d-step-diagram
5. papercraft-illustration / minimal-wellness-photo / continuous-line-drawing
6. conceptual-sketch / textured-digital-painting / precision-medical
7. poster / exercise-guide / section-illustration

### 사용 가능한 색상 팔레트 (3종)
1. medical: 의료 톤 (녹색 계열)
2. calm: 차분한 톤 (파란색 계열)
3. warm: 따뜻한 톤 (베이지 계열)

### TASK 2: 블로그 게시용 해시태그 (# 제외)
5개 분류: 핵심증상, 타겟상황, 행동솔루션, 의학한의학, 페르소나톤

### TASK 3: 섹션별 일러스트 (6개) - 원고 직접 요약 방식

### TASK 4: 시리즈 키워드 (다음 글 후보 5개)

### 출력 형식 (반드시 JSON)
{
  "extractedTopic": "주제명",
  "imageConcepts": [...],
  "hashtags": [...],
  "sectionIllustrations": [...],
  "seriesKeywords": [...]
}`;

                default:
                    return '';
            }
        };

        try {
            for (let i = 0; i < batchStages.length; i++) {
                const stage = batchStages[i];
                setBatchProgress({ current: i + 1, total: batchStages.length });
                setCurrentStage(stage);

                // 일괄처리용 프롬프트 (로컬 accumulator 참조)
                const prompt = getBatchStagePrompt(stage);
                let result = '';

                if (selectedProvider === 'gemini') {
                    const { GoogleGenAI } = await import('@google/genai');
                    const ai = new GoogleGenAI({ apiKey: geminiApiKey });
                    const response = await ai.models.generateContent({
                        model: 'gemini-2.5-flash',
                        contents: { parts: [{ text: prompt }] }
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
                            model: 'gpt-4o',
                            messages: [{ role: 'user', content: prompt }],
                            max_tokens: 4000
                        })
                    });
                    const data = await response.json();
                    result = data.choices?.[0]?.message?.content || '';
                }

                setCurrentOutput(result);

                // 로컬 accumulator 업데이트 (다음 단계에서 즉시 참조 가능)
                switch (stage) {
                    case 1:
                        batchAccumulator.keywords = result.split('\n').filter(l => l.trim());
                        break;
                    case 2:
                        batchAccumulator.references = result.split('\n').filter(l => l.trim());
                        break;
                    case 3:
                        batchAccumulator.outline = result;
                        break;
                    case 4:
                        batchAccumulator.draft = result;
                        break;
                    case 5:
                        batchAccumulator.critique = result;
                        break;
                    case 6:
                        batchAccumulator.finalDraft = result;
                        break;
                    case 7:
                        // 7단계 JSON 파싱
                        try {
                            const jsonMatch = result.match(/\{[\s\S]*\}/);
                            if (jsonMatch) {
                                const parsed = JSON.parse(jsonMatch[0]);
                                if (parsed.imageConcepts) {
                                    batchAccumulator.imageConcepts = parsed.imageConcepts;
                                }
                                if (parsed.hashtags) {
                                    batchAccumulator.recommendedHashtags = parsed.hashtags;
                                }
                                if (parsed.sectionIllustrations) {
                                    batchAccumulator.sectionIllustrations = parsed.sectionIllustrations;
                                }
                                if (parsed.seriesKeywords) {
                                    batchAccumulator.seriesKeywords = parsed.seriesKeywords;
                                }
                            }
                        } catch (parseError) {
                            console.error('Stage 7 JSON 파싱 오류:', parseError);
                        }
                        break;
                }

                // React 상태도 업데이트 (UI 반영용)
                switch (stage) {
                    case 1:
                        setStageData(prev => ({ ...prev, keywords: batchAccumulator.keywords }));
                        break;
                    case 2:
                        setStageData(prev => ({ ...prev, references: batchAccumulator.references }));
                        break;
                    case 3:
                        setStageData(prev => ({ ...prev, outline: batchAccumulator.outline }));
                        break;
                    case 4:
                        setStageData(prev => ({ ...prev, draft: batchAccumulator.draft }));
                        break;
                    case 5:
                        setStageData(prev => ({ ...prev, critique: batchAccumulator.critique }));
                        break;
                    case 6:
                        setStageData(prev => ({ ...prev, finalDraft: batchAccumulator.finalDraft }));
                        break;
                    case 7:
                        setStageData(prev => ({
                            ...prev,
                            imageConcepts: batchAccumulator.imageConcepts,
                            recommendedHashtags: batchAccumulator.recommendedHashtags,
                            sectionIllustrations: batchAccumulator.sectionIllustrations,
                            seriesKeywords: batchAccumulator.seriesKeywords
                        }));
                        break;
                }
            }

            // 완료 후 Stage 7 유지
            setCurrentStage(7);
            loadStageDataToOutput(7);

            // 🔴 7단계 완료 후 자동으로 이미지 카드 생성 + MD 파일 저장
            // handleCompleteStage7 내부 로직을 직접 실행 (stageData가 아직 업데이트되지 않았을 수 있으므로 accumulator 사용)

            // 1. 해시태그 MD 파일 저장
            if (batchAccumulator.recommendedHashtags.length > 0) {
                let content = `# 🏷️ 블로그 게시용 추천 태그\n\n`;
                content += `> 주제: ${stageData.selectedTopic || '미정'}\n`;
                content += `> 생성일: ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}\n\n`;
                content += `---\n\n`;

                batchAccumulator.recommendedHashtags.forEach((category: any) => {
                    const cleanedTags = category.tags.map((tag: string) =>
                        tag.replace(/^#/, '').trim()
                    ).filter((tag: string) => tag.length > 0);
                    content += `## ${category.category}\n\n`;
                    content += cleanedTags.map((tag: string) => `- ${tag}`).join('\n') + '\n\n';
                });

                const allTags = batchAccumulator.recommendedHashtags
                    .flatMap((cat: any) => cat.tags.map((tag: string) => tag.replace(/^#/, '').trim()))
                    .filter((tag: string) => tag.length > 0);
                content += `---\n\n## 📋 전체 태그 (복사용)\n\n\`\`\`\n${allTags.join(' ')}\n\`\`\`\n`;

                if (batchAccumulator.seriesKeywords && batchAccumulator.seriesKeywords.length > 0) {
                    content += `\n---\n\n## 📌 다음 글 시리즈 키워드\n\n`;
                    batchAccumulator.seriesKeywords.forEach((kw: any, i: number) => {
                        content += `${i + 1}. **${kw.title}** _(${kw.type})_\n   - ${kw.reason}\n\n`;
                    });
                }

                const now = new Date();
                const timestamp = now.getFullYear().toString() +
                    (now.getMonth() + 1).toString().padStart(2, '0') +
                    now.getDate().toString().padStart(2, '0') + '_' +
                    now.getHours().toString().padStart(2, '0') +
                    now.getMinutes().toString().padStart(2, '0') +
                    now.getSeconds().toString().padStart(2, '0');
                const filename = `해시태그_${timestamp}.md`;

                const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }

            // 2. 최종글 MD 파일 저장
            if (batchAccumulator.finalDraft) {
                const formattedDraft = formatForNotion(batchAccumulator.finalDraft);
                let mdContent = `> 작성일: ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;
                mdContent += '---\n\n';
                mdContent += formattedDraft;

                const now = new Date();
                const timestamp = now.getFullYear().toString() +
                    (now.getMonth() + 1).toString().padStart(2, '0') +
                    now.getDate().toString().padStart(2, '0') + '_' +
                    now.getHours().toString().padStart(2, '0') +
                    now.getMinutes().toString().padStart(2, '0') +
                    now.getSeconds().toString().padStart(2, '0');
                const mdFilename = `최종글_${timestamp}.md`;

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

            // 3. 이미지 카드 생성 (BlogVisualEditor로 전달)
            if (onStage7Complete && (batchAccumulator.imageConcepts.length > 0 || batchAccumulator.sectionIllustrations.length > 0)) {
                const commonNegatives = ['doctor', '한의사', 'medical professional', 'white coat', 'physician', '진료 장면', 'medical staff'];
                const patientPrompt = selectedProfile.patientCharacterPrompt || '기본 환자 캐릭터 (30대 중반, 성별 중립, 오피스 캐주얼)';

                const conceptCards = batchAccumulator.imageConcepts.map((c: any) => ({
                    title: c.title,
                    keywords: c.keywords,
                    recommendedStyle: c.recommendedStyle,
                    recommendedPalette: c.recommendedPalette,
                    negatives: c.negatives || commonNegatives,
                    patientCharacterPrompt: patientPrompt
                }));

                const sectionCards = batchAccumulator.sectionIllustrations.map((s: any) => ({
                    title: `${s.sectionNumber}. ${s.sectionTitle}`,
                    keywords: s.keywords,
                    description: s.manuscriptSummary || s.sectionContent || s.summary,
                    recommendedStyle: 'section-illustration' as const,
                    recommendedPalette: s.recommendedPalette,
                    negatives: commonNegatives,
                    patientCharacterPrompt: patientPrompt
                }));

                onStage7Complete({
                    topic: stageData.selectedTopic,
                    finalDraft: batchAccumulator.finalDraft,
                    concepts: [...conceptCards, ...sectionCards]
                });
            }

            alert('✅ 1~7단계 일괄처리가 완료되었습니다!\n\n📁 MD 파일 저장 완료\n🖼️ 이미지 카드가 생성되었습니다.');
        } catch (error: any) {
            setCurrentOutput(`❌ 일괄처리 오류: ${error.message}`);
            alert(`일괄처리 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            setIsBatchProcessing(false);
            setBatchProgress(null);
        }
    };

    // 📝 숏컷 시작 - Stage 6 직접 입력 모드로 이동
    const handleShortcutStart = () => {
        // stageData 초기화 (이전 작업 데이터 제거)
        setStageData({
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
            sectionIllustrations: [],
            seriesKeywords: []
        });

        // 현재 출력 초기화
        setCurrentOutput('');

        // Stage 6으로 이동 + 직접 입력 모드 활성화
        setCurrentStage(6);
        setManualInputMode(true);
        setIsEditMode(true);  // 편집 모드 활성화 (입력 가능하게)
    };

    // 🚀 숏컷 실행 - Stage 7 자동 실행 + 이미지 카드 생성까지
    const handleShortcutProcess = async () => {
        if (!geminiApiKey) {
            openSettings();
            return;
        }

        // Stage 6 직접 입력 모드에서 원고가 입력되었는지 확인
        if (!currentOutput.trim()) {
            alert('원고를 입력해주세요. 오른쪽 출력 패널에서 직접 입력하거나 붙여넣기 하세요.');
            return;
        }

        if (!confirm('입력한 원고로 이미지 카드와 해시태그를 생성합니다.\n\n진행하시겠습니까?')) {
            return;
        }

        setIsShortcutProcessing(true);

        try {
            // 1. finalDraft에 현재 입력 저장
            const finalDraftContent = currentOutput;
            setStageData(prev => ({ ...prev, finalDraft: finalDraftContent }));

            // 2. Stage 7로 이동
            setCurrentStage(7);
            setManualInputMode(false);

            // 3. Stage 7 프롬프트 생성 (finalDraft 사용)
            const stage7Prompt = `${getWorkflowPrompt(selectedProfile)}

## Stage 7: 시각 프롬프트 설계 + 해시태그 생성 (숏컷 모드)

주제: (아래 최종 글에서 핵심 주제를 추출하세요)
키워드 클러스터: (아래 최종 글에서 핵심 키워드를 추출하세요)
최종 글:
${finalDraftContent}

${getStagePrompt(7).split('최종 글:')[1] || ''}`;

            // 4. AI 호출
            let result = '';
            if (selectedProvider === 'gemini') {
                const { GoogleGenAI } = await import('@google/genai');
                const ai = new GoogleGenAI({ apiKey: geminiApiKey });
                const response = await ai.models.generateContent({
                    model: 'gemini-3-pro-preview',
                    contents: { parts: [{ text: stage7Prompt }] }
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
                        model: 'gpt-5.2',
                        messages: [{ role: 'user', content: stage7Prompt }],
                        max_tokens: 4000
                    })
                });
                const data = await response.json();
                result = data.choices?.[0]?.message?.content || '';
            }

            setCurrentOutput(result);

            // 5. JSON 파싱 및 stageData 업데이트
            let jsonStr = result;
            const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1].trim();
            } else {
                const objStart = result.indexOf('{');
                const objEnd = result.lastIndexOf('}');
                if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
                    jsonStr = result.substring(objStart, objEnd + 1);
                }
            }

            const parsed = JSON.parse(jsonStr);

            if (parsed.imageConcepts && Array.isArray(parsed.imageConcepts)) {
                const updatedStageData = {
                    ...stageData,
                    finalDraft: finalDraftContent,
                    selectedTopic: parsed.extractedTopic || '',
                    imageConcepts: parsed.imageConcepts,
                    recommendedHashtags: parsed.hashtags || [],
                    sectionIllustrations: parsed.sectionIllustrations || [],
                    seriesKeywords: parsed.seriesKeywords || []
                };
                setStageData(updatedStageData);

                // 6. 자동 완료 처리 (MD 저장 + 이미지 카드 생성)
                // 해시태그 MD 저장
                if (parsed.hashtags && parsed.hashtags.length > 0) {
                    let content = `# 🏷️ 블로그 게시용 추천 태그\n\n`;
                    content += `> 주제: ${parsed.extractedTopic || '미정'}\n`;
                    content += `> 생성일: ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}\n\n`;
                    content += `---\n\n`;

                    parsed.hashtags.forEach((category: any) => {
                        const cleanedTags = category.tags.map((tag: string) =>
                            tag.replace(/^#/, '').trim()
                        ).filter((tag: string) => tag.length > 0);
                        content += `## ${category.category}\n\n`;
                        content += cleanedTags.map((tag: string) => `- ${tag}`).join('\n') + '\n\n';
                    });

                    const allTags = parsed.hashtags
                        .flatMap((cat: any) => cat.tags.map((tag: string) => tag.replace(/^#/, '').trim()))
                        .filter((tag: string) => tag.length > 0);
                    content += `---\n\n## 📋 전체 태그 (복사용)\n\n\`\`\`\n${allTags.join(' ')}\n\`\`\`\n`;

                    if (parsed.seriesKeywords && parsed.seriesKeywords.length > 0) {
                        content += `\n---\n\n## 📌 다음 글 시리즈 키워드\n\n`;
                        parsed.seriesKeywords.forEach((kw: any, i: number) => {
                            content += `${i + 1}. **${kw.title}** _(${kw.type})_\n   - ${kw.reason}\n\n`;
                        });
                    }

                    const now = new Date();
                    const timestamp = now.getFullYear().toString() +
                        (now.getMonth() + 1).toString().padStart(2, '0') +
                        now.getDate().toString().padStart(2, '0') + '_' +
                        now.getHours().toString().padStart(2, '0') +
                        now.getMinutes().toString().padStart(2, '0') +
                        now.getSeconds().toString().padStart(2, '0');
                    const filename = `해시태그_${timestamp}.md`;

                    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                }

                // 최종글 MD 저장
                const formattedDraft = formatForNotion(finalDraftContent);
                let mdContent = `> 작성일: ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}\n\n`;
                mdContent += '---\n\n';
                mdContent += formattedDraft;

                const now = new Date();
                const timestamp = now.getFullYear().toString() +
                    (now.getMonth() + 1).toString().padStart(2, '0') +
                    now.getDate().toString().padStart(2, '0') + '_' +
                    now.getHours().toString().padStart(2, '0') +
                    now.getMinutes().toString().padStart(2, '0') +
                    now.getSeconds().toString().padStart(2, '0');
                const mdFilename = `최종글_${timestamp}.md`;

                const mdBlob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
                const mdUrl = URL.createObjectURL(mdBlob);
                const mdLink = document.createElement('a');
                mdLink.href = mdUrl;
                mdLink.download = mdFilename;
                document.body.appendChild(mdLink);
                mdLink.click();
                document.body.removeChild(mdLink);
                URL.revokeObjectURL(mdUrl);

                // 7. 이미지 카드 생성 (BlogVisualEditor로 전달)
                if (onStage7Complete && (parsed.imageConcepts.length > 0 || (parsed.sectionIllustrations && parsed.sectionIllustrations.length > 0))) {
                    const commonNegatives = ['doctor', '한의사', 'medical professional', 'white coat', 'physician', '진료 장면', 'medical staff'];
                    const patientPrompt = selectedProfile.patientCharacterPrompt || '기본 환자 캐릭터 (30대 중반, 성별 중립, 오피스 캐주얼)';

                    const conceptCards = parsed.imageConcepts.map((c: any) => ({
                        title: c.title,
                        keywords: c.keywords,
                        recommendedStyle: c.recommendedStyle,
                        recommendedPalette: c.recommendedPalette,
                        negatives: c.negatives || commonNegatives,
                        patientCharacterPrompt: patientPrompt
                    }));

                    const sectionCards = (parsed.sectionIllustrations || []).map((s: any) => ({
                        title: `${s.sectionNumber}. ${s.sectionTitle}`,
                        keywords: s.keywords,
                        description: s.manuscriptSummary || s.sectionContent || s.summary,
                        recommendedStyle: 'section-illustration' as const,
                        recommendedPalette: s.recommendedPalette,
                        negatives: commonNegatives,
                        patientCharacterPrompt: patientPrompt
                    }));

                    onStage7Complete({
                        topic: parsed.extractedTopic || '',
                        finalDraft: finalDraftContent,
                        concepts: [...conceptCards, ...sectionCards]
                    });
                }

                alert('✅ 숏컷 처리 완료!\n\n📁 MD 파일 저장 완료\n🖼️ 이미지 카드가 생성되었습니다.');
            } else {
                throw new Error('AI 응답에서 imageConcepts를 찾을 수 없습니다.');
            }
        } catch (error: any) {
            setCurrentOutput(`❌ 숏컷 처리 오류: ${error.message}`);
            alert(`숏컷 처리 중 오류가 발생했습니다: ${error.message}`);
        } finally {
            setIsShortcutProcessing(false);
        }
    };

    // 새 글 작성 - localStorage 데이터 초기화
    const handleNewPost = () => {
        if (!confirm('현재 작업 중인 내용이 모두 삭제됩니다. 새 글을 작성하시겠습니까?')) {
            return;
        }

        // stageData 초기화
        setStageData({
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
            sectionIllustrations: [],
            seriesKeywords: []
        });

        // 현재 출력 초기화
        setCurrentOutput('');

        // Stage 0으로 이동
        setCurrentStage(0);

        // 사용자 입력 초기화
        setUserInput('');

        // 수동 입력 모드 해제
        setManualInputMode(false);
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
                            <div className="flex items-center gap-3">
                                <h3 className="text-lg font-semibold text-gray-300">워크플로 진행</h3>
                                <button
                                    onClick={handleNewPost}
                                    className="flex items-center gap-1 px-3 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-md transition-colors"
                                    title="새 글 작성 (모든 데이터 초기화)"
                                >
                                    <PlusIcon className="w-3 h-3" />
                                    새 글 작성
                                </button>
                                <button
                                    onClick={handleBatchProcess}
                                    disabled={isBatchProcessing || isLoading || !stageData.selectedTopic}
                                    className="flex items-center gap-1 px-3 py-1 text-xs bg-amber-600 hover:bg-amber-500 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="1~6단계 일괄 실행 (주제 선택 후 사용 가능)"
                                >
                                    {isBatchProcessing ? (
                                        <>
                                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                            {batchProgress?.current}/{batchProgress?.total}
                                        </>
                                    ) : (
                                        <>
                                            <SparklesIcon className="w-3 h-3" />
                                            일괄처리
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleShortcutStart}
                                    disabled={isBatchProcessing || isLoading || isShortcutProcessing}
                                    className="flex items-center gap-1 px-3 py-1 text-xs bg-violet-600 hover:bg-violet-500 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="완성된 원고를 직접 입력하여 이미지카드/해시태그만 생성"
                                >
                                    <EditIcon className="w-3 h-3" />
                                    숏컷모드
                                </button>
                            </div>
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

                        {/* ⭐ 시리즈 진행 배너 (시리즈 컨텍스트가 있을 때) */}
                        {stageData.currentSeriesContext && (
                            <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border border-purple-500/30 rounded-lg p-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">📦</span>
                                        <div>
                                            <p className="text-sm text-purple-200">
                                                <strong>시리즈 진행 중</strong>
                                                <span className={`ml-2 text-xs px-2 py-0.5 rounded ${stageData.currentSeriesContext.type === 'main' ? 'bg-green-600' :
                                                    stageData.currentSeriesContext.type === 'drill-down' ? 'bg-blue-600' :
                                                        stageData.currentSeriesContext.type === 'lateral' ? 'bg-orange-600' :
                                                            'bg-pink-600'
                                                    }`}>
                                                    {stageData.currentSeriesContext.type === 'main' ? '🎯 메인' :
                                                        stageData.currentSeriesContext.type === 'drill-down' ? '🔍 세부' :
                                                            stageData.currentSeriesContext.type === 'lateral' ? '↔️ 확장' :
                                                                '➡️ 후속'}
                                                </span>
                                            </p>
                                            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-md">
                                                {stageData.selectedTopic}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        {stageData.currentSeriesContext.cluster.map((s, i) => (
                                            <span
                                                key={i}
                                                className={`w-2 h-2 rounded-full ${s.title === stageData.selectedTopic
                                                    ? 'bg-purple-400 ring-2 ring-purple-300'
                                                    : 'bg-gray-600'
                                                    }`}
                                                title={s.title}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

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
                                            입력 후 아래 버튼을 클릭하면 이미지 카드와 해시태그가 자동 생성됩니다.
                                        </p>
                                        <button
                                            onClick={handleShortcutProcess}
                                            disabled={isShortcutProcessing || isLoading || !currentOutput.trim()}
                                            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                                            title="원고로 이미지카드/해시태그 생성 + MD 저장"
                                        >
                                            {isShortcutProcessing ? (
                                                <>
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                    처리 중...
                                                </>
                                            ) : (
                                                <>
                                                    🚀 숏컷 실행 (이미지카드 + MD 저장)
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Stage 0.5: Topic Selection Cards + Cluster Series */}
                        {currentStage === 0.5 && stageData.scoredTopics.length > 0 && (
                            <div className="space-y-4">
                                <p className="text-sm text-gray-400">📊 평가된 주제 ({stageData.scoredTopics.length}개) - 클릭하면 시리즈 클러스터 표시:</p>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
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
                                                <div className="flex items-center gap-2">
                                                    <span className="text-yellow-400 font-bold">{topic.score}점</span>
                                                    {topic.clusterSuggestions && topic.clusterSuggestions.length > 0 && (
                                                        <span className="text-xs bg-purple-600/50 text-purple-200 px-2 py-0.5 rounded">
                                                            📦×{topic.clusterSuggestions.length}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-400">{topic.summary}</p>
                                            {topic.seriesHint && (
                                                <p className="text-xs text-purple-300 mt-1">💡 {topic.seriesHint}</p>
                                            )}
                                            <div className="flex items-center gap-2 mt-2">
                                                {idx === 0 && <span className="text-xs text-green-400">🥇 AI 추천</span>}
                                                {stageData.selectedTopicIndex === idx && (
                                                    <span className="text-xs text-green-300">✅ 선택됨</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* ⭐ 클러스터 시리즈 표시 (주제 선택 시) */}
                                {stageData.selectedTopicIndex >= 0 && stageData.scoredTopics[stageData.selectedTopicIndex]?.clusterSuggestions && (
                                    <div className="mt-4 border-t border-gray-700 pt-4">
                                        <p className="text-sm text-gray-300 mb-3">
                                            📦 <strong>시리즈 클러스터</strong> (원하는 글 선택 → 1-7단계 진행)
                                        </p>
                                        <div className="space-y-2">
                                            {stageData.scoredTopics[stageData.selectedTopicIndex].clusterSuggestions!.map((series, sIdx) => (
                                                <div
                                                    key={sIdx}
                                                    className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-500/30 rounded-lg p-3 hover:border-purple-400 transition-colors"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className={`text-xs px-2 py-0.5 rounded font-medium ${series.type === 'main' ? 'bg-green-600 text-white' :
                                                                    series.type === 'drill-down' ? 'bg-blue-600 text-white' :
                                                                        series.type === 'lateral' ? 'bg-orange-600 text-white' :
                                                                            'bg-pink-600 text-white'
                                                                    }`}>
                                                                    {series.type === 'main' ? '🎯 메인' :
                                                                        series.type === 'drill-down' ? '🔍 세부' :
                                                                            series.type === 'lateral' ? '↔️ 확장' :
                                                                                '➡️ 후속'}
                                                                </span>
                                                                <span className={`text-xs px-1.5 py-0.5 rounded ${series.estimatedSearchVolume === 'high' ? 'bg-green-700/50 text-green-300' :
                                                                    series.estimatedSearchVolume === 'medium' ? 'bg-yellow-700/50 text-yellow-300' :
                                                                        'bg-gray-700/50 text-gray-300'
                                                                    }`}>
                                                                    검색량: {series.estimatedSearchVolume}
                                                                </span>
                                                            </div>
                                                            <p className="text-white text-sm font-medium">{series.title}</p>
                                                            <p className="text-xs text-gray-400 mt-1">{series.reason}</p>
                                                        </div>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                // 시리즈 선택하여 1단계로 진행
                                                                setStageData(prev => ({
                                                                    ...prev,
                                                                    selectedTopic: series.title,
                                                                    currentSeriesContext: {
                                                                        type: series.type,
                                                                        cluster: stageData.scoredTopics[stageData.selectedTopicIndex].clusterSuggestions!
                                                                    }
                                                                }));
                                                                setCurrentStage(1);
                                                            }}
                                                            className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded-md transition-colors whitespace-nowrap"
                                                        >
                                                            ▶️ 1-7단계 시작
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* 시리즈 일괄 생성 버튼 */}
                                        <button
                                            onClick={() => {
                                                const cluster = stageData.scoredTopics[stageData.selectedTopicIndex]?.clusterSuggestions;
                                                if (cluster && cluster.length > 0) {
                                                    // 첫 번째 시리즈 (메인)부터 시작
                                                    const firstSeries = cluster[0];
                                                    setStageData(prev => ({
                                                        ...prev,
                                                        selectedTopic: firstSeries.title,
                                                        selectedCluster: {
                                                            main: firstSeries.title,
                                                            series: cluster
                                                        },
                                                        currentSeriesContext: {
                                                            type: firstSeries.type,
                                                            cluster: cluster
                                                        }
                                                    }));
                                                    setCurrentStage(1);
                                                }
                                            }}
                                            className="mt-3 w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-sm font-medium rounded-md transition-colors"
                                        >
                                            📦 시리즈 첫 번째 글(메인)부터 시작
                                        </button>
                                    </div>
                                )}
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
                                ) : (currentStage === 6 || currentStage === 7) ? (
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
                                            {/* Stage 6/7에서 Notion 스타일 적용하여 표시 */}
                                            {formatForNotion(currentStage === 7 ? stageData.finalDraft : currentOutput)}
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
