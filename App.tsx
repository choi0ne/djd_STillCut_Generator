import React, { useState } from 'react';
import PromptEditor from './components/PromptEditor';
import CodeEditor from './components/CodeEditor';
import ImageToPromptEditor from './components/ImageToPromptEditor';
import MpsEditor from './components/MpsEditor';
import BlogVisualEditor from './components/BlogVisualEditor';
import BlogWriterEditor from './components/BlogWriterEditor';
import ReviewManagerEditor from './components/ReviewManagerEditor';
import SettingsModal from './components/SettingsModal';
import useLocalStorage from './hooks/useLocalStorage';
import useGoogleAuth from './hooks/useGoogleAuth';

type EditorMode = 'blog-writer' | 'blog-image' | 'prompt' | 'image-prompt' | 'code' | 'mps' | 'review-manager';
type ImageProvider = 'gemini' | 'openai';

interface ApiKeys {
  gemini: string;
  openai: string;
  googleApi: string;
  googleClient: string;
}

const App: React.FC = () => {
  const [mode, setMode] = useState<EditorMode>('blog-writer');
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ImageProvider>('gemini');
  const [blogImageContext, setBlogImageContext] = useState<{
    topic: string;
    finalDraft: string;
    concepts: Array<{ title: string; keywords: string[]; description?: string }>;
  } | null>(null);

  const [geminiApiKey, setGeminiApiKey] = useLocalStorage<string>('gemini-api-key', '');
  const [openaiApiKey, setOpenaiApiKey] = useLocalStorage<string>('openai-api-key', '');
  const [googleApiKey, setGoogleApiKey] = useLocalStorage<string>('google-api-key', '');
  const [googleClientId, setGoogleClientId] = useLocalStorage<string>('google-client-id', '');

  const { isAuthenticated, isLoading: authLoading, signIn, signOut } = useGoogleAuth(googleClientId);

  const isKeyReady = !!geminiApiKey || !!openaiApiKey;

  const handleStage7Complete = (data: { topic: string; finalDraft: string; concepts: Array<{ title: string; keywords: string[]; description?: string }> }) => {
    setBlogImageContext(data);
    setMode('blog-image');
  };

  const handleSaveSettings = (keys: ApiKeys) => {
    setGeminiApiKey(keys.gemini);
    setOpenaiApiKey(keys.openai);
    setGoogleApiKey(keys.googleApi);
    setGoogleClientId(keys.googleClient);
    setIsSettingsModalOpen(false);
  };

  const renderEditor = () => {
    const editorProps = {
      isApiKeyReady: isKeyReady,
      openSettings: () => setIsSettingsModalOpen(true),
      geminiApiKey,
      openaiApiKey,
      selectedProvider,
      setSelectedProvider,
    };
    switch (mode) {
      case 'blog-writer':
        return <BlogWriterEditor isApiKeyReady={isKeyReady} openSettings={() => setIsSettingsModalOpen(true)} geminiApiKey={geminiApiKey} openaiApiKey={openaiApiKey} selectedProvider={selectedProvider} setSelectedProvider={setSelectedProvider} onStage7Complete={handleStage7Complete} />;
      case 'blog-image':
        return <BlogVisualEditor isApiKeyReady={isKeyReady} openSettings={() => setIsSettingsModalOpen(true)} geminiApiKey={geminiApiKey} openaiApiKey={openaiApiKey} selectedProvider={selectedProvider} setSelectedProvider={setSelectedProvider} initialContext={blogImageContext} />;
      case 'prompt':
        return <PromptEditor {...editorProps} />;
      case 'image-prompt':
        return <ImageToPromptEditor {...editorProps} />;
      case 'code':
        return <CodeEditor {...editorProps} />;
      case 'mps':
        return <MpsEditor />;
      case 'review-manager':
        return <ReviewManagerEditor {...editorProps} />;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="min-h-screen bg-[#0a0f1a] text-gray-100 flex flex-col">
        {/* Header - Full Width */}
        <header className="h-14 border-b border-white/5 flex items-center justify-center bg-[#0d1321]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              DJD
            </div>
            <span className="text-xl font-semibold text-blue-400">STillCutGenerator</span>
          </div>
        </header>

        {/* Body - Sidebar + Main Content */}
        <div className="flex-1 flex">
          {/* Left Sidebar */}
          <aside className="w-56 bg-[#0d1321] border-r border-white/5 p-4 flex flex-col">
            <div className="space-y-1">
              <button
                onClick={() => setMode('blog-writer')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${mode === 'blog-writer' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-white/5'
                  }`}
              >
                ✍️ 블로그글 작성
              </button>
              <button
                onClick={() => setMode('blog-image')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${mode === 'blog-image' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-white/5'
                  }`}
              >
                🎨 블로그 이미지
              </button>
              <button
                onClick={() => setMode('mps')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${mode === 'mps' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-white/5'
                  }`}
              >
                🔧 MPS 후처리
              </button>
              <button
                onClick={() => setMode('review-manager')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${mode === 'review-manager' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-white/5'
                  }`}
              >
                💬 리뷰 응대
              </button>
              <button
                onClick={() => setMode('prompt')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${mode === 'prompt' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-white/5'
                  }`}
              >
                ✨ 이미지 생성
              </button>
              <button
                onClick={() => setMode('code')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${mode === 'code' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-white/5'
                  }`}
              >
                📝 JSON 생성
              </button>
              <button
                onClick={() => setMode('image-prompt')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${mode === 'image-prompt' ? 'bg-blue-600/20 text-blue-400' : 'text-gray-400 hover:bg-white/5'
                  }`}
              >
                🖼️ 프롬프트 추출
              </button>
            </div>

            {/* Provider Links - AI Chat Services */}
            <div className="mt-4 pt-4 border-t border-white/10 space-y-1">
              <ProviderLink
                icon="🔷"
                label="Google Gemini"
                href="https://gemini.google.com/"
                hasKey={!!geminiApiKey}
              />
              <ProviderLink
                icon="💚"
                label="ChatGPT"
                href="https://chatgpt.com/"
                hasKey={!!openaiApiKey}
              />
              <ProviderLink
                icon="🟣"
                label="Claude"
                href="https://claude.ai/"
              />
              <ProviderLink
                icon="📓"
                label="NotebookLM"
                href="https://notebooklm.google.com/"
              />
              <ProviderLink
                icon="📝"
                label="Naver Blog"
                href="https://blog.naver.com/dongjedang"
              />
            </div>

            {/* Settings & Login - After menu items */}
            <div className="mt-4 pt-4 border-t border-white/10 space-y-1">
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/5 transition-colors"
              >
                <span>⚙️</span>
                <span>설정</span>
              </button>
              <button
                onClick={isAuthenticated ? signOut : signIn}
                disabled={authLoading}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${authLoading ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:bg-white/5'
                  }`}
              >
                <span>{authLoading ? '⏳' : isAuthenticated ? '🟢' : '🔓'}</span>
                <span>{authLoading ? '확인 중...' : isAuthenticated ? 'Logout' : 'Google Login'}</span>
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 flex flex-col">
            {/* Content Area */}
            <div className="flex-1 p-6 overflow-auto">
              {renderEditor()}
            </div>

            {/* Footer */}
            <footer className="py-3 text-center border-t border-white/5">
              <p className="text-xs text-gray-500">© 2025 DJD Quality-improvement in Clinical Practice. All rights reserved.</p>
              <p className="text-xs text-gray-600">본 서비스는 진료개선화 도구이며, 임상 의사결정을 대체할 수 없습니다.</p>
            </footer>
          </main>
        </div>
      </div>

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        onSave={handleSaveSettings}
        currentKeys={{
          gemini: geminiApiKey,
          openai: openaiApiKey,
          googleApi: googleApiKey,
          googleClient: googleClientId
        }}
      />
    </>
  );
};

// Sidebar Item Component
const SidebarItem: React.FC<{
  icon: string;
  label: string;
  active?: boolean;
  highlight?: boolean;
}> = ({ icon, label, active, highlight }) => (
  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${active ? 'bg-white/10 text-white' :
    highlight ? 'text-blue-400' :
      'text-gray-400 hover:bg-white/5'
    }`}>
    <span>{icon}</span>
    <span>{label}</span>
  </div>
);

// Provider Item Component
const ProviderItem: React.FC<{
  icon: string;
  label: string;
  active?: boolean;
  disabled?: boolean;
  hasKey?: boolean;
  onClick?: () => void;
}> = ({ icon, label, active, disabled, hasKey, onClick }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${disabled ? 'text-gray-600 cursor-not-allowed' :
      active ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' :
        'text-gray-400 hover:bg-white/5'
      }`}
  >
    <span>{icon}</span>
    <span className="flex-1 text-left">{label}</span>
  </button>
);

// Provider Link Component - Opens external API key pages
const ProviderLink: React.FC<{
  icon: string;
  label: string;
  href: string;
  hasKey?: boolean;
}> = ({ icon, label, href, hasKey }) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-gray-400 hover:bg-white/5 hover:text-white"
  >
    <span>{icon}</span>
    <span className="flex-1 text-left">{label}</span>
    {hasKey === true && <span className="text-xs text-green-400">✓</span>}
    <span className="text-xs text-gray-500">↗</span>
  </a>
);

export default App;