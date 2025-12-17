// MPS (Media Processing Suite) 서비스
// 백엔드/클라이언트 하이브리드 처리 지원

// ─────────────────────────────────────────────────────────────────
// 상수 및 타입 정의
// ─────────────────────────────────────────────────────────────────

const BACKEND_URL = 'https://mps-backend-595259465274.us-west2.run.app';
const BACKEND_TIMEOUT = 30000; // 30초 타임아웃

export type ProcessingMode = 'auto' | 'backend' | 'client';

export interface MpsImageOptions {
    removeWatermark: boolean;
    optimizeForBlog: boolean;
    outputFormat: 'webp' | 'jpg' | 'both';
}

export interface MpsPdfOptions extends MpsImageOptions {
    mergePages: boolean;
    selectedPages: number[];
    pageOrder: number[];
}

export interface MpsResult {
    success: boolean;
    outputFiles?: string[];
    processedImageUrl?: string;
    error?: string;
    timestamp: number;
    processedBy?: 'backend' | 'client'; // 어디서 처리되었는지 표시
}

export type FileType = 'image' | 'pdf' | 'unknown';

// ─────────────────────────────────────────────────────────────────
// 유틸리티 함수
// ─────────────────────────────────────────────────────────────────

/**
 * 파일 타입 감지
 */
export function detectFileType(file: File): FileType {
    const imageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    const pdfTypes = ['application/pdf'];

    if (imageTypes.includes(file.type)) {
        return 'image';
    }
    if (pdfTypes.includes(file.type)) {
        return 'pdf';
    }
    return 'unknown';
}

/**
 * 타임아웃 적용 fetch
 */
async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        return response;
    } finally {
        clearTimeout(timeoutId);
    }
}

// ─────────────────────────────────────────────────────────────────
// 백엔드 처리 함수
// ─────────────────────────────────────────────────────────────────

/**
 * 이미지 처리 (백엔드 서버 호출)
 */
export async function processImageWithBackend(
    file: File,
    options: MpsImageOptions
): Promise<MpsResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('remove_watermark', String(options.removeWatermark));
    formData.append('optimize_blog', String(options.optimizeForBlog));
    formData.append('output_format', options.outputFormat);

    try {
        const response = await fetchWithTimeout(`${BACKEND_URL}/process-image`, {
            method: 'POST',
            body: formData,
        }, BACKEND_TIMEOUT);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Server processing failed');
        }

        const data = await response.json();
        const outputFiles = data.outputFiles.map((path: string) => `${BACKEND_URL}${path}`);

        return {
            success: true,
            outputFiles: outputFiles,
            processedBy: 'backend',
            timestamp: Date.now()
        };
    } catch (error: any) {
        console.error('[MPS Backend] Image processing error:', error);
        return {
            success: false,
            error: error.name === 'AbortError' ? '백엔드 타임아웃' : error.message,
            timestamp: Date.now()
        };
    }
}

/**
 * PDF 처리 (백엔드 서버 호출)
 */
export async function processPdfWithBackend(
    file: File,
    options: MpsPdfOptions
): Promise<MpsResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('merge_pages', String(options.mergePages));
    formData.append('target_width', '1200');
    formData.append('output_format', options.outputFormat);

    if (options.selectedPages && options.selectedPages.length > 0) {
        formData.append('selected_pages', JSON.stringify(options.selectedPages));
    }

    try {
        const response = await fetchWithTimeout(`${BACKEND_URL}/process-pdf`, {
            method: 'POST',
            body: formData,
        }, BACKEND_TIMEOUT);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Server processing failed');
        }

        const data = await response.json();
        const outputFiles = data.outputFiles.map((path: string) => `${BACKEND_URL}${path}`);

        return {
            success: true,
            outputFiles: outputFiles,
            processedBy: 'backend',
            timestamp: Date.now()
        };
    } catch (error: any) {
        console.error('[MPS Backend] PDF processing error:', error);
        return {
            success: false,
            error: error.name === 'AbortError' ? '백엔드 타임아웃' : error.message,
            timestamp: Date.now()
        };
    }
}

// ─────────────────────────────────────────────────────────────────
// 클라이언트 처리 함수 (Canvas API)
// ─────────────────────────────────────────────────────────────────

/**
 * 이미지 처리 (클라이언트 Canvas API)
 */
export async function processImageClient(
    file: File,
    options: MpsImageOptions
): Promise<MpsResult> {
    try {
        const imageUrl = URL.createObjectURL(file);
        const img = new Image();

        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = reject;
            img.src = imageUrl;
        });

        // 리사이즈 계산 (블로그 최적화: 1200px 너비)
        let targetWidth = img.width;
        let targetHeight = img.height;

        if (options.optimizeForBlog && img.width > 1200) {
            const ratio = 1200 / img.width;
            targetWidth = 1200;
            targetHeight = Math.round(img.height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d')!;

        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // 워터마크 제거 (우측 하단 15% 영역 블러 처리)
        if (options.removeWatermark) {
            const wmWidth = Math.round(targetWidth * 0.15);
            const wmHeight = Math.round(targetHeight * 0.08);
            const wmX = targetWidth - wmWidth;
            const wmY = targetHeight - wmHeight;

            // 워터마크 영역을 주변 색상으로 채우기
            const imageData = ctx.getImageData(wmX - 5, wmY - 5, 5, 5);
            const avgColor = getAverageColor(imageData);
            ctx.fillStyle = `rgb(${avgColor.r}, ${avgColor.g}, ${avgColor.b})`;
            ctx.fillRect(wmX, wmY, wmWidth, wmHeight);
        }

        // 출력 포맷별 Data URL 생성
        const outputFiles: string[] = [];

        if (options.outputFormat === 'webp' || options.outputFormat === 'both') {
            outputFiles.push(canvas.toDataURL('image/webp', 0.9));
        }
        if (options.outputFormat === 'jpg' || options.outputFormat === 'both') {
            outputFiles.push(canvas.toDataURL('image/jpeg', 0.9));
        }

        URL.revokeObjectURL(imageUrl);

        return {
            success: true,
            outputFiles: outputFiles,
            processedBy: 'client',
            timestamp: Date.now()
        };
    } catch (error: any) {
        console.error('[MPS Client] Image processing error:', error);
        return {
            success: false,
            error: error.message,
            timestamp: Date.now()
        };
    }
}

/**
 * RGB 평균 색상 계산 헬퍼
 */
function getAverageColor(imageData: ImageData): { r: number; g: number; b: number } {
    let r = 0, g = 0, b = 0;
    const pixels = imageData.data;
    const count = pixels.length / 4;

    for (let i = 0; i < pixels.length; i += 4) {
        r += pixels[i];
        g += pixels[i + 1];
        b += pixels[i + 2];
    }

    return {
        r: Math.round(r / count),
        g: Math.round(g / count),
        b: Math.round(b / count)
    };
}

/**
 * PDF 처리 (클라이언트 - Canvas 렌더링)
 * PDF.js로 렌더링된 페이지를 이미지로 변환
 */
export async function processPdfClient(
    file: File,
    options: MpsPdfOptions,
    pdfPageImages?: string[] // MpsEditor에서 이미 렌더링된 페이지 이미지들
): Promise<MpsResult> {
    try {
        if (!pdfPageImages || pdfPageImages.length === 0) {
            return {
                success: false,
                error: 'PDF 페이지 미리보기가 필요합니다.',
                timestamp: Date.now()
            };
        }

        const selectedImages = options.selectedPages
            .map(pageNum => pdfPageImages[pageNum - 1])
            .filter(Boolean);

        if (selectedImages.length === 0) {
            return {
                success: false,
                error: '선택된 페이지가 없습니다.',
                timestamp: Date.now()
            };
        }

        let outputFiles: string[] = [];

        if (options.mergePages && selectedImages.length > 1) {
            // 페이지 병합: 세로로 이어붙이기
            const images = await Promise.all(
                selectedImages.map(src => {
                    return new Promise<HTMLImageElement>((resolve, reject) => {
                        const img = new Image();
                        img.onload = () => resolve(img);
                        img.onerror = reject;
                        img.src = src;
                    });
                })
            );

            const maxWidth = Math.max(...images.map(img => img.width));
            const totalHeight = images.reduce((sum, img) => sum + img.height, 0);

            const canvas = document.createElement('canvas');
            canvas.width = maxWidth;
            canvas.height = totalHeight;
            const ctx = canvas.getContext('2d')!;

            let currentY = 0;
            for (const img of images) {
                ctx.drawImage(img, 0, currentY);
                currentY += img.height;
            }

            if (options.outputFormat === 'webp' || options.outputFormat === 'both') {
                outputFiles.push(canvas.toDataURL('image/webp', 0.9));
            }
            if (options.outputFormat === 'jpg' || options.outputFormat === 'both') {
                outputFiles.push(canvas.toDataURL('image/jpeg', 0.9));
            }
        } else {
            // 개별 파일: 각 페이지를 별도 이미지로
            outputFiles = selectedImages;
        }

        return {
            success: true,
            outputFiles: outputFiles,
            processedBy: 'client',
            timestamp: Date.now()
        };
    } catch (error: any) {
        console.error('[MPS Client] PDF processing error:', error);
        return {
            success: false,
            error: error.message,
            timestamp: Date.now()
        };
    }
}

// ─────────────────────────────────────────────────────────────────
// 하이브리드 처리 함수
// ─────────────────────────────────────────────────────────────────

/**
 * 하이브리드 처리 (자동 폴백 지원)
 * - auto: 백엔드 시도 → 실패 시 클라이언트 폴백
 * - backend: 백엔드만 사용
 * - client: 클라이언트만 사용
 */
export async function processHybrid(
    file: File,
    options: MpsImageOptions | MpsPdfOptions,
    fileType: FileType,
    mode: ProcessingMode = 'auto',
    pdfPageImages?: string[] // PDF 클라이언트 처리용
): Promise<MpsResult & { fallbackUsed?: boolean }> {

    // 클라이언트 전용 모드
    if (mode === 'client') {
        if (fileType === 'image') {
            return await processImageClient(file, options as MpsImageOptions);
        } else if (fileType === 'pdf') {
            return await processPdfClient(file, options as MpsPdfOptions, pdfPageImages);
        }
        return { success: false, error: '지원하지 않는 파일 형식', timestamp: Date.now() };
    }

    // 백엔드 처리 시도
    let backendResult: MpsResult;

    if (fileType === 'image') {
        backendResult = await processImageWithBackend(file, options as MpsImageOptions);
    } else if (fileType === 'pdf') {
        backendResult = await processPdfWithBackend(file, options as MpsPdfOptions);
    } else {
        return { success: false, error: '지원하지 않는 파일 형식', timestamp: Date.now() };
    }

    // 백엔드 성공 또는 backend 전용 모드
    if (backendResult.success || mode === 'backend') {
        return backendResult;
    }

    // Auto 모드: 백엔드 실패 시 클라이언트 폴백
    console.log('[MPS Hybrid] 백엔드 실패, 클라이언트 폴백 시도...');

    let clientResult: MpsResult;

    if (fileType === 'image') {
        clientResult = await processImageClient(file, options as MpsImageOptions);
    } else {
        clientResult = await processPdfClient(file, options as MpsPdfOptions, pdfPageImages);
    }

    return {
        ...clientResult,
        fallbackUsed: true,
        error: clientResult.success
            ? undefined
            : `백엔드: ${backendResult.error} / 클라이언트: ${clientResult.error}`
    };
}

// ─────────────────────────────────────────────────────────────────
// 레거시 호환 함수 (기존 코드 호환성 유지)
// ─────────────────────────────────────────────────────────────────

/**
 * @deprecated processImageWithBackend 또는 processHybrid 사용 권장
 */
export const processImage = processImageWithBackend;

/**
 * @deprecated processPdfWithBackend 또는 processHybrid 사용 권장
 */
export const processPdf = processPdfWithBackend;
