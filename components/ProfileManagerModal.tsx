import React, { useState } from 'react';
import { BlogProfile } from '../data/blogProfilePresets';

interface ProfileManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    profiles: BlogProfile[];
    selectedProfileId: string;
    onSelectProfile: (profileId: string) => void;
    onSaveProfile: (profile: BlogProfile) => void;
    onDeleteProfile: (profileId: string) => void;
}

const ProfileManagerModal: React.FC<ProfileManagerModalProps> = ({
    isOpen,
    onClose,
    profiles,
    selectedProfileId,
    onSelectProfile,
    onSaveProfile,
    onDeleteProfile
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editingProfile, setEditingProfile] = useState<BlogProfile | null>(null);
    const [clinicFocusInput, setClinicFocusInput] = useState('');

    if (!isOpen) return null;

    const handleNewProfile = () => {
        const newProfile: BlogProfile = {
            id: `profile-${Date.now()}`,
            name: '',
            persona: '',
            clinic_focus: [],
            business_goal: '',
            audience: ''
        };
        setEditingProfile(newProfile);
        setClinicFocusInput('');
        setIsEditing(true);
    };

    const handleEditProfile = (profile: BlogProfile) => {
        setEditingProfile({ ...profile });
        setClinicFocusInput(profile.clinic_focus.join(', '));
        setIsEditing(true);
    };

    const handleSaveEdit = () => {
        if (!editingProfile) return;

        // 필수 필드 검증
        if (!editingProfile.name.trim()) {
            alert('프로필 이름을 입력해주세요.');
            return;
        }
        if (!editingProfile.persona.trim()) {
            alert('페르소나를 입력해주세요.');
            return;
        }
        if (clinicFocusInput.trim() === '') {
            alert('클리닉 포커스를 입력해주세요.');
            return;
        }
        if (!editingProfile.business_goal.trim()) {
            alert('비즈니스 목표를 입력해주세요.');
            return;
        }
        if (!editingProfile.audience.trim()) {
            alert('타겟 독자를 입력해주세요.');
            return;
        }

        // clinic_focus 파싱 (쉼표로 구분)
        const focusArray = clinicFocusInput
            .split(',')
            .map(item => item.trim())
            .filter(item => item.length > 0);

        const finalProfile: BlogProfile = {
            ...editingProfile,
            clinic_focus: focusArray
        };

        onSaveProfile(finalProfile);
        setIsEditing(false);
        setEditingProfile(null);
        setClinicFocusInput('');
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditingProfile(null);
        setClinicFocusInput('');
    };

    const handleDelete = (profileId: string) => {
        if (profiles.length <= 1) {
            alert('최소 1개의 프로필은 유지해야 합니다.');
            return;
        }
        if (confirm('정말 이 프로필을 삭제하시겠습니까?')) {
            onDeleteProfile(profileId);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* 헤더 */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-white">📋 블로그 프로필 관리</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-white text-2xl leading-none"
                    >
                        ×
                    </button>
                </div>

                {/* 본문 */}
                <div className="flex-1 overflow-y-auto p-4">
                    {!isEditing ? (
                        // 프로필 목록 보기
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-400">
                                    저장된 프로필 {profiles.length}개
                                </p>
                                <button
                                    onClick={handleNewProfile}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
                                >
                                    ➕ 새 프로필 추가
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                {profiles.map(profile => (
                                    <div
                                        key={profile.id}
                                        className={`p-4 rounded-lg border-2 transition-all ${selectedProfileId === profile.id
                                                ? 'bg-indigo-900/30 border-indigo-500'
                                                : 'bg-gray-700/50 border-gray-600 hover:border-gray-500'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h3 className="font-semibold text-white text-lg">
                                                        {profile.name}
                                                    </h3>
                                                    {selectedProfileId === profile.id && (
                                                        <span className="px-2 py-0.5 bg-green-600 text-white text-xs rounded">
                                                            선택됨
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="space-y-1.5 text-sm">
                                                    <p className="text-gray-300">
                                                        <span className="text-gray-500">👤 페르소나:</span> {profile.persona}
                                                    </p>
                                                    <p className="text-gray-300">
                                                        <span className="text-gray-500">🏥 클리닉 포커스:</span>{' '}
                                                        <span className="text-indigo-300">
                                                            {profile.clinic_focus.join(', ')}
                                                        </span>
                                                    </p>
                                                    <p className="text-gray-300">
                                                        <span className="text-gray-500">🎯 비즈니스 목표:</span> {profile.business_goal}
                                                    </p>
                                                    <p className="text-gray-300">
                                                        <span className="text-gray-500">👥 타겟 독자:</span> {profile.audience}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2 ml-4">
                                                {selectedProfileId !== profile.id && (
                                                    <button
                                                        onClick={() => onSelectProfile(profile.id)}
                                                        className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs rounded transition-colors"
                                                    >
                                                        ✓ 선택
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleEditProfile(profile)}
                                                    className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-xs rounded transition-colors"
                                                >
                                                    ✏️ 편집
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(profile.id)}
                                                    className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs rounded transition-colors"
                                                >
                                                    🗑️ 삭제
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        // 프로필 편집/추가 폼
                        <div className="space-y-4">
                            <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-lg p-3">
                                <p className="text-sm text-indigo-300">
                                    {editingProfile?.id.startsWith('profile-') && !profiles.find(p => p.id === editingProfile.id)
                                        ? '✨ 새 프로필 추가'
                                        : '✏️ 프로필 편집'}
                                </p>
                            </div>

                            {/* 프로필 이름 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    프로필 이름 <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editingProfile?.name || ''}
                                    onChange={(e) => setEditingProfile(prev => prev ? { ...prev, name: e.target.value } : null)}
                                    placeholder="예: DJD 한의원, 통증 클리닉"
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            {/* 페르소나 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    👤 페르소나 <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editingProfile?.persona || ''}
                                    onChange={(e) => setEditingProfile(prev => prev ? { ...prev, persona: e.target.value } : null)}
                                    placeholder="예: 한의사 (1인칭 관찰자), 통증 전문 한의사"
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            {/* 클리닉 포커스 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    🏥 클리닉 포커스 <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={clinicFocusInput}
                                    onChange={(e) => setClinicFocusInput(e.target.value)}
                                    placeholder="쉼표로 구분하여 입력 (예: 공황장애, 메니에르병, 불면)"
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    💡 여러 항목은 쉼표(,)로 구분하세요
                                </p>
                            </div>

                            {/* 비즈니스 목표 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    🎯 비즈니스 목표 <span className="text-red-400">*</span>
                                </label>
                                <textarea
                                    value={editingProfile?.business_goal || ''}
                                    onChange={(e) => setEditingProfile(prev => prev ? { ...prev, business_goal: e.target.value } : null)}
                                    placeholder="예: 환자 중심 임상 블로그 - 즉각적 행동 가능한 정보 제공"
                                    rows={2}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                                />
                            </div>

                            {/* 타겟 독자 */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    👥 타겟 독자 <span className="text-red-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={editingProfile?.audience || ''}
                                    onChange={(e) => setEditingProfile(prev => prev ? { ...prev, audience: e.target.value } : null)}
                                    placeholder="예: 20-50대 직장인 환자, 30-60대 만성 통증 환자"
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>

                            {/* 버튼 */}
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={handleSaveEdit}
                                    className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors"
                                >
                                    💾 저장
                                </button>
                                <button
                                    onClick={handleCancelEdit}
                                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-lg transition-colors"
                                >
                                    ✖️ 취소
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* 푸터 */}
                {!isEditing && (
                    <div className="p-4 border-t border-gray-700 bg-gray-800/50">
                        <button
                            onClick={onClose}
                            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                        >
                            닫기
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfileManagerModal;
