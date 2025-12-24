// 블로그 프로필 프리셋 타입 및 기본 프리셋 정의

export interface BlogProfile {
    id: string;
    name: string;  // 프리셋 이름 (예: "DJD 한의원", "통증 클리닉")
    persona: string;  // 페르소나 (예: "한의원 원장", "통증 전문의")
    clinic_focus: string[];  // 클리닉 포커스 (예: ["공황장애", "메니에르병"])
    business_goal: string;  // 비즈니스 목표 (예: "환자 교육 및 신뢰 구축")
    audience: string;  // 타겟 독자 (예: "20-50대 직장인 환자")
}

export const DEFAULT_PROFILES: BlogProfile[] = [
    {
        id: 'default-tkm',
        name: '기본 한의원 프로필',
        persona: '한의사 (1인칭 관찰자)',
        clinic_focus: ['공황장애', '메니에르병', '불면', '두드러기', '소화불량'],
        business_goal: '환자 중심 임상 블로그 - 즉각적 행동 가능한 정보 제공',
        audience: '20-50대 직장인 환자'
    },
    {
        id: 'pain-clinic',
        name: '통증 클리닉 프로필',
        persona: '통증 전문 한의사',
        clinic_focus: ['요통', '목통증', '어깨통증', '무릎통증', '두통'],
        business_goal: '만성 통증 환자 교육 및 예방법 제공',
        audience: '30-60대 만성 통증 환자'
    },
    {
        id: 'womens-health',
        name: '여성 건강 프로필',
        persona: '여성 건강 전문 한의사',
        clinic_focus: ['생리통', '갱년기', '산후조리', '불임', '다이어트'],
        business_goal: '여성 건강 관리 및 한방 치료 정보 제공',
        audience: '20-50대 여성'
    }
];
