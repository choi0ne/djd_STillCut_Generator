// 블로그 프로필 프리셋 타입 및 기본 프리셋 정의

export interface BlogProfile {
    id: string;
    name: string;  // 프리셋 이름 (예: "DJD 한의원", "통증 클리닉")
    persona: string;  // 페르소나 (예: "한의원 원장", "통증 전문의")
    clinic_focus: string[];  // 클리닉 포커스 (예: ["공황장애", "메니에르병"])
    business_goal: string;  // 비즈니스 목표 (예: "환자 교육 및 신뢰 구축")
    audience: string;  // 타겟 독자 (예: "20-50대 직장인 환자")
    patientCharacterPrompt?: string;  // ✨ 환자 캐릭터 프롬프트 (프로필 기반 자동 선택)
}

// ✨ 환자 캐릭터 프리셋 (독자 대리인 역할)
// 한의사는 텍스트에서 1인칭으로 서술, 이미지에서는 환자 캐릭터가 독자 대리인으로 등장
export const PATIENT_PRESETS: Record<string, string> = {
    'default-tkm': `
Korean office worker in their mid-30s (gender-neutral).
Short neat black hair, slightly tired but hopeful eyes, soft smile.
Wearing a beige cardigan over a white collared shirt.
Minimalist cartoon style, clean thick outlines, flat pastel colors.
Warm cream background (#F5F0E8).
No doctor or medical professional in the image.
`,
    'pain-clinic': `
Korean man in his late 40s to early 50s.
Short black hair with hints of gray, slightly furrowed brow, determined expression.
Wearing a navy blue polo shirt and comfortable pants.
May be shown holding lower back, neck, or shoulder to indicate pain.
Minimalist cartoon style, clean thick outlines, flat muted colors.
Warm cream background (#F5F0E8).
No doctor or medical professional in the image.
`,
    'womens-health': `
Korean woman in her early 30s.
Shoulder-length wavy black hair, soft gentle eyes, warm caring smile.
Wearing a cozy mint-green or soft pink knit sweater.
Minimalist cartoon style, clean thick outlines, soft pastel flat colors.
Feminine but not overly stylized, relatable and approachable.
Warm cream background (#F5F0E8).
No doctor or medical professional in the image.
`
};

// ✨ 섹션별 환자 캐릭터 감정/포즈 가이드
export const PATIENT_EMOTION_GUIDE: Record<string, { emotion: string; pose: string }> = {
    'answer-first': { emotion: 'understanding, nodding', pose: 'slight head tilt, attentive posture' },
    'warning': { emotion: 'concerned, worried', pose: 'hand near chin, furrowed brow' },
    'symptoms': { emotion: 'discomfort, pain', pose: 'holding affected body part' },
    'action': { emotion: 'motivated, determined', pose: 'performing the exercise/action' },
    'proof': { emotion: 'none', pose: 'none' },  // 연구/근거 섹션은 캐릭터 없음
    'closing': { emotion: 'hopeful, smiling', pose: 'bright smile, relaxed posture' }
};

export const DEFAULT_PROFILES: BlogProfile[] = [
    {
        id: 'default-tkm',
        name: '기본 한의원 프로필',
        persona: '동제당한의원 원장 최장혁 (1인칭 관찰자)',  // 🔴 고정
        clinic_focus: ['공황장애', '메니에르병', '불면', '두드러기', '소화불량'],  // 전문분야로 구분
        business_goal: '환자 중심 임상 블로그 - 즉각적 행동 가능한 정보 제공',  // 🔴 고정
        audience: '20-50대 직장인 환자',
        patientCharacterPrompt: PATIENT_PRESETS['default-tkm']
    },
    {
        id: 'pain-clinic',
        name: '통증 클리닉 프로필',
        persona: '동제당한의원 원장 최장혁 (1인칭 관찰자)',  // 🔴 고정
        clinic_focus: ['요통', '목통증', '어깨통증', '무릎통증', '두통'],  // 전문분야로 구분
        business_goal: '환자 중심 임상 블로그 - 즉각적 행동 가능한 정보 제공',  // 🔴 고정
        audience: '30-60대 만성 통증 환자',
        patientCharacterPrompt: PATIENT_PRESETS['pain-clinic']
    },
    {
        id: 'womens-health',
        name: '여성 건강 프로필',
        persona: '동제당한의원 원장 최장혁 (1인칭 관찰자)',  // 🔴 고정
        clinic_focus: ['생리통', '갱년기', '산후조리', '불임', '다이어트'],  // 전문분야로 구분
        business_goal: '환자 중심 임상 블로그 - 즉각적 행동 가능한 정보 제공',  // 🔴 고정
        audience: '20-50대 여성',
        patientCharacterPrompt: PATIENT_PRESETS['womens-health']
    }
];
