import { v4 as uuidv4 } from 'uuid';

// MPS (Media Processing Suite) 서비스
// Browser Native Implementation using Canvas API

export interface MpsImageOptions {
    removeWatermark: boolean;
    optimizeForBlog: boolean; // 1200px width limit
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
    processedImageUrl?: string; // Single image result (Data URL)
    processedImages?: string[]; // Multiple image results (Data URLs) for PDF
    error?: string;
    timestamp: number;
}

export type FileType = 'image' | 'pdf' | 'unknown';

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
 * 이미지 로드 (DataURL or File -> HTMLImageElement)
 */
const loadImage = (src: string | File): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        if (src instanceof File) {
            img.src = URL.createObjectURL(src);
        } else {
            img.src = src;
        }
    });
};

/**
 * 워터마크 영역 계산 (Python 스크립트 로직 포팅)
 */
function getWatermarkRegion(width: number, height: number) {
    let offsetRight = 1;
    let offsetBottom = 1;
    let wmWidth = 150;
    let wmHeight = 40;

    if (width >= 1000) {
        offsetRight = 9;
        offsetBottom = 8;
        wmHeight = 35;
    }

    const x1 = width - wmWidth - offsetRight;
    const y1 = height - wmHeight - offsetBottom;

    return { x: x1, y: y1, w: wmWidth, h: wmHeight };
}

/**
 * 워터마크 제거 (Canvas 조작)
 * 간단한 Inpainting: 주변 영역의 색상을 평균내어 덮어쓰거나 블러 처리
 */
function removeWatermark(ctx: CanvasRenderingContext2D, width: number, height: number) {
    const { x, y, w, h } = getWatermarkRegion(width, height);

    // 이미지 범위를 벗어나지 않도록 클램핑
    const sx = Math.max(0, x);
    const sy = Math.max(0, y);
    const sw = Math.min(width - sx, w);
    const sh = Math.min(height - sy, h);

    if (sw <= 0 || sh <= 0) return;

    try {
        // 주변 배경색 샘플링을 위해 워터마크 바로 위쪽과 왼쪽의 데이터를 가져옴
        // 여기서는 간단하게 "바로 위쪽" 5px 영역을 복사해서 늘리거나
        // 주변 색 평균으로 채우는 방식 사용

        // 방법 1: 바로 위쪽 영역을 복사해서 덮어씌우기 (가장 자연스러울 수 않음 배경이 복잡하면)
        // 방법 2: 블러 처리 (context.filter)

        // 1. 해당 영역의 원본 이미지 데이터 저장 (혹시 모를 복구를 위해? 아니오)

        // 2. 주변부(위쪽) 샘플링하여 덮어쓰기 시도
        // 위쪽에서 10px 높이만큼 가져와서 반복해서 채워넣기?
        // 배경이 단색이거나 그라데이션이면 통함.

        // 더 간단하고 효과적인 방법: 주변 픽셀로 클리어하고 가우시안 블러
        // 1단계: 마스크 영역 생성

        // 주변 색상 추출 (단순 평균)
        // 위쪽 5px, 왼쪽 5px 샘플링
        const sampleSize = 5;
        let r = 0, g = 0, b = 0, count = 0;

        // 위쪽 샘플링
        if (sy - sampleSize >= 0) {
            const data = ctx.getImageData(sx, sy - sampleSize, sw, sampleSize).data;
            for (let i = 0; i < data.length; i += 4) {
                r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
            }
        }

        // 왼쪽 샘플링
        if (sx - sampleSize >= 0) {
            const data = ctx.getImageData(sx - sampleSize, sy, sampleSize, sh).data;
            for (let i = 0; i < data.length; i += 4) {
                r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
            }
        }

        if (count > 0) {
            r = Math.round(r / count);
            g = Math.round(g / count);
            b = Math.round(b / count);

            // 채우기
            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(sx, sy, sw, sh);

            // 블렌딩을 위해 약간의 블러 효과를 주거나
            // 그라데이션을 사용하는 것이 좋지만 canvas API로는 복잡할 수 있음.
            // 여기서는 단순 채우기로 구현.
        } else {
            // 샘플링 실패 시 흰색으로
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(sx, sy, sw, sh);
        }

    } catch (e) {
        console.error("Watermark removal failed", e);
    }
}

/**
 * 캔버스 리사이즈
 */
function resizeCanvas(canvas: HTMLCanvasElement, maxWidth: number): HTMLCanvasElement {
    if (canvas.width <= maxWidth) return canvas;

    const scale = maxWidth / canvas.width;
    const newWidth = maxWidth;
    const newHeight = canvas.height * scale;

    const newCanvas = document.createElement('canvas');
    newCanvas.width = newWidth;
    newCanvas.height = newHeight;
    const ctx = newCanvas.getContext('2d');

    if (ctx) {
        // High quality scaling settings
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(canvas, 0, 0, newWidth, newHeight);
    }

    return newCanvas;
}

/**
 * 단일 이미지 처리 로직 (Core)
 */
async function processSingleImage(
    source: File | string, // File object or Data URL
    options: MpsImageOptions
): Promise<string> { // returns Data URL
    const img = await loadImage(source);

    let canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error("Canvas Context 생성 실패");

    ctx.drawImage(img, 0, 0);

    // 워터마크 제거
    if (options.removeWatermark) {
        removeWatermark(ctx, canvas.width, canvas.height);
    }

    // 블로그 최적화 (리사이즈)
    if (options.optimizeForBlog && canvas.width > 1200) {
        canvas = resizeCanvas(canvas, 1200);
    }

    // 포맷 변환 및 출력
    // outputFormat이 'both'인 경우 호출자가 두 번 호출하거나 여기서 처리해야 함.
    // 하지만 이 함수는 단일 Data URL 반환이므로, 호출자가 알아서 포맷 지정해서 호출한다고 가정?
    // 아니면 processImageWrapper에서 처리.

    // 여기서는 기본적으로 options.outputFormat 중 하나를 따르되, 
    // 'both'인 경우 webp를 우선 반환하거나 별도 로직 필요.
    // processImage에서 처리하도록 하고 여기는 원하는 포맷을 인자로 받거나 함.
    // 일단 WebP (0.9) 기본값

    const format = options.outputFormat === 'jpg' ? 'image/jpeg' : 'image/webp';
    return canvas.toDataURL(format, 0.9);
}


/**
 * 이미지 처리 (메인 함수)
 */
export async function processImage(
    file: File | string, // File or Data URL
    options: MpsImageOptions
): Promise<MpsResult> {
    try {
        const results: string[] = [];

        if (options.outputFormat === 'both') {
            // WebP
            const webpUrl = await processSingleImage(file, { ...options, outputFormat: 'webp' });
            results.push(webpUrl);
            // JPG
            const jpgUrl = await processSingleImage(file, { ...options, outputFormat: 'jpg' });
            results.push(jpgUrl);

            return {
                success: true,
                processedImageUrl: webpUrl, // 미리보기용으로는 첫 번째(WebP) 반환
                processedImages: results,
                outputFiles: ['image.webp', 'image.jpg'],
                timestamp: Date.now()
            };
        } else {
            const resultUrl = await processSingleImage(file, options);
            return {
                success: true,
                processedImageUrl: resultUrl,
                outputFiles: [`image.${options.outputFormat}`],
                timestamp: Date.now()
            };
        }
    } catch (e: any) {
        console.error("Image Processing Error", e);
        return {
            success: false,
            error: e.message || "이미지 처리 중 오류 발생",
            timestamp: Date.now()
        };
    }
}

/**
 * PDF 처리 (플레이스홀더 - 실제 구현은 MpsEditor에서 이루어짐)
 * 
 * MpsEditor에서 PDF 페이지를 파싱하고 이 서비스의 processImage를 각 페이지에 호출하는 것이 효율적임.
 * 여기서는 MpsEditor와의 호환성을 위해 인터페이스 유지.
 */
export async function processPdf(
    file: File,
    options: MpsPdfOptions
): Promise<MpsResult> {
    // 실제 처리는 MpsEditor.tsx 내에서 parsePdfPages 등으로 이루어지고 있으므로
    // 여기서는 '성공' 응답만 주거나, 
    // 또는 MpsEditor 로직을 여기로 옮겨와야 함.
    // 하지만 pdfjs 의존성 문제(worker 등)로 인해 MpsEditor에서 처리하는게 나을 수 있음.

    return {
        success: true,
        outputFiles: ['pdf_processed'],
        timestamp: Date.now()
    };
}
