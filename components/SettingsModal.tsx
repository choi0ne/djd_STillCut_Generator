import React, { useState } from 'react';

interface ApiKeys {
  gemini: string;
  openai: string;
  googleApi: string;
  googleClient: string;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (keys: ApiKeys) => void;
  currentKeys: ApiKeys;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, currentKeys }) => {
  const [keys, setKeys] = useState<ApiKeys>(currentKeys);

  const handleSave = () => {
    onSave(keys);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">⚙️ 설정</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Gemini API */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm text-gray-300">Gemini API</label>
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300">발급받기 ↗</a>
            </div>
            <input
              type="password"
              value={keys.gemini}
              onChange={(e) => setKeys({ ...keys, gemini: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="API 키 입력"
            />
          </div>

          {/* OpenAI API */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm text-gray-300">OpenAI API <span className="text-gray-500 text-xs">(선택)</span></label>
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300">발급받기 ↗</a>
            </div>
            <input
              type="password"
              value={keys.openai}
              onChange={(e) => setKeys({ ...keys, openai: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="API 키 입력 (선택)"
            />
          </div>

          {/* Divider */}
          <div className="border-t border-gray-700 pt-4">
            <p className="text-xs text-gray-500 mb-3">Google Drive 연동</p>
          </div>

          {/* Google API Key */}
          <div>
            <label className="text-sm text-gray-300 block mb-1.5">Google API 키</label>
            <input
              type="password"
              value={keys.googleApi}
              onChange={(e) => setKeys({ ...keys, googleApi: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="API 키 입력"
            />
          </div>

          {/* Google Client ID */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm text-gray-300">Google Client ID</label>
              <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300">생성하기 ↗</a>
            </div>
            <input
              type="password"
              value={keys.googleClient}
              onChange={(e) => setKeys({ ...keys, googleClient: e.target.value })}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Client ID 입력"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            저장
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
