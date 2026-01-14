#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";

// 워크플로우 스테이지 타입 정의
type WorkflowStage = 0 | 0.5 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

interface Profile {
  name: string;
  description: string;
  specialty: string;
  toneKeywords: string[];
  targetAudience: string;
  corePrinciples: string[];
  patientCharacterPrompt?: string;
}

interface StageData {
  ideation: string[];
  selectedTopic: string;
  keywords: string[];
  references: string[];
  outline: string;
  draft: string;
  critique: string;
  finalDraft: string;
  currentSeriesContext?: {
    cluster: Array<{ title: string; type: string }>;
  };
}

interface PromptRequest {
  stage: WorkflowStage;
  profile: Profile;
  stageData: Partial<StageData>;
  userInput?: string;
}

const FIXED_AUTHOR = {
  signature: "© 2024 김한의 원장 | 한의학과 서양의학의 조화로운 치료",
};

// 기본 워크플로우 프롬프트 생성
function getWorkflowPrompt(profile: Profile): string {
  return `당신은 **${profile.name}** 페르소나입니다.

## 프로필
${profile.description}

전문 분야: ${profile.specialty}
톤: ${profile.toneKeywords.join(", ")}
타겟 독자: ${profile.targetAudience}

## 핵심 원칙
${profile.corePrinciples.map((p, i) => `${i + 1}. ${p}`).join("\n")}

## 12 블록 라이브러리
1. VOC: 환자의 실제 말투로 증상/고민 표현
2. PATH: 즉시 실천 가능한 Top 3 루틴 (시간대별 또는 우선순위별)
3. CONTRA: 레드플래그 - 내원/응급 기준 명시
4. DRUG: 약물 정보 (성분명, 기전, 주의사항)
5. METAPHOR: 비유 설명 (예: "관절은 경첩과 같습니다")
6. ANALOGY: 유사 사례 비교
7. ANCHOR: 수치적 기준점 (예: "정상 혈압 120/80")
8. REF: 논문/가이드라인 인용
9. INTERACTION: 약물 상호작용 / 병용 금기
10. MEAS: 자가 측정 방법 (체크리스트, 점수표)
11. CASE: 실제 사례 (익명화)
12. DEEP_DIVE: 병리/기전 심화 (콜아웃 박스 형식)`;
}

// 스테이지별 프롬프트 생성 (원본 로직 이식)
function getStagePrompt(
  stage: WorkflowStage,
  profile: Profile,
  stageData: Partial<StageData>,
  userInput?: string
): string {
  const basePrompt = getWorkflowPrompt(profile);

  switch (stage) {
    case 0:
      return `${basePrompt}

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
      return `${basePrompt}

## Stage 0.5: 주제 스코어링 + 시리즈 클러스터

주제 후보들:
${stageData.ideation?.join("\n")}

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

반드시 JSON 배열 형식으로 출력하세요 (총점 높은 순으로 정렬).`;

    case 1:
      return `${basePrompt}

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
      return `${basePrompt}

## Stage 2: 근거 설계

주제: "${stageData.selectedTopic}"

참고 자료 3-6개를 제안하세요:
- WM (서양의학): NICE, BMJ, APA 등
- KM (한의학): 대한한의학회 CPG, NIKOM 등
- 5년 이내 문헌 우선

각 자료의 핵심 내용을 요약하세요.`;

    case 3:
      return `${basePrompt}

## Stage 3: 아웃라인 & 12 블록 맵핑

주제: "${stageData.selectedTopic}"
키워드: ${stageData.keywords?.slice(0, 10).join(", ")}

환자 중심 **8단락 구조**로 아웃라인을 작성하세요:

### 본문 섹션 (1-6)
1. Answer First (핵심 결론)
2. Action (즉각적 행동) - PATH Top 3
3. Warning (위험 신호) - CONTRA
4. The 'Why' (상세 원인)
5. Proof (사례와 근거)
6. Closing (요약 및 격려) + 마지막에 "${FIXED_AUTHOR.signature}" 표시

### 7. FAQ (자주 묻는 질문) - JSON-LD FAQPage 호환
### 8. 참고 자료 (글 하단 일괄 명시)

12 블록 중 사용할 블록을 지정하세요:
필수: VOC, PATH, CONTRA
선택: DRUG, METAPHOR, ANALOGY, ANCHOR, REF, INTERACTION, MEAS, CASE, DEEP_DIVE`;

    case 4:
      return `${basePrompt}

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

### 9개 섹션 구조 (반드시 모두 포함)
**[0. 제목]** (필수 - 글의 첫 줄)
**[본문 섹션 1-6]**
**[텍스트 전용 섹션 7-8]** (FAQ, 참고 자료)`;

    case 5:
      return `${basePrompt}

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
      return `${basePrompt}

## Stage 6: 탈고 (Notion 편집 모드)

---
# 📘 Notion Editing Instruction v2.3
(Content-Preserving Editor Only)
---

## 0. 역할 정의
- 역할은 **편집자(Editor)** 한 가지뿐이다.
- 입력된 모든 원문은 **의미·정보·뉘앙스 100% 보존**이 원칙이다.

## 1. 절대 규칙 (Critical Rules)
1. 내용 추가 금지
2. 내용 삭제 금지
3. 의미 변경 금지
4. 해석·의견·의학적 판단 금지
5. 요약·결론 문장 생성 금지

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
${
  stageData.currentSeriesContext
    ? `
### 📌 시리즈 글 연결 (필수 추가)
이 글은 시리즈의 일부입니다. 글의 마지막 부분(Closing 섹션 이후)에 관련 글 섹션을 추가하세요.
`
    : ""
}`;

    case 7:
      const hasTopicFromWorkflow =
        stageData.selectedTopic && stageData.selectedTopic.trim();
      const topicInstruction = hasTopicFromWorkflow
        ? `주제: "${stageData.selectedTopic}"`
        : `주제: (아래 최종 글에서 핵심 주제를 추출하세요)`;

      const keywordsInstruction =
        stageData.keywords && stageData.keywords.length > 0
          ? `키워드 클러스터: ${stageData.keywords.slice(0, 15).join(", ")}`
          : `키워드 클러스터: (아래 최종 글에서 핵심 키워드를 추출하세요)`;

      return `${basePrompt}

## Stage 7: 시각 프롬프트 설계 + 해시태그 생성

${topicInstruction}
${keywordsInstruction}
최종 글:
${stageData.finalDraft}

### 🔴 이미지 생성 필수 규칙 (모든 컨셉에 적용)

**환자 캐릭터 프롬프트 (프로필 기반):**
${profile.patientCharacterPrompt || "기본 환자 캐릭터 (30대 중반, 성별 중립, 오피스 캐주얼)"}

**⛔ NEGATIVES (모든 이미지에서 절대 금지):**
- 의사/한의사/의료진 캐릭터 절대 금지
- 흰 가운 입은 인물 금지
- 의료진이 설명하는 장면 금지

### TASK 1: 이미지 컨셉 (3-5개)
⚠️ **필수 규칙: 첫 번째 컨셉은 반드시 "블로그 썸네일" (blog-thumbnail) 스타일!**

### TASK 2: 블로그 게시용 해시태그 (# 제외)
5개 분류로 생성:
- 핵심증상
- 타겟상황
- 행동솔루션
- 의학한의학
- 페르소나톤

### TASK 3: 섹션별 일러스트 (6개)
각 섹션의 원고 내용을 2-3문장으로 요약하고, 시각적 키워드를 추출하세요.

### TASK 4: 시리즈 키워드 (다음 글 후보)
꼬리를 무는 연속 주제 5개를 제안하세요.

### 출력 형식 (반드시 JSON)
{
  "extractedTopic": "주제",
  "imageConcepts": [...],
  "hashtags": [...],
  "sectionIllustrations": [...],
  "seriesKeywords": [...]
}`;

    default:
      return "";
  }
}

// MCP 서버 초기화
const server = new Server(
  {
    name: "blog-workflow-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 도구 목록 정의
const tools: Tool[] = [
  {
    name: "generate_stage_prompt",
    description:
      "의료 블로그 작성 워크플로우의 각 단계별 프롬프트를 생성합니다. Stage 0부터 7까지 지원하며, 각 단계에 맞는 상세한 작성 가이드를 제공합니다.",
    inputSchema: {
      type: "object",
      properties: {
        stage: {
          type: "number",
          enum: [0, 0.5, 1, 2, 3, 4, 5, 6, 7],
          description: "워크플로우 단계 (0: 아이디에이션, 1: 키워드, 2: 근거, 3: 아웃라인, 4: 집필, 5: 비평, 6: 탈고, 7: 시각 프롬프트)",
        },
        profile: {
          type: "object",
          description: "작성자 프로필 정보",
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            specialty: { type: "string" },
            toneKeywords: { type: "array", items: { type: "string" } },
            targetAudience: { type: "string" },
            corePrinciples: { type: "array", items: { type: "string" } },
            patientCharacterPrompt: { type: "string" },
          },
          required: ["name", "description", "specialty", "toneKeywords", "targetAudience", "corePrinciples"],
        },
        stageData: {
          type: "object",
          description: "각 단계에서 생성된 데이터",
          properties: {
            ideation: { type: "array", items: { type: "string" } },
            selectedTopic: { type: "string" },
            keywords: { type: "array", items: { type: "string" } },
            references: { type: "array", items: { type: "string" } },
            outline: { type: "string" },
            draft: { type: "string" },
            critique: { type: "string" },
            finalDraft: { type: "string" },
          },
        },
        userInput: {
          type: "string",
          description: "Stage 0에서 사용할 초기 키워드/아이디어",
        },
      },
      required: ["stage", "profile", "stageData"],
    },
  },
  {
    name: "get_workflow_info",
    description: "블로그 워크플로우의 전체 단계 설명을 반환합니다.",
    inputSchema: {
      type: "object",
      properties: {},
    },
  },
];

// 도구 목록 핸들러
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// 도구 호출 핸들러
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "generate_stage_prompt") {
    const promptArgs = args as unknown as PromptRequest;
    const { stage, profile, stageData, userInput } = promptArgs;

    try {
      const prompt = getStagePrompt(stage, profile, stageData, userInput);

      return {
        content: [
          {
            type: "text",
            text: prompt,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error generating prompt: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  if (name === "get_workflow_info") {
    const info = `
# 의료 블로그 작성 워크플로우

## 8단계 워크플로우

**Stage 0: 아이디에이션**
- 키워드/아이디어를 바탕으로 주제 후보 5개 생성
- 각 후보에 대한 검색 의도, 결론, 루틴, 원인, 위험 신호 포함

**Stage 0.5: 주제 스코어링 + 시리즈 클러스터**
- 5대 축 평가: 행동성, 검색 의도, 진료 연관성, 긴급성, 시리즈화 적합성
- 각 주제에 대한 시리즈 클러스터 제안 (main, drill-down, lateral, follow-up)

**Stage 1: 키워드 클러스터**
- 롱테일 키워드 20개 이상 생성 (약물, 한약, 증상, 상황, 생활요법)
- 문단별 배치 맵 작성

**Stage 2: 근거 설계**
- 참고 자료 3-6개 제안 (WM/KM)
- 각 자료의 핵심 내용 요약

**Stage 3: 아웃라인 & 12 블록 맵핑**
- 환자 중심 8단락 구조 설계
- 12 블록 라이브러리 중 사용할 블록 선정

**Stage 4: 집필**
- 8개 섹션 완전체 블로그 초고 작성
- 집필 규칙 준수

**Stage 5: 초고 비평**
- 5C 체크리스트 (Clarity, Compassion, Actionability, Structure, Urgency)
- 수정 메모 작성

**Stage 6: 탈고**
- Notion 편집 모드 적용
- 내용 100% 보존 원칙

**Stage 7: 시각 프롬프트 설계 + 해시태그**
- 이미지 컨셉 3-5개 생성
- 해시태그 5개 분류
- 섹션별 일러스트 6개
- 시리즈 키워드 제안
`;

    return {
      content: [
        {
          type: "text",
          text: info,
        },
      ],
    };
  }

  return {
    content: [
      {
        type: "text",
        text: `Unknown tool: ${name}`,
      },
    ],
    isError: true,
  };
});

// 서버 시작
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Blog Workflow MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
