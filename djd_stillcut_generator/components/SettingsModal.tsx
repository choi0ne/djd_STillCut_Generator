import React, { useState, useEffect } from 'react';
import { XIcon } from './Icons';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (keys: { gemini: string; googleApi: string; googleClient: string }) => void;
  currentKeys: { gemini: string; googleApi: string; googleClient: string };
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, currentKeys }) => {
  const [geminiKeyInput, setGeminiKeyInput] = useState(currentKeys.gemini);
  const [googleApiKeyInput, setGoogleApiKeyInput] = useState(currentKeys.googleApi);
  const [googleClientIdInput, setGoogleClientIdInput] = useState(currentKeys.googleClient);

  useEffect(() => {
    if (isOpen) {
      setGeminiKeyInput(currentKeys.gemini);
      setGoogleApiKeyInput(currentKeys.googleApi);
      setGoogleClientIdInput(currentKeys.googleClient);
    }
  }, [isOpen, currentKeys]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      gemini: geminiKeyInput.trim(),
      googleApi: googleApiKeyInput.trim(),
      googleClient: googleClientIdInput.trim(),
    });
  };

  const canSave = geminiKeyInput.trim() !== '' || googleApiKeyInput.trim() !== '' || googleClientIdInput.trim() !== '';

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 transition-opacity"
      aria-labelledby="settings-modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-md m-4 transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-700">
          <h2 id="settings-modal-title" className="text-xl font-bold text-white">설정</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="설정 닫기"
          >
            <XIcon className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          <div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2">Gemini API 키</h3>
            <p className="text-sm text-gray-400 mb-4">
              Google AI Studio에서 API 키를 생성하여 아래에 붙여넣어 주세요. 입력된 키는 이미지 생성/편집에 사용됩니다.
            </p>
            <input
              type="password"
              value={geminiKeyInput}
              onChange={(e) => setGeminiKeyInput(e.target.value)}
              placeholder="Gemini API 키"
              className="w-full bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
            />
          </div>

          <div className="border-t border-gray-700 my-4"></div>

          <div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2">Google Drive API 설정</h3>
            <p className="text-sm text-gray-400 mb-4">
              생성된 이미지를 Google Drive에 저장하려면 Google Cloud Console에서 API 키와 OAuth 2.0 클라이언트 ID를 생성하여 입력해주세요.
            </p>
            <div className="space-y-4">
               <input
                type="password"
                value={googleApiKeyInput}
                onChange={(e) => setGoogleApiKeyInput(e.target.value)}
                placeholder="Google Cloud API 키"
                className="w-full bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
              />
               <input
                type="password"
                value={googleClientIdInput}
                onChange={(e) => setGoogleClientIdInput(e.target.value)}
                placeholder="Google Cloud Client ID"
                className="w-full bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
              />
            </div>
             <p className="text-xs text-gray-500 mt-3 text-center">
                API 키 사용은 연결된 Google Cloud 프로젝트에 요금이 부과될 수 있습니다. 
                <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline ml-1">
                  자세히 알아보기
                </a>
              </p>
          </div>
        </div>
        
        <div className="bg-gray-800/50 px-6 py-4 rounded-b-2xl flex justify-end gap-3">
           <button 
            onClick={onClose} 
            className="bg-gray-600 text-white font-semibold py-2 px-5 rounded-lg hover:bg-gray-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-gray-500"
          >
            취소
          </button>
          <button 
              onClick={handleSave} 
              disabled={!canSave}
              className="bg-indigo-600 text-white font-bold py-2 px-5 rounded-lg hover:bg-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 disabled:opacity-50"
            >
              저장
            </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;