import React, { useState, useCallback, useRef, useEffect } from 'react';
import * as pdfjs from 'pdfjs-dist';
import {
    detectFileType,
    processHybrid,
    type ProcessingMode,
    type MpsImageOptions,
    type MpsPdfOptions,
    type FileType,
    type MpsResult
} from '../services/mpsService';
import { saveToGoogleDrive, downloadImageFromGoogleDrive } from '../services/googleDriveService';
import GoogleDrivePickerModal, { type SelectedDriveFile } from './GoogleDrivePickerModal';

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
    const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
    const [isLoadingDrive, setIsLoadingDrive] = useState(false);

    // 다중 파일 일괄 처리 상태
    const [isBatchProcessing, setIsBatchProcessing] = useState(false);
    const [batchProgress, setBatchProgress] = useState<{ current: number; total: number; fileName: string } | null>(null);
    const [batchResults, setBatchResults] = useState<Array<{ fileName: string; success: boolean; error?: string }>>([]);
    const [pendingBatchFiles, setPendingBatchFiles] = useState<SelectedDriveFile[]>([]); // 대기 중인 파일 큐;
    const [pendingLocalFiles, setPendingLocalFiles] = useState<File[]>([]); // 로컬 파일 큐 (실제 File 객체)

    // PDF 미리보기 상태
    const [pdfPagePreviews, setPdfPagePreviews] = useState<PdfPagePreview[]>([]);
    const [isParsing, setIsParsing] = useState(false);

    // 처리 모드 상태 (하이브리드 전략)
    const [processingMode, setProcessingMode] = useState<ProcessingMode>('auto');

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
        const files = e.dataTransfer.files;
        if (!files || files.length === 0) return;

        // 단일 파일인 경우 기존 로직 사용
        if (files.length === 1) {
            handleFileUpload(files[0]);
            return;
        }

        // 다중 파일: 큐에 저장하고 옵션 선택 대기
        const driveStyleFiles: SelectedDriveFile[] = [];
        const localFiles: File[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            driveStyleFiles.push({
                fileId: `local-${Date.now()}-${i}`,
                fileName: file.name,
                mimeType: file.type
            });
            localFiles.push(file);
        }

        setPendingBatchFiles(driveStyleFiles);
        setPendingLocalFiles(localFiles);
        setBatchResults([]);
        setError(null);
        setStatusMessage(`📦 ${files.length}개 파일 선택됨. 옵션 설정 후 "일괄 처리 시작" 버튼을 클릭하세요.`);
    }, [handleFileUpload]);

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        // 단일 파일인 경우 기존 로직 사용
        if (files.length === 1) {
            handleFileUpload(files[0]);
            return;
        }

        // 다중 파일: 큐에 저장하고 옵션 선택 대기
        const driveStyleFiles: SelectedDriveFile[] = [];
        const localFiles: File[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            driveStyleFiles.push({
                fileId: `local-${Date.now()}-${i}`, // 로컬 파일용 임시 ID
                fileName: file.name,
                mimeType: file.type
            });
            localFiles.push(file);
        }

        setPendingBatchFiles(driveStyleFiles);
        setPendingLocalFiles(localFiles);
        setBatchResults([]);
        setError(null);
        setStatusMessage(`📦 ${files.length}개 파일 선택됨. 옵션 설정 후 "일괄 처리 시작" 버튼을 클릭하세요.`);

        // input 초기화 (같은 파일 다시 선택 가능)
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }, [handleFileUpload]);

    // 구글 드라이브 모달 열기
    const handleOpenGoogleDrive = () => {
        setIsDriveModalOpen(true);
    };

    // 구글 드라이브에서 선택한 파일들 큐에 저장 (옵션 선택 후 실행)
    const handleSelectDriveFiles = async (files: SelectedDriveFile[]) => {
        setIsDriveModalOpen(false);
        if (files.length === 0) return;

        // 단일 파일인 경우 기존 로직 사용
        if (files.length === 1) {
            setIsLoadingDrive(true);
            try {
                const firstFile = files[0];
                const imageData = await downloadImageFromGoogleDrive(firstFile.fileId, firstFile.mimeType);
                const response = await fetch(imageData.base64);
                const blob = await response.blob();
                const file = new File([blob], firstFile.fileName, { type: firstFile.mimeType });
                handleFileUpload(file);
            } catch (error: any) {
                setError(error.message || '파일을 다운로드할 수 없습니다.');
            } finally {
                setIsLoadingDrive(false);
            }
            return;
        }

        // 다중 파일: 큐에 저장하고 옵션 선택 대기
        setPendingBatchFiles(files);
        setBatchResults([]);
        setError(null);
        setStatusMessage(`📦 ${files.length}개 파일 선택됨. 옵션 설정 후 "일괄 처리 시작" 버튼을 클릭하세요.`);
    };

    // 일괄 처리 실행 (큐에 있는 파일들 순차 처리 - Google Drive 파일용)
    const handleStartBatchProcessing = async () => {
        // 로컬 파일이 있으면 로컬 처리 실행
        if (pendingLocalFiles.length > 0) {
            await handleStartLocalBatchProcessing();
            return;
        }

        if (pendingBatchFiles.length === 0) return;

        setIsBatchProcessing(true);
        setBatchResults([]);
        setError(null);

        const results: Array<{ fileName: string; success: boolean; error?: string }> = [];
        const timestamp = Date.now();
        const filesToProcess = [...pendingBatchFiles];

        // 큐 초기화 (처리 시작 시)
        setPendingBatchFiles([]);

        for (let i = 0; i < filesToProcess.length; i++) {
            const driveFile = filesToProcess[i];
            setBatchProgress({ current: i + 1, total: filesToProcess.length, fileName: driveFile.fileName });

            try {
                // 1. 파일 다운로드
                setStatusMessage(`📥 [${i + 1}/${filesToProcess.length}] 다운로드: ${driveFile.fileName}`);
                const imageData = await downloadImageFromGoogleDrive(driveFile.fileId, driveFile.mimeType);
                const response = await fetch(imageData.base64);
                const blob = await response.blob();
                const localFile = new File([blob], driveFile.fileName, { type: driveFile.mimeType });
                const localFileType = detectFileType(localFile);

                // 2. 처리 실행 (선택된 옵션 사용)
                setStatusMessage(`⚙️ [${i + 1}/${filesToProcess.length}] 처리 중: ${driveFile.fileName}`);
                const processResult = await processHybrid(
                    localFile,
                    localFileType === 'image' ? imageOptions : pdfOptions,
                    localFileType,
                    processingMode,
                    [] // PDF 미리보기는 일괄 처리에서는 생략
                );

                if (!processResult.success || !processResult.outputFiles) {
                    throw new Error(processResult.error || '처리 실패');
                }

                // 3. 저장 (로컬 + Google Drive)
                setStatusMessage(`💾 [${i + 1}/${filesToProcess.length}] 저장 중: ${driveFile.fileName}`);

                // 출력 포맷에 따른 저장 (both면 webp+jpg 모두)
                const formatsToSave: ('webp' | 'jpg')[] =
                    imageOptions.outputFormat === 'both' ? ['webp', 'jpg'] : [imageOptions.outputFormat === 'webp' ? 'webp' : 'jpg'];

                for (let j = 0; j < processResult.outputFiles.length; j++) {
                    const fileUrl = processResult.outputFiles[j];
                    const baseName = driveFile.fileName.replace(/\.[^.]+$/, '');

                    for (const ext of formatsToSave) {
                        const saveName = processResult.outputFiles.length > 1
                            ? `${baseName}-${timestamp}-${j + 1}.${ext}`
                            : `${baseName}-${timestamp}.${ext}`;

                        const saveResponse = await fetch(fileUrl);
                        const saveBlob = await saveResponse.blob();
                        const blobUrl = URL.createObjectURL(saveBlob);

                        // 로컬 다운로드
                        const link = document.createElement('a');
                        link.href = blobUrl;
                        link.download = saveName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);

                        // Google Drive 저장
                        try {
                            await saveToGoogleDrive(blobUrl);
                        } catch (driveErr) {
                            console.error(`[MPS Batch] Drive 저장 실패: ${saveName}`, driveErr);
                        }

                        URL.revokeObjectURL(blobUrl);
                    }
                }

                results.push({ fileName: driveFile.fileName, success: true });

            } catch (err: any) {
                console.error(`[MPS Batch] 처리 실패: ${driveFile.fileName}`, err);
                results.push({ fileName: driveFile.fileName, success: false, error: err.message });
            }
        }

        // 결과 요약
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        setBatchResults(results);
        setBatchProgress(null);
        setIsBatchProcessing(false);

        if (failCount === 0) {
            setStatusMessage(`✅ 일괄 처리 완료! ${successCount}개 파일 저장됨`);
        } else {
            setStatusMessage(`⚠️ 일괄 처리 완료: 성공 ${successCount}개, 실패 ${failCount}개`);
        }
    };

    // 일괄 처리 실행 (로컬 파일용 - 다운로드 없이 바로 처리)
    const handleStartLocalBatchProcessing = async () => {
        if (pendingLocalFiles.length === 0) return;

        setIsBatchProcessing(true);
        setBatchResults([]);
        setError(null);

        const results: Array<{ fileName: string; success: boolean; error?: string }> = [];
        const timestamp = Date.now();
        const filesToProcess = [...pendingLocalFiles];

        // 큐 초기화 (처리 시작 시)
        setPendingBatchFiles([]);
        setPendingLocalFiles([]);

        for (let i = 0; i < filesToProcess.length; i++) {
            const localFile = filesToProcess[i];
            const localFileType = detectFileType(localFile);
            setBatchProgress({ current: i + 1, total: filesToProcess.length, fileName: localFile.name });

            try {
                // 1. 처리 실행 (선택된 옵션 사용) - 다운로드 없이 바로 처리
                setStatusMessage(`⚙️ [${i + 1}/${filesToProcess.length}] 처리 중: ${localFile.name}`);
                const processResult = await processHybrid(
                    localFile,
                    localFileType === 'image' ? imageOptions : pdfOptions,
                    localFileType,
                    processingMode,
                    [] // PDF 미리보기는 일괄 처리에서는 생략
                );

                if (!processResult.success || !processResult.outputFiles) {
                    throw new Error(processResult.error || '처리 실패');
                }

                // 2. 저장 (로컬 + Google Drive)
                setStatusMessage(`💾 [${i + 1}/${filesToProcess.length}] 저장 중: ${localFile.name}`);

                // 출력 포맷에 따른 저장 (both면 webp+jpg 모두)
                const formatsToSave: ('webp' | 'jpg')[] =
                    imageOptions.outputFormat === 'both' ? ['webp', 'jpg'] : [imageOptions.outputFormat === 'webp' ? 'webp' : 'jpg'];

                for (let j = 0; j < processResult.outputFiles.length; j++) {
                    const fileUrl = processResult.outputFiles[j];
                    const baseName = localFile.name.replace(/\.[^.]+$/, '');

                    for (const ext of formatsToSave) {
                        const saveName = processResult.outputFiles.length > 1
                            ? `${baseName}-${timestamp}-${j + 1}.${ext}`
                            : `${baseName}-${timestamp}.${ext}`;

                        const saveResponse = await fetch(fileUrl);
                        const saveBlob = await saveResponse.blob();
                        const blobUrl = URL.createObjectURL(saveBlob);

                        // 로컬 다운로드
                        const link = document.createElement('a');
                        link.href = blobUrl;
                        link.download = saveName;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);

                        // Google Drive 저장
                        try {
                            await saveToGoogleDrive(blobUrl);
                        } catch (driveErr) {
                            console.error(`[MPS Batch] Drive 저장 실패: ${saveName}`, driveErr);
                        }

                        URL.revokeObjectURL(blobUrl);
                    }
                }

                results.push({ fileName: localFile.name, success: true });

            } catch (err: any) {
                console.error(`[MPS Batch] 처리 실패: ${localFile.name}`, err);
                results.push({ fileName: localFile.name, success: false, error: err.message });
            }
        }

        // 결과 요약
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        setBatchResults(results);
        setBatchProgress(null);
        setIsBatchProcessing(false);

        if (failCount === 0) {
            setStatusMessage(`✅ 일괄 처리 완료! ${successCount}개 파일 저장됨`);
        } else {
            setStatusMessage(`⚠️ 일괄 처리 완료: 성공 ${successCount}개, 실패 ${failCount}개`);
        }
    };

    // 대기 중인 파일 취소
    const handleCancelBatch = () => {
        setPendingBatchFiles([]);
        setPendingLocalFiles([]);
        setStatusMessage(null);
    };

    // 처리 실행
    const handleProcess = async () => {
        if (!uploadedFile) return;

        setIsProcessing(true);
        setError(null);
        setResult(null);

        const modeLabel = processingMode === 'auto' ? '🔄 Auto' : processingMode === 'backend' ? '☁️ Backend' : '💻 Client';
        setStatusMessage(`${modeLabel} 모드로 처리 중...`);

        try {
            // PDF 클라이언트 처리용 페이지 이미지 준비
            const pdfImages = pdfPagePreviews.map(p => p.imageUrl);

            const processResult = await processHybrid(
                uploadedFile,
                fileType === 'image' ? imageOptions : pdfOptions,
                fileType,
                processingMode,
                pdfImages
            );

            setResult(processResult);

            // 결과 메시지 생성
            let message = '';
            if (processResult.success) {
                const location = processResult.processedBy === 'backend' ? '☁️ 백엔드' : '💻 클라이언트';
                const fallback = (processResult as any).fallbackUsed ? ' (폴백)' : '';
                message = `✅ ${location}${fallback}에서 처리 완료! 출력: ${processResult.outputFiles?.length || 0}개 파일`;
            } else {
                message = `❌ 처리 실패: ${processResult.error}`;
            }
            setStatusMessage(message);
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

    // 저장 기능 (로컬 + Google Drive) - 모든 출력 파일 저장
    const handleSave = async () => {
        if (!result || !result.success || !result.outputFiles || result.outputFiles.length === 0) return;

        setIsSaving(true);
        let savedCount = 0;
        let driveSuccessCount = 0;

        try {
            const outputFormat = fileType === 'pdf' ? pdfOptions.outputFormat : imageOptions.outputFormat;
            const timestamp = Date.now();

            for (let i = 0; i < result.outputFiles.length; i++) {
                const fileUrl = result.outputFiles[i];

                // 파일 확장자 결정
                let extension = 'png';
                if (outputFormat === 'webp') extension = 'webp';
                else if (outputFormat === 'jpg') extension = 'jpg';
                else if (fileUrl.includes('.webp')) extension = 'webp';
                else if (fileUrl.includes('.jpg') || fileUrl.includes('.jpeg')) extension = 'jpg';

                const fileName = result.outputFiles.length > 1
                    ? `mps-${timestamp}-${i + 1}.${extension}`
                    : `mps-${timestamp}.${extension}`;

                // Blob으로 변환
                const response = await fetch(fileUrl);
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);

                // 로컬 다운로드
                const link = document.createElement('a');
                link.href = blobUrl;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                savedCount++;

                // Google Drive 저장
                try {
                    await saveToGoogleDrive(blobUrl);
                    driveSuccessCount++;
                } catch (driveErr) {
                    console.error(`[MPS] Google Drive 저장 실패 (파일 ${i + 1}):`, driveErr);
                }

                URL.revokeObjectURL(blobUrl);

                // 진행 상태 업데이트 (여러 파일일 때)
                if (result.outputFiles.length > 1) {
                    setStatusMessage(`💾 저장 중... ${i + 1}/${result.outputFiles.length}`);
                }
            }

            // 최종 상태 메시지
            if (driveSuccessCount === savedCount) {
                setStatusMessage(`✅ 저장 완료! ${savedCount}개 파일 (로컬 + Google Drive)`);
            } else if (driveSuccessCount > 0) {
                setStatusMessage(`✅ 저장 완료! 로컬 ${savedCount}개, Drive ${driveSuccessCount}개`);
            } else {
                setStatusMessage(`⚠️ 로컬 ${savedCount}개 저장됨 (Drive 저장 실패)`);
            }
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
                        multiple
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
                            <p className="text-gray-500 text-xs">Ctrl+V로 붙여넣기 가능 | 여러 파일 동시 선택 가능</p>
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

            {/* 처리 모드 선택 */}
            <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
                <h3 className="text-sm font-medium text-gray-300 border-b border-white/10 pb-2 mb-4">
                    ⚙️ 처리 모드
                </h3>
                <div className="flex gap-2">
                    <button
                        onClick={() => setProcessingMode('auto')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${processingMode === 'auto'
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        <span>🔄</span> Auto
                    </button>
                    <button
                        onClick={() => setProcessingMode('backend')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${processingMode === 'backend'
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        <span>☁️</span> Backend
                    </button>
                    <button
                        onClick={() => setProcessingMode('client')}
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${processingMode === 'client'
                            ? 'bg-green-600 text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        <span>💻</span> Client
                    </button>
                </div>
                <p className="mt-3 text-xs text-gray-500">
                    {processingMode === 'auto' && '백엔드 우선 처리, 실패 시 클라이언트 폴백'}
                    {processingMode === 'backend' && '고품질 워터마크 제거 & PDF 변환 (pytesseract, pdf2image)'}
                    {processingMode === 'client' && '빠른 처리, 서버 부하 0 (Canvas API)'}
                </p>
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

            {/* 이미지 옵션 (단일 이미지 또는 일괄 처리 대기 중) */}
            {(fileType === 'image' || pendingBatchFiles.length > 0 || pendingLocalFiles.length > 0) && (
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

            {/* 대기 중인 파일 목록 (일괄 처리 대기) */}
            {pendingBatchFiles.length > 0 && !isBatchProcessing && (
                <div className="bg-[#111827] rounded-xl border border-purple-500/30 p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-purple-400">
                            📦 일괄 처리 대기 ({pendingBatchFiles.length}개 파일)
                        </h3>
                        <button
                            onClick={handleCancelBatch}
                            className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                        >
                            전체 취소
                        </button>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto mb-4">
                        {pendingBatchFiles.map((file, idx) => (
                            <div key={idx} className="text-xs flex items-center justify-between text-gray-300 bg-black/20 px-2 py-1 rounded">
                                <span className="truncate flex-1">{idx + 1}. {file.fileName}</span>
                                <button
                                    onClick={() => setPendingBatchFiles(prev => prev.filter((_, i) => i !== idx))}
                                    className="text-gray-500 hover:text-red-400 ml-2"
                                >
                                    ✕
                                </button>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                        ⬆️ 위의 이미지 옵션을 설정한 후 아래 버튼을 클릭하세요
                    </p>
                    <button
                        onClick={handleStartBatchProcessing}
                        className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <span>🚀</span>
                        <span>일괄 처리 시작</span>
                    </button>
                </div>
            )}

            {/* 일괄 처리 진행 상태 */}
            {isBatchProcessing && batchProgress && (
                <div className="bg-[#111827] rounded-xl border border-blue-500/30 p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-blue-400">📦 일괄 처리 진행 중</h3>
                        <span className="text-sm text-gray-400">
                            {batchProgress.current} / {batchProgress.total}
                        </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                        <div
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-400 truncate">
                        🔄 {batchProgress.fileName}
                    </p>
                </div>
            )}

            {/* 일괄 처리 결과 요약 */}
            {!isBatchProcessing && batchResults.length > 0 && (
                <div className="bg-[#111827] rounded-xl border border-white/5 p-5">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-gray-300">📋 일괄 처리 결과</h3>
                        <button
                            onClick={() => setBatchResults([])}
                            className="text-xs text-gray-500 hover:text-gray-300"
                        >
                            닫기
                        </button>
                    </div>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                        {batchResults.map((r, idx) => (
                            <div key={idx} className={`text-xs flex items-center gap-2 ${r.success ? 'text-green-400' : 'text-red-400'}`}>
                                <span>{r.success ? '✅' : '❌'}</span>
                                <span className="truncate">{r.fileName}</span>
                                {r.error && <span className="text-gray-500">({r.error})</span>}
                            </div>
                        ))}
                    </div>
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

            {/* Google Drive 파일 선택 모달 */}
            <GoogleDrivePickerModal
                isOpen={isDriveModalOpen}
                onClose={() => setIsDriveModalOpen(false)}
                onSelect={handleSelectDriveFiles}
                multiSelect={true}
            />
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
