import React, { useState, useMemo, useEffect, useRef } from 'react';
import { StoredPrompt } from '../types';
import { XIcon, PlusIcon, EditIcon, DeleteIcon, SaveIcon, UploadIcon, DownloadIcon } from './Icons';
import { savePromptsToGoogleDrive, listPromptFilesFromGoogleDrive, loadPromptsFromGoogleDrive } from '../services/googleDriveService';

interface PromptLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompts: StoredPrompt[];
  onAddPrompt: (title: string, text: string) => void;
  onUpdatePrompt: (id: string, title: string, newText: string) => void;
  onDeletePrompt: (id: string) => void;
  onUsePrompt: (prompts: StoredPrompt[]) => void;
  onImport: (prompts: StoredPrompt[]) => void;
  initialText?: string | null;
}

const PromptLibraryModal: React.FC<PromptLibraryModalProps> = ({ isOpen, onClose, prompts, onAddPrompt, onUpdatePrompt, onDeletePrompt, onUsePrompt, onImport, initialText }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editText, setEditText] = useState('');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const importInputRef = useRef<HTMLInputElement>(null);

  // Google Drive 상태
  const [isDriveLoading, setIsDriveLoading] = useState(false);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [showDriveFiles, setShowDriveFiles] = useState(false);

  // Google Drive에 저장
  const handleSaveToDrive = async () => {
    if (prompts.length === 0) {
      alert('저장할 프롬프트가 없습니다.');
      return;
    }
    setIsDriveLoading(true);
    try {
      const date = new Date().toISOString().split('T')[0];
      await savePromptsToGoogleDrive(prompts, `djd-prompts-${date}.json`);
      alert('Google Drive에 저장되었습니다!');
    } catch (error: any) {
      alert(error.message || 'Google Drive 저장 실패');
    } finally {
      setIsDriveLoading(false);
    }
  };

  // Google Drive에서 파일 목록 불러오기
  const handleListDriveFiles = async () => {
    setIsDriveLoading(true);
    try {
      const files = await listPromptFilesFromGoogleDrive();
      setDriveFiles(files);
      setShowDriveFiles(true);
    } catch (error: any) {
      alert(error.message || 'Google Drive 파일 목록 불러오기 실패');
    } finally {
      setIsDriveLoading(false);
    }
  };

  // Google Drive에서 선택한 파일 불러오기
  const handleLoadFromDrive = async (fileId: string) => {
    setIsDriveLoading(true);
    try {
      const loadedPrompts = await loadPromptsFromGoogleDrive(fileId);
      if (Array.isArray(loadedPrompts)) {
        onImport(loadedPrompts);
        setShowDriveFiles(false);
      }
    } catch (error: any) {
      alert(error.message || 'Google Drive에서 불러오기 실패');
    } finally {
      setIsDriveLoading(false);
    }
  };

  const handleClose = () => {
    setIsAdding(false);
    setEditingId(null);
    setSelectedIds(new Set());
    setSearchTerm('');
    onClose();
  }

  useEffect(() => {
    if (isOpen && initialText) {
      setIsAdding(true);
      setNewText(initialText);
      setNewTitle('');
    }
  }, [isOpen, initialText]);

  const handleAddNew = () => {
    if (newTitle.trim() && newText.trim()) {
      onAddPrompt(newTitle, newText);
      setNewTitle('');
      setNewText('');
      setIsAdding(false);
    }
  };

  const handleStartEdit = (prompt: StoredPrompt) => {
    setEditingId(prompt.id);
    setEditTitle(prompt.title);
    setEditText(prompt.text);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditText('');
  };

  const handleSaveEdit = () => {
    if (editingId && editTitle.trim() && editText.trim()) {
      onUpdatePrompt(editingId, editTitle, editText);
      handleCancelEdit();
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        if (newSet.size >= 4) {
          alert("최대 4개의 프롬프트만 선택할 수 있습니다.");
          return prev;
        }
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleApplySelection = () => {
    const selectedPrompts = prompts
      .filter(p => selectedIds.has(p.id))
      .sort((a, b) => Array.from(selectedIds).indexOf(a.id) - Array.from(selectedIds).indexOf(b.id));

    if (selectedPrompts.length > 0) {
      onUsePrompt(selectedPrompts);
    }
    handleClose();
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(prompts, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    const date = new Date().toISOString().split('T')[0];
    link.download = `djd_prompts_backup_${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const triggerImport = () => importInputRef.current?.click();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const imported = JSON.parse(text);
        if (Array.isArray(imported) && imported.every(p => p.id && p.title && p.text)) {
          onImport(imported as StoredPrompt[]);
        } else {
          alert('유효하지 않은 파일 형식입니다. id, title, text 속성을 포함한 객체 배열이어야 합니다.');
        }
      } catch (error) {
        console.error('프롬프트 가져오기 실패:', error);
        alert('파일을 읽는 중 오류가 발생했습니다. 유효한 JSON 파일인지 확인해주세요.');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const filteredPrompts = useMemo(() => {
    if (!searchTerm.trim()) return prompts;
    const lowercasedTerm = searchTerm.toLowerCase();
    return prompts.filter(p =>
      p.title.toLowerCase().includes(lowercasedTerm) ||
      p.text.toLowerCase().includes(lowercasedTerm)
    );
  }, [prompts, searchTerm]);

  if (!isOpen) return null;

  const renderPromptItem = (prompt: StoredPrompt) => {
    if (editingId === prompt.id) {
      return (
        <div className="space-y-3">
          <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="제목" className="w-full bg-gray-600 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={3} placeholder="프롬프트 내용" className="w-full bg-gray-600 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <div className="flex justify-end gap-2">
            <button onClick={handleCancelEdit} className="text-sm px-3 py-1 rounded-md text-gray-300 hover:bg-gray-600 transition-colors">취소</button>
            <button onClick={handleSaveEdit} className="text-sm px-3 py-1 rounded-md bg-indigo-600 text-white hover:bg-indigo-500 transition-colors flex items-center gap-1"><SaveIcon className="w-4 h-4" /> 저장</button>
          </div>
        </div>
      );
    } else {
      return (
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            id={`prompt-checkbox-${prompt.id}`}
            checked={selectedIds.has(prompt.id)}
            onChange={() => toggleSelection(prompt.id)}
            className="mt-1 flex-shrink-0 h-5 w-5 rounded border-gray-500 bg-gray-900 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
          <div className="flex-grow cursor-pointer" onClick={() => toggleSelection(prompt.id)}>
            <label htmlFor={`prompt-checkbox-${prompt.id}`} className="font-semibold text-white cursor-pointer">{prompt.title}</label>
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">{prompt.text}</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button onClick={() => handleStartEdit(prompt)} className="p-1.5 text-gray-400 hover:text-white transition-colors" title="수정"><EditIcon className="w-4 h-4" /></button>
            <button onClick={() => onDeletePrompt(prompt.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors" title="삭제"><DeleteIcon className="w-4 h-4" /></button>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity" onClick={handleClose}>
      <div className="bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl transform transition-all flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-white">프롬프트 라이브러리</h2>
          <button onClick={handleClose} className="text-gray-400 hover:text-white transition-colors"><XIcon className="w-6 h-6" /></button>
        </div>

        {isAdding ? (
          <div className="p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-300">새 프롬프트 추가</h3>
            <div>
              <label htmlFor="new-title" className="text-sm font-medium text-gray-400 mb-1 block">제목</label>
              <input id="new-title" type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="프롬프트 제목 (예: 우주복 스타일)" className="w-full bg-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label htmlFor="new-text" className="text-sm font-medium text-gray-400 mb-1 block">프롬프트</label>
              <textarea id="new-text" value={newText} onChange={e => setNewText(e.target.value)} rows={4} placeholder="프롬프트 내용 입력..." className="w-full bg-gray-700 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setIsAdding(false)} className="px-4 py-2 rounded-lg text-white font-semibold bg-gray-600 hover:bg-gray-500 transition-colors">취소</button>
              <button onClick={handleAddNew} disabled={!newTitle.trim() || !newText.trim()} className="px-4 py-2 rounded-lg text-white font-semibold bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-50">저장</button>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-gray-700 flex-shrink-0 space-y-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <input type="text" placeholder="제목 또는 내용으로 검색..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-700 text-white placeholder-gray-500 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow" />
                <button onClick={() => setIsAdding(true)} className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors">
                  <PlusIcon className="w-5 h-5" />
                  <span>새 프롬프트</span>
                </button>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={triggerImport} className="flex-grow flex items-center justify-center gap-2 px-4 py-2 bg-gray-600/50 text-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-600 transition-colors">
                  <UploadIcon className="w-4 h-4" /><span>가져오기</span>
                </button>
                <button onClick={handleExport} className="flex-grow flex items-center justify-center gap-2 px-4 py-2 bg-gray-600/50 text-gray-300 text-sm font-semibold rounded-lg hover:bg-gray-600 transition-colors">
                  <DownloadIcon className="w-4 h-4" /><span>내보내기</span>
                </button>
                <input type="file" ref={importInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
              </div>
              {/* Google Drive 버튼 */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleListDriveFiles}
                  disabled={isDriveLoading}
                  className="flex-grow flex items-center justify-center gap-2 px-4 py-2 bg-blue-600/30 text-blue-300 text-sm font-semibold rounded-lg hover:bg-blue-600/50 transition-colors disabled:opacity-50"
                >
                  <span>☁️</span><span>{isDriveLoading ? '로딩...' : 'Drive에서 가져오기'}</span>
                </button>
                <button
                  onClick={handleSaveToDrive}
                  disabled={isDriveLoading || prompts.length === 0}
                  className="flex-grow flex items-center justify-center gap-2 px-4 py-2 bg-green-600/30 text-green-300 text-sm font-semibold rounded-lg hover:bg-green-600/50 transition-colors disabled:opacity-50"
                >
                  <span>💾</span><span>Drive에 저장</span>
                </button>
              </div>
              {/* Google Drive 파일 선택 모달 */}
              {showDriveFiles && (
                <div className="bg-gray-700 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white font-semibold">Google Drive 파일 선택</span>
                    <button onClick={() => setShowDriveFiles(false)} className="text-gray-400 hover:text-white">
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                  {driveFiles.length > 0 ? (
                    <ul className="space-y-1 max-h-32 overflow-y-auto">
                      {driveFiles.map((file: any) => (
                        <li
                          key={file.id}
                          onClick={() => handleLoadFromDrive(file.id)}
                          className="px-3 py-2 bg-gray-600 rounded cursor-pointer hover:bg-gray-500 text-sm text-gray-200"
                        >
                          {file.name}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-gray-400">저장된 프롬프트 파일이 없습니다.</p>
                  )}
                </div>
              )}
            </div>
            <div className="overflow-y-auto p-4 flex-grow">
              {filteredPrompts.length > 0 ? (
                <ul className="space-y-3">
                  {filteredPrompts.map(prompt => (
                    <li key={prompt.id} className="bg-gray-700/60 rounded-lg p-3 transition-colors hover:bg-gray-700/80">
                      {renderPromptItem(prompt)}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center text-gray-500 py-12 flex flex-col items-center justify-center h-full">
                  <p>{searchTerm ? '검색 결과가 없습니다.' : '저장된 프롬프트가 없습니다.'}</p>
                  <p className="text-sm mt-1">새 프롬프트 버튼을 눌러 추가해보세요.</p>
                </div>
              )}
            </div>
            <div className="flex-shrink-0 p-4 border-t border-gray-700 bg-gray-800/80 backdrop-blur-sm">
              <button
                onClick={handleApplySelection}
                disabled={selectedIds.size === 0}
                className="w-full px-4 py-2.5 rounded-lg text-white font-semibold bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedIds.size > 0 ? `${selectedIds.size}개 프롬프트 사용` : '사용할 프롬프트를 선택하세요'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PromptLibraryModal;