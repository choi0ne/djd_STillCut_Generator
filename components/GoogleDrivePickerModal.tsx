import React, { useState, useEffect } from 'react';
import { listImagesFromGoogleDrive } from '../services/googleDriveService';

interface GoogleDriveFile {
    id: string;
    mimeType: string;
    name: string;
    thumbnailLink?: string;
}

interface GoogleDrivePickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (fileId: string, mimeType: string, fileName: string) => void;
}

const GoogleDrivePickerModal: React.FC<GoogleDrivePickerModalProps> = ({ isOpen, onClose, onSelect }) => {
    const [driveFiles, setDriveFiles] = useState<GoogleDriveFile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadDriveFiles();
        }
    }, [isOpen]);

    const loadDriveFiles = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const files = await listImagesFromGoogleDrive();
            setDriveFiles(files);
        } catch (err: any) {
            setError(err.message || 'Google Drive 파일을 불러올 수 없습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-[#1a1f2e] border border-blue-500/50 rounded-2xl shadow-2xl w-[90vw] max-w-4xl max-h-[80vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 모달 헤더 */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">☁️</span>
                        <div>
                            <h3 className="text-lg font-semibold text-white">Google Drive</h3>
                            <p className="text-xs text-gray-400">이미지를 선택하세요</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                        ✕
                    </button>
                </div>

                {/* 이미지 그리드 */}
                <div className="p-4 overflow-y-auto flex-grow">
                    {isLoading ? (
                        <div className="flex h-64 items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    ) : error ? (
                        <div className="flex h-64 items-center justify-center flex-col gap-2">
                            <p className="text-red-400">{error}</p>
                            <button
                                onClick={loadDriveFiles}
                                className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30"
                            >
                                다시 시도
                            </button>
                        </div>
                    ) : driveFiles.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3">
                            {driveFiles.map((file) => (
                                <div
                                    key={file.id}
                                    onClick={() => onSelect(file.id, file.mimeType, file.name)}
                                    className="group relative aspect-square bg-gray-800 rounded-xl cursor-pointer hover:ring-2 hover:ring-blue-500 hover:scale-105 overflow-hidden transition-all duration-200 shadow-lg"
                                >
                                    {file.thumbnailLink ? (
                                        <img src={file.thumbnailLink} alt={file.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center p-2">
                                            <span className="text-3xl mb-1">🖼️</span>
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
                <div className="flex items-center justify-between p-4 border-t border-white/10 bg-black/20 shrink-0">
                    <p className="text-xs text-gray-500">{driveFiles.length}개의 이미지</p>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg transition-colors"
                    >
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GoogleDrivePickerModal;
