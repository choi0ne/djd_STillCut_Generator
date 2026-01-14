# Blog Workflow MCP Server

의료 블로그 작성을 위한 8단계 워크플로우 프롬프트를 생성하는 MCP 서버입니다.

## 기능

- **generate_stage_prompt**: 워크플로우의 각 단계(0-7)에 맞는 상세한 프롬프트 생성
- **get_workflow_info**: 전체 워크플로우 설명 제공

## 설치

### 1. 의존성 설치

```bash
cd mcp-blog-workflow
npm install
```

### 2. 빌드

```bash
npm run build
```

## Claude Desktop 연결

### Windows 설정

1. Claude Desktop 설정 파일을 엽니다:
   - 위치: `%APPDATA%\Claude\claude_desktop_config.json`
   - 또는 Claude Desktop 앱에서: `Settings > Developer > Edit Config`

2. 다음 내용을 추가합니다:

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

**중요**: 경로는 절대 경로를 사용하고, Windows에서는 `\\`를 사용합니다.

### macOS/Linux 설정

1. Claude Desktop 설정 파일을 엽니다:
   - 위치: `~/Library/Application Support/Claude/claude_desktop_config.json`

2. 다음 내용을 추가합니다:

```json
{
  "mcpServers": {
    "blog-workflow": {
      "command": "node",
      "args": [
        "/absolute/path/to/djd_STillCut_Generator/mcp-blog-workflow/dist/index.js"
      ]
    }
  }
}
```

### 3. Claude Desktop 재시작

설정을 저장한 후 Claude Desktop을 완전히 종료하고 다시 시작합니다.

### 4. 연결 확인

Claude Desktop에서 다음과 같이 확인할 수 있습니다:
- 하단에 🔌 아이콘이 표시되면 MCP 서버가 연결된 것입니다
- "Use MCP tools" 또는 도구 목록에서 `generate_stage_prompt`를 확인할 수 있습니다

## Claude Code (VSCode) 연결

### 1. Claude Code 설정 파일 편집

```bash
# Windows
notepad %USERPROFILE%\.claude\config.json

# macOS/Linux
nano ~/.claude/config.json
```

### 2. MCP 서버 추가

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

### 3. VSCode 재시작

VSCode를 재시작하면 Claude Code가 MCP 서버를 인식합니다.

### 4. 스킬과 함께 사용

`.claude-code/skills/blog-workflow.md` 스킬이 이 MCP 서버를 자동으로 사용합니다.

```bash
# VSCode에서 Claude Code를 열고
/blog-workflow
```

## 사용 예시

### 직접 도구 호출 (Claude Desktop)

```
사용자: blog-workflow MCP의 generate_stage_prompt 도구를 사용해서 Stage 0 프롬프트를 생성해줘.

profile:
- name: 김한의 원장
- specialty: 한방신경정신과
...

userInput: 어지럼증
```

### 스킬 사용 (Claude Code)

```bash
/blog-workflow
```

그러면 대화형 워크플로우가 시작됩니다.

## API

### generate_stage_prompt

워크플로우의 특정 단계에 대한 프롬프트를 생성합니다.

**입력:**
```typescript
{
  stage: 0 | 0.5 | 1 | 2 | 3 | 4 | 5 | 6 | 7,
  profile: {
    name: string,
    description: string,
    specialty: string,
    toneKeywords: string[],
    targetAudience: string,
    corePrinciples: string[],
    patientCharacterPrompt?: string
  },
  stageData: {
    ideation?: string[],
    selectedTopic?: string,
    keywords?: string[],
    references?: string[],
    outline?: string,
    draft?: string,
    critique?: string,
    finalDraft?: string,
    currentSeriesContext?: {...}
  },
  userInput?: string  // Stage 0에서만 필요
}
```

**출력:**
```
해당 단계에 맞는 상세한 프롬프트 텍스트
```

### get_workflow_info

전체 워크플로우의 단계 설명을 반환합니다.

**입력:** 없음

**출력:**
```
워크플로우 8단계 전체 설명 (마크다운)
```

## 워크플로우 단계

1. **Stage 0**: 아이디에이션 - 주제 후보 5개 생성
2. **Stage 0.5**: 주제 스코어링 + 시리즈 클러스터
3. **Stage 1**: 키워드 클러스터 - 롱테일 키워드 20개 이상
4. **Stage 2**: 근거 설계 - 참고 자료 제안
5. **Stage 3**: 아웃라인 & 12 블록 맵핑
6. **Stage 4**: 집필 - 8개 섹션 완전체
7. **Stage 5**: 초고 비평 - 5C 체크리스트
8. **Stage 6**: 탈고 - Notion 편집 모드
9. **Stage 7**: 시각 프롬프트 설계 + 해시태그

## 개발

### 개발 모드 실행

```bash
npm run dev
```

TypeScript 파일 변경 시 자동으로 재컴파일됩니다.

### 빌드

```bash
npm run build
```

### 테스트 실행

```bash
npm start
```

표준 입출력으로 MCP 서버가 실행됩니다.

## 문제 해결

### "MCP server not found" 오류

1. 경로가 절대 경로인지 확인
2. `npm run build`가 실행되어 `dist/index.js`가 생성되었는지 확인
3. Node.js가 설치되어 있는지 확인 (`node --version`)

### "Permission denied" 오류 (macOS/Linux)

```bash
chmod +x dist/index.js
```

### 프롬프트가 잘못 생성됨

1. 입력 데이터의 형식이 올바른지 확인
2. 각 단계에 필요한 `stageData` 필드가 모두 제공되었는지 확인
3. Stage 0에서는 `userInput` 필드가 필수입니다

## 라이선스

MIT

## 기여

이슈나 PR을 환영합니다!
