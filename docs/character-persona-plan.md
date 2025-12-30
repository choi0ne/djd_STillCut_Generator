# 📋 프로필별 캐릭터 페르소나 계획서

> 작성일: 2025-12-30
> 목적: 블로그 섹션 일러스트 6개에서 일관된 캐릭터가 등장하도록 프로필별 페르소나 정의

---

## 🩺 공통 캐릭터: 한의사 최장혁 (권장)

> **모든 프로필에서 공통으로 사용하는 한의사 캐릭터**
> 브랜딩 일관성을 위해 환자 캐릭터 대신 한의사가 설명하는 형식으로 고정
> 
> ⭐ **참조 이미지**: `assets/doctor-reference.jpg` (실제 프로필 사진)

### 📸 실제 프로필 사진 기반 캐릭터 분석

| 항목 | 특징 |
|------|------|
| **나이대** | 30대 후반 ~ 40대 초반 |
| **안경** | 검정 테 둥근 사각형 프레임 안경 (특징적 요소!) |
| **머리** | 웨이브가 있는 짧은 검은 머리, 옆으로 살짝 넘긴 스타일 |
| **의상** | 밝은 회색/연청색 재킷 + 네이비 V넥 수술복(스크럽) |
| **표정** | 부드럽고 친근한 미소, 신뢰감 있는 눈매 |
| **인상** | 전문적이면서 따뜻한 한의사 |

### 이미지 프롬프트 (영문) - 마스터 프롬프트

```
Main character (FIXED - use in ALL section illustrations): 
A Korean Traditional Medicine doctor (한의사) named "Dr. Choi" in his late 30s to early 40s.

KEY IDENTIFYING FEATURES (must be consistent):
- Black-framed round-rectangular glasses (distinctive feature)
- Short black wavy hair, slightly swept to the side
- Warm, trustworthy eyes with a gentle professional smile
- Light gray/pale blue blazer over navy V-neck medical scrubs

STYLE:
- Minimalist cartoon style, clean thick outlines (2-3px)
- Flat pastel colors, warm cream background (#F5F0E8)
- Friendly and approachable aesthetic
- The doctor appears in various explaining poses across all 6 section illustrations
- Maintains consistent appearance with different gestures for each section

TYPOGRAPHY (Korean text if any):
- Font: Do Hyeon (도현체) style - bold, rounded Korean gothic
- Large, legible text (minimum 24pt equivalent)
- High contrast against background
- Short phrases only (1-2 sentences max)

IMPORTANT: 
- Always include the distinctive black-framed glasses as the key identifying feature.
- Any Korean text must use Do Hyeon style bold rounded gothic font.
```


### 섹션별 포즈 가이드

| 섹션 | 포즈 | 표정 |
|------|------|------|
| **1. Answer First** | 손바닥을 펴서 핵심을 강조하는 제스처 | 확신에 찬 미소 |
| **2. Action** | 체크리스트를 들고 있거나, 손가락으로 1-2-3 카운트 | 격려하는 표정 |
| **3. Warning** | 손을 들어 주의를 환기, 살짝 손가락 흔들기 | 걱정스러운 표정 |
| **4. The Why** | 턱을 괴고 생각하거나, 다이어그램을 가리키는 포즈 | 설명하는 표정 |
| **5. Proof** | 책이나 연구 자료를 들고 있는 모습 | 학구적인 표정 |
| **6. Closing** | 따뜻하게 미소 지으며 격려하는 포즈, 엄지척 | 밝은 미소 |

### 🔧 기술 구현: 참조 이미지 활용

**Gemini API는 참조 이미지 지원!**

```typescript
// 섹션 일러스트 생성 시 참조 이미지 자동 주입
const doctorReferenceImage = '/assets/doctor-reference.jpg';

// generateImageWithPrompt 호출 시 baseImage로 전달
await generateImageWithPrompt(
    doctorReferenceImage,  // 참조 이미지
    characterPrompt + sectionPrompt,
    1,
    'gemini'
);
```

**기대 효과:**
- 참조 이미지 + 상세 프롬프트 조합으로 80~90% 캐릭터 일관성 확보
- 안경, 머리 스타일, 의상 등 핵심 특징 유지

---

## 🎯 핵심: 출력 일관성 강제 전략

> ⚠️ **가장 중요한 목표: 6개 섹션 일러스트에서 동일한 요소들이 일관되게 출력되어야 함**

### 일관성 강제 대상

| 요소 | 고정 값 | 중요도 |
|------|---------|--------|
| **캐릭터** | 한의사 Dr. Choi (안경, 머리, 의상) | ⭐⭐⭐ |
| **서체** | 도현체 (Do Hyeon) - 굵은 둥근 고딕 | ⭐⭐⭐ |
| **배경색** | 크림색 (#F5F0E8) | ⭐⭐ |
| **스타일** | 미니멀 카툰, 플랫 파스텔 | ⭐⭐ |

### 1. 마스터 프롬프트 강제 주입

**모든 섹션 일러스트 생성 시 캐릭터 프롬프트가 맨 앞에 강제 삽입됨**

```typescript
// BlogVisualEditor.tsx 또는 이미지 생성 로직에서

const DOCTOR_CHOI_MASTER_PROMPT = `
[CHARACTER LOCK - DO NOT DEVIATE]
Main character: Korean male doctor "Dr. Choi", late 30s to early 40s.
MANDATORY FEATURES (must appear in EVERY image):
✓ Black-framed round-rectangular glasses
✓ Short black wavy hair, swept to side
✓ Light gray/pale blue blazer
✓ Navy V-neck medical scrubs underneath
✓ Warm professional smile
STYLE: Minimalist cartoon, clean thick outlines (2-3px), flat pastel colors.
[END CHARACTER LOCK]

`;

// 섹션 일러스트 생성 시 강제 결합
const buildPrompt = (sectionPrompt: string) => {
    return DOCTOR_CHOI_MASTER_PROMPT + sectionPrompt;
};
```

### 2. 참조 이미지 필수 사용

```typescript
// 섹션 일러스트 생성 시 참조 이미지는 항상 포함
const generateSectionIllustration = async (sectionPrompt: string) => {
    const referenceImage = await loadDoctorReferenceImage();  // assets/doctor-reference.jpg
    
    // 참조 이미지 없으면 생성 차단
    if (!referenceImage) {
        throw new Error('한의사 참조 이미지가 필요합니다. assets/doctor-reference.jpg를 확인하세요.');
    }
    
    return generateImageWithPrompt(
        referenceImage,              // ⭐ 참조 이미지 필수
        buildPrompt(sectionPrompt),  // ⭐ 마스터 프롬프트 강제 결합
        1,
        'gemini'
    );
};
```

### 3. 네거티브 프롬프트로 불일치 차단

```typescript
const STYLE_NEGATIVES = [
    // 캐릭터 관련
    'different face',
    'different glasses',
    'no glasses',
    'different hair',
    'blonde hair',
    'long hair',
    'female doctor',
    'young doctor',
    'old doctor',
    'different outfit',
    'white coat',
    'casual clothes',
    'multiple characters',
    'crowd',
    'realistic style',
    'photo-realistic',
    // 서체 관련
    'thin font',
    'cursive font',
    'serif font',
    'handwritten font',
    'small text',
    'illegible text',
    'decorative font'
];

// 프롬프트에 네거티브 추가
const fullPrompt = `${MASTER_PROMPT}
${sectionPrompt}

AVOID: ${STYLE_NEGATIVES.join(', ')}`;
```

### 3-1. 서체 일관성 강제 전략

**한글 텍스트가 포함될 경우 도현체(Do Hyeon) 스타일 강제**

```typescript
const TYPOGRAPHY_RULES = `
TYPOGRAPHY LOCK (for any Korean text):
- Font style: Do Hyeon (도현체) - bold, rounded Korean gothic
- Weight: Extra Bold / Black
- Size: Large and legible (minimum 24pt equivalent)
- Color: High contrast (#333333 on light, #FFFFFF on dark)
- Placement: Clear separation from illustration
- Length: Short phrases only (1-2 sentences maximum)

DO NOT USE:
- Thin or light weight fonts
- Cursive or handwritten styles
- Serif fonts
- Decorative or fancy fonts
- Small or illegible text sizes
`;

// 텍스트가 포함된 이미지 생성 시 서체 규칙 강제 주입
const buildPromptWithText = (basePrompt: string, koreanText: string) => {
    return `${MASTER_PROMPT}
${TYPOGRAPHY_RULES}

Korean text to include: "${koreanText}"

${basePrompt}`;
};
```

### 서체 일관성 체크 포인트

| 요소 | 고정 값 | 네거티브 |
|------|---------|----------|
| 서체 스타일 | 도현체 (Do Hyeon) | thin, cursive, serif, handwritten |
| 굵기 | Extra Bold / Black | light, regular, medium |
| 크기 | 24pt 이상 (대형) | small, tiny, illegible |
| 색상 | 고대비 (#333 또는 #FFF) | low contrast, pastel text |

### 4. 섹션별 변형은 포즈/표정만

```typescript
// 각 섹션별로 포즈와 표정만 다르게 지정
const SECTION_VARIATIONS = {
    1: { pose: 'palm open, emphasizing gesture', expression: 'confident smile' },
    2: { pose: 'holding checklist, counting fingers', expression: 'encouraging' },
    3: { pose: 'hand raised warning, finger wagging', expression: 'concerned' },
    4: { pose: 'chin on hand thinking, pointing at diagram', expression: 'explaining' },
    5: { pose: 'holding book or research paper', expression: 'scholarly' },
    6: { pose: 'thumbs up, warmly smiling', expression: 'bright encouraging smile' }
};

// 최종 프롬프트 구성
const buildSectionPrompt = (sectionNumber: number, contentSummary: string) => {
    const variation = SECTION_VARIATIONS[sectionNumber];
    return `
${DOCTOR_CHOI_MASTER_PROMPT}

SECTION ${sectionNumber} ILLUSTRATION:
- Pose: ${variation.pose}
- Expression: ${variation.expression}
- Context: ${contentSummary}

REMEMBER: Keep the character's face, glasses, hair, and outfit EXACTLY the same as the reference image.
Only change the pose and expression as specified above.
`;
};
```

### 5. 프롬프트 구조 강제 (코드 레벨)

```typescript
// styleLibrary.ts의 section-illustration 스타일 수정

{
    id: 'section-illustration',
    displayName: '섹션 일러스트',
    icon: '📖',
    description: '블로그 섹션별 요약 일러스트 - 한의사 캐릭터 고정',
    keywords: ['section', 'doctor', 'consistent character', 'Korean TKM'],
    goldStandardExample: {
        // ⭐ 캐릭터 프롬프트가 항상 맨 앞에 위치
        BACKGROUND_PROMPT: `[CHARACTER LOCK]
Main character: Korean male TKM doctor "Dr. Choi", late 30s-40s.
MANDATORY: Black-framed glasses, short black wavy hair, light gray blazer, navy scrubs.
Style: Minimalist cartoon, clean outlines, flat pastel colors, cream background (#F5F0E8).
[END LOCK]

{SECTION_CONTENT}  // 이 자리에 섹션별 내용 삽입

Keep character appearance IDENTICAL across all images. Only vary pose and expression.`,
        NEGATIVES: [
            'different character',
            'no glasses',
            'different hair',
            'female',
            'white coat',
            'realistic',
            'photo'
        ]
    }
}
```

### 일관성 체크 포인트

| 요소 | 고정 여부 | 확인 방법 |
|------|----------|----------|
| 안경 | ✅ 고정 | 검정 테 둥근 사각형 |
| 머리 | ✅ 고정 | 짧은 검은 웨이브, 옆으로 넘김 |
| 의상 | ✅ 고정 | 연회색 재킷 + 네이비 스크럽 |
| 얼굴형 | ✅ 참조 이미지 기반 | 동일 인상 유지 |
| 포즈 | ❌ 변형 | 섹션별로 다름 |
| 표정 | ❌ 변형 | 섹션별로 다름 |
| 배경 | ✅ 고정 | 크림색 (#F5F0E8) |

---

## 🎭 조건부 캐릭터 등장 로직

> ⚠️ **중요: 한의사 캐릭터는 모든 장면에 등장하는 것이 아님!**
> 한의사가 필요한 장면에만 등장하고, 그 외에는 개념 일러스트로 대체

### 섹션별 캐릭터 등장 여부

| 섹션 | 한의사 등장 | 이유 | 대안 이미지 |
|------|------------|------|------------|
| **1. Answer First** | ✅ 등장 | 핵심 결론을 전달하는 역할 | - |
| **2. Action** | ⚪ 선택적 | 실천법 설명 또는 동작 일러스트 | 스텝 다이어그램, 동작 가이드 |
| **3. Warning** | ✅ 등장 | 주의사항 경고 역할 | - |
| **4. The Why** | ⚪ 선택적 | 기전 설명 또는 개념 다이어그램 | 의학 일러스트, 해부도 |
| **5. Proof** | ❌ 미등장 | 연구/근거 데이터가 주인공 | 인포그래픽, 차트 |
| **6. Closing** | ✅ 등장 | 격려/마무리 인사 역할 | - |

### 등장 여부 판단 로직

```typescript
// 섹션별 한의사 등장 여부 결정
const SECTION_CHARACTER_CONFIG = {
    1: { doctorRequired: true,  description: 'Answer First - 핵심 결론 전달' },
    2: { doctorRequired: false, description: 'Action - 실천법 (선택적)' },
    3: { doctorRequired: true,  description: 'Warning - 주의사항 경고' },
    4: { doctorRequired: false, description: 'The Why - 기전 설명 (선택적)' },
    5: { doctorRequired: false, description: 'Proof - 연구/근거 데이터' },
    6: { doctorRequired: true,  description: 'Closing - 격려/마무리' }
};

// 일러스트 생성 시 캐릭터 포함 여부 결정
const buildIllustrationPrompt = (sectionNumber: number, contentSummary: string) => {
    const config = SECTION_CHARACTER_CONFIG[sectionNumber];
    
    if (config.doctorRequired) {
        // 한의사 캐릭터 포함 프롬프트
        return DOCTOR_CHOI_MASTER_PROMPT + buildSectionPose(sectionNumber, contentSummary);
    } else {
        // 개념 일러스트 프롬프트 (한의사 미등장)
        return buildConceptIllustrationPrompt(sectionNumber, contentSummary);
    }
};
```

### 개념 일러스트 스타일 (한의사 미등장 시)

```typescript
const buildConceptIllustrationPrompt = (sectionNumber: number, contentSummary: string) => {
    // 섹션별 적합한 스타일 선택
    const styleMap: Record<number, string> = {
        2: '2d-step-diagram',      // Action: 단계별 가이드
        4: 'medical-illustration', // The Why: 의학 개념도
        5: 'infographic-chart'     // Proof: 데이터 시각화
    };
    
    const style = styleMap[sectionNumber] || 'conceptual-sketch';
    const styleTemplate = STYLE_LIBRARY.find(s => s.id === style);
    
    return `${styleTemplate?.goldStandardExample.BACKGROUND_PROMPT}

CONTENT: ${contentSummary}

Style: ${style}, no human characters, focus on concept visualization.
Warm cream background (#F5F0E8), clean minimalist design.`;
};
```

### UI에서 캐릭터 등장 설정

```tsx
// 섹션 일러스트 생성 모달에서 토글 제공
<div className="character-toggle">
    <label>
        <input 
            type="checkbox" 
            checked={includeDoctor}
            onChange={(e) => setIncludeDoctor(e.target.checked)}
        />
        한의사 캐릭터 포함
    </label>
    <span className="hint">
        {SECTION_CHARACTER_CONFIG[sectionNumber].doctorRequired 
            ? '(권장: 이 섹션에서는 한의사 등장 권장)' 
            : '(선택: 개념 일러스트로 대체 가능)'}
    </span>
</div>
```

### 요약

| 상황 | 한의사 등장 | 사용 스타일 |
|------|------------|------------|
| 핵심 결론/경고/격려 전달 | ✅ 등장 | `section-illustration` + 참조 이미지 |
| 실천법/동작 설명 | ⚪ 선택적 | `2d-step-diagram` 또는 `exercise-guide` |
| 기전/원인 설명 | ⚪ 선택적 | `medical-illustration` 또는 `hand-drawn-diagram` |
| 연구/데이터/근거 | ❌ 미등장 | `infographic-chart` 또는 `isometric-infographic` |


## 1. 기본 한의원 프로필 (`default-tkm`)

**타겟:** 20-50대 직장인 환자  
**포커스:** 공황장애, 메니에르병, 불면, 두드러기, 소화불량

### 추천 캐릭터 페르소나

| 항목 | 설명 |
|------|------|
| **나이/성별** | 30대 중반 남녀 혼용 (성별 중립적 표현) |
| **외모** | 깔끔한 단발/짧은 머리, 피로한 눈, 하지만 희망적 표정 |
| **의상** | 오피스 캐주얼 - 베이지 카디건 + 흰 셔츠 |
| **컬러 팔레트** | Calm (파란색 계열 #5C7AEA) |
| **분위기** | 지친 직장인이 회복을 향해 나아가는 느낌 |

### 이미지 프롬프트 (영문)

```
Main character: A Korean office worker in their mid-30s (gender-neutral presentation). 
Short neat black hair, slightly tired but hopeful eyes, soft smile. 
Wearing a beige cardigan over a white collared shirt.
Minimalist cartoon style, clean thick outlines, flat pastel colors.
Warm cream background (#F5F0E8).
```

---

## 2. 통증 클리닉 프로필 (`pain-clinic`)

**타겟:** 30-60대 만성 통증 환자  
**포커스:** 요통, 목통증, 어깨통증, 무릎통증, 두통

### 추천 캐릭터 페르소나

| 항목 | 설명 |
|------|------|
| **나이/성별** | 45-50대 남성 (육체 노동/사무직 혼합) |
| **외모** | 짧은 회색 섞인 머리, 주름진 이마, 강인하지만 고통스러운 표정 |
| **의상** | 캐주얼 폴로셔츠 (네이비) + 편한 바지 |
| **컬러 팔레트** | Medical (녹색 계열 #3A5A40) |
| **분위기** | 만성 통증과 싸우는 중년의 강인함 + 치료 희망 |

### 이미지 프롬프트 (영문)

```
Main character: A Korean man in his late 40s to early 50s.
Short black hair with hints of gray, slightly furrowed brow, determined but pained expression.
Wearing a navy blue polo shirt and comfortable pants.
Minimalist cartoon style, clean thick outlines, flat muted colors.
Often shown holding lower back, neck, or shoulder to indicate pain areas.
Warm beige background (#F5F0E8).
```

---

## 3. 여성 건강 프로필 (`womens-health`)

**타겟:** 20-50대 여성  
**포커스:** 생리통, 갱년기, 산후조리, 불임, 다이어트

### 추천 캐릭터 페르소나

| 항목 | 설명 |
|------|------|
| **나이/성별** | 30대 초반 여성 (출산 전후 공감 가능한 나이대) |
| **외모** | 어깨 길이 웨이브 머리, 부드러운 눈매, 따뜻한 미소 |
| **의상** | 편안한 민트/연분홍 니트 + 레깅스 |
| **컬러 팔레트** | Warm (베이지 계열 #D4A373) |
| **분위기** | 여성성과 건강미, 포근하고 공감되는 느낌 |

### 이미지 프롬프트 (영문)

```
Main character: A Korean woman in her early 30s.
Shoulder-length wavy black hair, soft gentle eyes, warm caring smile.
Wearing a cozy mint-green or soft pink knit sweater with comfortable leggings.
Minimalist cartoon style, clean thick outlines, soft pastel flat colors.
Feminine but not overly stylized, relatable and approachable.
Warm cream/peach background (#FEFAE0).
```

---

## 🛠️ 기술 구현 계획

### 1단계: `BlogProfile` 인터페이스 확장

**파일:** `data/blogProfilePresets.ts`

```typescript
export interface BlogProfile {
    id: string;
    name: string;
    persona: string;
    clinic_focus: string[];
    business_goal: string;
    audience: string;
    // ✨ 새로 추가
    characterPersona: {
        description: string;      // 캐릭터 설명 (한글)
        imagePrompt: string;      // 이미지 생성용 프롬프트 (영문)
        palette: 'medical' | 'calm' | 'warm';  // 기본 색상 팔레트
    };
}
```

### 2단계: `DEFAULT_PROFILES` 업데이트

각 프로필에 위 캐릭터 페르소나 정보 추가

### 3단계: 이미지 생성 로직 수정

**파일:** `components/BlogWriterEditor.tsx`

`section-illustration` 스타일 적용 시 선택된 프로필의 `characterPersona.imagePrompt`를 마스터 프롬프트에 주입

```typescript
// 예시 코드
const sectionCards = stageData.sectionIllustrations.map(s => ({
    title: `${s.sectionNumber}. ${s.sectionTitle}`,
    keywords: s.keywords,
    description: s.manuscriptSummary || s.sectionContent || s.summary,
    recommendedStyle: 'section-illustration' as const,
    recommendedPalette: s.recommendedPalette,
    // ✨ 프로필 캐릭터 페르소나 주입
    characterPrompt: selectedProfile.characterPersona?.imagePrompt || ''
}));
```

### 4단계: 스타일 라이브러리 수정

**파일:** `data/styleLibrary.ts`

`section-illustration` 스타일의 `BACKGROUND_PROMPT`에 캐릭터 프롬프트 플레이스홀더 추가 또는 동적 주입 로직 구현

---

## 🤖 5단계: 프로필 ↔ 프롬프트 동기화 시스템

> **핵심 원칙: 프로필을 수정하면 프롬프트도 자동으로 동기화**

### 동기화 플로우

```
┌─────────────────────────────────────────────────────────────────────┐
│                        프로필 관리 시스템                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  [신규 생성]                    [수정]                    [삭제]     │
│      │                           │                          │       │
│      ▼                           ▼                          ▼       │
│  ┌──────────────┐          ┌──────────────┐          ┌──────────┐   │
│  │ AI 프리셋    │          │ 프롬프트     │          │ 연관     │   │
│  │ 자동 생성    │          │ 자동 동기화  │          │ 정리     │   │
│  └──────────────┘          └──────────────┘          └──────────┘   │
│      │                           │                                   │
│      ▼                           ▼                                   │
│  ┌──────────────┐          ┌──────────────┐                         │
│  │ 사용자 수정  │          │ 이미지 생성  │                         │
│  │ (편집 가능)  │          │ 즉시 반영    │                         │
│  └──────────────┘          └──────────────┘                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

### 1️⃣ 신규 프로필 생성 시

```
1. 사용자: 기본 정보 입력
   - 프로필 이름: "소아과 프로필"
   - 타겟 독자: "30-40대 부모"
   - 클리닉 포커스: ["야제", "식욕부진", "성장"]

2. 시스템: 캐릭터 타입 선택 요청
   ○ 한의사 캐릭터 (공통 Dr. Choi 프리셋)
   ○ 환자/보호자 캐릭터 (AI 자동 생성)

3. [AI 자동 생성] 선택 시:
   - AI가 타겟 독자 분석
   - 캐릭터 페르소나 JSON 생성
   - 이미지 프롬프트 자동 생성

4. 사용자: 생성된 프리셋 검토 & 수정
   - 캐릭터 설명 편집 ✏️
   - 이미지 프롬프트 편집 ✏️
   - 팔레트 변경 ✏️

5. 저장 → 즉시 사용 가능
```

### 2️⃣ 프로필 수정 시 (자동 동기화)

```typescript
// 프로필 수정 시 프롬프트 자동 동기화
const handleProfileUpdate = (updatedProfile: BlogProfile) => {
    // 1. 프로필 저장
    saveProfile(updatedProfile);
    
    // 2. 이미지 생성 시 사용되는 프롬프트 자동 갱신
    // (별도 동기화 작업 불필요 - 프로필에서 직접 참조)
    
    // 3. 현재 세션에서 즉시 반영
    setSelectedProfile(updatedProfile);
};

// 이미지 생성 시 항상 최신 프로필 프롬프트 사용
const generateImage = () => {
    const prompt = buildPrompt(
        selectedProfile.characterPersona.imagePrompt,  // ⭐ 프로필에서 직접 참조
        sectionContent
    );
    // ...
};
```

### 3️⃣ 프로필 구조 (확장된 인터페이스)

```typescript
export interface BlogProfile {
    id: string;
    name: string;
    persona: string;
    clinic_focus: string[];
    business_goal: string;
    audience: string;
    
    // ✨ 캐릭터 & 스타일 설정 (동기화 대상)
    characterPersona: {
        type: 'doctor' | 'patient' | 'custom';  // 캐릭터 타입
        description: string;                     // 캐릭터 설명 (한글, 편집 가능)
        imagePrompt: string;                     // 이미지 프롬프트 (영문, 편집 가능)
        referenceImage?: string;                 // 참조 이미지 경로 (선택)
        palette: 'medical' | 'calm' | 'warm';   // 색상 팔레트
    };
    
    // ✨ 서체 & 스타일 설정 (동기화 대상)
    typography: {
        fontStyle: string;      // 기본: 'Do Hyeon'
        fontWeight: string;     // 기본: 'Extra Bold'
    };
    
    // ✨ 메타데이터
    createdAt: string;
    updatedAt: string;
    isAIGenerated: boolean;     // AI 자동 생성 여부
}
```

### 자동 구조화 플로우 (상세)

```
[프로필 생성 모달]
        │
        ├── 1. 기본 정보 입력
        │   - 프로필 이름
        │   - 타겟 독자 (예: "20-40대 여성")
        │   - 클리닉 포커스 (예: ["생리통", "갱년기"])
        │
        ├── 2. 캐릭터 타입 선택 (라디오 버튼)
        │   ○ 한의사 캐릭터 (공통 - Dr. Choi) → 프리셋 자동 적용
        │   ○ 환자 캐릭터 (타겟 독자 기반 자동 생성) → AI 생성
        │   ○ 커스텀 캐릭터 (직접 입력) → 빈 폼 제공
        │
        ├── 3. AI 자동 생성 (환자 캐릭터 선택 시)
        │   - 타겟 독자 정보 분석
        │   - 캐릭터 페르소나 자동 생성
        │   - 이미지 프롬프트 자동 생성
        │
        ├── 4. 사용자 수정 (편집 가능 폼)
        │   - [캐릭터 설명] 텍스트 에디터
        │   - [이미지 프롬프트] 텍스트 에디터 (영문)
        │   - [팔레트] 선택 드롭다운
        │   - [서체] 선택 드롭다운 (기본: 도현체)
        │
        └── 5. 저장 & 동기화
            - 프로필 저장
            - 이미지 생성 시 자동 반영
```


### AI 자동 생성 프롬프트 (환자 캐릭터)

```typescript
const generatePatientPersona = async (profile: BlogProfile) => {
    const prompt = `
당신은 블로그 일러스트용 캐릭터 디자이너입니다.
다음 정보를 바탕으로 캐릭터 페르소나를 구조화하세요.

## 입력 정보
- 타겟 독자: ${profile.audience}
- 클리닉 포커스: ${profile.clinic_focus.join(', ')}
- 비즈니스 목표: ${profile.business_goal}

## 출력 형식 (JSON)
{
    "description": "캐릭터 설명 (한글, 2-3문장)",
    "age": "나이대",
    "gender": "성별",
    "appearance": {
        "hair": "머리 스타일",
        "clothing": "의상",
        "expression": "기본 표정"
    },
    "palette": "medical | calm | warm",
    "imagePrompt": "영문 이미지 생성 프롬프트 (100-150 단어)"
}

## 규칙
1. 타겟 독자가 공감할 수 있는 캐릭터여야 함
2. 증상/상황을 자연스럽게 표현할 수 있는 포즈/의상 고려
3. 미니멀 카툰 스타일, 플랫 파스텔 컬러 기준
`;
    
    const result = await generateTextWithGemini(prompt);
    return JSON.parse(result);
};
```

### UI 구현 (ProfileManagerModal 확장)

```tsx
// components/ProfileManagerModal.tsx

// 캐릭터 타입 선택
const [characterType, setCharacterType] = useState<'doctor' | 'patient'>('doctor');

// 환자 캐릭터 자동 생성
const handleGeneratePatientPersona = async () => {
    setIsGenerating(true);
    try {
        const persona = await generatePatientPersona(newProfile);
        setNewProfile(prev => ({
            ...prev,
            characterPersona: persona
        }));
    } finally {
        setIsGenerating(false);
    }
};

// 한의사 캐릭터 선택 시 공통 프리셋 적용
const applyDoctorPersona = () => {
    setNewProfile(prev => ({
        ...prev,
        characterPersona: DOCTOR_CHOI_PRESET  // 미리 정의된 한의사 캐릭터
    }));
};
```

### 미리 정의된 한의사 캐릭터 프리셋

```typescript
// data/blogProfilePresets.ts

export const DOCTOR_CHOI_PRESET = {
    description: '30대 후반 ~ 40대 초반 남성 한의사. 검정 테 안경, 웨이브 머리, 밝은 회색 재킷에 네이비 스크럽 착용.',
    referenceImage: '/assets/doctor-reference.jpg',
    imagePrompt: `Main character (FIXED - use in ALL section illustrations): 
A Korean Traditional Medicine doctor (한의사) named "Dr. Choi" in his late 30s to early 40s.
KEY IDENTIFYING FEATURES (must be consistent):
- Black-framed round-rectangular glasses (distinctive feature)
- Short black wavy hair, slightly swept to the side
- Warm, trustworthy eyes with a gentle professional smile
- Light gray/pale blue blazer over navy V-neck medical scrubs
STYLE: Minimalist cartoon style, clean thick outlines (2-3px), flat pastel colors, warm cream background (#F5F0E8).
IMPORTANT: Always include the distinctive black-framed glasses as the key identifying feature.`,
    palette: 'medical' as const
};
```

---

## ✅ 체크리스트

- [ ] `BlogProfile` 인터페이스에 `characterPersona` 필드 추가
- [ ] `DOCTOR_CHOI_PRESET` 상수 정의 (한의사 공통 캐릭터)
- [ ] `DEFAULT_PROFILES` 3개에 캐릭터 정보 추가
- [ ] `ProfileManagerModal`에 캐릭터 타입 선택 UI 추가
- [ ] AI 자동 캐릭터 생성 함수 구현 (`generatePatientPersona`)
- [ ] 이미지 생성 시 프로필 캐릭터 프롬프트 주입 로직 구현
- [ ] 테스트: 새 프로필 생성 시 캐릭터 자동 구조화 확인
- [ ] 테스트: 각 프로필로 섹션 일러스트 생성 시 캐릭터 일관성 확인
