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
        keywords: ['isometric', 'infographic', '3D', 'vector', 'clean'],
        goldStandardExample: {
            BACKGROUND_PROMPT: 'A clean isometric illustration showing a stylized brain on a platform connected by a glowing data-line to a stylized stomach on another platform below. Style: isometric vector art, clean, minimalist, soft aesthetic.',
            NEGATIVES: ['text', 'letters', 'writing', 'signatures']
        }
    },
    {
        id: 'infographic-chart',
        displayName: '인포그래픽 차트',
        icon: '📈',
        description: '데이터와 통계를 명확하게 제시',
        keywords: ['infographic', 'data-viz', 'chart', 'minimalist'],
        goldStandardExample: {
            BACKGROUND_PROMPT: 'A modern, clean infographic chart on a background resembling a digital notebook page with a subtle dot grid. Style: minimalist, hand-annotated feel, data visualization.',
            NEGATIVES: ['text', 'letters', 'numbers', 'writing in the image']
        }
    },
    {
        id: 'empathetic-character',
        displayName: '공감 캐릭터',
        icon: '🧑‍🦰',
        description: '감정, 증상, 자세를 친근하게 표현',
        keywords: ['character', 'minimalist', 'vector', 'clean', 'relatable'],
        goldStandardExample: {
            BACKGROUND_PROMPT: 'A minimalist and clean character illustration of a person gently touching their temple, with a subtle radiating line effect to indicate a headache. Style: clean vector lines, soft flat color fills, modern health app aesthetic.',
            NEGATIVES: ['text', 'letters', 'writing in the image', 'signatures']
        }
    },
    {
        id: 'herbal-sketch',
        displayName: '약재 스케치',
        icon: '🌿',
        description: '약재의 식물학적 표현',
        keywords: ['botanical', 'illustration', 'ink', 'watercolor', 'scientific'],
        goldStandardExample: {
            BACKGROUND_PROMPT: 'A detailed botanical illustration of a single ginseng root with leaves, meticulously drawn with fine ink lines and delicate watercolor washes on an aged paper texture background. Style: scientific yet artistic, botanist journal.',
            NEGATIVES: ['text', 'labels', 'titles', 'leader lines']
        }
    },
    {
        id: 'empathetic-cutoon',
        displayName: '공감 컷툰',
        icon: '💬',
        description: '상황이나 감정을 스토리텔링 방식으로 전달',
        keywords: ['cut-toon', 'comic', 'character', 'storytelling', 'speech bubble'],
        goldStandardExample: {
            BACKGROUND_PROMPT: 'A clean, minimalist single-panel comic illustration of a character sitting at a desk, looking tired, with one hand on their forehead. Style: clean line art with soft, flat colors.',
            NEGATIVES: ['text', 'letters', 'writing', 'signatures']
        }
    },
    {
        id: 'artistic-thumbnail',
        displayName: '예술적 썸네일',
        icon: '🎨',
        description: '소셜 미디어 또는 블로그 포스트 썸네일',
        keywords: ['minimalist', 'symbolic', 'semi-abstract', 'vector', 'elegant'],
        goldStandardExample: {
            BACKGROUND_PROMPT: 'A minimalist semi-abstract illustration on a clean, textured background. A symbolic and artistic representation combining clean vector-like lines with deep, textural color fields. Style: minimalist semi-abstract illustration, elegant.',
            NEGATIVES: ['borders', 'frames', 'cropped elements', 'text in the image']
        }
    },
    {
        id: 'hand-drawn-diagram',
        displayName: '손그림 다이어그램',
        icon: '✍️',
        description: '사이클, 관계, 간단한 프로세스 설명',
        keywords: ['hand-drawn', 'monotone', 'notebook', 'sketch', 'ink'],
        goldStandardExample: {
            BACKGROUND_PROMPT: 'A hand-drawn diagram on off-white paper with faint integrated grid, resembling a page from a personal notebook. Style: monotone hand-drawn outlines with no fills, authentic notebook sketch feel.',
            NEGATIVES: ['3D effects', 'shadows', 'gradients', 'digital text']
        }
    },
    {
        id: 'medical-illustration',
        displayName: '의학 일러스트레이션',
        icon: '🏥',
        description: '해부학적 구조 비교 또는 생리학적 프로세스 설명',
        keywords: ['2d', 'cross-section', 'textbook style', "Netter's Atlas", 'anatomical'],
        goldStandardExample: {
            BACKGROUND_PROMPT: "A clear, 2D, textbook-style medical illustration in the style of 'Netter's Atlas', showing a comparative cross-section view. Style: classic textbook 2D line art, precise anatomical illustration.",
            NEGATIVES: ['photographs', '3D rendering', 'shadows', 'artistic style']
        }
    },
    {
        id: 'conceptual-metaphor',
        displayName: '개념적 은유',
        icon: '💭',
        description: '추상적인 의학 개념을 상징적인 오브제로 시각화',
        keywords: ['conceptual', 'metaphor', 'abstract', '3D render', 'symbolic'],
        goldStandardExample: {
            BACKGROUND_PROMPT: 'A highly realistic 3D render of a stylized, transparent glass human head silhouette, viewed in profile. The inside of the head is filled with dense, swirling fog. Style: conceptual metaphor, 3D render, minimalist, photorealistic.',
            NEGATIVES: ['text', 'letters', 'busy background', 'cluttered', 'people']
        }
    },
    {
        id: '2d-step-diagram',
        displayName: '2D 스텝 다이어그램',
        icon: '📋',
        description: '환자의 행동 지침, 치료 프로토콜 등 선형적 프로세스',
        keywords: ['2D', 'diagram', 'step-by-step', 'process', 'infographic'],
        goldStandardExample: {
            BACKGROUND_PROMPT: 'A clean, 2D vector infographic illustrating a 3-step linear process. Three distinct blocks arranged horizontally, connected by thick arrows. Style: minimalist, 2D vector, clean, educational infographic.',
            NEGATIVES: ['3D', 'isometric', 'photorealistic', 'shadows', 'gradients']
        }
    },
    {
        id: 'papercraft-illustration',
        displayName: '페이퍼크래프트 일러스트',
        icon: '📄',
        description: '신체 기관이나 프로세스를 따뜻하고 친근하게 묘사',
        keywords: ['papercraft', 'illustration', '3D', 'textured', 'cutout', 'handmade'],
        goldStandardExample: {
            BACKGROUND_PROMPT: "A whimsical 3D illustration meticulously constructed to look like layered papercraft. The entire scene casting soft, realistic shadows, giving it a tangible, handmade feel. Style: papercraft illustration, 3D, layered paper, cutout, textured.",
            NEGATIVES: ['text', 'photograph', 'realistic human', 'flat', '2D', 'glossy']
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
        keywords: ['continuous line', 'one line', 'drawing', 'minimalist', 'elegant'],
        goldStandardExample: {
            BACKGROUND_PROMPT: 'A minimalist and elegant continuous line drawing of a human profile. A single, fluid, unbroken line outlines the face, neck, and subtle features. Style: continuous line art, minimalist, elegant, clean, abstract.',
            NEGATIVES: ['multiple lines', 'shading', 'realistic', 'cluttered', 'cartoon']
        }
    },
    {
        id: 'conceptual-sketch',
        displayName: '개념적 스케치',
        icon: '✏️',
        description: '복잡한 철학적/심리적 개념을 위트 있게 시각화',
        keywords: ['conceptual sketch', 'literal metaphor', 'monochromatic', 'charcoal'],
        goldStandardExample: {
            BACKGROUND_PROMPT: "An editorial sketch illustration on a clean, neutral off-white paper background. A very simple 'stick figure' character stands at a crossroads. Style: pencil sketch, charcoal texture, hand-drawn lines, conceptual, witty.",
            NEGATIVES: ['photorealistic', 'digital vector', 'clean lines', 'bright colors']
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
        keywords: ['medical textbook', 'anatomy', 'labeled', 'cross-section', 'color-coded', 'precision', 'Netter style'],
        goldStandardExample: {
            BACKGROUND_PROMPT: "A detailed anatomical illustration in medical textbook style with subtle shading. Color-coded structures: arteries in #E53935 (red), veins in #1E88E5 (blue), organs in natural tones. Clean white background with no gradients. Cross-section or anterior view with realistic anatomical proportions. Style: conservative medical textbook, Netter's Atlas inspired, precise line art, minimal shading, educational clarity. Labels should be placed as vector text layer separately.",
            NEGATIVES: ['stylization drift', 'artistic interpretation', '3D rendering', 'photographs', 'cartoon style', 'anime', 'fantasy elements', 'incorrect anatomy']
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
