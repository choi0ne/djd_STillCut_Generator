import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as pdfjs from 'pdfjs-dist';
import {
    detectFileType,
    processImage,
    processPdf,
    type MpsImageOptions,
    type MpsPdfOptions,
    type FileType,
    type MpsResult
} from '../services/mpsService';
import { saveToGoogleDrive, listImagesFromGoogleDrive, downloadImageFromGoogleDrive } from '../services/googleDriveService';

// PDF.js worker 설정 (ES Module 호환)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.mjs`;

interface PdfPagePreview {
    pageNum: number;
    imageUrl: string;
}

const MpsEditor: React.FC = () => {
    // 파일 상태
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [fileType, setFileType] = useState<FileType>('unknown');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 처리 상태
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<MpsResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);

    // 이미지 옵션
    const [imageOptions, setImageOptions] = useState<MpsImageOptions>({
        removeWatermark: true,
        optimizeForBlog: true,
        outputFormat: 'webp'
    });

    // PDF 옵션
    const [pdfOptions, setPdfOptions] = useState<MpsPdfOptions>({
        removeWatermark: true,
        optimizeForBlog: true,
        outputFormat: 'webp',
        mergePages: true,
        selectedPages: [],
        pageOrder: []
    });

    // 저장 상태
    const [isSaving, setIsSaving] = useState(false);

    // 구글 드라이브 상태
    const [showDriveFiles, setShowDriveFiles] = useState(false);
    const [driveFiles, setDriveFiles] = useState<any[]>([]);
    const [isLoadingDrive, setIsLoadingDrive] = useState(false);

    // PDF 미리보기 상태
    const [pdfPagePreviews, setPdfPagePreviews] = useState<PdfPagePreview[]>([]);
    const [isParsing, setIsParsing] = useState(false);

    // PDF 페이지 파싱 및 미리보기 생성
    const parsePdfPages = async (file: File) => {
        setIsParsing(true);
        setPdfPagePreviews([]);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
            const totalPages = pdf.numPages;

            const previews: PdfPagePreview[] = [];

            for (let i = 1; i <= totalPages; i++) {
                const page = await pdf.getPage(i);
                const viewport = page.getViewport({ scale: 0.3 });

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                if (!context) continue;

                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({
                    canvasContext: context,
                    viewport: viewport,
                    canvas: canvas
                } as any).promise;

                previews.push({
                    pageNum: i,
                    imageUrl: canvas.toDataURL('image/png')
                });
            }

            setPdfPagePreviews(previews);

            // 모든 페이지를 기본 선택
            const allPages = previews.map(p => p.pageNum);
            setPdfOptions(prev => ({
                ...prev,
                selectedPages: allPages,
                pageOrder: allPages
            }));

            setStatusMessage(`📄 PDF 분석 완료: ${totalPages}페이지 감지됨`);
        } catch (err) {
            console.error('PDF 파싱 오류:', err);
            setError(`PDF 파싱 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
        } finally {
            setIsParsing(false);
        }
    };

    // 파일 업로드 처리
    const handleFileUpload = useCallback((file: File) => {
        const type = detectFileType(file);
        setUploadedFile(file);
        setFileType(type);
        setResult(null);
        setError(null);
        setStatusMessage(`파일 "${file.name}" 업로드됨 (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

        // 이미지 미리보기
        if (type === 'image') {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        } else {
            setPreviewUrl(null);
        }

        // PDF의 경우 페이지 파싱
        if (type === 'pdf') {
            parsePdfPages(file);
        }
    }, []);

    // 클립보드 붙여넣기 (Ctrl+V) 지원
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                        e.preventDefault();
                        handleFileUpload(file);
                        break;
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => {
            window.removeEventListener('paste', handlePaste);
        };
    }, [handleFileUpload]);

    // 드래그 앤 드롭 핸들러
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileUpload(file);
        }
    }, [handleFileUpload]);

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileUpload(file);
        }
    }, [handleFileUpload]);

    // 구글 드라이브에서 파일 목록 가져오기
    const handleOpenGoogleDrive = async () => {
        setIsLoadingDrive(true);
        try {
            const files = await listImagesFromGoogleDrive();
            setDriveFiles(files);
            setShowDriveFiles(true);
        } catch (error: any) {
            setError(error.message || 'Google Drive 파일 목록을 불러올 수 없습니다.');
        } finally {
            setIsLoadingDrive(false);
        }
    };

    // 구글 드라이브에서 선택한 파일 다운로드
    const handleSelectDriveFile = async (fileId: string, mimeType: string, fileName: string) => {
        setIsLoadingDrive(true);
        try {
            const imageData = await downloadImageFromGoogleDrive(fileId, mimeType);
            const response = await fetch(imageData.base64);
            const blob = await response.blob();
            const file = new File([blob], fileName, { type: mimeType });
            handleFileUpload(file);
            setShowDriveFiles(false);
        } catch (error: any) {
            setError(error.message || '파일을 다운로드할 수 없습니다.');
        } finally {
            setIsLoadingDrive(false);
        }
    };

    // 처리 실행
    const handleProcess = async () => {
        if (!uploadedFile) return;

        setIsProcessing(true);
        setError(null);
        setResult(null);
        setStatusMessage('처리 중...');

        try {
            let processResult: MpsResult;

            if (fileType === 'image') {
                processResult = await processImage(uploadedFile, imageOptions);
            } else if (fileType === 'pdf') {
                processResult = await processPdf(uploadedFile, pdfOptions);
            } else {
                throw new Error('지원하지 않는 파일 형식입니다.');
            }

            setResult(processResult);
            setStatusMessage(processResult.success
                ? `✅ 처리 완료! 출력: ${processResult.outputFiles?.join(', ') || '없음'}`
                : `❌ 처리 실패: ${processResult.error}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : '처리 중 오류가 발생했습니다.');
            setStatusMessage(null);
        } finally {
            setIsProcessing(false);
        }
    };

    // 파일 초기화
    const handleReset = () => {
        setUploadedFile(null);
        setFileType('unknown');
        setPreviewUrl(null);
        setResult(null);
        setError(null);
        setStatusMessage(null);
        setPdfPagePreviews([]);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    // 저장 기능 (로컬 + Google Drive)
    const handleSave = async () => {
        if (!result || !result.success) return;

        setIsSaving(true);
        try {
            // 로컬 다운로드
            if (previewUrl) {
                const link = document.createElement('a');
                link.href = previewUrl;
                link.download = `mps-${Date.now()}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            }

            // Google Drive 저장
            if (previewUrl) {
                await saveToGoogleDrive(previewUrl);
            }

            setStatusMessage('✅ 저장 완료! 로컬 + Google Drive');
        } catch (err) {
            setError(`저장 중 오류: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* 헤더 */}
            <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                    <span>🔧</span> MPS 후처리
                </h2>

                {/* 파일 업로드 영역 */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragging
                        ? 'border-blue-500 bg-blue-500/10'
                        : uploadedFile
                            ? 'border-green-500/50 bg-green-500/5'
                            : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                        }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                        onChange={handleFileInputChange}
                        className="hidden"
                    />

                    {uploadedFile ? (
                        <div className="space-y-2">
                            <span className="text-4xl">{fileType === 'pdf' ? '📄' : '🖼️'}</span>
                            <p className="text-white font-medium">{uploadedFile.name}</p>
                            <p className="text-gray-400 text-sm">
                                {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleReset();
                                }}
                                className="text-red-400 hover:text-red-300 text-sm underline"
                            >
                                파일 제거
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <span className="text-4xl">📁</span>
                            <p className="text-gray-400">클릭 또는 드래그하여 파일 업로드</p>
                            <p className="text-gray-500 text-xs">Ctrl+V로 붙여넣기 가능</p>
                            <p className="text-gray-500 text-xs">PNG, JPG, WebP, PDF 지원</p>
                        </div>
                    )}
                </div>

                {/* Google Drive 가져오기 버튼 */}
                <button
                    onClick={handleOpenGoogleDrive}
                    disabled={isLoadingDrive}
                    className="mt-4 w-full py-2 bg-blue-600/20 text-blue-300 text-sm rounded-lg hover:bg-blue-600/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <span>☁️</span>
                    <span>{isLoadingDrive ? '로딩...' : 'Google Drive에서 가져오기'}</span>
                </button>

                {/* Google Drive 파일 선택 모달 - 위치 이동됨 */}
            </div>

            {/* 미리보기 */}
            {previewUrl && (
                <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
                    <h3 className="text-sm font-semibold text-gray-300 mb-3">🖼️ 미리보기</h3>
                    <div className="rounded-lg overflow-hidden border border-white/10">
                        <img src={previewUrl} alt="Preview" className="w-full max-h-64 object-contain bg-black/50" />
                    </div>
                </div>
            )}

            {/* 이미지 옵션 */}
            {fileType === 'image' && (
                <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
                    <ImageOptionsPanel options={imageOptions} onChange={setImageOptions} />
                </div>
            )}

            {/* PDF 옵션 */}
            {fileType === 'pdf' && (
                <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
                    <PdfOptionsPanel
                        options={pdfOptions}
                        onChange={setPdfOptions}
                        pagePreviews={pdfPagePreviews}
                        isParsing={isParsing}
                    />
                </div>
            )}

            {/* 상태 메시지 */}
            {statusMessage && (
                <div className="bg-[#111827] rounded-xl border border-white/5 p-4">
                    <p className="text-sm text-gray-300">{statusMessage}</p>
                </div>
            )}

            {/* 에러 메시지 */}
            {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <p className="text-red-400 text-sm">❌ {error}</p>
                </div>
            )}

            {/* 처리 버튼 */}
            {uploadedFile && fileType !== 'unknown' && (
                <div className="flex gap-3">
                    <button
                        onClick={handleProcess}
                        disabled={isProcessing}
                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <>
                                <span className="animate-spin">⏳</span>
                                처리 중...
                            </>
                        ) : (
                            <>
                                <span>⚡</span>
                                처리 시작
                            </>
                        )}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!result || !result.success || isSaving}
                        className="px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                    >
                        {isSaving ? '⏳' : '💾'} 저장
                    </button>
                </div>
            )}

            {/* 처리 결과 */}
            {result && result.success && (
                <div className="bg-[#111827] rounded-xl border border-green-500/30 p-5">
                    <h3 className="text-sm font-semibold text-green-400 mb-3">✅ 처리 결과</h3>
                    <div className="space-y-2">
                        {result.outputFiles?.map((file, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-sm text-gray-300">
                                <span>📄</span>
                                <span>{file}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Google Drive 파일 선택 팝업 모달 */}
            {showDriveFiles && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={() => setShowDriveFiles(false)}>
                    <div
                        className="bg-[#1a1f2e] border border-blue-500/50 rounded-2xl shadow-2xl w-[90vw] max-w-4xl max-h-[80vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 모달 헤더 */}
                        <div className="flex items-center justify-between p-4 border-b border-white/10">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">☁️</span>
                                <div>
                                    <h3 className="text-lg font-semibold text-white">Google Drive</h3>
                                    <p className="text-xs text-gray-400">파일을 선택하세요</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowDriveFiles(false)}
                                className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            >
                                ✕
                            </button>
                        </div>

                        {/* 파일 그리드 */}
                        <div className="p-4 overflow-y-auto max-h-[60vh]">
                            {driveFiles.length > 0 ? (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                                    {driveFiles.map((file) => (
                                        <div
                                            key={file.id}
                                            onClick={() => handleSelectDriveFile(file.id, file.mimeType, file.name)}
                                            className="group relative aspect-square bg-gray-800 rounded-xl cursor-pointer hover:ring-2 hover:ring-blue-500 hover:scale-105 overflow-hidden transition-all duration-200 shadow-lg"
                                        >
                                            {file.thumbnailLink ? (
                                                <img src={file.thumbnailLink} alt={file.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center p-2">
                                                    <span className="text-3xl mb-1">{file.mimeType?.includes('pdf') ? '📄' : '🖼️'}</span>
                                                    <p className="text-xs text-gray-400 text-center truncate w-full">{file.name}</p>
                                                </div>
                                            )}
                                            {/* 호버 오버레이 */}
                                            <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/20 transition-colors flex items-center justify-center">
                                                <span className="opacity-0 group-hover:opacity-100 text-white text-2xl transition-opacity">✓</span>
                                            </div>
                                            {/* 파일명 표시 */}
                                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <p className="text-xs text-white truncate">{file.name}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-16">
                                    <span className="text-4xl mb-4 block">📁</span>
                                    <p className="text-gray-400">파일이 없습니다</p>
                                </div>
                            )}
                        </div>

                        {/* 모달 푸터 */}
                        <div className="flex items-center justify-between p-4 border-t border-white/10 bg-black/20">
                            <p className="text-xs text-gray-500">{driveFiles.length}개의 파일</p>
                            <button
                                onClick={() => setShowDriveFiles(false)}
                                className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg transition-colors"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────
// 이미지 옵션 패널
// ─────────────────────────────────────────────────────────────────
interface ImageOptionsPanelProps {
    options: MpsImageOptions;
    onChange: (options: MpsImageOptions) => void;
}

const ImageOptionsPanel: React.FC<ImageOptionsPanelProps> = ({ options, onChange }) => {
    return (
        <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-300 border-b border-white/10 pb-2">
                🖼️ 이미지 처리 옵션
            </h3>

            <ToggleOption
                label="워터마크 제거"
                description="우측 하단 워터마크 자동 제거"
                checked={options.removeWatermark}
                onChange={(checked) => onChange({ ...options, removeWatermark: checked })}
            />

            <ToggleOption
                label="블로그 최적화"
                description="1200px 리사이즈 + 압축"
                checked={options.optimizeForBlog}
                onChange={(checked) => onChange({ ...options, optimizeForBlog: checked })}
            />

            <div className="space-y-2">
                <p className="text-sm text-gray-400">출력 포맷</p>
                <div className="flex gap-2">
                    {(['webp', 'jpg', 'both'] as const).map((format) => (
                        <button
                            key={format}
                            onClick={() => onChange({ ...options, outputFormat: format })}
                            className={`px-4 py-2 rounded-lg text-sm transition-colors ${options.outputFormat === format
                                ? 'bg-blue-600 text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            {format === 'both' ? 'WebP + JPG' : format.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────
// PDF 옵션 패널
// ─────────────────────────────────────────────────────────────────
interface PdfOptionsPanelProps {
    options: MpsPdfOptions;
    onChange: (options: MpsPdfOptions) => void;
    pagePreviews?: PdfPagePreview[];
    isParsing?: boolean;
}

const PdfOptionsPanel: React.FC<PdfOptionsPanelProps> = ({ options, onChange, pagePreviews = [], isParsing = false }) => {
    const togglePage = (page: number) => {
        const newSelected = options.selectedPages.includes(page)
            ? options.selectedPages.filter(p => p !== page)
            : [...options.selectedPages, page].sort((a, b) => a - b);
        onChange({ ...options, selectedPages: newSelected, pageOrder: newSelected });
    };

    const totalPages = pagePreviews.length > 0 ? pagePreviews.length : 10;

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-300 border-b border-white/10 pb-2">
                📄 PDF 처리 옵션
            </h3>

            <ToggleOption
                label="워터마크 제거"
                description="각 페이지 워터마크 제거"
                checked={options.removeWatermark}
                onChange={(checked) => onChange({ ...options, removeWatermark: checked })}
            />

            <ToggleOption
                label="블로그 최적화"
                description="1200px + DPI 자동 계산"
                checked={options.optimizeForBlog}
                onChange={(checked) => onChange({ ...options, optimizeForBlog: checked })}
            />

            <div className="space-y-2">
                <p className="text-sm text-gray-400">출력 포맷</p>
                <div className="flex gap-2">
                    {(['webp', 'jpg', 'both'] as const).map((format) => (
                        <button
                            key={format}
                            onClick={() => onChange({ ...options, outputFormat: format })}
                            className={`px-4 py-2 rounded-lg text-sm transition-colors ${options.outputFormat === format
                                ? 'bg-blue-600 text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            {format === 'both' ? 'WebP + JPG' : format.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <p className="text-sm text-gray-400">출력 방식</p>
                <div className="flex gap-2">
                    <button
                        onClick={() => onChange({ ...options, mergePages: false })}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors ${!options.mergePages
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        📑 개별 파일
                    </button>
                    <button
                        onClick={() => onChange({ ...options, mergePages: true })}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors ${options.mergePages
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        📄 한 장 합치기
                    </button>
                </div>
            </div>

            {/* 페이지 선택 */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-400">
                        페이지 선택 {isParsing && <span className="animate-pulse">분석 중...</span>}
                    </p>
                    <div className="flex gap-1">
                        <button
                            onClick={() => {
                                const allPages = pagePreviews.length > 0
                                    ? pagePreviews.map(p => p.pageNum)
                                    : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
                                onChange({ ...options, selectedPages: allPages, pageOrder: allPages });
                            }}
                            className="text-xs px-2 py-1 bg-white/5 text-gray-400 hover:bg-white/10 rounded"
                        >
                            모두 선택
                        </button>
                        <button
                            onClick={() => onChange({ ...options, selectedPages: [], pageOrder: [] })}
                            className="text-xs px-2 py-1 bg-white/5 text-gray-400 hover:bg-white/10 rounded"
                        >
                            모두 해제
                        </button>
                    </div>
                </div>

                {/* 미리보기 이미지 그리드 */}
                {pagePreviews.length > 0 ? (
                    <div className="grid grid-cols-5 gap-2 max-h-64 overflow-y-auto">
                        {pagePreviews.map((preview) => (
                            <div
                                key={preview.pageNum}
                                onClick={() => togglePage(preview.pageNum)}
                                className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${options.selectedPages.includes(preview.pageNum)
                                    ? 'border-blue-500 ring-2 ring-blue-500/30'
                                    : 'border-gray-600 opacity-50 grayscale'
                                    }`}
                            >
                                <img
                                    src={preview.imageUrl}
                                    alt={`Page ${preview.pageNum}`}
                                    className="w-full h-auto"
                                />
                                <div className={`absolute bottom-0 left-0 right-0 text-center text-xs py-0.5 ${options.selectedPages.includes(preview.pageNum)
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-700 text-gray-400'
                                    }`}>
                                    {preview.pageNum}
                                </div>
                                {!options.selectedPages.includes(preview.pageNum) && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                        <span className="text-red-400 text-xl">✕</span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <button
                                key={page}
                                onClick={() => togglePage(page)}
                                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${options.selectedPages.includes(page)
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                    }`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                )}

                <p className="text-xs text-gray-500">
                    선택: {options.selectedPages.length}개 / 제외: {totalPages - options.selectedPages.length}개
                </p>
                <p className="text-xs text-gray-400 italic">
                    ℹ️ 클릭하여 포함/제외 토글
                </p>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────
// 토글 옵션 컴포넌트
// ─────────────────────────────────────────────────────────────────
interface ToggleOptionProps {
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

const ToggleOption: React.FC<ToggleOptionProps> = ({
    label,
    description,
    checked,
    onChange
}) => {
    return (
        <div
            onClick={() => onChange(!checked)}
            className="flex items-center justify-between p-3 bg-[#0a0f1a] rounded-lg border border-white/5 cursor-pointer hover:border-white/10 transition-colors"
        >
            <div>
                <p className="text-white text-sm font-medium">{label}</p>
                <p className="text-gray-500 text-xs">{description}</p>
            </div>
            <div
                className={`w-12 h-6 rounded-full relative transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-700'
                    }`}
            >
                <div
                    className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${checked ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                />
            </div>
        </div>
    );
};

export default MpsEditor;
