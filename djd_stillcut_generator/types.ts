export interface ImageFile {
  base64: string;
  mimeType: string;
}

export interface StoredPrompt {
  id: string;
  title: string;
  text: string;
}

declare global {
  // Fix: Replaced inline type with a named `AIStudio` interface to resolve a TypeScript
  // declaration merging conflict for the global `window.aistudio` property.
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }

  interface Window {
    aistudio?: AIStudio;
    gapi: any;
    google: any;
  }
}