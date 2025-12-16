import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ImageFile, StoredPrompt } from '../types';
import Panel from './common/Panel';
import ImageDropzone from './ImageDropzone';
import PromptLibraryModal from './PromptLibraryModal';
import { generatePromptFromImage, generateJsonFromImage } from '../services/geminiService';
import useLocalStorage from '../hooks/useLocalStorage';
import { XIcon, SparklesIcon, ClipboardIcon, LibraryIcon, PlusIcon, EditIcon } from './Icons';
import type { ImageProvider } from '../services/types';
import { listImagesFromGoogleDrive, downloadImageFromGoogleDrive } from '../services/googleDriveService';

interface ImageToPromptEditorProps {
    isApiKeyReady: boolean;
    openSettings: () => void;
    geminiApiKey: string;
    openaiApiKey: string;
    selectedProvider: ImageProvider;
    setSelectedProvider: (provider: ImageProvider) => void;
}

const ImageToPromptEditor: React.FC<ImageToPromptEditorProps> = ({
    isApiKeyReady,
    openSettings,
    selectedProvider,
    setSelectedProvider
}) => {
    const [image, setImage] = useState<ImageFile | null>(null);
    const [generatedPrompt, setGeneratedPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);
    const [isLibraryOpen, setIsLibraryOpen] = useState(false);
    const [libraryInitialText, setLibraryInitialText] = useState<string | null>(null);
    const [outputMode, setOutputMode] = useState<'text' | 'json'>('text');
    const [isEditing, setIsEditing] = useState(false);

    // Google Drive 상태
    const [showDriveFiles, setShowDriveFiles] = useState(false);
    const [driveFiles, setDriveFiles] = useState<any[]>([]);
    const [isLoadingDrive, setIsLoadingDrive] = useState(false);

    const [storedPrompts, setStoredPrompts] = useLocalStorage<StoredPrompt[]>('generatedPromptsLibrary', []);

    const handleImageUpload = useCallback((file: ImageFile) => {
        setImage(file);
        setGeneratedPrompt('');
        setError(null);
    }, []);

    // 클립보드 붙여넣기 (Ctrl+V) 지원
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    // 이미지 발견 즉시 기본 동작 방지
                    e.preventDefault();
                    e.stopPropagation();

                    const file = items[i].getAsFile();
                    if (file) {
                        // File을 ImageFile 형식으로 변환
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            if (typeof event.target?.result === 'string') {
                                handleImageUpload({
                                    base64: event.target.result,
                                    mimeType: file.type
                                });
                            }
                        };
                        reader.readAsDataURL(file);
                        break;
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => {
            window.removeEventListener('paste', handlePaste);
        };
    }, [handleImageUpload]);

    // Google Drive에서 이미지 가져오기
    const handleOpenGoogleDrive = async () => {
        setIsLoadingDrive(true);
        try {
            const files = await listImagesFromGoogleDrive();
            setDriveFiles(files);
            setShowDriveFiles(true);
        } catch (err: any) {
            setError(err.message || 'Google Drive 파일을 불러올 수 없습니다.');
        } finally {
            setIsLoadingDrive(false);
        }
    };

    const handleSelectDriveFile = async (fileId: string, mimeType: string, fileName: string) => {
        setIsLoadingDrive(true);
        try {
            const imageData = await downloadImageFromGoogleDrive(fileId, mimeType);
            handleImageUpload({
                base64: imageData.base64,
                mimeType: mimeType,
            });
            setShowDriveFiles(false);
        } catch (err: any) {
            setError(err.message || '파일을 다운로드할 수 없습니다.');
        } finally {
            setIsLoadingDrive(false);
        }
    };

    const clearImage = () => {
        setImage(null);
        setGeneratedPrompt('');
        setError(null);
    };

    const handleAddPrompt = (title: string, text: string) => {
        if (title.trim() && text.trim()) {
            const newPrompt = { id: uuidv4(), title, text };
            setStoredPrompts(prev => [newPrompt, ...prev]);
        }
    };

    const handleUpdatePrompt = (id: string, title: string, text: string) => {
        setStoredPrompts(prompts => prompts.map(p => p.id === id ? { ...p, title, text } : p));
    };

    const handleDeletePrompt = (id: string) => {
        setStoredPrompts(prompts => prompts.filter(p => p.id !== id));
    };

    const handleUsePrompt = (prompts: StoredPrompt[]) => {
        if (prompts.length > 0) {
            const combinedText = prompts.map(p => p.text).join('\n\n---\n\n');
            navigator.clipboard.writeText(combinedText);
            alert(`${prompts.length}개의 프롬프트를 클립보드에 복사했습니다.`);
        }
        setIsLibraryOpen(false);
    };

    const handleImportPrompts = (importedPrompts: StoredPrompt[]) => {
        setStoredPrompts(currentPrompts => {
            const currentIds = new Set(currentPrompts.map(p => p.id));
            const newPrompts = importedPrompts.filter(p => !currentIds.has(p.id));
            if (newPrompts.length === 0) {
                alert("새로운 프롬프트가 없습니다.");
                return currentPrompts;
            }
            alert(`${newPrompts.length}개의 새로운 프롬프트를 추가했습니다.`);
            return [...newPrompts, ...currentPrompts];
        });
    };

    const handleSaveGeneratedPrompt = () => {
        if (!generatedPrompt.trim()) {
            alert("저장할 프롬프트가 없습니다.");
            return;
        }
        setLibraryInitialText(generatedPrompt);
        setIsLibraryOpen(true);
    };

    const handleCloseLibrary = () => {
        setIsLibraryOpen(false);
        setLibraryInitialText(null);
    };

    const handleGenerate = async () => {
        if (!isApiKeyReady) {
            openSettings();
            return;
        }
        if (!image) {
            setError('먼저 이미지를 업로드해주세요.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedPrompt('');

        try {
            // TODO: Use selectedProvider to choose between Gemini and OpenAI
            const promptText = outputMode === 'json'
                ? await generateJsonFromImage(image)
                : await generatePromptFromImage(image);
            setGeneratedPrompt(promptText);
        } catch (e: any) {
            setError(e.message || '생성 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        if (!generatedPrompt) return;
        navigator.clipboard.writeText(generatedPrompt).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <Panel>
                    <div className="flex flex-col gap-6 flex-grow">
                        {/* 제목 + AI 제공자 선택 */}
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-300">1. 이미지 업로드</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setSelectedProvider('gemini')}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedProvider === 'gemini'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                        }`}
                                >
                                    🔷 Gemini
                                </button>
                                <button
                                    onClick={() => setSelectedProvider('openai')}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedProvider === 'openai'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                        }`}
                                >
                                    💚 ChatGPT
                                </button>
                            </div>
                        </div>
                        <p className="text-sm text-gray-400 -mt-4">
                            내용을 분석하여 프롬프트를 생성할 이미지를 업로드하세요.
                        </p>

                        {/* 이미지 업로드 영역 */}
                        <div className="flex flex-col flex-grow">
                            {image ? (
                                <div className="relative group h-full min-h-64 rounded-lg overflow-hidden">
                                    <img src={image.base64} alt="프롬프트 생성용 이미지" className="w-full h-full object-contain" />
                                    <button
                                        onClick={clearImage}
                                        className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 hover:bg-black/80 transition-opacity"
                                        title="이미지 제거"
                                        aria-label="이미지 제거"
                                    >
                                        <XIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="h-full min-h-48">
                                        <ImageDropzone onImageUpload={handleImageUpload} label="분석할 이미지 (PNG, JPG) - Ctrl+V 붙여넣기 지원" showDriveButton={false} />
                                    </div>
                                    <button
                                        onClick={handleOpenGoogleDrive}
                                        disabled={isLoadingDrive}
                                        className="w-full py-2 bg-blue-600/20 text-blue-300 text-sm rounded-lg hover:bg-blue-600/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        <span>☁️</span>
                                        <span>{isLoadingDrive ? '로딩...' : 'Google Drive에서 가져오기'}</span>
                                    </button>

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
                                                            <p className="text-xs text-gray-400">이미지를 선택하세요</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => setShowDriveFiles(false)}
                                                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>

                                                {/* 이미지 그리드 */}
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
                                                <div className="flex items-center justify-between p-4 border-t border-white/10 bg-black/20">
                                                    <p className="text-xs text-gray-500">{driveFiles.length}개의 이미지</p>
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
                            )}
                        </div>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={isLoading || !image || !isApiKeyReady}
                        className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-teal-500 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                    >
                        {isLoading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                            <SparklesIcon className="w-5 h-5" />
                        )}
                        <span>{isLoading ? '분석 중...' : '프롬프트 생성'}</span>
                    </button>
                </Panel>

                <Panel>
                    <div className="flex flex-col gap-4 flex-grow h-full">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-300">2. 생성된 {outputMode === 'json' ? 'JSON 코드' : '프롬프트'}</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setOutputMode('text')}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${outputMode === 'text'
                                        ? 'bg-teal-600 text-white'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                        }`}
                                >
                                    📝 텍스트
                                </button>
                                <button
                                    onClick={() => setOutputMode('json')}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${outputMode === 'json'
                                        ? 'bg-teal-600 text-white'
                                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                        }`}
                                >
                                    { } JSON
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center justify-between" style={{ marginTop: '-0.5rem' }}>
                            <p className="text-xs text-gray-500">
                                {outputMode === 'json' ? '이미지를 구조화된 JSON으로 변환합니다' : '이미지를 텍스트 프롬프트로 변환합니다'}
                            </p>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 text-white text-sm rounded-lg transition-colors ${isEditing ? 'bg-orange-600 hover:bg-orange-500' : 'bg-gray-600 hover:bg-gray-500'}`}
                                    title={isEditing ? '수정 완료' : '프롬프트 수정'}
                                >
                                    <EditIcon className="w-4 h-4" />
                                    <span>{isEditing ? '완료' : '수정'}</span>
                                </button>
                                <button
                                    onClick={() => setIsLibraryOpen(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-500 transition-colors"
                                    title="저장된 프롬프트 라이브러리"
                                >
                                    <LibraryIcon className="w-4 h-4" />
                                    <span>라이브러리 ({storedPrompts.length})</span>
                                </button>
                            </div>
                        </div>
                        <div className="w-full flex-grow flex flex-col bg-gray-900/50 rounded-lg relative overflow-hidden p-4">
                            {isLoading && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-gray-900/50">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-400 mb-2"></div>
                                    <span>{outputMode === 'json' ? 'JSON을 생성하고 있습니다...' : '프롬프트를 생성하고 있습니다...'}</span>
                                </div>
                            )}
                            {error && <div className="text-red-400 p-4 text-center m-auto">{error}</div>}

                            <textarea
                                id="generated-prompt-output"
                                value={generatedPrompt}
                                readOnly={!isEditing}
                                onChange={(e) => isEditing && setGeneratedPrompt(e.target.value)}
                                placeholder={!isLoading && !error ? (outputMode === 'json' ? "이곳에 생성된 JSON 코드가 표시됩니다..." : "이곳에 생성된 프롬프트가 표시됩니다...") : ""}
                                className={`w-full flex-grow bg-transparent text-white placeholder-gray-500 border-none focus:outline-none font-mono text-sm resize-none ${isEditing ? 'ring-2 ring-orange-500/50 rounded' : ''}`}
                            />
                        </div>
                        {generatedPrompt && !isLoading && (
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopy}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-500 transition-colors"
                                >
                                    <ClipboardIcon className="w-4 h-4" />
                                    <span>{copySuccess ? '복사됨!' : '클립보드 복사'}</span>
                                </button>
                                <button
                                    onClick={handleSaveGeneratedPrompt}
                                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-500 transition-colors"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    <span>라이브러리에 저장</span>
                                </button>
                            </div>
                        )}
                    </div>
                </Panel>
            </div>

            <PromptLibraryModal
                isOpen={isLibraryOpen}
                onClose={handleCloseLibrary}
                prompts={storedPrompts}
                onAddPrompt={handleAddPrompt}
                onUpdatePrompt={handleUpdatePrompt}
                onDeletePrompt={handleDeletePrompt}
                onUsePrompt={handleUsePrompt}
                onImport={handleImportPrompts}
                initialText={libraryInitialText}
            />
        </>
    );
};

export default ImageToPromptEditor;
