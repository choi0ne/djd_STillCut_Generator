
import React, { useState } from 'react';
import { StoredPrompt } from '../types';
import { EditIcon, DeleteIcon, SaveIcon } from './Icons';

interface StoredPromptsProps {
  prompts: StoredPrompt[];
  onUsePrompt: (promptText: string) => void;
  onUpdatePrompt: (id: string, newText: string) => void;
  onDeletePrompt: (id: string) => void;
}

const StoredPrompts: React.FC<StoredPromptsProps> = ({ prompts, onUsePrompt, onUpdatePrompt, onDeletePrompt }) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const handleEdit = (prompt: StoredPrompt) => {
    setEditingId(prompt.id);
    setEditText(prompt.text);
  };

  const handleSave = (id: string) => {
    onUpdatePrompt(id, editText);
    setEditingId(null);
    setEditText('');
  };

  return (
    <div className="w-full bg-gray-800/50 p-4 rounded-lg">
      <h3 className="text-lg font-semibold text-gray-300 mb-3">저장된 프롬프트</h3>
      {prompts.length === 0 ? (
        <p className="text-sm text-gray-500">아직 저장된 프롬프트가 없습니다.</p>
      ) : (
        <ul className="space-y-2 max-h-60 overflow-y-auto">
          {prompts.map((prompt) => (
            <li key={prompt.id} className="flex items-center justify-between bg-gray-700/60 p-2 rounded-md text-sm">
              {editingId === prompt.id ? (
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="flex-grow bg-gray-600 text-white rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleSave(prompt.id)}
                />
              ) : (
                <p className="flex-grow cursor-pointer hover:text-indigo-400" onClick={() => onUsePrompt(prompt.text)}>
                  {prompt.text}
                </p>
              )}
              <div className="flex items-center space-x-2 ml-2 flex-shrink-0">
                {editingId === prompt.id ? (
                  <button onClick={() => handleSave(prompt.id)} className="p-1 text-green-400 hover:text-green-300 transition-colors">
                    <SaveIcon className="w-4 h-4" />
                  </button>
                ) : (
                  <button onClick={() => handleEdit(prompt)} className="p-1 text-gray-400 hover:text-white transition-colors">
                    <EditIcon className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => onDeletePrompt(prompt.id)} className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                  <DeleteIcon className="w-4 h-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default StoredPrompts;