import React, { useState, useCallback, useEffect } from 'react';
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
  geminiApiKey,
  selectedProvider,
  setSelectedProvider
}) => {
  const [image, setImage] = useState<ImageFile | null>(null);
  const [jsonCode, setJsonCode] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libraryInitialText, setLibraryInitialText] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState('');



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

  const handleImageUpload = useCallback((file: ImageFile) => {
    setImage(file);
    setAnalysisResult('');
    clearResults();
  }, [clearResults]);

  // Ctrl+V 붙여넣기 지원
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result) {
                handleImageUpload({
                  base64: event.target.result as string,
                  mimeType: file.type,
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
    return () => window.removeEventListener('paste', handlePaste);
  }, [handleImageUpload]);



  const clearImage = () => {
    setImage(null);
    setAnalysisResult('');
    clearResults();
  };

  // 이미지 → JSON 분석
  const handleAnalyzeImage = async () => {
    if (!image) return;
    if (!geminiApiKey) {
      openSettings();
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult('');
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: image.mimeType,
                data: image.base64.split(',')[1]
              }
            },
            {
              text: `이 이미지를 분석하여 Gemini 이미지 생성 API에 사용할 수 있는 JSON 코드를 생성하세요.

다음 형식으로 출력하세요:
{
  "subject": "주요 피사체 (영어)",
  "style": "스타일 (예: photorealistic, cartoon, watercolor 등)",
  "setting": "배경/장소 (영어)",
  "lighting": "조명 (예: natural light, dramatic, soft 등)",
  "mood": "분위기 (예: peaceful, energetic, mysterious 등)"
}

반드시 유효한 JSON 형식으로만 출력하고, 다른 설명은 하지 마세요.`
            }
          ]
        }
      });

      let result = response.text || '';

      // 마크다운 코드블록 제거
      const jsonMatch = result.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        result = jsonMatch[1].trim();
      }

      // JSON 유효성 검증
      JSON.parse(result);
      setAnalysisResult(result);
      setJsonCode(result);
    } catch (err) {
      setAnalysisResult(`❌ 분석 실패: ${err instanceof Error ? err.message : '알 수 없는 오류'}`);
    } finally {
      setIsAnalyzing(false);
    }
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
      setJsonError(null); // 일반 텍스트는 허용
    }
  };

  const validateInput = () => {
    if (!jsonCode.trim()) {
      setJsonError('프롬프트 또는 JSON 코드를 입력해주세요.');
      return false;
    }
    setJsonError(null);
    return true;
  };

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

  const handleSaveCurrentConfig = () => {
    if (!jsonCode.trim()) {
      alert("저장할 내용이 없습니다.");
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
    if (!validateInput()) {
      return;
    }

    generate(null, jsonCode);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* 좌측: 이미지 → JSON 변환 */}
        <Panel>
          <div className="flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">📸 이미지 → JSON</h2>
            </div>

            {/* 이미지 업로드 영역 */}
            <div className="bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/30 rounded-lg p-4 flex-1">
              {image ? (
                <div className="space-y-3">
                  <div className="relative group rounded-lg overflow-hidden">
                    <img src={image.base64} alt="업로드된 이미지" className="w-full max-h-48 object-contain bg-black/50" />
                    <button
                      onClick={clearImage}
                      className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 hover:bg-black/80 transition-opacity"
                      title="이미지 제거"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={handleAnalyzeImage}
                    disabled={isAnalyzing}
                    className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        분석 중...
                      </>
                    ) : (
                      <>
                        <span>🔍</span>
                        JSON으로 변환
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="h-48">
                  <ImageDropzone onImageUpload={handleImageUpload} label="이미지를 업로드하여 JSON으로 변환 (Ctrl+V)" />
                </div>
              )}
            </div>

            {/* JSON 변환 결과 출력 */}
            <div className="flex-1 flex flex-col">
              <label className="text-sm font-semibold text-gray-300 mb-2">변환된 JSON 코드</label>
              {analysisResult && !analysisResult.startsWith('❌') ? (
                <div className="bg-gray-900/50 rounded-lg p-4 flex-1 relative group border border-gray-600">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(analysisResult);
                      setJsonCode(analysisResult); // 우측 패널로 복사
                      const btn = document.getElementById('copy-analysis-btn');
                      if (btn) {
                        btn.textContent = '✓ 복사됨';
                        setTimeout(() => { btn.textContent = '📋 복사 & 적용'; }, 2000);
                      }
                    }}
                    id="copy-analysis-btn"
                    className="absolute top-2 right-2 px-2 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-xs rounded transition-colors"
                    title="JSON 복사 후 우측에 적용"
                  >
                    📋 복사 & 적용
                  </button>
                  <pre className="text-sm text-green-300 font-mono whitespace-pre-wrap pr-24 overflow-auto max-h-[200px]">{analysisResult}</pre>
                </div>
              ) : analysisResult && analysisResult.startsWith('❌') ? (
                <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 flex-1">
                  <p className="text-sm text-red-400">{analysisResult}</p>
                </div>
              ) : (
                <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-4 flex-1 flex items-center justify-center">
                  <p className="text-sm text-gray-500">이미지를 업로드하고 변환하면 JSON 코드가 여기에 표시됩니다</p>
                </div>
              )}
            </div>
          </div>
        </Panel>

        {/* 우측: JSON → 이미지 생성 */}
        <Panel>
          <div className="flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">✨ JSON → 이미지</h2>
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

            {/* JSON 코드 입력 */}
            <div className="flex-1 flex flex-col">
              <div className="flex justify-between items-center mb-2">
                <label htmlFor="json-input" className="text-sm font-semibold text-gray-300">JSON 코드 입력</label>
                <div className="flex gap-2">
                  <button
                    onClick={handleSaveCurrentConfig}
                    disabled={!jsonCode.trim()}
                    className="flex items-center gap-1 px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    title="현재 설정 저장"
                  >
                    <PlusIcon className="w-3 h-3" />
                    저장
                  </button>
                  <button
                    onClick={() => setIsLibraryOpen(true)}
                    className="flex items-center gap-1 px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-500 transition-colors"
                    title="저장된 설정 라이브러리"
                  >
                    <LibraryIcon className="w-3 h-3" />
                    라이브러리 ({storedConfigs.length})
                  </button>
                </div>
              </div>
              <textarea
                id="json-input"
                value={jsonCode}
                onChange={handleJsonChange}
                onBlur={formatJson}
                placeholder={`{\n  "subject": "a majestic lion",\n  "style": "synthwave",\n  "setting": "neon city"\n}`}
                className="w-full flex-grow min-h-[150px] bg-gray-900 text-white placeholder-gray-500 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow font-mono text-sm"
              />
              {jsonError && <p className="text-sm text-red-400 mt-2">{jsonError}</p>}
            </div>

            {/* 이미지 생성 버튼 */}
            <button
              onClick={handleSubmit}
              disabled={isLoading || !jsonCode.trim() || !!jsonError || !isApiKeyReady}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-lg"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <SparklesIcon className="w-6 h-6" />
              )}
              <span>{isLoading ? '생성 중...' : '이미지 생성'}</span>
            </button>

            {/* 생성된 이미지 결과 */}
            <div className="flex-1">
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
          </div>
        </Panel>
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
