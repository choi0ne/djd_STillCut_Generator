# ✅ Blog Workflow MCP + Skill 구현 완료

의료 블로그 작성 워크플로우를 MCP 서버와 Claude Code 스킬로 통합했습니다!

## 📁 생성된 파일들

### 1. MCP 서버 (mcp-blog-workflow/)

```
mcp-blog-workflow/
├── src/
│   └── index.ts          # MCP 서버 메인 코드 (워크플로우 프롬프트 로직)
├── dist/                 # 빌드된 JavaScript 파일 (자동 생성)
├── package.json          # 의존성 및 스크립트
├── tsconfig.json         # TypeScript 설정
├── .gitignore           # Git 제외 파일
└── README.md            # MCP 서버 상세 문서
```

**주요 기능:**
- `generate_stage_prompt`: Stage 0-7의 프롬프트 생성
- `get_workflow_info`: 워크플로우 전체 설명 제공

### 2. Claude Code 스킬

```
.claude-code/
└── skills/
    └── blog-workflow.md  # /blog-workflow 스킬 정의
```

**기능:**
- 대화형 워크플로우 진행
- 8단계 순차 진행 가이드
- 데이터 저장/복원 지원
- MCP 서버 자동 연동

### 3. 문서

```
BLOG_WORKFLOW_GUIDE.md    # 빠른 시작 가이드
MCP_SKILL_SUMMARY.md      # 이 파일 (구현 요약)
```

## 🎯 3가지 사용 방법

### 방법 1: Claude Code 스킬 (가장 편리) ⭐

VSCode에서 Claude Code를 열고:

```bash
/blog-workflow
```

대화형으로 8단계를 진행하며, 단계마다 안내를 받을 수 있습니다.

**장점:**
- 단계별 자동 안내
- 데이터 자동 관리
- 중간 저장/복원 가능
- 명령어로 이동 (next, back, status, export)

### 방법 2: Claude Desktop + MCP 도구

Claude Desktop에서 직접 MCP 도구 호출:

```
generate_stage_prompt 도구를 사용해서 Stage 0 프롬프트를 생성해줘.

stage: 0
profile: {...}
userInput: "어지럼증"
```

**장점:**
- 특정 단계만 빠르게 실행
- Claude Desktop의 풍부한 대화 기능 활용

### 방법 3: 기존 React 앱 계속 사용

[components/BlogWriterEditor.tsx](components/BlogWriterEditor.tsx)를 그대로 사용.

**장점:**
- 기존 UI/UX 유지
- 시각적 인터페이스
- 단계별 버튼 클릭

## 🔧 설치 방법

### 1. MCP 서버 설치 (이미 완료됨 ✅)

```bash
cd mcp-blog-workflow
npm install  # ✅ 완료
npm run build  # ✅ 완료
```

### 2. Claude Desktop 연결

`%APPDATA%\Claude\claude_desktop_config.json` 파일 수정:

```json
{
  "mcpServers": {
    "blog-workflow": {
      "command": "node",
      "args": [
        "C:\\djd_STillCut_Generator\\mcp-blog-workflow\\dist\\index.js"
      ]
    }
  }
}
```

**중요**: 경로를 본인의 실제 프로젝트 경로로 변경하세요!

Claude Desktop 재시작 → 🔌 아이콘 확인

### 3. Claude Code (VSCode) 연결

`~/.claude/config.json` 파일 수정:

```json
{
  "mcpServers": {
    "blog-workflow": {
      "command": "node",
      "args": [
        "C:\\djd_STillCut_Generator\\mcp-blog-workflow\\dist\\index.js"
      ]
    }
  }
}
```

VSCode 재시작

## 🚀 바로 사용해 보기

### 스킬 실행

```bash
# VSCode에서 Claude Code 열기
/blog-workflow
```

### 예시 대화 흐름

```
👤 User: /blog-workflow

🤖 Claude: 의료 블로그 작성 워크플로우를 시작합니다!

프로필을 선택해 주세요:
1. 김한의 원장
2. 새 프로필 생성

👤 User: 1

🤖 Claude: "김한의 원장" 프로필을 선택하셨습니다.
시작 단계를 선택하세요:
1. 처음부터 (Stage 0)
2. 특정 단계부터

👤 User: 1

🤖 Claude: 블로그 주제나 키워드를 입력해 주세요:

👤 User: 손목 통증

🤖 Claude:
========================================
📝 Stage 0: 아이디에이션 (1/8)
========================================

당신은 **김한의 원장** 페르소나입니다.

## 프로필
...

## Stage 0: 아이디에이션

사용자 입력: "손목 통증"

위 키워드/아이디어를 바탕으로 블로그 주제 후보 5개를 생성하세요.
...

---
다음 작업: 위 지침에 따라 5개의 주제 후보를 JSON 형식으로 생성해 주세요.

명령어:
- next: 다음 단계로
- status: 진행 상황
- quit: 종료

👤 User: [생성한 JSON 붙여넣기]

🤖 Claude: ✅ Stage 0 완료!
5개의 주제 후보가 생성되었습니다.
`next`를 입력하여 Stage 0.5로 진행하세요.

👤 User: next

[Stage 0.5로 진행...]
```

## 📊 워크플로우 8단계

| Stage | 이름 | 설명 |
|-------|------|------|
| 0 | 아이디에이션 | 키워드 → 주제 후보 5개 생성 |
| 0.5 | 주제 스코어링 | 5대 축 평가 + 시리즈 클러스터 |
| 1 | 키워드 클러스터 | 롱테일 키워드 20개 이상 |
| 2 | 근거 설계 | WM/KM 참고 자료 제안 |
| 3 | 아웃라인 | 8단락 구조 + 12 블록 맵핑 |
| 4 | 집필 | 8개 섹션 완전체 초고 |
| 5 | 초고 비평 | 5C 체크리스트 기반 |
| 6 | 탈고 | Notion 편집 (내용 100% 보존) |
| 7 | 시각 프롬프트 | 이미지 + 해시태그 + 일러스트 |

## 🎁 추가 기능

### 데이터 저장

```
👤 User: export

🤖 Claude: ✅ 저장 완료!
파일: blog-workflow-export-2024-01-15-143022.json
```

### 세션 복원

```
👤 User: /blog-workflow
[... 프로필 선택 ...]

🤖 Claude: 시작 단계를 선택하세요:
1. 처음부터
2. 특정 단계부터

👤 User: 2

🤖 Claude: JSON 파일 경로를 입력하세요:

👤 User: blog-workflow-export-2024-01-15-143022.json

🤖 Claude: ✅ 세션 복원 완료! Stage 4부터 계속합니다.
```

## 🔄 기존 코드와의 관계

### BlogWriterEditor.tsx의 `getStagePrompt` 함수

**원본 위치:**
```typescript
// components/BlogWriterEditor.tsx (224-821줄)
const getStagePrompt = (stage: WorkflowStage): string => {
  switch (stage) {
    case 0: return `...`;
    case 1: return `...`;
    // ...
  }
}
```

**MCP 서버로 이식:**
```typescript
// mcp-blog-workflow/src/index.ts
function getStagePrompt(
  stage: WorkflowStage,
  profile: Profile,
  stageData: Partial<StageData>,
  userInput?: string
): string {
  // 동일한 로직
}
```

**차이점:**
- MCP 서버: **독립적으로 실행**, Claude가 도구로 호출
- React 앱: **컴포넌트 내부**, UI와 긴밀하게 통합

**공존 가능:** 두 방식 모두 사용 가능하며, 서로 영향을 주지 않습니다.

## 💡 언제 어떤 방식을 쓸까?

| 상황 | 추천 방법 |
|------|-----------|
| Claude와 대화하며 블로그 작성 | 스킬 (/blog-workflow) |
| 특정 단계 프롬프트만 필요 | MCP 도구 직접 호출 |
| 시각적 UI로 단계별 작업 | React 앱 |
| 자동화/배치 처리 | MCP 서버 API |

## 🐛 문제 해결

### MCP 서버 연결 안 됨

```bash
# 1. 빌드 확인
cd mcp-blog-workflow
npm run build

# 2. dist/index.js 파일 존재 확인
ls dist/index.js  # Windows: dir dist\index.js

# 3. Node.js 버전 확인
node --version  # v18 이상 권장
```

### 스킬이 작동하지 않음

```bash
# 1. 스킬 파일 확인
ls .claude-code/skills/blog-workflow.md

# 2. VSCode 재시작

# 3. Claude Code 확장 업데이트
```

### 프롬프트가 이상함

- 입력 데이터 형식 확인 (JSON이 올바른지)
- 이전 단계 데이터가 있는지 확인
- Stage 0에서는 `userInput` 필수

## 📚 더 읽어보기

- [빠른 시작 가이드](BLOG_WORKFLOW_GUIDE.md)
- [MCP 서버 상세 문서](mcp-blog-workflow/README.md)
- [스킬 소스 코드](.claude-code/skills/blog-workflow.md)
- [원본 React 컴포넌트](components/BlogWriterEditor.tsx)

## ✨ 다음 단계

1. **MCP 서버 연결**
   - Claude Desktop 설정 파일 수정
   - 경로를 본인 환경에 맞게 변경
   - 재시작 후 🔌 아이콘 확인

2. **스킬 사용해 보기**
   ```bash
   /blog-workflow
   ```

3. **첫 블로그 작성**
   - 프로필: 김한의 원장 선택
   - 키워드: "어지럼증" 입력
   - 8단계 순차 진행

4. **프로필 커스터마이징**
   - 본인의 전문 분야로 프로필 생성
   - JSON 파일로 저장하여 재사용

즐거운 블로그 작성 되세요! 🎉

---

**구현 완료일**: 2026-01-14
**구현자**: Claude Sonnet 4.5
**버전**: 1.0.0
