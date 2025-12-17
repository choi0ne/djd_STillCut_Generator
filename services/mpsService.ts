// MPS (Media Processing Suite) 서비스
// Python 스크립트 호출을 위한 인터페이스

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
 * 이미지 처리 명령어 생성
 * 
 * 실제 Python 스크립트 호출은 Electron 환경 또는 백엔드 서버가 필요합니다.
 * 현재는 명령어 문자열만 생성합니다.
 */
export function buildImageCommand(
    inputPath: string,
    options: MpsImageOptions
): string {
    const commands: string[] = [];

    if (options.removeWatermark) {
        commands.push(`python mps/scripts/remove_watermark.py "${inputPath}"`);
    }

    if (options.optimizeForBlog) {
        const formatArg = options.outputFormat === 'both' ? 'all' : options.outputFormat;
        commands.push(`python mps/scripts/optimize_blog.py "${inputPath}" output.${formatArg}`);
    }

    return commands.join(' && ');
}

/**
 * PDF 처리 명령어 생성
 */
export function buildPdfCommand(
    inputPath: string,
    options: MpsPdfOptions
): string {
    const mergeArg = options.mergePages ? 'true' : 'false';
    const formatArg = options.outputFormat === 'both' ? 'all' : options.outputFormat;
    const logoArg = 'none'; // 기본적으로 로고 비활성화

    const command = `python mps/scripts/pdf_smart.py "${inputPath}" ${logoArg} output/ ${mergeArg} 1200 ${formatArg}`;

    return command;
}

/**
 * 이미지 처리 (플레이스홀더)
 * 
 * 실제 구현은 Electron의 child_process 또는 백엔드 API 호출이 필요합니다.
 */
/**
 * 이미지 처리 (백엔드 서버 호출)
 */
export async function processImage(
    file: File,
    options: MpsImageOptions
): Promise<MpsResult> {
    // API URL 설정 (환경 변수 또는 기본값)
    // Cloud Run 배포 주소를 기본값으로 설정하여 별도 환경변수 없이도 작동하도록 함
    const API_URL = import.meta.env.VITE_MPS_API_URL || 'https://mps-backend-595259465274.us-west2.run.app';

    const formData = new FormData();
    formData.append('file', file);
    formData.append('remove_watermark', String(options.removeWatermark));
    formData.append('optimize_blog', String(options.optimizeForBlog));
    formData.append('output_format', options.outputFormat);

    try {
        const response = await fetch(`${API_URL}/process-image`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Server processing failed');
        }

        const data = await response.json();

        // 서버에서 반환된 상대 경로를 전체 URL로 변환
        const outputFiles = data.outputFiles.map((path: string) => `${API_URL}${path}`);

        return {
            success: true,
            outputFiles: outputFiles,
            timestamp: Date.now()
        };
    } catch (error: any) {
        console.error('[MPS] Image processing error:', error);
        return {
            success: false,
            error: error.message,
            timestamp: Date.now()
        };
    }
}

/**
 * PDF 처리 (백엔드 서버 호출)
 */
export async function processPdf(
    file: File,
    options: MpsPdfOptions
): Promise<MpsResult> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('merge_pages', String(options.mergePages));
    formData.append('target_width', '1200'); // 기본값
    formData.append('output_format', options.outputFormat);

    // 선택된 페이지가 있으면 전송 (예: "[1, 3, 5]" 또는 "1,3,5")
    if (options.selectedPages && options.selectedPages.length > 0) {
        // 백엔드에서 파싱하기 쉽도록 JSON 문자열로 전송
        formData.append('selected_pages', JSON.stringify(options.selectedPages));
    }

    try {
        const response = await fetch('http://localhost:8000/process-pdf', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Server processing failed');
        }

        const data = await response.json();

        // 서버에서 반환된 상대 경로를 전체 URL로 변환
        const outputFiles = data.outputFiles.map((path: string) => `${API_URL}${path}`);

        return {
            success: true,
            outputFiles: outputFiles,
            timestamp: Date.now()
        };
    } catch (error: any) {
        console.error('[MPS] PDF processing error:', error);
        return {
            success: false,
            error: error.message,
            timestamp: Date.now()
        };
    }
}
