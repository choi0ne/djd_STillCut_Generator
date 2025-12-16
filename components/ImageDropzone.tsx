import React, { useState, useCallback, useRef, useEffect } from 'react';
import { UploadIcon } from './Icons';
import { ImageFile } from '../types';
import { listImagesFromGoogleDrive, downloadImageFromGoogleDrive } from '../services/googleDriveService';

interface ImageDropzoneProps {
  onImageUpload: (file: ImageFile) => void;
  label: string;
  showDriveButton?: boolean;
}

const ImageDropzone: React.FC<ImageDropzoneProps> = ({ onImageUpload, label, showDriveButton = true }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [showDriveImages, setShowDriveImages] = useState(false);
  const [driveImages, setDriveImages] = useState<any[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (typeof e.target?.result === 'string') {
          onImageUpload({ base64: e.target.result, mimeType: file.type });
        }
      };
      reader.readAsDataURL(file);
    }
  }, [onImageUpload]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            handleFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [handleFile]);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  // Google Drive에서 이미지 목록 가져오기
  const handleOpenDrivePicker = async () => {
    setIsLoadingDrive(true);
    try {
      const images = await listImagesFromGoogleDrive();
      setDriveImages(images);
      setShowDriveImages(true);
    } catch (error: any) {
      alert(error.message || 'Google Drive 이미지 목록을 불러올 수 없습니다.');
    } finally {
      setIsLoadingDrive(false);
    }
  };

  // Google Drive에서 선택한 이미지 다운로드
  const handleSelectDriveImage = async (fileId: string, mimeType: string) => {
    setIsLoadingDrive(true);
    try {
      const imageData = await downloadImageFromGoogleDrive(fileId, mimeType);
      onImageUpload(imageData);
      setShowDriveImages(false);
    } catch (error: any) {
      alert(error.message || '이미지를 다운로드할 수 없습니다.');
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const dropzoneClasses = `flex flex-col items-center justify-center w-full h-full p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-200 ${isDragging ? 'border-indigo-500 bg-gray-700/50' : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50'
    }`;

  // Google Drive 이미지 선택 모달
  if (showDriveImages) {
    return (
      <div className="flex flex-col w-full h-full p-4 border-2 border-dashed border-blue-500 rounded-lg bg-gray-800/50">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-white">☁️ Google Drive</span>
          <button
            onClick={() => setShowDriveImages(false)}
            className="text-gray-400 hover:text-white text-sm"
          >
            ✕
          </button>
        </div>
        {isLoadingDrive ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-gray-400 text-sm">로딩...</span>
          </div>
        ) : driveImages.length > 0 ? (
          <div className="flex-1 overflow-y-auto grid grid-cols-3 gap-2">
            {driveImages.map((img) => (
              <div
                key={img.id}
                onClick={() => handleSelectDriveImage(img.id, img.mimeType)}
                className="aspect-square bg-gray-700 rounded cursor-pointer hover:ring-2 hover:ring-blue-500 overflow-hidden"
              >
                {img.thumbnailLink ? (
                  <img src={img.thumbnailLink} alt={img.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-gray-400 p-1 text-center">
                    {img.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            이미지 없음
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 h-full">
      <div
        className={dropzoneClasses}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <div className="text-center">
          <UploadIcon className="mx-auto h-10 w-10 text-gray-400" />
          <p className="mt-1 text-sm text-gray-400">
            <span className="font-semibold text-indigo-400">클릭</span> 또는 드래그
          </p>
          <p className="text-xs text-gray-500">Ctrl+V 붙여넣기</p>
          <p className="text-xs text-gray-500 mt-1">{label}</p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />
        </div>
      </div>
      {showDriveButton && (
        <button
          onClick={handleOpenDrivePicker}
          disabled={isLoadingDrive}
          className="w-full py-2 bg-blue-600/20 text-blue-300 text-sm rounded-lg hover:bg-blue-600/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <span>☁️</span>
          <span>{isLoadingDrive ? '로딩...' : 'Google Drive에서 가져오기'}</span>
        </button>
      )}
    </div>
  );
};

export default ImageDropzone;
