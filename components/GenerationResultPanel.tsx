import React, { useState, useCallback } from 'react';
import { DownloadIcon, RegenerateIcon } from './Icons';
import { saveToGoogleDrive } from '../services/googleDriveService';

interface GenerationResultPanelProps {
    isLoading: boolean;
    error: string | null;
    generatedImages: string[] | null;
    selectedImage: string | null;
    onSelectImage: (image: string) => void;
    onRegenerate: () => void;
    canRegenerate: boolean;
}

const GenerationResultPanel: React.FC<GenerationResultPanelProps> = ({
    isLoading,
    error,
    generatedImages,
    selectedImage,
    onSelectImage,
    onRegenerate,
    canRegenerate,
}) => {
    const [isSaving, setIsSaving] = useState(false);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [savingProgress, setSavingProgress] = useState<{ current: number; total: number } | null>(null);

    // 다중 선택 토글
    const toggleSelection = useCallback((index: number) => {
        setSelectedIndices(prev => {
            const newSet = new Set(prev);
            if (newSet.has(index)) {
                newSet.delete(index);
            } else {
                newSet.add(index);
            }
            return newSet;
        });
    }, []);

    // 전체 선택/해제
    const toggleSelectAll = useCallback(() => {
        if (!generatedImages) return;
        if (selectedIndices.size === generatedImages.length) {
            setSelectedIndices(new Set());
        } else {
            setSelectedIndices(new Set(generatedImages.map((_, i) => i)));
        }
    }, [generatedImages, selectedIndices.size]);

    // 단일 이미지 저장
    const handleSave = async () => {
        if (!selectedImage) return;

        // 1. Local download
        const link = document.createElement('a');
        link.href = selectedImage;
        link.download = `djd-image-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 2. Google Drive upload
        setIsSaving(true);
        try {
            await saveToGoogleDrive(selectedImage);
            alert('로컬에 다운로드되었으며 Google Drive에 성공적으로 저장되었습니다!');
        } catch (error: any) {
            alert(`로컬 다운로드는 완료되었지만, Google Drive 저장에 실패했습니다: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // 선택된 이미지들 일괄 저장
    const handleBatchSave = async () => {
        if (!generatedImages || selectedIndices.size === 0) return;

        const indicesToSave = Array.from(selectedIndices).sort((a, b) => a - b);
        const timestamp = Date.now();

        setIsSaving(true);
        setSavingProgress({ current: 0, total: indicesToSave.length });

        let successCount = 0;
        let driveSuccessCount = 0;

        for (let i = 0; i < indicesToSave.length; i++) {
            const idx = indicesToSave[i];
            const imageUrl = generatedImages[idx];
            setSavingProgress({ current: i + 1, total: indicesToSave.length });

            try {
                // 로컬 다운로드
                const link = document.createElement('a');
                link.href = imageUrl;
                link.download = `djd-image-${timestamp}-${idx + 1}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                successCount++;

                // Google Drive 저장
                try {
                    await saveToGoogleDrive(imageUrl);
                    driveSuccessCount++;
                } catch (driveErr) {
                    console.error(`[BatchSave] Google Drive 저장 실패 (${idx + 1}):`, driveErr);
                }

                // 다음 다운로드 전 약간의 딜레이 (브라우저 제한 방지)
                if (i < indicesToSave.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 300));
                }
            } catch (err) {
                console.error(`[BatchSave] 저장 실패 (${idx + 1}):`, err);
            }
        }

        setIsSaving(false);
        setSavingProgress(null);
        setSelectedIndices(new Set()); // 선택 초기화

        if (driveSuccessCount === successCount) {
            alert(`✅ ${successCount}개 이미지 저장 완료! (로컬 + Google Drive)`);
        } else if (driveSuccessCount > 0) {
            alert(`✅ 로컬 ${successCount}개, Google Drive ${driveSuccessCount}개 저장됨`);
        } else {
            alert(`⚠️ 로컬 ${successCount}개 저장됨 (Google Drive 저장 실패)`);
        }
    };

    // 여러 이미지가 있는지 확인
    const hasMultipleImages = generatedImages && generatedImages.length > 1;

    return (
        <div className="flex flex-col gap-4 p-6 bg-gray-800/50 rounded-xl shadow-lg min-h-[500px] justify-between">
            <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-semibold text-gray-300">결과</h2>
                    {hasMultipleImages && (
                        <span className="px-2 py-1 bg-purple-600/40 text-purple-200 text-xs rounded-full">
                            {generatedImages.length}장 생성됨
                        </span>
                    )}
                </div>

                {/* 메인 이미지 뷰어 */}
                <div className="w-full aspect-square bg-gray-900/50 rounded-lg flex items-center justify-center relative overflow-hidden">
                    {isLoading && (
                        <div className="flex flex-col items-center text-gray-400">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mb-2"></div>
                            <span>생성 중입니다. 잠시만 기다려주세요...</span>
                        </div>
                    )}
                    {error && <div className="text-red-400 p-4 text-center">{error}</div>}
                    {selectedImage && !isLoading && (
                        <img src={selectedImage} alt="선택된 생성 이미지" className="w-full h-full object-contain" />
                    )}
                    {!selectedImage && !isLoading && !error && (
                        <div className="text-center text-gray-500">
                            <p>생성된 이미지가 여기에 표시됩니다</p>
                        </div>
                    )}
                </div>

                {/* 여러 이미지 썸네일 그리드 (2장 이상일 때만 표시) */}
                {hasMultipleImages && !isLoading && (
                    <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-gray-400">이미지 선택</p>
                            <button
                                onClick={toggleSelectAll}
                                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                                {selectedIndices.size === generatedImages.length ? '전체 해제' : '전체 선택'}
                            </button>
                        </div>
                        <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
                            {generatedImages.map((img, idx) => (
                                <div
                                    key={idx}
                                    className="relative group cursor-pointer"
                                >
                                    {/* 체크박스 */}
                                    <div
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleSelection(idx);
                                        }}
                                        className={`absolute top-1 left-1 z-20 w-5 h-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer
                                            ${selectedIndices.has(idx)
                                                ? 'bg-green-500 border-green-400'
                                                : 'bg-black/50 border-white/50 hover:border-green-400'
                                            }`}
                                    >
                                        {selectedIndices.has(idx) && (
                                            <span className="text-white text-xs">✓</span>
                                        )}
                                    </div>

                                    {/* 썸네일 이미지 */}
                                    <div
                                        onClick={() => onSelectImage(img)}
                                        className={`aspect-square rounded-lg overflow-hidden border-2 transition-all
                                            ${selectedImage === img
                                                ? 'border-indigo-500 ring-2 ring-indigo-400/50'
                                                : 'border-gray-700 hover:border-gray-500'
                                            }`}
                                    >
                                        <img
                                            src={img}
                                            alt={`생성 이미지 ${idx + 1}`}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    {/* 이미지 번호 */}
                                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/70 text-white text-xs rounded">
                                        {idx + 1}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* 버튼 영역 */}
            <div className="w-full space-y-3">
                {/* 일괄 저장 버튼 (여러 이미지 선택 시) */}
                {hasMultipleImages && selectedIndices.size > 0 && !isLoading && (
                    <button
                        onClick={handleBatchSave}
                        disabled={isSaving}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold py-2.5 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {isSaving && savingProgress ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                <span>저장 중... ({savingProgress.current}/{savingProgress.total})</span>
                            </>
                        ) : (
                            <>
                                <DownloadIcon className="w-5 h-5" />
                                <span>선택된 {selectedIndices.size}장 일괄 저장</span>
                            </>
                        )}
                    </button>
                )}

                {/* 기존 단일 저장/재생성 버튼 */}
                {selectedImage && !isLoading && (
                    <div className="w-full grid grid-cols-2 gap-3">
                        <button
                            onClick={onRegenerate}
                            disabled={isLoading || !canRegenerate}
                            className="flex items-center justify-center gap-2 bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
                        >
                            <RegenerateIcon className="w-5 h-5" />
                            <span>재생성</span>
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-wait"
                        >
                            {isSaving && !savingProgress ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <DownloadIcon className="w-5 h-5" />
                            )}
                            <span>{isSaving && !savingProgress ? '저장 중...' : '저장'}</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GenerationResultPanel;