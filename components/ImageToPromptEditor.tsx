import React, { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ImageFile, StoredPrompt } from '../types';
import Panel from './common/Panel';
import ImageDropzone from './ImageDropzone';
import PromptLibraryModal from './PromptLibraryModal';
import { generatePromptFromImage, generateJsonFromImage, generatePromptFromTextInput, generateCombinedPrompt } from '../services/geminiService';
import useLocalStorage from '../hooks/useLocalStorage';
import { XIcon, SparklesIcon, ClipboardIcon, LibraryIcon, PlusIcon, EditIcon } from './Icons';
import type { ImageProvider } from '../services/types';
import { downloadImageFromGoogleDrive } from '../services/googleDriveService';
import GoogleDrivePickerModal from './GoogleDrivePickerModal';

interface ImageToPromptEditorProps {
    isApiKeyReady: boolean;
    openSettings: () => void;
    geminiApiKey: string;
    openaiApiKey: string;
    selectedProvider: ImageProvider;
    setSelectedProvider: (provider: ImageProvider) => void;
}

type InputMode = 'image' | 'text' | 'both';

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

    // 입력 모드 상태: 이미지만 / 텍스트만 / 이미지+텍스트
    const [inputMode, setInputMode] = useState<InputMode>('image');

    // Google Drive 상태
    const [showDriveFiles, setShowDriveFiles] = useState(false);
    const [isLoadingDrive, setIsLoadingDrive] = useState(false);

    // 텍스트 입력 상태
    const [textInput, setTextInput] = useState('');

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
                    e.preventDefault();
                    e.stopPropagation();

                    const file = items[i].getAsFile();
                    if (file) {
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
    const handleOpenGoogleDrive = () => {
        setShowDriveFiles(true);
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

    const handleCopy = () => {
        if (!generatedPrompt) return;
        navigator.clipboard.writeText(generatedPrompt).then(() => {
            setCopySuccess(true);
            setTimeout(() => setCopySuccess(false), 2000);
        });
    };

    // 통합 프롬프트 생성 함수
    const handleGenerate = async () => {
        if (!isApiKeyReady) {
            openSettings();
            return;
        }

        // 입력 모드에 따른 유효성 검사
        if (inputMode === 'image' && !image) {
            setError('이미지를 업로드해주세요.');
            return;
        }
        if (inputMode === 'text' && !textInput.trim()) {
            setError('텍스트를 입력해주세요.');
            return;
        }
        if (inputMode === 'both' && (!image || !textInput.trim())) {
            setError('이미지와 텍스트를 모두 입력해주세요.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedPrompt('');

        try {
            let promptText: string;

            if (inputMode === 'image' && image) {
                // 이미지만 사용
                promptText = outputMode === 'json'
                    ? await generateJsonFromImage(image)
                    : await generatePromptFromImage(image);
            } else if (inputMode === 'text') {
                // 텍스트만 사용
                promptText = await generatePromptFromTextInput(textInput, outputMode);
            } else if (inputMode === 'both' && image) {
                // 이미지 + 텍스트 함께 사용
                promptText = await generateCombinedPrompt(image, textInput, outputMode);
            } else {
                throw new Error('입력 조건이 올바르지 않습니다.');
            }

            setGeneratedPrompt(promptText);
        } catch (e: any) {
            setError(e.message || '생성 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    // 생성 버튼 활성화 조건
    const canGenerate = () => {
        if (inputMode === 'image') return !!image;
        if (inputMode === 'text') return !!textInput.trim();
        if (inputMode === 'both') return !!image && !!textInput.trim();
        return false;
    };

    return (
        <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <Panel>
                    <div className="flex flex-col gap-5 flex-grow">
                        {/* 제목 + AI 제공자 선택 */}
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-300">1. 입력 방식 선택</h3>
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

                        {/* 입력 모드 선택 */}
                        <div className="flex gap-2 p-1 bg-gray-800/50 rounded-lg">
                            <button
                                onClick={() => setInputMode('image')}
                                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${inputMode === 'image'
                                    ? 'bg-teal-600 text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                                    }`}
                            >
                                🖼️ 이미지만
                            </button>
                            <button
                                onClick={() => setInputMode('text')}
                                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${inputMode === 'text'
                                    ? 'bg-teal-600 text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                                    }`}
                            >
                                💬 텍스트만
                            </button>
                            <button
                                onClick={() => setInputMode('both')}
                                className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-all ${inputMode === 'both'
                                    ? 'bg-teal-600 text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                                    }`}
                            >
                                🖼️+💬 함께
                            </button>
                        </div>

                        {/* 이미지 업로드 영역 (이미지만 또는 함께 모드일 때 표시) */}
                        {(inputMode === 'image' || inputMode === 'both') && (
                            <div className="flex flex-col">
                                <label className="text-sm font-medium text-gray-400 mb-2">
                                    📷 이미지 업로드
                                </label>
                                {image ? (
                                    <div className="relative group h-48 rounded-lg overflow-hidden border border-gray-600">
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
                                    <div className="space-y-2">
                                        <div className="h-40">
                                            <ImageDropzone onImageUpload={handleImageUpload} label="이미지 (PNG, JPG) - Ctrl+V 지원" showDriveButton={false} />
                                        </div>
                                        <button
                                            onClick={handleOpenGoogleDrive}
                                            disabled={isLoadingDrive}
                                            className="w-full py-2 bg-blue-600/20 text-blue-300 text-sm rounded-lg hover:bg-blue-600/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            <span>☁️</span>
                                            <span>{isLoadingDrive ? '로딩...' : 'Google Drive에서 가져오기'}</span>
                                        </button>

                                        <GoogleDrivePickerModal
                                            isOpen={showDriveFiles}
                                            onClose={() => setShowDriveFiles(false)}
                                            onSelect={handleSelectDriveFile}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 텍스트 입력 영역 (텍스트만 또는 함께 모드일 때 표시) */}
                        {(inputMode === 'text' || inputMode === 'both') && (
                            <div className="flex flex-col">
                                <label className="text-sm font-medium text-gray-400 mb-2">
                                    💬 이미지 설명 입력
                                </label>
                                <textarea
                                    value={textInput}
                                    onChange={(e) => setTextInput(e.target.value)}
                                    placeholder="원하는 이미지를 설명하세요...&#10;예: 밤하늘 아래 외로운 늑대, 사이버펑크 스타일의 미래 도시"
                                    className="w-full h-28 bg-gray-900/50 text-white placeholder-gray-500 border border-gray-600 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-shadow text-sm resize-none"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    한국어로 입력하면 영어 프롬프트로 자동 변환됩니다
                                </p>
                            </div>
                        )}

                        {/* 통합 프롬프트 생성 버튼 */}
                        <button
                            onClick={handleGenerate}
                            disabled={isLoading || !canGenerate() || !isApiKeyReady}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-bold py-3 px-4 rounded-lg hover:from-teal-500 hover:to-cyan-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                            {isLoading ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            ) : (
                                <SparklesIcon className="w-5 h-5" />
                            )}
                            <span>{isLoading ? '프롬프트 생성 중...' : '✨ 프롬프트 생성'}</span>
                        </button>
                    </div>
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
                                {outputMode === 'json' ? '구조화된 JSON으로 변환 (subject, style, setting, colors, composition 등)' : '구도, 색감, 조명, 분위기 등을 포함한 상세 영어 프롬프트'}
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
