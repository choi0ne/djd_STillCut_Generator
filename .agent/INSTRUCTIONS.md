# DJD STillCut Generator - Instructions

## 🎯 개발 지침

### 1. Provider 통합
- Gemini (Nano Banana Pro) / OpenAI (gpt-image-1) 선택 가능
- **라디오 버튼**으로 Provider 전환
- Gemini 기본값 (무료, 최신)

### 2. MPS 후처리 섹션 (4번째 탭)
**모든 옵션 = 버튼/토글 선택식**

#### 이미지 업로드
```
[워터마크 제거] 토글
[블로그 최적화] 토글
[포맷 선택] WebP / JPG / 둘 다
```

#### PDF 업로드
```
[워터마크 제거] 토글
[블로그 최적화] 토글
[포맷 선택] WebP / JPG / 둘 다
[출력 방식] 개별 / 한 장 합치기
[페이지 선택] 체크박스 + 순서 조정
```

### 3. MPS 스크립트 호출
```typescript
// UI 선택 → Python 스크립트 호출
const command = `python mps/scripts/remove_watermark.py ${input}`;
```

### 4. API 키 관리
- Gemini: 필수
- OpenAI: 선택
- Claude: 불필요

---

## ⚠️ 주의사항
- MPS = Python 스크립트 (LLM 아님)
- 사용자가 직접 옵션 선택
- Claude API 불필요
