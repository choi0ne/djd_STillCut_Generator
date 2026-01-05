// 15종 블로그 시각 스타일 라이브러리
export interface StyleTemplate {
    id: string;
    displayName: string;
    icon: string;
    description: string;
    keywords: string[];
    goldStandardExample: {
        BACKGROUND_PROMPT: string;
        NEGATIVES: string[];
    };
}

export const STYLE_LIBRARY: StyleTemplate[] = [
    {
        id: 'isometric-infographic',
        displayName: '아이소메트릭 인포그래픽',
        icon: '📊',
        description: '관계, 프로세스 또는 시스템을 3D 방식으로 시각화',
        keywords: ['isometric', 'infographic', '3D', 'vector', 'medical', 'network', 'Korean'],
        goldStandardExample: {
            BACKGROUND_PROMPT: `[그림체] 아이소메트릭(등각투영) 3D 벡터 일러스트. 45도 각도에서 본 미니어처 3D 오브젝트들. 플랫한 면 + 미니멀한 그림자(한 방향). 밝고 선명한 컬러 아이콘들(빨강, 노랑, 초록, 파랑 등). 의료/건강 관련 오브젝트(병원, 의사, 약, 심장, 청진기, 구급차 등). 각 오브젝트는 독립적인 작은 플랫폼 위에 배치. [레이아웃] 다크 블루/네이비 배경(#1E3A5F ~ #2A4B6E). 오브젝트들이 격자형 또는 네트워크형으로 배치. 흰색/밝은 연결선이 오브젝트들을 잇는 구조. 중앙에 핵심 개념, 주변으로 관련 요소들이 연결. 전체적으로 균형잡힌 대칭 구도. [글씨체] 하단에 제목 배너. 굵은 산세리프체(Bold Sans-serif). 흰색 또는 밝은 색상. 영문은 대문자, 한글은 고딕체. 아이콘 옆에 작은 라벨 가능. [분위기] 전문적이고 현대적인 의료 인포그래픽. 깔끔하고 정돈된 느낌. 밝은 아이콘과 다크 배경의 대비로 시선 집중. 디지털/테크 느낌. Style: medical isometric infographic, dark blue background, bright colorful 3D icons on platforms, white connection lines forming network, professional healthcare visualization.`,
            NEGATIVES: ['realistic photos', 'cluttered', 'low quality', 'blurry', 'hand-drawn style', 'watercolor', 'small illegible text']
        }
    },
    {
        id: 'infographic-chart',
        displayName: '인포그래픽 차트',
        icon: '📈',
        description: '데이터와 통계를 명확하게 제시',
        keywords: ['infographic', 'data-viz', 'chart', 'statistics', 'medical', 'Korean'],
        goldStandardExample: {
            BACKGROUND_PROMPT: `[그림체] 플랫 벡터 인포그래픽 스타일. 컬러풀한 막대 그래프/차트(무지개색 그라데이션 또는 카테고리별 색상 구분). 남녀 실루엣 아이콘으로 인구/성별 표현. 인체 기관 일러스트(폐, 심장, 위 등)를 티셔츠/몸통 실루엣 안에 배치. 그라데이션 색상 사용(오렌지→빨강, 파랑→보라 등). 깔끔한 외곽선 없이 면으로만 표현. [레이아웃] 밝은 그라데이션 배경(연한 회색→흰색 또는 연한 파랑). 좌측에 막대 그래프/통계 차트, 우측에 핵심 시각 요소(기관/캐릭터). 데이터 라벨(AGE 40-50, WOMEN 등)이 차트 옆에 배치. 하단 또는 측면에 범례/키워드 영역. [글씨체] 영문은 산세리프체 대문자(AGE, WOMEN, MAN 등). 한글은 고딕체. 차트 라벨은 작은 사이즈, 제목은 큰 사이즈. 흰색 또는 진한 색상으로 가독성 확보. [분위기] 의료/건강 통계 인포그래픽. 밝고 친근한 컬러. 전문적이면서 이해하기 쉬운 데이터 시각화. 교육적 목적. Style: medical infographic chart, colorful bar graphs, human silhouette icons, organ illustrations, gradient colors, clean data visualization, statistics presentation.`,
            NEGATIVES: ['hand-drawn style', '3D rendering', 'complex textures', 'cluttered', 'low quality', 'small illegible text']
        }
    },
    {
        id: 'empathetic-character',
        displayName: '공감 캐릭터',
        icon: '🧑‍🦰',
        description: '감정, 증상, 자세를 친근하게 표현 (말풍선 없음)',
        keywords: ['character', 'cartoon', 'emotion', 'symptom', 'no-text', 'Korean style'],
        goldStandardExample: {
            BACKGROUND_PROMPT: `[그림체] 깔끔한 2D 캐릭터 일러스트. 단순화된 얼굴 표정(눈썹, 입 모양으로 감정 표현). 굵은 검정 외곽선(2-3px), 내부는 플랫 컬러로 채움. 따뜻한 피부톤, 차분한 의상 컬러(파란색, 베이지 계열). 증상을 표현하는 포즈(머리 짚기, 배 감싸기, 어깨 주무르기 등). 증상 부위에 작은 효과선(통증 표시) 또는 아이콘 가능. [레이아웃] 캐릭터가 화면 중앙에 크게 배치. 말풍선/텍스트 없음. 배경은 심플한 단색 또는 그라데이션. 최소한의 소품만(의자, 책상 등 선택적). 캐릭터에 집중되는 구도. [글씨체] 텍스트 없음. 이미지만으로 감정/증상 전달. [분위기] 따뜻한 크림/베이지 배경(#F5F0E8). 부드러운 그림자 없이 플랫하게. 공감되는 일상 상황 묘사. 친근하고 따뜻한 느낌. Style: warm empathetic cartoon character, clean line art, flat colors, no speech bubble, no text, symptom/emotion expression through pose and facial expression.`,
            NEGATIVES: ['speech bubble', 'text', 'letters', 'realistic style', 'complex shading', '3D effects', 'cluttered background']
        }
    },
    {
        id: 'herbal-sketch',
        displayName: '약재 스케치',
        icon: '🌿',
        description: '약재, 한약, 약국 도구의 빈티지 일러스트',
        keywords: ['botanical', 'herbal', 'vintage', 'ink', 'apothecary', 'traditional medicine'],
        goldStandardExample: {
            BACKGROUND_PROMPT: `[그림체] 빈티지 잉크 드로잉 스타일. 가는 펜촉으로 그린 듯한 세밀한 선화. 해칭(빗금)과 크로스해칭으로 음영 표현. 주요 오브젝트: 약병, 한약재(인삼, 감초, 당귀 등), 저울, 플라스크, 모래시계, 허브 식물. 흑백 기반 + 선택적으로 부분 수채화 컬러(녹색 잎, 갈색 뿌리, 노란 꽃 등). 식물학적 정확도를 갖춘 허브/약재 묘사. [레이아웃] 오브젝트들이 컬렉션 형태로 배치되거나 단일 약재를 중앙에 크게 배치. 여백을 살린 깔끔한 구도. 바닥선 없이 떠있는 느낌 또는 가벼운 그림자. 다양한 크기의 오브젝트들이 조화롭게 배열. [글씨체] 필기체 또는 세리프체로 약재명 라벨 (선택적). 작은 사이즈, 우아한 스타일. 라틴어 학명 형식도 가능. [분위기] 빈티지/앤티크 느낌. 크림색 또는 노란빛 도는 오래된 종이 배경. 19세기 약학 도감/식물학 저널 느낌. 전문적이면서 클래식한 분위기. Style: vintage apothecary ink illustration, botanical herbal sketch, fine line hatching, antique pharmacy, traditional medicine elements, aged paper background.`,
            NEGATIVES: ['modern style', 'cartoon', 'bright neon colors', '3D rendering', 'photo-realistic', 'cluttered']
        }
    },
    {
        id: 'empathetic-cutoon',
        displayName: '공감 컷툰',
        icon: '💬',
        description: '상황이나 감정을 스토리텔링 방식으로 전달',
        keywords: ['cut-toon', 'comic', 'character', 'storytelling', 'speech bubble', 'Korean'],
        goldStandardExample: {
            BACKGROUND_PROMPT: `[그림체] 깔끔한 2D 캐릭터 일러스트. 단순화된 얼굴 표정(눈썹, 입 모양으로 감정 표현). 굵은 검정 외곽선(2-3px), 내부는 플랫 컬러로 채움. 따뜻한 피부톤, 차분한 의상 컬러(파란색, 베이지 계열). [레이아웃] 싱글 패널 구성. 캐릭터가 화면 좌측 2/3 차지. 우측 상단에 말풍선 또는 생각풍선 배치. 배경은 심플하게(침대, 의자 등 최소 소품). [글씨체] 말풍선 안에 둥근 고딕체(Rounded Gothic). 굵기 Medium. 2-3줄 이내 짧은 대사. 느낌표나 말줄임표로 감정 강조. [분위기] 따뜻한 크림/베이지 배경(#F5F0E8). 부드러운 그림자 없이 플랫하게. 공감되는 일상 상황 묘사. Style: warm empathetic cartoon, clean line art, flat colors, speech bubble with rounded Korean text.`,
            NEGATIVES: ['realistic style', 'complex shading', '3D effects', 'small illegible text', 'cluttered background']
        }
    },
    {
        id: 'artistic-thumbnail',
        displayName: '예술적 썸네일',
        icon: '🎨',
        description: '소셜 미디어 또는 블로그 포스트 썸네일 (범용)',
        keywords: ['minimalist', 'symbolic', 'semi-abstract', 'vector', 'elegant', 'thumbnail'],
        goldStandardExample: {
            BACKGROUND_PROMPT: `[그림체] 미니멀하고 세련된 반추상 일러스트. 주제를 상징하는 핵심 시각 요소 1-2개. 깔끔한 벡터 스타일 또는 부드러운 텍스처. 단순화된 형태, 과도한 디테일 없이. 깊은 질감의 컬러 필드와 깔끔한 선의 조합. [레이아웃] 상징적 요소가 화면 중앙에 배치. 여백을 충분히 살린 미니멀 구도. [글씨체] 텍스트 없음 또는 최소한의 라벨. [분위기] 우아하고 세련된 느낌. 미니멀 아트 스타일. Style: minimalist semi-abstract illustration, symbolic representation, clean vector lines, deep textural color fields, elegant.`,
            NEGATIVES: ['cluttered', 'too many elements', 'photo-realistic', 'complex backgrounds', 'busy design']
        }
    },
    {
        id: 'blog-thumbnail',
        displayName: '블로그 썸네일',
        icon: '📰',
        description: '⚠️ 첫 번째 컨셉 전용 - 블로그 대표 이미지 (제목 필수)',
        keywords: ['blog', 'header', 'title', 'Korean', 'Do Hyeon', 'first-concept-only', 'papercraft'],
        goldStandardExample: {
            BACKGROUND_PROMPT: `[크기/비율] ⭐ 세로형 2:3 비율. 해상도: 800x1200. 

[레이아웃] ⭐ 상하 분할 구조 필수 (그림 3 : 글 1):
- 상단 75%: 페이퍼크래프트 일러스트 영역 (레이어드 종이 컷아웃 효과)
- 하단 25%: 텍스트 영역 (제목 + 부제) - 연한 크림색/아이보리 배경 박스

[일러스트 영역 - 페이퍼크래프트 스타일] 
- 레이어드 페이퍼크래프트 3D 일러스트
- 종이를 오려 붙인 듯한 질감과 층층이 쌓인 레이어 표현
- 부드러운 그림자로 입체감 연출
- 따뜻한 파스텔 컬러 팔레트 (연한 핑크, 민트, 베이지, 살색, 연노랑)
- 신체 기관이나 의학 개념을 귀엽고 친근하게 단순화
- 손으로 만든 듯한 핸드메이드 느낌
- 배경에 간단한 레이어드 요소 (구름, 하트, 별 등) 추가 가능

[글씨체] ⭐ 도현체(Do Hyeon) 스타일 - 굵고 둥근 한글 고딕체 필수.
- 메인 제목: Extra Bold, 검정색(#333333), 화면 폭의 80% 차지
- 제목이 길면 2줄로 배치 (콜론으로 구분)
- 예시: "40대 여성 만성 소화불량:" / "단순한 위장 문제가 아닙니다."
- 글자 간격 약간 넓게, 줄 간격 1.2~1.4

[분위기] 완전 흰색 또는 연한 크림색 배경(#FFFFFF ~ #FFF8F0). 따뜻하고 포근한 느낌. 환자에게 친근하고 무섭지 않은 의학 개념 전달. 어린이 교육 자료 같은 귀여운 스타일이면서 전문적 신뢰감. 

Style: blog thumbnail, VERTICAL portrait layout (2:3 ratio, 800x1200), top 75% whimsical papercraft 3D illustration with layered paper cutout effect and soft shadows, warm pastel colors (pink, mint, beige), friendly medical visualization of the topic, bottom 25% Korean title in Do Hyeon style bold gothic font on light cream background box, professional yet friendly healthcare blog header.`,
            NEGATIVES: ['horizontal layout', 'landscape', 'text on top of illustration', 'thin fonts', 'small illegible text', 'cursive fonts', 'cluttered', 'too many elements', 'complex backgrounds', 'photo-realistic', 'no title text', 'title in illustration area', 'cold colors', 'scary imagery', 'mechanical/gear style']
        }
    },
    {
        id: 'hand-drawn-diagram',
        displayName: '손그림 다이어그램',
        icon: '✍️',
        description: '사이클, 관계, 간단한 프로세스 설명',
        keywords: ['hand-drawn', 'flowchart', 'notebook', 'sketch', 'ink', 'icons', 'Korean'],
        goldStandardExample: {
            BACKGROUND_PROMPT: `[그림체] 손그림 느낌의 다이어그램. 검정 잉크 펜으로 그린 듯한 스케치 라인. 둥근 사각형 박스들이 화살표로 연결된 플로우차트 구조. 각 박스 안에 심플한 아이콘(구름, 저울, 시계, 위장 등). 선 굵기 1-2px, 약간의 손떨림 텍스처. [레이아웃] 중앙에 핵심 개념, 주변에 4-5개 연결 요소가 방사형 또는 순환형 배치. 화살표는 부드러운 곡선. 전체적으로 대칭적이고 균형잡힌 구도. [글씨체] 각 박스 안에 손글씨 느낌의 고딕체. 굵기 Bold. 2-4글자 핵심 키워드. 상단에 제목(더 큰 사이즈). 우측 하단에 작은 로고/서명 공간. [분위기] 연한 아이보리 배경(#FAF8F5)에 희미한 격자 텍스처. 노트북/메모장 위에 그린 느낌. 교육적이면서 친근함. Style: hand-drawn flowchart diagram, notebook paper texture, simple icons in rounded boxes, arrows connecting concepts, Korean labels in bold handwritten gothic font.`,
            NEGATIVES: ['3D effects', 'photo-realistic', 'gradients', 'complex shading', 'small illegible text']
        }
    },
    {
        id: 'medical-illustration',
        displayName: '의학 일러스트레이션',
        icon: '🏥',
        description: '해부학적 구조 비교 또는 생리학적 프로세스 설명',
        keywords: ['anatomical', 'comparison', 'digestive', 'organs', 'labeled', 'watercolor', 'Korean'],
        goldStandardExample: {
            BACKGROUND_PROMPT: `[그림체] 부드러운 수채화/파스텔 톤의 해부학적 일러스트. 장기(위, 대장, 폐 등)를 교육적이면서 따뜻하게 묘사. 가는 검정 외곽선 + 부드러운 색상 채움(베이지, 살색, 연한 핑크, 민트 등). 미생물/세균은 작은 타원형으로 단순하게 표현. 병변/문제 부위는 약간 어두운 톤 또는 노란 하이라이트로 강조.

[레이아웃] ⭐ 좌우 비교 구조 권장:
- 좌측: 정상/건강한 상태 (Healthy)
- 우측: 문제/질환 상태 (Disease/Chronic)
- 중앙에 세로 구분선
- 각 장기에서 화살표로 설명 라벨 연결

[글씨체] 
- 상단: 각 섹션 제목 (굵은 세리프체 또는 고딕체, 예: "Healthy Digestive System" / "Chronic Indigestion")
- 라벨: 화살표 끝에 작은 산세리프체 (Normal Peristalsis, Impaired Motility 등)
- 영문 또는 한글 가능

[분위기] 따뜻한 크림/베이지 배경(#F5F0E8). 의학 교과서 느낌이지만 딱딱하지 않고 친근함. 환자가 이해하기 쉬운 교육용 일러스트. Style: comparative medical illustration, left healthy vs right diseased, soft watercolor anatomical drawing, labeled with arrows, warm cream background, educational healthcare visualization.`,
            NEGATIVES: ['photo-realistic', '3D rendering', 'cold colors', 'complex backgrounds', 'too technical', 'scary imagery', 'small illegible text']
        }
    },
    {
        id: 'conceptual-metaphor',
        displayName: '개념적 은유',
        icon: '💭',
        description: '추상적인 의학 개념을 상징적인 오브제로 시각화',
        keywords: ['conceptual', 'metaphor', 'silhouette', 'gears', 'mechanism', 'symbolic', 'Korean'],
        goldStandardExample: {
            BACKGROUND_PROMPT: `[그림체] 인체 실루엣(측면 프로필) 안에 기계적 요소(톱니바퀴, 연결선, 파이프)로 신체 시스템을 표현. 실루엣은 따뜻한 베이지/살색 톤으로 채움. 내부 기계 요소는 네이비/차콜 컬러. 외곽선은 테라코타/브릭 레드(#A0522D). 손그림 텍스처가 살짝 느껴지는 일러스트 스타일. [레이아웃] 인체 실루엣이 화면 중앙에 크게 배치. 머리(뇌)와 몸통(장기) 사이를 톱니바퀴와 연결선이 이어줌. 기계 요소 주변에 작은 번개/진동 효과로 활성화 상태 표현. [글씨체] 하단에 제목 텍스트. 굵은 세리프 또는 고딕체. 검정색, 큰 사이즈(24pt 이상). 필요시 콜론(:)으로 부제 연결. [분위기] 따뜻한 크림/오프화이트 배경(#F5F0E8). 전체적으로 교육적이면서 따뜻한 의학 일러스트 느낌. Style: conceptual body-mechanism metaphor, human silhouette with gears and connection lines inside, warm cream background, educational medical illustration, Korean title at bottom in bold font.`,
            NEGATIVES: ['photo-realistic', 'cold colors', 'cluttered', '3D rendering', 'complex background']
        }
    },
    {
        id: '2d-step-diagram',
        displayName: '2D 스텝 다이어그램',
        icon: '📋',
        description: '환자의 행동 지침, 치료 프로토콜 등 선형적 프로세스',
        keywords: ['2D', 'diagram', 'step-by-step', 'process', 'infographic', 'Korean', 'numbered'],
        goldStandardExample: {
            BACKGROUND_PROMPT: `[그림체] 깔끔한 2D 벡터 인포그래픽. 플랫 디자인 스타일. 각 스텝은 둥근 사각형 또는 원형 블록으로 표현. 블록마다 숫자 또는 아이콘 포함. 화살표로 스텝 간 연결. 각 블록에 다른 색상 사용(파스텔 계열 권장). 그림자 없이 플랫하게.

[레이아웃] 
- 가로형: 3-5개 스텝이 좌→우로 배열, 화살표로 연결
- 또는 세로형: 위→아래로 배열 (스크롤 친화적)
- 각 스텝 블록 크기 동일
- 상단에 제목, 하단 또는 블록 아래에 설명 텍스트

[글씨체]
- 스텝 번호: 굵은 숫자 (1, 2, 3...) 또는 원형 안에 숫자
- 스텝 제목: 굵은 고딕체 (한글), 블록 안 또는 아래
- 설명: 작은 산세리프체, 블록 아래 1-2줄
- 예시: "1. 손목 스트레칭" / "2. 따뜻한 찜질" / "3. 충분한 휴식"

[분위기] 밝은 흰색 또는 연한 그레이 배경. 교육적이고 따라하기 쉬운 가이드 느낌. 환자가 한눈에 이해할 수 있는 명확한 구조. Style: 2D step-by-step infographic, numbered blocks connected by arrows, Korean labels, flat vector design, clean educational guide, pastel colors.`,
            NEGATIVES: ['3D', 'isometric', 'photo-realistic', 'shadows', 'gradients', 'complex illustrations', 'small illegible text']
        }
    },
    {
        id: 'papercraft-illustration',
        displayName: '페이퍼크래프트 일러스트',
        icon: '📄',
        description: '신체 기관이나 프로세스를 따뜻하고 친근하게 묘사',
        keywords: ['papercraft', 'illustration', '3D', 'textured', 'cutout', 'handmade', 'Korean'],
        goldStandardExample: {
            BACKGROUND_PROMPT: `[그림체] 레이어드 페이퍼크래프트 스타일의 3D 일러스트. 종이를 오려 붙인 듯한 질감과 층을 표현. 부드러운 그림자로 입체감. 따뜻한 파스텔 컬러(연한 핑크, 민트, 베이지, 살색). 장기나 신체 부위를 귀엽고 친근하게 단순화. 손으로 만든 듯한 핸드메이드 느낌.

[레이아웃] 
- 중앙에 주요 오브젝트(장기, 인체 일부, 프로세스) 배치
- 배경에 간단한 레이어드 요소(구름, 하트, 별 등) 추가 가능
- 여백을 살린 깔끔한 구도

[글씨체]
- 제목 또는 라벨: 둥근 고딕체 (한글), 색종이 위에 쓴 듯한 느낌
- 선택적으로 작은 설명 텍스트
- 너무 많은 텍스트는 지양

[분위기] 따뜻하고 포근한 느낌. 환자에게 친근하고 무섭지 않게 의학 개념 전달. 어린이 교육 자료 같은 귀여운 스타일. 밝은 배경. Style: whimsical papercraft 3D illustration, layered paper cutout effect, soft shadows, warm pastel colors, handmade feel, friendly medical visualization, Korean labels in rounded gothic font.`,
            NEGATIVES: ['photo-realistic', 'flat 2D', 'cold colors', 'scary imagery', 'complex details', 'small illegible text']
        }
    },
    {
        id: 'minimal-wellness-photo',
        displayName: '미니멀 웰니스 포토',
        icon: '🍵',
        description: '약재, 차, 건강 음식을 감성적이고 깔끔하게',
        keywords: ['minimalist', 'wellness', 'photography', 'high-key', 'natural light'],
        goldStandardExample: {
            BACKGROUND_PROMPT: 'A high-key, minimalist photograph of a steaming cup of herbal tea on a simple, textured light grey surface. Style: minimalist wellness photography, high-key, natural light, serene, clean.',
            NEGATIVES: ['text', 'people', 'cluttered background', 'dark lighting', 'illustration']
        }
    },
    {
        id: 'continuous-line-drawing',
        displayName: '연속적인 한 줄 드로잉',
        icon: '〰️',
        description: '신체 부위, 얼굴 등을 세련되고 감성적인 방식으로 표현',
        keywords: ['continuous line', 'one line', 'drawing', 'minimalist', 'elegant', 'profile', 'brain'],
        goldStandardExample: {
            BACKGROUND_PROMPT: `[그림체] 연속적인 한 줄 드로잉(Continuous Line Drawing). 선이 끊기지 않고 하나의 선으로 전체 형태를 표현. 검정색 얇은 선(1-2px). 인체 측면 프로필(머리, 목, 어깨) + 내부 장기/뇌 구조까지 한 줄로 연결. 미니멀하고 추상적. 채색 없이 선만으로 표현.

[레이아웃] 
- 인체 측면 프로필이 화면 중앙에 배치
- 머리 안에 뇌 또는 관련 장기가 같은 선으로 연결
- 충분한 여백
- 선이 시작점과 끝점이 자연스럽게 연결되거나 열린 형태

[글씨체]
- 텍스트 없음 (순수 라인 아트)
- 필요시 하단에 작은 제목 가능 (가는 산세리프체)

[분위기] 깔끔한 흰색 배경(#FFFFFF). 우아하고 세련된 미니멀 아트. 현대적이고 감성적인 느낌. 의학적이면서도 예술적인 표현. Style: continuous one-line drawing, human profile with brain/organ inside, single unbroken black line, minimalist elegant art, white background, abstract medical illustration.`,
            NEGATIVES: ['multiple separate lines', 'shading', 'colors', 'realistic', 'cluttered', 'cartoon style', 'thick lines']
        }
    },
    {
        id: 'conceptual-sketch',
        displayName: '개념적 스케치',
        icon: '✏️',
        description: '복잡한 철학적/심리적 개념을 위트 있게 시각화',
        keywords: ['conceptual sketch', 'literal metaphor', 'monochromatic', 'charcoal', 'Korean'],
        goldStandardExample: {
            BACKGROUND_PROMPT: `[그림체] 연필/목탄 스케치 스타일의 개념적 일러스트. 손그림 느낌의 거친 선. 모노크롬(흑백 또는 세피아 톤). 단순화된 캐릭터(스틱맨 또는 간단한 인물). 추상적인 개념을 시각적 은유로 표현(예: 갈림길에 선 사람, 무거운 짐을 진 사람 등). 위트 있고 철학적인 메시지.

[레이아웃] 
- 중앙에 주요 캐릭터/상황 배치
- 심플한 배경 요소(화살표, 물음표, 구름 등)
- 여백을 살린 에디토리얼 느낌

[글씨체]
- 선택적으로 짧은 한글 텍스트 가능
- 손글씨 느낌 또는 가는 고딕체
- 캡션이나 생각풍선 형태

[분위기] 오프화이트/크림색 종이 배경. 스케치북에 그린 듯한 자연스러운 느낌. 심리적/철학적 메시지를 담은 위트 있는 표현. 환자의 감정이나 상황을 공감적으로 표현. Style: editorial pencil sketch, conceptual illustration, stick figure at crossroads, charcoal texture, hand-drawn lines, witty philosophical message, Korean caption optional.`,
            NEGATIVES: ['photo-realistic', 'digital vector', 'bright colors', 'complex details', 'small illegible text']
        }
    },
    {
        id: 'textured-digital-painting',
        displayName: '텍스처 디지털 페인팅',
        icon: '🖌️',
        description: '사진에 따뜻하고 아날로그적인 회화 질감',
        keywords: ['textured digital painting', 'digital pastel', 'soft portrait', 'analog texture'],
        goldStandardExample: {
            BACKGROUND_PROMPT: 'A textured digital painting, mimicking a pastel or colored pencil drawing on fine-grained paper. A subtle paper texture overlay is visible across the entire image. Style: textured digital painting, soft focus, warm and inviting, pastel-like.',
            NEGATIVES: ['harsh lighting', 'sharp edges', 'cartoon', 'anime', 'cold colors']
        }
    },
    {
        id: 'precision-medical',
        displayName: '정밀 의학도',
        icon: '🔬',
        description: '해부학적 정확도와 색상 코딩, 텍스트 라벨이 분리된 의학 교과서 스타일',
        keywords: ['medical textbook', 'anatomy', 'labeled', 'cross-section', 'color-coded', 'precision', 'Netter style', 'Korean'],
        goldStandardExample: {
            BACKGROUND_PROMPT: `[그림체] 의학 교과서 스타일의 정밀 해부학 일러스트. Netter's Atlas 스타일 참고. 정확한 해부학적 비율. 섬세한 명암 표현. 색상 코딩: 동맥(빨간색 #E53935), 정맥(파란색 #1E88E5), 장기(자연스러운 톤). 깔끔한 라인 아트 + 미니멀 셰이딩. 단면도 또는 전방 뷰.

[레이아웃] 
- 해부학적 구조가 화면 중앙에 배치
- 화살표 + 리더 라인으로 각 부위 연결
- 라벨은 구조 외부에 정렬되게 배치
- 깔끔한 흰색 배경

[글씨체]
- 라벨: 작은 산세리프체 고딕 (한글 또는 영문)
- 화살표 끝에 연결된 형태
- 제목: 상단에 굵은 고딕체
- 예시: "위십이지장", "소장", "대장", "간"

[분위기] 순백색 배경(#FFFFFF). 전문적이고 교육적인 의학 교과서 느낌. 해부학적 정확도 중시. 학생/의료인 대상 자료 수준. Style: precision medical textbook illustration, Netter's Atlas inspired, anatomical accuracy, color-coded structures, labeled with Korean or English terms, clean white background, educational clinical clarity.`,
            NEGATIVES: ['artistic interpretation', '3D rendering', 'photographs', 'cartoon style', 'fantasy elements', 'incorrect anatomy', 'small illegible text', 'cluttered labels']
        }
    },
    {
        id: 'section-illustration',
        displayName: '섹션 일러스트',
        icon: '📖',
        description: '블로그 섹션별 요약 일러스트 - 배너 헤더, 귀여운 캐릭터, 말풍선',
        keywords: ['section', 'cute', 'character', 'banner', 'speech bubble', 'pastel', 'Korean text'],
        goldStandardExample: {
            BACKGROUND_PROMPT: 'A warm pastel-colored illustration with a decorative banner/ribbon header at the top containing Korean text. Below, cute minimalist characters in a clean cartoon style with speech bubbles. The layout includes card-style boxes with icons and simple Korean text labels. Style: cute educational illustration, soft flat colors, warm beige/cream background, clean line art, friendly and approachable aesthetic. IMPORTANT: Korean text should be rendered in clear, bold, sans-serif font, large enough to be easily readable. Text placement should be clearly defined (centered, top, bottom). Keep Korean phrases short and simple (1-2 sentences maximum).',
            NEGATIVES: ['realistic style', 'complex backgrounds', 'small text', 'cursive fonts', 'overlapping text', 'too much detail']
        }
    },
    {
        id: 'poster',
        displayName: '포스터',
        icon: '🪧',
        description: '홍보/안내용 포스터 - 이벤트, 공지, 캠페인, 클리닉 홍보',
        keywords: ['poster', 'promotion', 'announcement', 'event', 'Korean', 'clinic', 'healthcare campaign'],
        goldStandardExample: {
            BACKGROUND_PROMPT: `[크기/비율] 세로형 포스터 비율 (2:3 또는 3:4). 권장 해상도: 800x1200 또는 900x1350.

[레이아웃] ⭐ 3단 구조 필수:
- 상단 15%: 키워드 영역 (증상 또는 주제 키워드 3-4개, 가운데 정렬)
- 중앙 50%: 메인 비주얼 (상징적 일러스트 - 초승달, 구름, 사람 실루엣, 별 등)
- 하단 35%: 메시지 영역 (메인 카피 + 부제 + 서비스 아이콘 리스트 + 클리닉 정보)

[그림체] 
- 메인 비주얼: 벡터 일러스트, 실루엣 스타일, 부드러운 빛 효과
- 아이콘: 라인 스타일, 청록색 계열
- 전체적으로 깔끔하고 현대적인 그래픽

[색상 팔레트]
- 배경: 깊은 네이비 그라데이션 (#1a2332 → #2d4356)
- 메인 비주얼: 밝은 청록색 (#4ecdc4), 민트 (#95e1d3)
- 포인트: 노란빛 (#ffd93d)
- 텍스트: 밝은 회색 (#e8eaed), 연한 회색 (#b0b8c1)
- 아이콘: 청록색 (#6fcf97)
- 정보 박스: 반투명 흰색 배경 (15% opacity)

[글씨체]
- 상단 키워드: 작은 산세리프 고딕, 밝은 회색
- 메인 카피: 굵은 세리프체 또는 도현체, 큰 사이즈, 밝은 회색
- 부제: 고딕체, 중간 사이즈, 연한 회색
- 서비스 리스트: 이모지 아이콘 + 한글 설명
- 하단 정보: 작은 산세리프, 연락처/주소/진료시간

[분위기] 전문적이고 신뢰감 있는 클리닉 홍보 포스터. 차분하면서 치유적인 느낌. 밤/수면/안정 테마에 적합한 네이비 배경. Style: healthcare clinic promotional poster, 3-tier layout (15% keywords / 50% visual / 35% message), deep navy gradient background, vector silhouette illustration, Korean headline in serif font, service icons with Korean labels, professional medical aesthetic.`,
            NEGATIVES: ['photo-realistic', 'cluttered', 'bright daylight colors', 'too many elements', 'small illegible text', 'horizontal layout']
        }
    },
    {
        id: 'exercise-guide',
        displayName: '운동법 가이드',
        icon: '🧘',
        description: '스트레칭/운동 동작 설명 - 단계별 자세 가이드',
        keywords: ['exercise', 'stretching', 'pose', 'line drawing', 'arrow', 'Korean', 'foam roller'],
        goldStandardExample: {
            BACKGROUND_PROMPT: `[그림체] 심플한 라인 드로잉 스타일의 운동/스트레칭 가이드. 깔끔한 검정 외곽선으로 인체 표현. 얼굴은 최소화(눈, 코 정도). 의상: 민트/청록색 상의 + 검정 하의. 동작 방향을 청록색 화살표로 명확하게 표시. 운동 도구(폼롤러, 밴드, 덤벨 등) 포함 가능. 그림자 없이 플랫하게.

[레이아웃] 
- 단일 동작: 화면 중앙에 크게 한 가지 자세
- 또는 가로 3단 배열(좌→우): 시작→중간→완료 자세
- 동작 방향을 화살표(→, ↑, ↓)로 표시
- 각 동작 하단에 간략한 한글 설명 1줄

[글씨체]
- 상단: 전체 제목 (굵은 고딕체, 한글)
- 각 동작 하단: 간략한 한글 설명
- 예시: "폼롤러 등 스트레칭" / "1. 무릎 세우고 눕기"
- 폰트: 작은 고딕체, 검정색

[분위기] 깔끔한 흰색 배경. 심플하고 명확한 라인. 누구나 따라할 수 있는 직관적인 가이드. 재활운동, 홈트레이닝, 한의원 처방 운동에 적합. Style: simple line drawing exercise guide, black outline with mint/cyan top and black pants, directional arrows showing movement, foam roller or exercise equipment, Korean description below, clean white background.`,
            NEGATIVES: ['photo-realistic', 'complex shading', 'scary poses', 'too detailed face', 'small illegible text', 'cluttered', '3D style']
        }
    }
];

export const COLOR_PALETTES = {
    medical: {
        primary: '#3A5A40',
        secondary: '#C85050',
        accent: '#E57373',
        background: '#F5F5F5',
        text: '#333333'
    },
    calm: {
        primary: '#5C7AEA',
        secondary: '#A7C4BC',
        accent: '#E8D5B7',
        background: '#FAFAFA',
        text: '#2D3436'
    },
    warm: {
        primary: '#D4A373',
        secondary: '#CCD5AE',
        accent: '#FAEDCD',
        background: '#FEFAE0',
        text: '#3D405B'
    }
};
