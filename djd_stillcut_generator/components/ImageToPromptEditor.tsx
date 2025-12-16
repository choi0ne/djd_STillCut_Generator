
import React, { useState } from 'react';
import { ImageFile } from '../types';
import Panel from './common/Panel';
import ImageDropzone from './ImageDropzone';
import { generatePromptFromImage } from '../services/geminiService';
import { XIcon, SparklesIcon, ClipboardIcon } from './Icons';

interface ImageToPromptEditorProps {
    isApiKeyReady: boolean;
    openSettings: () => void;
}

const ImageToPromptEditor: React.FC<ImageToPromptEditorProps> = ({ isApiKeyReady, openSettings }) => {
    const [image, setImage] = useState<ImageFile | null>(null);
    const [generatedPrompt, setGeneratedPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copySuccess, setCopySuccess] = useState(false);

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <Panel>
                <div className="flex flex-col gap-6 flex-grow">
                    <div>
                        <h3 className="text-lg font-semibold mb-2 text-gray-300">1. 이미지 업로드</h3>
                        <p className="text-sm text-gray-400 mb-3">
                            내용을 분석하여 프롬프트를 생성할 이미지를 업로드하세요.
                        </p>
                    </div>
                    
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
                    <span>{isLoading ? '생성 중...' : '프롬프트 생성'}</span>
                </button>
            </Panel>
            
            <Panel>
                <div className="flex flex-col gap-4 flex-grow h-full">
                     <h3 className="text-lg font-semibold text-gray-300">2. 생성된 프롬프트</h3>
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
                        <button onClick={handleCopy} className="w-full flex items-center justify-center gap-2 bg-gray-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-500 transition-colors">
                            <ClipboardIcon className="w-4 h-4" />
                            <span>{copySuccess ? '복사됨!' : '프롬프트 복사'}</span>
                        </button>
                     )}
                </div>
            </Panel>
        </div>
    );
};

export default ImageToPromptEditor;
