import React, { useState } from 'react';
import ImageDropzone from './ImageDropzone';
import { ImageFile } from '../types';
import { generateImageWithCode } from '../services/geminiService';
import { useImageGenerator } from '../hooks/useImageGenerator';
import GenerationResultPanel from './GenerationResultPanel';
import Panel from './common/Panel';
import { SparklesIcon, XIcon } from './Icons';

interface CodeEditorProps {
    isApiKeyReady: boolean;
    openSettings: () => void;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ isApiKeyReady, openSettings }) => {
  const [image, setImage] = useState<ImageFile | null>(null);
  const [jsonCode, setJsonCode] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

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
    setJsonError(null); // Clear error on change
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
    } catch(e) {
        setJsonError('잘못된 JSON 형식입니다. 생성하기 전에 수정해주세요.');
        return false;
    }
  }

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
      <Panel>
        <div className="flex flex-col gap-6 flex-grow">
            <div className="flex flex-col">
                <label className="block text-lg font-semibold mb-2 text-gray-300">1. 참조 이미지 (선택)</label>
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
  );
};

export default CodeEditor;