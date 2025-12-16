import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { ImageFile, StoredPrompt } from '../types';
import Panel from './common/Panel';
import ImageDropzone from './ImageDropzone';
import PromptLibraryModal from './PromptLibraryModal';
import { generatePromptFromImage } from '../services/geminiService';
import useLocalStorage from '../hooks/useLocalStorage';
import { XIcon, SparklesIcon, ClipboardIcon, LibraryIcon, PlusIcon } from './Icons';
import type { ImageProvider } from '../services/types';

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

    const [storedPrompts, setStoredPrompts] = useLocalStorage<StoredPrompt[]>('generatedPromptsLibrary', []);

    const handleImageUpload = (file: ImageFile) => {
        setImage(file);
        setGeneratedPrompt('');
        setError(null);
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
            const promptText = await generatePromptFromImage(image);
            setGeneratedPrompt(promptText);
        } catch (e: any) {
            setError(e.message || '프롬프트 생성 중 오류가 발생했습니다.');
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
                                <div className="h-full min-h-64">
                                    <ImageDropzone onImageUpload={handleImageUpload} label="분석할 이미지 (PNG, JPG)" />
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
                            <h3 className="text-lg font-semibold text-gray-300">2. 생성된 프롬프트</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleSaveGeneratedPrompt}
                                    disabled={!generatedPrompt.trim()}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    title="현재 프롬프트 저장"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    <span>저장</span>
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
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400 mb-2"></div>
                                    <span>프롬프트를 생성하고 있습니다...</span>
                                </div>
                            )}
                            {error && <div className="text-red-400 p-4 text-center m-auto">{error}</div>}

                            <textarea
                                id="generated-prompt-output"
                                value={generatedPrompt}
                                readOnly
                                placeholder={!isLoading && !error ? "이곳에 생성된 프롬프트가 표시됩니다..." : ""}
                                className="w-full flex-grow bg-transparent text-white placeholder-gray-500 border-none focus:outline-none focus:ring-0 font-mono text-sm resize-none"
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
