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
export async function processImage(
    file: File,
    options: MpsImageOptions
): Promise<MpsResult> {
    // 브라우저 환경에서는 직접 Python 실행 불가
    // 시뮬레이션용 지연
    await new Promise(resolve => setTimeout(resolve, 1000));

    const command = buildImageCommand(file.name, options);
    console.log('[MPS] Image processing command:', command);

    return {
        success: true,
        outputFiles: [`processed_${file.name}`],
        timestamp: Date.now()
    };
}

/**
 * PDF 처리 (플레이스홀더)
 */
export async function processPdf(
    file: File,
    options: MpsPdfOptions
): Promise<MpsResult> {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const command = buildPdfCommand(file.name, options);
    console.log('[MPS] PDF processing command:', command);

    const outputFiles = options.mergePages
        ? ['merged_optimized.webp', 'merged_optimized.jpg']
        : options.selectedPages.map(p => `page_${p}.webp`);

    return {
        success: true,
        outputFiles,
        timestamp: Date.now()
    };
}
