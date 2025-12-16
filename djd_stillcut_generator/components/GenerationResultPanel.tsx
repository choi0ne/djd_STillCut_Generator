import React, { useState } from 'react';
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

    return (
        <div className="flex flex-col gap-4 p-6 bg-gray-800/50 rounded-xl shadow-lg min-h-[500px] justify-between">
            <div>
                <h2 className="text-xl font-semibold text-gray-300 self-start mb-4">결과</h2>
                <div className="w-full aspect-square bg-gray-900/50 rounded-lg flex items-center justify-center relative overflow-hidden">
                    {isLoading && (
                        <div className="flex flex-col items-center text-gray-400">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mb-2"></div>
                            <span>생성 중입니다. 잠시만 기다려주세요...</span>
                        </div>
                    )}
                    {error && <div className="text-red-400 p-4 text-center">{error}</div>}
                    {selectedImage && !isLoading && <img src={selectedImage} alt="선택된 생성 이미지" className="w-full h-full object-contain" />}
                    {!selectedImage && !isLoading && !error && (
                        <div className="text-center text-gray-500">
                            <p>생성된 이미지가 여기에 표시됩니다</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="w-full space-y-4">
                {generatedImages && generatedImages.length > 0 && !isLoading && (
                    <div>
                        <h3 className="text-md font-semibold text-gray-400 mb-2">마음에 드는 결과물을 선택하세요</h3>
                        <div className="grid grid-cols-4 gap-3">
                            {generatedImages.map((imgSrc, index) => (
                                <button
                                    key={index}
                                    className={`relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all duration-200 focus:outline-none ${selectedImage === imgSrc ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-gray-800' : 'opacity-70 hover:opacity-100'}`}
                                    onClick={() => onSelectImage(imgSrc)}
                                    aria-label={`생성된 이미지 ${index + 1} 선택`}
                                >
                                    <img src={imgSrc} alt={`생성 옵션 ${index + 1}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {selectedImage && !isLoading && (
                    <div className="w-full grid grid-cols-2 gap-3 pt-2">
                        <button onClick={onRegenerate} disabled={isLoading || !canRegenerate} className="flex items-center justify-center gap-2 bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50">
                            <RegenerateIcon className="w-5 h-5" />
                            <span>재생성</span>
                        </button>
                        <button onClick={handleSave} disabled={isSaving} className="flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-wait">
                            {isSaving ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <DownloadIcon className="w-5 h-5" />
                            )}
                            <span>{isSaving ? '저장 중...' : '저장'}</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GenerationResultPanel;