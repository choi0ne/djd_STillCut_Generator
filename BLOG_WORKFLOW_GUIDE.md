# 🚀 Blog Workflow MCP + Skill 빠른 시작 가이드

의료 블로그 작성 워크플로우를 MCP 서버와 Claude Code 스킬로 사용하는 방법입니다.

## 📦 설치 (한 번만 수행)

### 1. MCP 서버 설치

```bash
cd mcp-blog-workflow
npm install
npm run build
```

### 2. Claude Desktop 연결 (선택사항)

`%APPDATA%\Claude\claude_desktop_config.json` 파일에 추가:

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

> **주의**: 경로를 본인의 프로젝트 경로로 변경하세요!

Claude Desktop을 재시작하면 🔌 아이콘이 표시됩니다.

### 3. Claude Code (VSCode) 연결

`~/.claude/config.json` 파일에 추가:

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

VSCode를 재시작합니다.

## 🎯 사용 방법

### 방법 1: Claude Code 스킬 사용 (추천)

VSCode에서 Claude Code를 열고:

```bash
/blog-workflow
```

대화형 워크플로우가 시작됩니다! 스킬이 단계별로 안내해 줍니다.

#### 스킬 명령어

- `next` 또는 `n`: 다음 단계로 진행
- `back` 또는 `b`: 이전 단계로 돌아가기
- `status` 또는 `s`: 현재 진행 상황 확인
- `export` 또는 `e`: 데이터를 JSON 파일로 저장
- `quit` 또는 `q`: 워크플로우 종료

#### 예시 대화

```
👤 User: /blog-workflow

🤖 Assistant: 의료 블로그 작성 워크플로우를 시작합니다!

먼저 프로필을 선택해 주세요:
1. 김한의 원장 (기본 한의학 프로필)
2. 새 프로필 생성

👤 User: 1

🤖 Assistant: "김한의 원장" 프로필을 선택하셨습니다.
어느 단계부터 시작하시겠습니까?
1. 처음부터 (Stage 0: 아이디에이션)
2. 특정 단계부터 (기존 데이터 불러오기)

👤 User: 1

🤖 Assistant: Stage 0부터 시작합니다.
블로그 주제나 키워드를 입력해 주세요:

👤 User: 어지럼증

🤖 Assistant:
========================================
📝 Stage 0: 아이디에이션 (1/8)
========================================

[생성된 프롬프트가 여기 표시됩니다]

---
다음 작업: 위 지침에 따라 5개의 주제 후보를 JSON 형식으로 생성해 주세요.

👤 User: [생성된 JSON 붙여넣기]

🤖 Assistant: ✅ Stage 0 완료! 다음 단계로 진행할까요?
`next` 또는 `n`을 입력하세요.

👤 User: next

[Stage 1로 진행...]
```

### 방법 2: Claude Desktop에서 직접 MCP 도구 사용

Claude Desktop 대화창에서:

```
generate_stage_prompt 도구를 사용해서 Stage 0 프롬프트를 생성해줘.

stage: 0
profile: {
  "name": "김한의 원장",
  "description": "한방신경정신과 전문의...",
  "specialty": "한방신경정신과, 심리치료, 침구치료",
  "toneKeywords": ["공감적", "과학적", "실용적"],
  "targetAudience": "20-40대 도시 직장인",
  "corePrinciples": [...]
}
userInput: "어지럼증"
```

### 방법 3: React 앱에서 계속 사용

기존 [BlogWriterEditor.tsx](components/BlogWriterEditor.tsx)는 그대로 사용 가능합니다.
MCP 서버는 추가 옵션으로, 기존 기능에 영향을 주지 않습니다.

## 🔄 워크플로우 8단계

1. **Stage 0**: 아이디에이션 - 키워드에서 주제 후보 5개 생성
2. **Stage 0.5**: 주제 스코어링 - 5대 축 평가 및 시리즈 클러스터
3. **Stage 1**: 키워드 클러스터 - 롱테일 키워드 20개 이상
4. **Stage 2**: 근거 설계 - WM/KM 참고 자료 제안
5. **Stage 3**: 아웃라인 - 8단락 구조 + 12 블록 맵핑
6. **Stage 4**: 집필 - 8개 섹션 완전체 초고 작성
7. **Stage 5**: 초고 비평 - 5C 체크리스트 기반 비평
8. **Stage 6**: 탈고 - Notion 편집 모드 (내용 100% 보존)
9. **Stage 7**: 시각 프롬프트 - 이미지 컨셉, 해시태그, 섹션 일러스트

## 💡 유용한 팁

### 1. 데이터 저장하기

언제든지 `export` 명령으로 진행 상황을 저장할 수 있습니다:

```
👤 User: export

🤖 Assistant: ✅ 데이터를 저장했습니다!
파일: blog-workflow-export-2024-01-15-143022.json
```

### 2. 세션 복원하기

이전에 저장한 파일로 세션을 복원할 수 있습니다:

```
👤 User: /blog-workflow

🤖 Assistant: ...

👤 User: 2 (특정 단계부터 시작)

🤖 Assistant: 저장된 JSON 파일 경로를 입력해 주세요:

👤 User: blog-workflow-export-2024-01-15-143022.json

🤖 Assistant: ✅ 세션을 복원했습니다!
마지막 완료 단계: Stage 3
Stage 4부터 계속하시겠습니까?
```

### 3. 프로필 재사용

자주 사용하는 프로필은 JSON 파일로 저장해 두면 편리합니다:

```json
// my-profile.json
{
  "name": "김한의 원장",
  "description": "한방신경정신과 전문의로...",
  "specialty": "한방신경정신과",
  "toneKeywords": ["공감적", "과학적"],
  "targetAudience": "20-40대 직장인",
  "corePrinciples": [
    "Answer First: 결론부터 명확하게",
    "환자 중심 언어 사용"
  ],
  "patientCharacterPrompt": "30대 중반, 성별 중립, 오피스 캐주얼"
}
```

### 4. 특정 단계만 실행

특정 단계의 프롬프트만 필요할 때는 Claude에게 직접 요청:

```
👤 User: generate_stage_prompt 도구로 Stage 3 프롬프트만 생성해줘.
selectedTopic은 "어지럼증의 원인과 관리법"이고,
keywords는 ["어지럼증 원인", "전정기관", "혈압성 어지럼증", ...]
```

## 🐛 문제 해결

### MCP 서버가 연결되지 않음

1. `npm run build`를 실행했는지 확인
2. 설정 파일의 경로가 절대 경로인지 확인
3. Claude Desktop/VSCode를 재시작

### 프롬프트가 이상하게 생성됨

1. 입력 데이터 형식 확인 (특히 JSON)
2. 각 단계에 필요한 이전 단계 데이터가 있는지 확인
3. Stage 0에서는 `userInput` 필수

### 스킬이 실행되지 않음

1. `.claude-code/skills/blog-workflow.md` 파일이 있는지 확인
2. VSCode를 재시작
3. Claude Code 확장 프로그램이 최신 버전인지 확인

## 📚 추가 리소스

- MCP 서버 상세 문서: [mcp-blog-workflow/README.md](mcp-blog-workflow/README.md)
- 스킬 소스 코드: [.claude-code/skills/blog-workflow.md](.claude-code/skills/blog-workflow.md)
- 원본 React 컴포넌트: [components/BlogWriterEditor.tsx](components/BlogWriterEditor.tsx)

## 🎉 이제 시작하세요!

```bash
/blog-workflow
```

즐거운 블로그 작성 되세요! 🚀
