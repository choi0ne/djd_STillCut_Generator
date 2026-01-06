import React, { useState, useEffect, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { saveToGoogleDrive as uploadToGoogleDrive } from '../services/googleDriveService';

// ============================================================
// 타입 정의
// ============================================================
interface WorkCalendarEditorProps {
    isApiKeyReady: boolean;
    openSettings: () => void;
    geminiApiKey: string;
}

// ============================================================
// 병원 정보 (고정값)
// ============================================================
const CLINIC_INFO = {
    name: '동제당한의원',
    phone: '032-765-7733',
    address: '인천시 동구 동산로 88'
} as const;



// ============================================================
// 한국 공휴일 데이터 (2025-2026)
// ============================================================
const holidays: { [key: string]: { [key: string]: string } } = {
    '2025': {
        '1-1': '신정',
        '1-28': '설날연휴',
        '1-29': '설날',
        '1-30': '설날연휴',
        '3-1': '삼일절',
        '5-5': '어린이날',
        '5-6': '대체공휴일',
        '6-6': '현충일',
        '8-15': '광복절',
        '10-3': '개천절',
        '10-5': '추석연휴',
        '10-6': '추석',
        '10-7': '추석연휴',
        '10-8': '대체공휴일',
        '10-9': '한글날',
        '12-25': '성탄절',
    },
    '2026': {
        '1-1': '신정',
        '2-16': '연휴',
        '2-17': '설날',
        '2-18': '연휴',
        '3-1': '삼일절',
        '3-2': '대체',
        '5-5': '어린이날',
        '5-24': '부처님',
        '6-6': '현충일',
        '8-15': '광복절',
        '8-17': '대체',
        '9-24': '연휴',
        '9-25': '추석',
        '9-26': '연휴',
        '10-3': '개천절',
        '10-5': '대체',
        '10-9': '한글날',
        '12-25': '성탄절',
    }
};

// ============================================================
// 월별 계절 이미지 프롬프트
// ============================================================
const monthlyImagePrompts: { [key: number]: { season: string; prompt: string } } = {
    1: {
        season: '겨울',
        prompt: `Paper craft illustration of January winter scene.
Style: Minimal paper cut art, pastel colors, clean geometric shapes
Elements: Paper cut snowflakes, simple pine trees, soft clouds, gentle snow
Colors: White (#FFFFFF), light blue (#E3F2FD), soft gray (#ECEFF1), pale mint (#E8F5E9)
Mood: Calm, fresh, peaceful, new beginnings
Composition: Layered paper effect, 1200x300px horizontal banner format
IMPORTANT: Leave bottom center 150px completely empty/clean for text overlay
NO medical symbols, NO traditional Asian elements, NO text, NO people`
    },
    2: {
        season: '겨울',
        prompt: `Paper craft illustration of February late winter scene.
Style: Minimal paper cut art, soft gradients, clean geometric shapes
Elements: Paper cut early spring buds, melting snow, bare branches with tiny buds
Colors: Soft white (#FAFAFA), pale pink (#FCE4EC), light lavender (#EDE7F6)
Mood: Hopeful, transitional, gentle warmth approaching
Composition: Layered paper effect, 1200x300px horizontal banner format
IMPORTANT: Leave bottom center 150px completely empty/clean for text overlay
NO medical symbols, NO traditional Asian elements, NO text, NO people`
    },
    3: {
        season: '봄',
        prompt: `Paper craft illustration of March early spring scene.
Style: Minimal paper cut art, fresh colors, clean geometric shapes
Elements: Paper cut cherry blossoms beginning to bloom, gentle breeze, small birds
Colors: Soft pink (#F8BBD9), fresh green (#C8E6C9), sky blue (#BBDEFB)
Mood: Renewal, awakening, fresh beginnings
Composition: Layered paper effect, 1200x300px horizontal banner format
IMPORTANT: Leave bottom center 150px completely empty/clean for text overlay
NO medical symbols, NO traditional Asian elements, NO text, NO people`
    },
    4: {
        season: '봄',
        prompt: `Paper craft illustration of April full spring scene.
Style: Minimal paper cut art, vibrant yet soft colors, clean geometric shapes
Elements: Paper cut blooming flowers, butterflies, gentle rain drops, tulips
Colors: Bright pink (#F48FB1), fresh yellow (#FFF59D), soft green (#A5D6A7)
Mood: Flourishing, joyful, energetic spring
Composition: Layered paper effect, 1200x300px horizontal banner format
IMPORTANT: Leave bottom center 150px completely empty/clean for text overlay
NO medical symbols, NO traditional Asian elements, NO text, NO people`
    },
    5: {
        season: '봄',
        prompt: `Paper craft illustration of May late spring scene.
Style: Minimal paper cut art, warm and bright colors, clean geometric shapes
Elements: Paper cut roses, lush green leaves, sunshine rays, ladybugs
Colors: Rose (#E91E63), fresh green (#66BB6A), warm yellow (#FFEE58)
Mood: Abundant, warm, family-oriented, celebratory
Composition: Layered paper effect, 1200x300px horizontal banner format
IMPORTANT: Leave bottom center 150px completely empty/clean for text overlay
NO medical symbols, NO traditional Asian elements, NO text, NO people`
    },
    6: {
        season: '여름',
        prompt: `Paper craft illustration of June early summer scene.
Style: Minimal paper cut art, cool and refreshing colors, clean geometric shapes
Elements: Paper cut hydrangeas, rain drops, umbrellas, fresh leaves
Colors: Blue (#64B5F6), purple (#BA68C8), green (#81C784), white (#FFFFFF)
Mood: Fresh, cool, gentle rain, refreshing
Composition: Layered paper effect, 1200x300px horizontal banner format
IMPORTANT: Leave bottom center 150px completely empty/clean for text overlay
NO medical symbols, NO traditional Asian elements, NO text, NO people`
    },
    7: {
        season: '여름',
        prompt: `Paper craft illustration of July summer scene.
Style: Minimal paper cut art, vibrant summer colors, clean geometric shapes
Elements: Paper cut sunflowers, bright sun, ocean waves, seashells
Colors: Bright yellow (#FFEB3B), ocean blue (#29B6F6), coral (#FF8A65)
Mood: Vibrant, energetic, vacation spirit, sunny
Composition: Layered paper effect, 1200x300px horizontal banner format
IMPORTANT: Leave bottom center 150px completely empty/clean for text overlay
NO medical symbols, NO traditional Asian elements, NO text, NO people`
    },
    8: {
        season: '여름',
        prompt: `Paper craft illustration of August late summer scene.
Style: Minimal paper cut art, warm summer colors, clean geometric shapes
Elements: Paper cut tropical leaves, sunset colors, gentle evening breeze
Colors: Orange (#FF9800), coral (#FF7043), turquoise (#26C6DA), golden (#FFD54F)
Mood: Warm evenings, relaxed, transitional summer
Composition: Layered paper effect, 1200x300px horizontal banner format
IMPORTANT: Leave bottom center 150px completely empty/clean for text overlay
NO medical symbols, NO traditional Asian elements, NO text, NO people`
    },
    9: {
        season: '가을',
        prompt: `Paper craft illustration of September early autumn scene.
Style: Minimal paper cut art, warm earth tones, clean geometric shapes
Elements: Paper cut early autumn leaves, cosmos flowers, gentle wind
Colors: Soft orange (#FFAB91), golden yellow (#FFE082), sage green (#A5D6A7)
Mood: Harvest time, gratitude, family gathering
Composition: Layered paper effect, 1200x300px horizontal banner format
IMPORTANT: Leave bottom center 150px completely empty/clean for text overlay
NO medical symbols, NO traditional Asian elements, NO text, NO people`
    },
    10: {
        season: '가을',
        prompt: `Paper craft illustration of October full autumn scene.
Style: Minimal paper cut art, rich autumn palette, clean geometric shapes
Elements: Paper cut colorful maple leaves, pumpkins, acorns, harvest moon
Colors: Deep orange (#FF7043), burgundy (#C62828), golden (#FFC107), brown (#8D6E63)
Mood: Cozy, harvest celebration, vibrant change
Composition: Layered paper effect, 1200x300px horizontal banner format
IMPORTANT: Leave bottom center 150px completely empty/clean for text overlay
NO medical symbols, NO traditional Asian elements, NO text, NO people`
    },
    11: {
        season: '가을',
        prompt: `Paper craft illustration of November late autumn scene.
Style: Minimal paper cut art, muted warm tones, clean geometric shapes
Elements: Paper cut falling leaves, bare branches, crisp air feeling, geese flying
Colors: Rust (#BF360C), tan (#D7CCC8), muted gold (#C9B037), soft gray (#90A4AE)
Mood: Reflective, peaceful, preparing for winter
Composition: Layered paper effect, 1200x300px horizontal banner format
IMPORTANT: Leave bottom center 150px completely empty/clean for text overlay
NO medical symbols, NO traditional Asian elements, NO text, NO people`
    },
    12: {
        season: '겨울',
        prompt: `Paper craft illustration of December winter holiday scene.
Style: Minimal paper cut art, festive yet elegant, clean geometric shapes
Elements: Paper cut snowflakes, evergreen trees, stars, gentle snow falling
Colors: Deep green (#2E7D32), red (#C62828), white (#FFFFFF), gold (#FFD700)
Mood: Festive, warm, cozy, celebration
Composition: Layered paper effect, 1200x300px horizontal banner format
IMPORTANT: Leave bottom center 150px completely empty/clean for text overlay
NO medical symbols, NO traditional Asian elements, NO text, NO people`
    }
};

// ============================================================
// 유틸리티 함수들
// ============================================================

// 달력 생성
function generateCalendar(year: number, month: number): (number | null)[][] {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const lastDate = new Date(year, month, 0).getDate();

    const calendar: (number | null)[][] = [];
    let date = 1;

    for (let week = 0; week < 6; week++) {
        const weekDays: (number | null)[] = [];
        for (let day = 0; day < 7; day++) {
            if ((week === 0 && day < firstDay) || date > lastDate) {
                weekDays.push(null);
            } else {
                weekDays.push(date++);
            }
        }
        calendar.push(weekDays);
    }

    return calendar;
}

// 공휴일 확인
function isHoliday(year: number, month: number, date: number): string | null {
    const yearHolidays = holidays[String(year)];
    if (!yearHolidays) return null;
    return yearHolidays[`${month}-${date}`] || null;
}

// 오늘 날짜 확인
function isToday(year: number, month: number, date: number): boolean {
    const today = new Date();
    return today.getFullYear() === year &&
        today.getMonth() + 1 === month &&
        today.getDate() === date;
}

// 평일 기본 선택 (월~금)
function getDefaultWorkDays(year: number, month: number): number[] {
    const workDays: number[] = [];
    const lastDate = new Date(year, month, 0).getDate();

    for (let date = 1; date <= lastDate; date++) {
        const dayOfWeek = new Date(year, month - 1, date).getDay();
        // 월(1) ~ 금(5)이면서 공휴일이 아닌 경우
        if (dayOfWeek >= 1 && dayOfWeek <= 5 && !isHoliday(year, month, date)) {
            workDays.push(date);
        }
    }

    return workDays;
}

// LocalStorage 저장/로드
function saveWorkSchedule(year: number, month: number, dates: number[]): void {
    const key = `workSchedule-${year}-${month}`;
    localStorage.setItem(key, JSON.stringify(dates));
}

function loadWorkSchedule(year: number, month: number): number[] | null {
    const key = `workSchedule-${year}-${month}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
}

// 야간진료일 저장/로드
function saveNightSchedule(year: number, month: number, dates: number[]): void {
    const key = `nightSchedule-${year}-${month}`;
    localStorage.setItem(key, JSON.stringify(dates));
}

function loadNightSchedule(year: number, month: number): number[] | null {
    const key = `nightSchedule-${year}-${month}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
}

// 오전진료일 저장/로드 (~15:00)
function saveMorningSchedule(year: number, month: number, dates: number[]): void {
    const key = `morningSchedule-${year}-${month}`;
    localStorage.setItem(key, JSON.stringify(dates));
}

function loadMorningSchedule(year: number, month: number): number[] | null {
    const key = `morningSchedule-${year}-${month}`;
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : null;
}

// 이미지 캐시
function cacheImage(year: number, month: number, imageData: string): void {
    const key = `calendarImage-${year}-${month}`;
    try {
        localStorage.setItem(key, imageData);
    } catch (e) {
        console.warn('이미지 캐시 저장 실패 (용량 초과일 수 있음):', e);
    }
}

function getCachedImage(year: number, month: number): string | null {
    const key = `calendarImage-${year}-${month}`;
    return localStorage.getItem(key);
}

// ============================================================
// 메인 컴포넌트
// ============================================================
const WorkCalendarEditor: React.FC<WorkCalendarEditorProps> = ({
    isApiKeyReady,
    openSettings,
    geminiApiKey
}) => {
    const today = new Date();
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
    const [selectedDates, setSelectedDates] = useState<number[]>([]);
    const [morningDates, setMorningDates] = useState<number[]>([]); // 오전진료일 (~15:00)
    const [nightDates, setNightDates] = useState<number[]>([]); // 야간진료일 (~19:00)
    const [seasonalImage, setSeasonalImage] = useState<string | null>(null);
    const [isGeneratingImage, setIsGeneratingImage] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

    const exportRef = useRef<HTMLDivElement>(null);
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];

    // 달력 생성
    const calendar = generateCalendar(currentYear, currentMonth);

    // 월 변경 시 진료일 로드
    useEffect(() => {
        const saved = loadWorkSchedule(currentYear, currentMonth);
        if (saved) {
            setSelectedDates(saved);
        } else {
            // 저장된 데이터 없으면 기본 평일 선택
            setSelectedDates(getDefaultWorkDays(currentYear, currentMonth));
        }

        // 야간진료일 로드
        const savedNight = loadNightSchedule(currentYear, currentMonth);
        setNightDates(savedNight || []);

        // 오전진료일 로드
        const savedMorning = loadMorningSchedule(currentYear, currentMonth);
        setMorningDates(savedMorning || []);
    }, [currentYear, currentMonth]);

    // 월 변경 시 캐시된 이미지 로드
    useEffect(() => {
        const cached = getCachedImage(currentYear, currentMonth);
        if (cached) {
            setSeasonalImage(cached);
        } else {
            setSeasonalImage(null);
        }
    }, [currentYear, currentMonth]);

    // 월 변경 시 캐시된 이미지 로드
    useEffect(() => {
        const cached = getCachedImage(currentYear, currentMonth);
        if (cached) {
            setSeasonalImage(cached);
        } else {
            setSeasonalImage(null);
        }
    }, [currentYear, currentMonth]);

    // 날짜 토글 (4단계: 휴진 → 진료 → 오전 → 야간 → 휴진)
    const toggleDate = useCallback((date: number) => {
        const isWorkDay = selectedDates.includes(date);
        const isMorningDay = morningDates.includes(date);
        const isNightDay = nightDates.includes(date);

        if (!isWorkDay && !isMorningDay && !isNightDay) {
            // 휴진 → 진료
            const newDates = [...selectedDates, date].sort((a, b) => a - b);
            setSelectedDates(newDates);
            saveWorkSchedule(currentYear, currentMonth, newDates);
        } else if (isWorkDay && !isMorningDay && !isNightDay) {
            // 진료 → 오전
            const newMorningDates = [...morningDates, date].sort((a, b) => a - b);
            setMorningDates(newMorningDates);
            saveMorningSchedule(currentYear, currentMonth, newMorningDates);
        } else if (isWorkDay && isMorningDay && !isNightDay) {
            // 오전 → 야간
            const newMorningDates = morningDates.filter(d => d !== date);
            const newNightDates = [...nightDates, date].sort((a, b) => a - b);
            setMorningDates(newMorningDates);
            setNightDates(newNightDates);
            saveMorningSchedule(currentYear, currentMonth, newMorningDates);
            saveNightSchedule(currentYear, currentMonth, newNightDates);
        } else {
            // 야간 → 휴진
            const newDates = selectedDates.filter(d => d !== date);
            const newMorningDates = morningDates.filter(d => d !== date);
            const newNightDates = nightDates.filter(d => d !== date);
            setSelectedDates(newDates);
            setMorningDates(newMorningDates);
            setNightDates(newNightDates);
            saveWorkSchedule(currentYear, currentMonth, newDates);
            saveMorningSchedule(currentYear, currentMonth, newMorningDates);
            saveNightSchedule(currentYear, currentMonth, newNightDates);
        }
    }, [currentYear, currentMonth, selectedDates, morningDates, nightDates]);

    // Gemini API로 계절 이미지 생성
    const generateSeasonalImageWithGemini = async () => {
        if (!geminiApiKey) {
            openSettings();
            return;
        }

        setIsGeneratingImage(true);
        setSaveStatus(null);

        try {
            const promptData = monthlyImagePrompts[currentMonth];

            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=${geminiApiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{ text: promptData.prompt }]
                        }],
                        generationConfig: {
                            responseModalities: ["TEXT", "IMAGE"]
                        }
                    })
                }
            );

            if (!response.ok) {
                throw new Error(`API 오류: ${response.status}`);
            }

            const data = await response.json();

            // 이미지 추출
            const parts = data.candidates?.[0]?.content?.parts || [];
            const imagePart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));

            if (imagePart?.inlineData?.data) {
                const imageData = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                setSeasonalImage(imageData);
                cacheImage(currentYear, currentMonth, imageData);
                setSaveStatus({ type: 'success', message: '계절 이미지가 생성되었습니다!' });
            } else {
                throw new Error('이미지 생성 실패');
            }
        } catch (error) {
            console.error('이미지 생성 오류:', error);
            setSaveStatus({ type: 'error', message: `이미지 생성 실패: ${error}` });
        } finally {
            setIsGeneratingImage(false);
        }
    };

    // 이미지 캡처 및 저장
    const captureCalendarImage = async (): Promise<Blob | null> => {
        if (!exportRef.current) return null;

        try {
            const element = exportRef.current;

            // 스크롤 위치 저장 및 리셋
            const originalScrollY = window.scrollY;

            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: '#ffffff',
                logging: false,
                useCORS: true,
                allowTaint: true,
                width: element.offsetWidth,
                height: element.offsetHeight,
                x: 0,
                y: 0,
                scrollX: 0,
                scrollY: 0,
                windowWidth: element.offsetWidth,
                windowHeight: element.offsetHeight,
                onclone: (clonedDoc) => {
                    const clonedElement = clonedDoc.querySelector('[data-export-ref]');
                    if (clonedElement) {
                        (clonedElement as HTMLElement).style.overflow = 'visible';
                    }
                }
            });

            return new Promise((resolve) => {
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/png');
            });
        } catch (error) {
            console.error('캡처 오류:', error);
            return null;
        }
    };

    // 로컬 다운로드
    const saveToLocal = async () => {
        setIsSaving(true);
        setSaveStatus(null);

        const blob = await captureCalendarImage();
        if (!blob) {
            setSaveStatus({ type: 'error', message: '이미지 생성 실패' });
            setIsSaving(false);
            return;
        }

        const fileName = `동제당한의원_${currentYear}년_${currentMonth}월_진료일.png`;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);

        setSaveStatus({ type: 'success', message: '로컬에 저장되었습니다!' });
        setIsSaving(false);
    };

    // Google Drive 저장
    const saveToGoogleDrive = async () => {
        setIsSaving(true);
        setSaveStatus(null);

        const blob = await captureCalendarImage();
        if (!blob) {
            setSaveStatus({ type: 'error', message: '이미지 생성 실패' });
            setIsSaving(false);
            return;
        }

        try {
            // Blob을 Base64로 변환
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result as string;
                await uploadToGoogleDrive(base64);
                setSaveStatus({ type: 'success', message: 'Google Drive에 저장되었습니다!' });
                setIsSaving(false);
            };
            reader.readAsDataURL(blob);
        } catch (error) {
            console.error('드라이브 저장 오류:', error);
            setSaveStatus({ type: 'error', message: `저장 실패: ${error}` });
            setIsSaving(false);
        }
    };

    // 둘 다 저장
    const saveToBoth = async () => {
        setIsSaving(true);
        setSaveStatus(null);

        const blob = await captureCalendarImage();
        if (!blob) {
            setSaveStatus({ type: 'error', message: '이미지 생성 실패' });
            setIsSaving(false);
            return;
        }

        // 로컬 저장
        const fileName = `동제당한의원_${currentYear}년_${currentMonth}월_진료일.png`;
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);

        // Google Drive 저장
        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = reader.result as string;
                await uploadToGoogleDrive(base64);
                setSaveStatus({ type: 'success', message: '로컬 + Google Drive 모두 저장 완료!' });
                setIsSaving(false);
            };
            reader.readAsDataURL(blob);
        } catch (error) {
            setSaveStatus({ type: 'success', message: '로컬 저장 완료 (Drive 저장 실패)' });
            setIsSaving(false);
        }
    };

    // ============================================================
    // UI 렌더링
    // ============================================================
    return (
        <div className="max-w-[1400px] mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-[400px_1fr] gap-6">
                {/* 좌측: 설정 패널 */}
                <div className="space-y-6">
                    {/* 연/월 선택 */}
                    <div className="bg-[#111827] rounded-xl p-6 border border-white/10">
                        <h3 className="text-lg font-semibold text-white mb-4">📅 연/월 선택</h3>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <label className="block text-sm text-gray-400 mb-2">연도</label>
                                <select
                                    value={currentYear}
                                    onChange={(e) => setCurrentYear(Number(e.target.value))}
                                    className="w-full bg-[#1f2937] text-white rounded-lg px-4 py-3 border border-white/10 focus:border-blue-500 focus:outline-none"
                                >
                                    {Array.from({ length: 11 }, (_, i) => 2025 + i).map(year => (
                                        <option key={year} value={year}>{year}년</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-sm text-gray-400 mb-2">월</label>
                                <select
                                    value={currentMonth}
                                    onChange={(e) => setCurrentMonth(Number(e.target.value))}
                                    className="w-full bg-[#1f2937] text-white rounded-lg px-4 py-3 border border-white/10 focus:border-blue-500 focus:outline-none"
                                >
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                        <option key={month} value={month}>{month}월</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mt-3">
                            계절: {monthlyImagePrompts[currentMonth].season}
                        </p>
                    </div>

                    {/* 계절 이미지 생성 */}
                    <div className="bg-[#111827] rounded-xl p-6 border border-white/10">
                        <h3 className="text-lg font-semibold text-white mb-4">🎨 계절 이미지</h3>
                        <button
                            onClick={generateSeasonalImageWithGemini}
                            disabled={isGeneratingImage || !isApiKeyReady}
                            className={`w-full py-3 rounded-lg font-medium transition-colors ${isGeneratingImage
                                ? 'bg-gray-600 text-gray-300 cursor-not-allowed'
                                : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700'
                                }`}
                        >
                            {isGeneratingImage ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin">⏳</span> 생성 중...
                                </span>
                            ) : seasonalImage ? (
                                '🔄 이미지 재생성'
                            ) : (
                                '✨ Gemini로 이미지 생성'
                            )}
                        </button>
                        {!isApiKeyReady && (
                            <button
                                onClick={openSettings}
                                className="w-full mt-2 py-2 text-sm text-blue-400 hover:text-blue-300"
                            >
                                ⚙️ API 키 설정하기
                            </button>
                        )}
                    </div>

                    {/* 병원 정보 (고정) */}
                    <div className="bg-[#111827] rounded-xl p-6 border border-white/10">
                        <h3 className="text-lg font-semibold text-white mb-4">🏥 병원 정보</h3>
                        <div className="space-y-3 text-gray-300">
                            <p><span className="text-gray-500">병원명:</span> {CLINIC_INFO.name}</p>
                            <p><span className="text-gray-500">연락처:</span> {CLINIC_INFO.phone}</p>
                            <p><span className="text-gray-500">주소:</span> {CLINIC_INFO.address}</p>
                        </div>
                    </div>

                    {/* 날짜 선택 */}
                    <div className="bg-[#111827] rounded-xl p-6 border border-white/10">
                        <h3 className="text-lg font-semibold text-white mb-4">📌 진료일 선택</h3>
                        <p className="text-sm text-gray-400 mb-4">
                            클릭하여 진료일/휴진일을 토글하세요
                        </p>

                        {/* 요일 헤더 */}
                        <div className="grid grid-cols-7 gap-2 mb-2">
                            {weekdays.map((day, idx) => (
                                <div
                                    key={day}
                                    className={`text-center text-sm font-semibold py-2 ${idx === 0 ? 'text-red-400' : idx === 6 ? 'text-blue-400' : 'text-gray-400'
                                        }`}
                                >
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* 날짜 그리드 */}
                        {calendar.map((week, weekIdx) => (
                            <div key={weekIdx} className="grid grid-cols-7 gap-2 mb-2">
                                {week.map((date, dayIdx) => {
                                    if (!date) {
                                        return <div key={dayIdx} className="aspect-square" />;
                                    }

                                    const holiday = isHoliday(currentYear, currentMonth, date);
                                    const isSelected = selectedDates.includes(date);
                                    const isMorning = morningDates.includes(date);
                                    const isNight = nightDates.includes(date);
                                    const isTodayDate = isToday(currentYear, currentMonth, date);
                                    const isSunday = dayIdx === 0;
                                    const isSaturday = dayIdx === 6;

                                    // 색상 결정: 야간=녹색, 오전=주황색, 진료=파란색, 휴진=회색
                                    let bgColor = 'bg-[#1f2937] hover:bg-white/10';
                                    let textColor = '';

                                    if (isSelected && isNight) {
                                        bgColor = 'bg-emerald-500 text-white shadow-md';
                                    } else if (isSelected && isMorning) {
                                        bgColor = 'bg-orange-500 text-white shadow-md';
                                    } else if (isSelected) {
                                        bgColor = 'bg-blue-500 text-white shadow-md';
                                    } else if ((holiday || isSunday)) {
                                        textColor = 'text-red-400';
                                    } else if (isSaturday) {
                                        textColor = 'text-blue-400';
                                    }

                                    return (
                                        <button
                                            key={dayIdx}
                                            onClick={() => toggleDate(date)}
                                            className={`
                                                aspect-square flex flex-col items-center justify-center
                                                text-sm font-medium rounded-lg transition-all
                                                min-h-[44px] min-w-[44px]
                                                ${bgColor} ${textColor}
                                                ${isTodayDate ? 'ring-2 ring-yellow-400' : 'border border-white/10'}
                                            `}
                                            title={holiday ? `${holiday}${isNight ? ' (야간)' : ''}` : (isNight ? '야간진료' : undefined)}
                                            aria-label={`${date}일 ${isNight ? '야간진료' : isSelected ? '진료' : '휴진'}`}
                                        >
                                            <span>{date}</span>
                                            {holiday && (
                                                <span className={`text-[8px] leading-tight ${isSelected ? 'text-white/80' : 'text-red-400'}`}>
                                                    {holiday}
                                                </span>
                                            )}
                                            {isNight && !holiday && (
                                                <span className="text-[8px] leading-tight text-white/80">야간</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}

                        {/* 선택된 진료일 수 */}
                        <div className="mt-4 text-center text-sm text-gray-400 space-y-1">
                            <p>총 <span className="text-blue-400 font-bold">{selectedDates.length}</span>일 진료</p>
                            {nightDates.length > 0 && (
                                <p className="text-xs">(야간진료 <span className="text-emerald-400 font-bold">{nightDates.length}</span>일 포함)</p>
                            )}
                        </div>
                    </div>

                    {/* 저장 옵션 */}
                    <div className="bg-[#111827] rounded-xl p-6 border border-white/10">
                        <h3 className="text-lg font-semibold text-white mb-4">💾 저장</h3>
                        <div className="grid grid-cols-3 gap-3">
                            <button
                                onClick={saveToLocal}
                                disabled={isSaving}
                                className="py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                📥 로컬
                            </button>
                            <button
                                onClick={saveToGoogleDrive}
                                disabled={isSaving}
                                className="py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                ☁️ Drive
                            </button>
                            <button
                                onClick={saveToBoth}
                                disabled={isSaving}
                                className="py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                            >
                                💾 둘 다
                            </button>
                        </div>

                        {saveStatus && (
                            <div className={`mt-4 p-3 rounded-lg text-sm ${saveStatus.type === 'success' ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'
                                }`}>
                                {saveStatus.message}
                            </div>
                        )}
                    </div>
                </div>

                {/* 우측: 미리보기 */}
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">👁️ 미리보기</h3>
                    <div className="bg-white rounded-xl overflow-x-auto shadow-2xl">
                        {/* 내보내기 영역 */}
                        <div ref={exportRef} className="bg-white" style={{ width: '860px' }}>
                            {/* 계절 이미지 헤더 */}
                            {seasonalImage ? (
                                <div className="relative h-72">
                                    <img
                                        src={seasonalImage}
                                        alt="계절 배경"
                                        className="w-full h-full object-cover"
                                        crossOrigin="anonymous"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex flex-col items-center justify-end pb-8">
                                        <h1 className="text-5xl font-bold text-white drop-shadow-lg">{CLINIC_INFO.name}</h1>
                                        <p className="text-2xl text-white/90 mt-3">{currentYear}년 {currentMonth}월 진료 안내</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-16 text-center">
                                    <h1 className="text-5xl font-bold text-white">{CLINIC_INFO.name}</h1>
                                    <p className="text-2xl text-white/90 mt-3">{currentYear}년 {currentMonth}월 진료 안내</p>
                                </div>
                            )}

                            {/* 달력 본문 */}
                            <div className="px-4 py-2">
                                {/* 요일 헤더 */}
                                <div className="grid grid-cols-7 gap-1 mb-2">
                                    {weekdays.map((day, idx) => (
                                        <div
                                            key={day}
                                            className={`text-center text-base font-bold py-3 ${idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-gray-600'
                                                }`}
                                        >
                                            {day}
                                        </div>
                                    ))}
                                </div>

                                {/* 날짜 그리드 */}
                                {calendar.map((week, weekIdx) => (
                                    <div key={weekIdx} className="grid grid-cols-7 gap-1 mb-1">
                                        {week.map((date, dayIdx) => {
                                            if (!date) {
                                                return <div key={dayIdx} className="h-24" />;
                                            }

                                            const holiday = isHoliday(currentYear, currentMonth, date);
                                            const isSelected = selectedDates.includes(date);
                                            const isMorning = morningDates.includes(date);
                                            const isNight = nightDates.includes(date);
                                            const isSunday = dayIdx === 0;
                                            const isSaturday = dayIdx === 6;

                                            // 색상 결정: 야간=녹색, 오전=주황색, 진료=파란색, 휴진=회색
                                            let bgColor = 'bg-gray-100 text-gray-400';
                                            if (isSelected && isNight) {
                                                bgColor = 'bg-emerald-500 text-white';
                                            } else if (isSelected && isMorning) {
                                                bgColor = 'bg-orange-500 text-white';
                                            } else if (isSelected) {
                                                bgColor = 'bg-blue-500 text-white';
                                            } else if ((holiday || isSunday)) {
                                                bgColor = 'bg-gray-100 text-red-400';
                                            } else if (isSaturday) {
                                                bgColor = 'bg-gray-100 text-blue-400';
                                            }

                                            return (
                                                <div
                                                    key={dayIdx}
                                                    className={`
                                                        h-24 flex flex-col items-center justify-center
                                                        text-xl font-semibold rounded-lg relative
                                                        ${bgColor}
                                                    `}
                                                >
                                                    <span>{date}</span>
                                                    {holiday && (
                                                        <span className={`text-xs leading-tight ${isSelected ? 'text-white/80' : 'text-red-400'}`}>
                                                            {holiday}
                                                        </span>
                                                    )}
                                                    {isMorning && !holiday && (
                                                        <span className="text-xs leading-tight text-white/80">오전</span>
                                                    )}
                                                    {isNight && !holiday && (
                                                        <span className="text-xs leading-tight text-white/80">야간</span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}

                                {/* 범례 */}
                                <div className="flex justify-center gap-6 mt-4 text-sm flex-wrap">
                                    <span className="flex items-center gap-1">
                                        <span className="w-4 h-4 rounded-sm bg-blue-500"></span>
                                        <span className="text-gray-600">진료(~18:00)</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="w-4 h-4 rounded-sm bg-orange-500"></span>
                                        <span className="text-gray-600">오전(~15:00)</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="w-4 h-4 rounded-sm bg-emerald-500"></span>
                                        <span className="text-gray-600">야간(~19:00)</span>
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="w-4 h-4 rounded-sm bg-gray-100 border border-gray-300"></span>
                                        <span className="text-gray-600">휴진</span>
                                    </span>
                                </div>

                                {/* 연락처 */}
                                <div className="mt-6 pt-6 pb-6 border-t border-gray-200 text-center text-gray-600 text-base">
                                    <p className="text-lg">📞 {CLINIC_INFO.phone}</p>
                                    <p className="text-sm text-gray-400 mt-2">📍 {CLINIC_INFO.address}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkCalendarEditor;
