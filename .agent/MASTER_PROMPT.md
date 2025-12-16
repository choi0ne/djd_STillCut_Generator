# DJD STillCut Generator - Master Prompt

## 🎯 프로젝트 개요

**DJD STillCut Generator**는 Multi-Provider AI 이미지 생성 및 MPS 후처리 통합 웹 애플리케이션입니다.

---

## 📦 기술 스택

| 분류 | 기술 |
|------|------|
| **프레임워크** | React 19.2 |
| **빌드 도구** | Vite 6.2 |
| **언어** | TypeScript 5.8 |
| **스타일링** | TailwindCSS 3.4 |
| **AI API** | Gemini (Nano Banana Pro), OpenAI (gpt-image-1) |
| **후처리** | MPS 스킬 (Python 스크립트) |
| **인증** | Google OAuth 2.0 |
| **상태관리** | React Hooks + LocalStorage |

---

## 🏗️ 프로젝트 구조

```
djd-STillCutGenerator/
├── App.tsx                  # 메인 애플리케이션
├── components/
│   ├── PromptEditor.tsx       # [섹션1] 프롬프트 → 이미지
│   ├── ImageToPromptEditor.tsx # [섹션2] 이미지 → 분석
│   ├── CodeEditor.tsx         # [섹션3] JSON → 이미지
│   ├── MpsProcessor.tsx       # [섹션4] MPS 후처리 ⭐ NEW
│   ├── SettingsModal.tsx      # API 키 설정
│   └── Icons.tsx
├── services/
│   ├── types.ts               # 공통 타입 정의
│   ├── geminiProvider.ts      # Gemini API Provider
│   └── openaiProvider.ts      # OpenAI API Provider
├── mps/
│   ├── SKILL.md               # MPS 스킬 문서
│   └── scripts/               # Python 후처리 스크립트
│       ├── remove_watermark.py
│       ├── optimize_blog.py
│       ├── merge_png.py
│       └── pdf_smart.py
└── hooks/
    ├── useGoogleAuth.tsx
    └── useLocalStorage.tsx
```

---

## 🎨 핵심 기능 (4개 섹션)

### 1. 프롬프트 에디터
텍스트 → Gemini/GPT로 이미지 생성

### 2. 이미지-프롬프트 에디터
이미지 → AI 분석 → 프롬프트 추출

### 3. 코드 에디터
JSON 설정 → 세밀한 이미지 생성

### 4. MPS 후처리 ⭐ NEW
PNG/JPG/PDF → 워터마크 제거, 블로그 최적화

---

## 🔀 Provider 선택 스위치

| Provider | 상태 | 비용 |
|----------|:----:|------|
| Gemini (Nano Banana Pro) | ✅ 최신 | 무료 |
| OpenAI (gpt-image-1) | ⚠️ | 유료 |

---

## 🛠️ MPS 후처리 옵션 (버튼식 UI)

### 이미지 업로드 시
- [토글] 워터마크 제거
- [토글] 블로그 최적화
- [선택] 포맷: WebP / JPG / 둘 다

### PDF 업로드 시
- [토글] 워터마크 제거
- [토글] 블로그 최적화
- [선택] 포맷: WebP / JPG / 둘 다
- [선택] 출력: 개별 / 한 장 합치기
- [체크박스] 페이지 선택 + 순서 조정

---

## 🔐 API 키 요구사항

| API 키 | 용도 | 필수 |
|--------|------|:----:|
| Gemini API Key | 이미지 생성/분석 | ✅ |
| OpenAI API Key | 고품질 생성 (선택) | 선택 |
| Google Client ID | OAuth 로그인 | ✅ |

---

## 🚀 실행 명령어

```bash
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
```

---

## 📌 중요 참고사항

> [!IMPORTANT]
> Claude API 불필요 - Gemini로 분석, MPS 스크립트로 후처리

> [!NOTE]
> MPS 스킬 = Python 스크립트 (로컬 실행, 무료)

---

© 2025 DJD Quality-improvement in Clinical Practice. All rights reserved.
