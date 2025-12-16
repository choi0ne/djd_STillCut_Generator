import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ImageDropzone from './ImageDropzone';
import PromptLibraryModal from './PromptLibraryModal';
import { ImageFile, StoredPrompt } from '../types';
import { generateImageWithCode } from '../services/geminiService';
import { useImageGenerator } from '../hooks/useImageGenerator';
import useLocalStorage from '../hooks/useLocalStorage';
import GenerationResultPanel from './GenerationResultPanel';
import Panel from './common/Panel';
import { SparklesIcon, XIcon, LibraryIcon, PlusIcon } from './Icons';
import type { ImageProvider } from '../services/types';

interface CodeEditorProps {
  isApiKeyReady: boolean;
  openSettings: () => void;
  geminiApiKey: string;
  openaiApiKey: string;
  selectedProvider: ImageProvider;
  setSelectedProvider: (provider: ImageProvider) => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  isApiKeyReady,
  openSettings,
  selectedProvider,
  setSelectedProvider
}) => {
  const [image, setImage] = useState<ImageFile | null>(null);
  const [jsonCode, setJsonCode] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libraryInitialText, setLibraryInitialText] = useState<string | null>(null);

  // JSON 설정을 저장하는 라이브러리
  const [storedConfigs, setStoredConfigs] = useLocalStorage<StoredPrompt[]>('jsonConfigsLibrary', []);

  const {
    isLoading,
    error,
    generatedImages,
    selectedImage,
    setSelectedImage,
    generate,
    regenerate,
    clearResults,
    canRegenerate,
  } = useImageGenerator({ generationFn: generateImageWithCode });

  const handleImageUpload = (file: ImageFile) => {
    setImage(file);
    clearResults();
  };

  const clearImage = () => {
    setImage(null);
    clearResults();
  };

  const handleJsonChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setJsonCode(e.target.value);
    setJsonError(null);
  };

  const formatJson = () => {
    try {
      if (jsonCode.trim()) {
        const parsed = JSON.parse(jsonCode);
        setJsonCode(JSON.stringify(parsed, null, 2));
        setJsonError(null);
      }
    } catch (e) {
      setJsonError("잘못된 JSON 형식입니다. 수정해주세요.");
    }
  };

  const validateJson = () => {
    if (!jsonCode.trim()) {
      setJsonError('JSON 코드를 입력해주세요.');
      return false;
    }
    try {
      JSON.parse(jsonCode);
      setJsonError(null);
      return true;
    } catch (e) {
      setJsonError('잘못된 JSON 형식입니다. 생성하기 전에 수정해주세요.');
      return false;
    }
  };

  // 라이브러리 관련 함수
  const handleAddConfig = (title: string, text: string) => {
    if (title.trim() && text.trim()) {
      const newConfig = { id: uuidv4(), title, text };
      setStoredConfigs(prev => [newConfig, ...prev]);
    }
  };

  const handleUpdateConfig = (id: string, title: string, text: string) => {
    setStoredConfigs(configs => configs.map(c => c.id === id ? { ...c, title, text } : c));
  };

  const handleDeleteConfig = (id: string) => {
    setStoredConfigs(configs => configs.filter(c => c.id !== id));
  };

  const handleUseConfig = (configs: StoredPrompt[]) => {
    // 라이브러리에서 선택한 설정을 에디터에 적용
    if (configs.length > 0) {
      setJsonCode(configs[0].text);
      setJsonError(null);
    }
    setIsLibraryOpen(false);
  };

  const handleImportConfigs = (importedConfigs: StoredPrompt[]) => {
    setStoredConfigs(currentConfigs => {
      const currentIds = new Set(currentConfigs.map(c => c.id));
      const newConfigs = importedConfigs.filter(c => !currentIds.has(c.id));
      if (newConfigs.length === 0) {
        alert("새로운 설정이 없습니다.");
        return currentConfigs;
      }
      alert(`${newConfigs.length}개의 새로운 설정을 추가했습니다.`);
      return [...newConfigs, ...currentConfigs];
    });
  };

  // 현재 JSON 설정을 라이브러리에 저장
  const handleSaveCurrentConfig = () => {
    if (!jsonCode.trim()) {
      alert("저장할 JSON 설정이 없습니다.");
      return;
    }
    if (!validateJson()) {
      alert("유효한 JSON 형식이어야 저장할 수 있습니다.");
      return;
    }
    setLibraryInitialText(jsonCode);
    setIsLibraryOpen(true);
  };

  const handleCloseLibrary = () => {
    setIsLibraryOpen(false);
    setLibraryInitialText(null);
  };

  const handleSubmit = () => {
    if (!isApiKeyReady) {
      openSettings();
      return;
    }
    if (!validateJson()) {
      return;
    }

    generate(image, jsonCode);
  };

  const renderGenerateButton = () => {
    return (
      <button
        onClick={handleSubmit}
        disabled={isLoading || !jsonCode.trim() || !!jsonError || !isApiKeyReady}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-lg mt-6"
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        ) : (
          <SparklesIcon className="w-6 h-6" />
        )}
        <span>{isLoading ? '생성 중...' : '이미지 생성'}</span>
      </button>
    );
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        <Panel>
          <div className="flex flex-col gap-6 flex-grow">
            {/* 제목 + AI 제공자 선택 */}
            <div className="flex items-center justify-between">
              <label className="block text-lg font-semibold text-gray-300">1. 참조 이미지 (선택)</label>
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
            <div className="flex flex-col -mt-4">
              {image ? (
                <div className="relative group h-64 rounded-lg overflow-hidden">
                  <img src={image.base64} alt="업로드된 참조 이미지" className="w-full h-full object-contain" />
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
                <div className="h-64">
                  <ImageDropzone onImageUpload={handleImageUpload} label="참조 스타일 (선택 사항)" />
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="json-input" className="block text-lg font-semibold text-gray-300">2. JSON 코드 입력</label>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveCurrentConfig}
                    disabled={!jsonCode.trim()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="현재 설정 저장"
                  >
                    <PlusIcon className="w-4 h-4" />
                    <span>저장</span>
                  </button>
                  <button
                    onClick={() => setIsLibraryOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-500 transition-colors"
                    title="저장된 설정 라이브러리"
                  >
                    <LibraryIcon className="w-4 h-4" />
                    <span>라이브러리 ({storedConfigs.length})</span>
                  </button>
                </div>
              </div>
              <textarea
                id="json-input"
                value={jsonCode}
                onChange={handleJsonChange}
                onBlur={formatJson}
                placeholder={`{\n  "subject": "a majestic lion",\n  "style": "synthwave",\n  "setting": "in front of a neon pyramid"\n}`}
                className="w-full flex-grow bg-gray-900 text-white placeholder-gray-500 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow font-mono text-sm"
              />
              {jsonError && <p className="text-sm text-red-400 mt-2">{jsonError}</p>}
            </div>
          </div>

          {renderGenerateButton()}
        </Panel>

        <GenerationResultPanel
          isLoading={isLoading}
          error={error || jsonError}
          generatedImages={generatedImages}
          selectedImage={selectedImage}
          onSelectImage={setSelectedImage}
          onRegenerate={regenerate}
          canRegenerate={canRegenerate}
        />
      </div>

      <PromptLibraryModal
        isOpen={isLibraryOpen}
        onClose={handleCloseLibrary}
        prompts={storedConfigs}
        onAddPrompt={handleAddConfig}
        onUpdatePrompt={handleUpdateConfig}
        onDeletePrompt={handleDeleteConfig}
        onUsePrompt={handleUseConfig}
        onImport={handleImportConfigs}
        initialText={libraryInitialText}
      />
    </>
  );
};

export default CodeEditor;
