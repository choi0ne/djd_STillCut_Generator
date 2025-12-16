import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    detectFileType,
    processImage,
    processPdf,
    type MpsImageOptions,
    type MpsPdfOptions,
    type FileType,
    type MpsResult
} from '../services/mpsService';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

const MpsEditor: React.FC = () => {
    // 파일 상태
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [fileType, setFileType] = useState<FileType>('unknown');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 처리 상태
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<MpsResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // 이미지 옵션
    const [imageOptions, setImageOptions] = useState<MpsImageOptions>({
        removeWatermark: true,
        optimizeForBlog: true,
        outputFormat: 'webp'
    });

    // PDF 옵션
    const [pdfOptions, setPdfOptions] = useState<MpsPdfOptions>({
        removeWatermark: true,
        optimizeForBlog: true,
        outputFormat: 'webp',
        mergePages: true,
        selectedPages: [],
        pageOrder: []
    });

    // 채팅 상태
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatting, setIsChatting] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // 채팅 스크롤
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);


    // 파일 업로드 처리
    const handleFileUpload = useCallback((file: File) => {
        const type = detectFileType(file);
        setUploadedFile(file);
        setFileType(type);
        setResult(null);
        setError(null);

        // 이미지 미리보기
        if (type === 'image') {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        } else {
            setPreviewUrl(null);
        }

        // PDF의 경우 페이지 수 추정
        if (type === 'pdf') {
            const pages = [1, 2, 3, 4, 5];
            setPdfOptions(prev => ({
                ...prev,
                selectedPages: pages,
                pageOrder: pages
            }));
        }

        // 파일 업로드 알림 메시지
        setChatMessages(prev => [...prev, {
            role: 'assistant',
            content: `파일 "${file.name}"이 업로드되었습니다. (${(file.size / 1024 / 1024).toFixed(2)} MB)\n\n처리 옵션을 설정하거나, 좌표 수정 등 필요한 사항을 말씀해주세요.`,
            timestamp: new Date()
        }]);
    }, []);

    // 클립보드 붙여넣기 (Ctrl+V) 지원
    useEffect(() => {
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                        e.preventDefault();
                        handleFileUpload(file);
                        break;
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => {
            window.removeEventListener('paste', handlePaste);
        };
    }, [handleFileUpload]);

    // 드래그 앤 드롭 핸들러
    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            handleFileUpload(file);
        }
    }, [handleFileUpload]);

    const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleFileUpload(file);
        }
    }, [handleFileUpload]);

    // Gemini 채팅 전송
    const handleSendChat = async () => {
        if (!chatInput.trim()) return;

        const userMessage: ChatMessage = {
            role: 'user',
            content: chatInput,
            timestamp: new Date()
        };
        setChatMessages(prev => [...prev, userMessage]);
        setChatInput('');
        setIsChatting(true);

        try {
            // API 키 가져오기
            let apiKey: string | undefined;
            try {
                const item = window.localStorage.getItem('gemini-api-key');
                if (item) {
                    apiKey = JSON.parse(item);
                }
            } catch (e) {
                console.error('API 키 파싱 오류:', e);
            }

            if (!apiKey) {
                setChatMessages(prev => [...prev, {
                    role: 'assistant',
                    content: '⚠️ API 키가 설정되지 않았습니다. 설정에서 Gemini API 키를 입력해주세요.',
                    timestamp: new Date()
                }]);
                return;
            }

            // Gemini API 호출 (텍스트 전용)
            const { GoogleGenAI } = await import('@google/genai');
            const ai = new GoogleGenAI({ apiKey });

            const contextMessage = uploadedFile
                ? `현재 업로드된 파일: ${uploadedFile.name} (${fileType})\n현재 옵션: ${JSON.stringify(fileType === 'image' ? imageOptions : pdfOptions, null, 2)}\n\n사용자 요청: ${userMessage.content}`
                : userMessage.content;

            const response = await ai.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: {
                    parts: [{ text: `당신은 이미지/PDF 후처리 도우미입니다. 워터마크 제거, 좌표 수정, 블로그 최적화, 크롭, 리사이즈 등의 작업을 도와줍니다. 한국어로 답변하세요.\n\n${contextMessage}` }]
                }
            });

            const assistantMessage: ChatMessage = {
                role: 'assistant',
                content: response.text || '응답을 받지 못했습니다.',
                timestamp: new Date()
            };
            setChatMessages(prev => [...prev, assistantMessage]);
        } catch (err) {
            console.error('채팅 오류:', err);
            setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: `❌ 오류가 발생했습니다: ${err instanceof Error ? err.message : '알 수 없는 오류'}`,
                timestamp: new Date()
            }]);
        } finally {
            setIsChatting(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendChat();
        }
    };

    // 처리 실행
    const handleProcess = async () => {
        if (!uploadedFile) return;

        setIsProcessing(true);
        setError(null);
        setResult(null);

        try {
            let processResult: MpsResult;

            if (fileType === 'image') {
                processResult = await processImage(uploadedFile, imageOptions);
            } else if (fileType === 'pdf') {
                processResult = await processPdf(uploadedFile, pdfOptions);
            } else {
                throw new Error('지원하지 않는 파일 형식입니다.');
            }

            setResult(processResult);

            // 채팅에 처리 결과 알림
            setChatMessages(prev => [...prev, {
                role: 'assistant',
                content: processResult.success
                    ? `✅ 처리가 완료되었습니다!\n출력 파일: ${processResult.outputFiles?.join(', ') || '없음'}`
                    : `❌ 처리 실패: ${processResult.error}`,
                timestamp: new Date()
            }]);
        } catch (err) {
            setError(err instanceof Error ? err.message : '처리 중 오류가 발생했습니다.');
        } finally {
            setIsProcessing(false);
        }
    };

    // 파일 초기화
    const handleReset = () => {
        setUploadedFile(null);
        setFileType('unknown');
        setPreviewUrl(null);
        setResult(null);
        setError(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            {/* 왼쪽: 파일 업로드 및 옵션 */}
            <div className="bg-[#111827] rounded-xl border border-white/5 p-5 space-y-5 overflow-auto max-h-[calc(100vh-200px)]">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span>🔧</span> MPS 후처리
                </h2>

                {/* 파일 업로드 영역 */}
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${isDragging
                        ? 'border-blue-500 bg-blue-500/10'
                        : uploadedFile
                            ? 'border-green-500/50 bg-green-500/5'
                            : 'border-white/10 hover:border-white/30 hover:bg-white/5'
                        }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
                        onChange={handleFileInputChange}
                        className="hidden"
                    />

                    {uploadedFile ? (
                        <div className="space-y-2">
                            <span className="text-3xl">{fileType === 'pdf' ? '📄' : '🖼️'}</span>
                            <p className="text-white font-medium">{uploadedFile.name}</p>
                            <p className="text-gray-400 text-sm">
                                {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleReset();
                                }}
                                className="text-red-400 hover:text-red-300 text-sm underline"
                            >
                                파일 제거
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <span className="text-3xl">📁</span>
                            <p className="text-gray-400 text-sm">
                                클릭 또는 드래그
                            </p>
                            <p className="text-gray-500 text-xs">Ctrl+V 붙여넣기</p>
                            <p className="text-gray-500 text-xs">
                                PNG, JPG, WebP, PDF
                            </p>
                        </div>
                    )}
                </div>

                {/* Google Drive 가져오기 버튼 */}
                <button
                    className="w-full py-2 bg-blue-600/20 text-blue-300 text-sm rounded-lg hover:bg-blue-600/30 transition-colors flex items-center justify-center gap-2"
                >
                    <span>☁️</span>
                    <span>Drive에서 가져오기</span>
                </button>

                {/* 미리보기 */}
                {previewUrl && (
                    <div className="rounded-lg overflow-hidden border border-white/10">
                        <img src={previewUrl} alt="Preview" className="w-full max-h-48 object-contain bg-black/50" />
                    </div>
                )}

                {/* 이미지 옵션 */}
                {fileType === 'image' && (
                    <ImageOptionsPanel options={imageOptions} onChange={setImageOptions} />
                )}

                {/* PDF 옵션 */}
                {fileType === 'pdf' && (
                    <PdfOptionsPanel options={pdfOptions} onChange={setPdfOptions} />
                )}

                {/* 처리 버튼 */}
                {uploadedFile && fileType !== 'unknown' && (
                    <button
                        onClick={handleProcess}
                        disabled={isProcessing}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <>
                                <span className="animate-spin">⏳</span>
                                처리 중...
                            </>
                        ) : (
                            <>
                                <span>⚡</span>
                                처리 시작
                            </>
                        )}
                    </button>
                )}

                {/* 에러 메시지 */}
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-red-400 text-sm">{error}</p>
                    </div>
                )}
            </div>

            {/* 오른쪽: 채팅 영역 */}
            <div className="bg-[#111827] rounded-xl border border-white/5 p-5 flex flex-col h-[calc(100vh-200px)]">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span>💬</span> Gemini 어시스턴트
                </h2>

                {/* 채팅 메시지 */}
                <div className="flex-1 overflow-auto space-y-3 mb-4 pr-2">
                    {chatMessages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-500 text-sm space-y-2">
                            <span className="text-4xl">💡</span>
                            <p>파일을 업로드하고 질문하세요!</p>
                            <p className="text-xs text-gray-600">예: "워터마크 좌표 수정해줘", "1200px로 리사이즈"</p>
                        </div>
                    ) : (
                        chatMessages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-lg px-4 py-2 ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-100'
                                        }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                                    <p className="text-xs opacity-50 mt-1">
                                        {msg.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                    {isChatting && (
                        <div className="flex justify-start">
                            <div className="bg-gray-700 rounded-lg px-4 py-2">
                                <div className="flex items-center gap-2">
                                    <span className="animate-spin">⏳</span>
                                    <span className="text-sm text-gray-300">생각 중...</span>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* 채팅 입력 */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="좌표 수정, 크롭, 리사이즈 등 요청하세요..."
                        className="flex-1 bg-gray-800 text-white placeholder-gray-500 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isChatting}
                    />
                    <button
                        onClick={handleSendChat}
                        disabled={isChatting || !chatInput.trim()}
                        className="px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                    >
                        {isChatting ? '⏳' : '📤'}
                    </button>
                    <button
                        disabled={!result}
                        title="저장 (로컬 + Drive)"
                        className="px-4 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                        💾
                    </button>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────
// 이미지 옵션 패널
// ─────────────────────────────────────────────────────────────────
interface ImageOptionsPanelProps {
    options: MpsImageOptions;
    onChange: (options: MpsImageOptions) => void;
}

const ImageOptionsPanel: React.FC<ImageOptionsPanelProps> = ({ options, onChange }) => {
    return (
        <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-300 border-b border-white/10 pb-2">
                🖼️ 이미지 처리 옵션
            </h3>

            <ToggleOption
                label="워터마크 제거"
                description="우측 하단 워터마크 자동 제거"
                checked={options.removeWatermark}
                onChange={(checked) => onChange({ ...options, removeWatermark: checked })}
            />

            <ToggleOption
                label="블로그 최적화"
                description="1200px 리사이즈 + 압축"
                checked={options.optimizeForBlog}
                onChange={(checked) => onChange({ ...options, optimizeForBlog: checked })}
            />

            <div className="space-y-2">
                <p className="text-sm text-gray-400">출력 포맷</p>
                <div className="flex gap-2">
                    {(['webp', 'jpg', 'both'] as const).map((format) => (
                        <button
                            key={format}
                            onClick={() => onChange({ ...options, outputFormat: format })}
                            className={`px-4 py-2 rounded-lg text-sm transition-colors ${options.outputFormat === format
                                ? 'bg-blue-600 text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            {format === 'both' ? 'WebP + JPG' : format.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────
// PDF 옵션 패널
// ─────────────────────────────────────────────────────────────────
interface PdfOptionsPanelProps {
    options: MpsPdfOptions;
    onChange: (options: MpsPdfOptions) => void;
}

const PdfOptionsPanel: React.FC<PdfOptionsPanelProps> = ({ options, onChange }) => {
    const togglePage = (page: number) => {
        const newSelected = options.selectedPages.includes(page)
            ? options.selectedPages.filter(p => p !== page)
            : [...options.selectedPages, page].sort((a, b) => a - b);
        onChange({ ...options, selectedPages: newSelected, pageOrder: newSelected });
    };

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-300 border-b border-white/10 pb-2">
                📄 PDF 처리 옵션
            </h3>

            <ToggleOption
                label="워터마크 제거"
                description="각 페이지 워터마크 제거"
                checked={options.removeWatermark}
                onChange={(checked) => onChange({ ...options, removeWatermark: checked })}
            />

            <ToggleOption
                label="블로그 최적화"
                description="1200px + DPI 자동 계산"
                checked={options.optimizeForBlog}
                onChange={(checked) => onChange({ ...options, optimizeForBlog: checked })}
            />

            <div className="space-y-2">
                <p className="text-sm text-gray-400">출력 포맷</p>
                <div className="flex gap-2">
                    {(['webp', 'jpg', 'both'] as const).map((format) => (
                        <button
                            key={format}
                            onClick={() => onChange({ ...options, outputFormat: format })}
                            className={`px-4 py-2 rounded-lg text-sm transition-colors ${options.outputFormat === format
                                ? 'bg-blue-600 text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            {format === 'both' ? 'WebP + JPG' : format.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <p className="text-sm text-gray-400">출력 방식</p>
                <div className="flex gap-2">
                    <button
                        onClick={() => onChange({ ...options, mergePages: false })}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors ${!options.mergePages
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        📑 개별 파일
                    </button>
                    <button
                        onClick={() => onChange({ ...options, mergePages: true })}
                        className={`px-4 py-2 rounded-lg text-sm transition-colors ${options.mergePages
                            ? 'bg-blue-600 text-white'
                            : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        📄 한 장 합치기
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                <p className="text-sm text-gray-400">페이지 선택</p>
                <div className="flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((page) => (
                        <button
                            key={page}
                            onClick={() => togglePage(page)}
                            className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${options.selectedPages.includes(page)
                                ? 'bg-blue-600 text-white'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                                }`}
                        >
                            {page}
                        </button>
                    ))}
                </div>
                <p className="text-xs text-gray-500">
                    선택된 페이지: {options.selectedPages.join(', ') || '없음'}
                </p>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────
// 토글 옵션 컴포넌트
// ─────────────────────────────────────────────────────────────────
interface ToggleOptionProps {
    label: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
}

const ToggleOption: React.FC<ToggleOptionProps> = ({
    label,
    description,
    checked,
    onChange
}) => {
    return (
        <div
            onClick={() => onChange(!checked)}
            className="flex items-center justify-between p-3 bg-[#0a0f1a] rounded-lg border border-white/5 cursor-pointer hover:border-white/10 transition-colors"
        >
            <div>
                <p className="text-white text-sm font-medium">{label}</p>
                <p className="text-gray-500 text-xs">{description}</p>
            </div>
            <div
                className={`w-12 h-6 rounded-full relative transition-colors ${checked ? 'bg-blue-600' : 'bg-gray-700'
                    }`}
            >
                <div
                    className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${checked ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                />
            </div>
        </div>
    );
};

export default MpsEditor;
