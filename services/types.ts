// 이미지 생성 Provider 공통 타입 정의

export type ImageProvider = 'gemini' | 'openai';

export interface ImageGenerationRequest {
  prompt: string;
  provider: ImageProvider;
  jsonCode?: string;  // JSON 코드 입력
  options?: {
    size?: '1024x1024' | '1536x1024' | '1024x1536';
    quality?: 'low' | 'medium' | 'high' | 'auto';
    style?: 'natural' | 'vivid';
    model?: string;  // 'gemini-3-pro-preview' | 'gpt-image-1.5'
  };
}

export interface ImageGenerationResponse {
  success: boolean;
  imageUrl?: string;
  imageBase64?: string;
  error?: string;
  provider: ImageProvider;
  timestamp: number;
}

export interface PostProcessOptions {
  removeWatermark: boolean;
  optimizeForBlog: boolean;
  outputFormat: 'webp' | 'jpeg' | 'png' | 'all';
  targetWidth?: number;  // default: 1200
}

export interface StorageOptions {
  saveLocal: boolean;
  saveGoogleDrive: boolean;
  folderPath?: string;
  fileName?: string;
}
