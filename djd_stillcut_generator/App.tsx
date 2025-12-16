import React, { useState } from 'react';
import PromptEditor from './components/PromptEditor';
import CodeEditor from './components/CodeEditor';
import ImageToPromptEditor from './components/ImageToPromptEditor';
import SettingsModal from './components/SettingsModal';
import { SparklesIcon, CodeBracketIcon, PhotoIcon } from './components/Icons';
import useLocalStorage from './hooks/useLocalStorage';

type EditorMode = 'prompt' | 'image-prompt' | 'code';

interface ApiKeys {
  gemini: string;
  googleApi: string;
  googleClient: string;
}

const App: React.FC = () => {
  const [mode, setMode] = useState<EditorMode>('prompt');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  
  const [geminiApiKey, setGeminiApiKey] = useLocalStorage<string>('gemini-api-key', '');
  const [googleApiKey, setGoogleApiKey] = useLocalStorage<string>('google-api-key', '');
  const [googleClientId, setGoogleClientId] = useLocalStorage<string>('google-client-id', '');

  const isKeyReady = !!geminiApiKey;

  const handleSaveSettings = (keys: ApiKeys) => {
    setGeminiApiKey(keys.gemini);
    setGoogleApiKey(keys.googleApi);
    setGoogleClientId(keys.googleClient);
    setIsSettingsModalOpen(false);
  };

  const renderEditor = () => {
    const editorProps = {
      isApiKeyReady: isKeyReady,
      openSettings: () => setIsSettingsModalOpen(true),
    };
    switch (mode) {
      case 'prompt':
        return <PromptEditor {...editorProps} />;
      case 'image-prompt':
        return <ImageToPromptEditor {...editorProps} />;
      case 'code':
        return <CodeEditor {...editorProps} />;
      default:
        return null;
    }
  };

  const getTabClass = (tabMode: EditorMode) =>
    `flex items-center gap-2 px-4 py-3 text-sm font-medium rounded-t-lg transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 focus-visible:ring-indigo-500 ${
      mode === tabMode
        ? 'bg-gray-800 text-white border-b-2 border-indigo-500'
        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
    }`;

  return (
    <>
      <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col items-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-7xl mx-auto flex-grow">
          <header className="text-center mb-6">
            <div className="flex items-center justify-center gap-4">
              <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-3xl sm:text-4xl font-bold tracking-tighter">DJD</span>
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
                STillCutGenerator
              </h1>
            </div>
          </header>

          <div className="w-full">
            <div className="border-b border-gray-700 flex justify-between items-end">
              <nav className="-mb-px flex space-x-2" aria-label="Tabs">
                <button onClick={() => setMode('prompt')} className={getTabClass('prompt')}>
                  <SparklesIcon className="w-5 h-5" />
                  <span>프롬프트 에디터</span>
                </button>
                <button onClick={() => setMode('image-prompt')} className={getTabClass('image-prompt')}>
                  <PhotoIcon className="w-5 h-5" />
                  <span>이미지로 프롬프트</span>
                </button>
                <button onClick={() => setMode('code')} className={getTabClass('code')}>
                  <CodeBracketIcon className="w-5 h-5" />
                  <span>코드 에디터</span>
                </button>
              </nav>
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="mb-1 px-4 py-2 text-sm font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-indigo-400"
                aria-label="설정 열기"
              >
                설정
              </button>
            </div>
            <main className="mt-4">{renderEditor()}</main>
          </div>
        </div>
        <footer className="w-full text-center mt-12 py-4 border-t border-gray-800">
          <p className="text-xs text-gray-500">
            © 2025 DJD Quality-improvement in Clinical Practice. All rights reserved.
          </p>
          <p className="text-xs text-gray-600 mt-1">
            본 서비스는 진료개선화 도구이며, 임상 의사결정을 대체할 수 없습니다.
          </p>
        </footer>
      </div>

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSave={handleSaveSettings}
        currentKeys={{
          gemini: geminiApiKey,
          googleApi: googleApiKey,
          googleClient: googleClientId
        }}
      />
    </>
  );
};

export default App;