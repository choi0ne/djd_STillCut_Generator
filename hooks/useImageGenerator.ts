import { useState, useCallback } from 'react';

// A generic type for the parameters of the generation function
type GenerationParams = any;

interface UseImageGeneratorArgs<T extends GenerationParams> {
  generationFn: (...args: T[]) => Promise<string[]>;
}

export const useImageGenerator = <T extends GenerationParams>({ generationFn }: UseImageGeneratorArgs<T>) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[] | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [lastGenerationParams, setLastGenerationParams] = useState<T[] | null>(null);

  const generate = useCallback(async (...params: T[]) => {
    setIsLoading(true);
    setError(null);
    setGeneratedImages(null);
    setSelectedImage(null);

    try {
      const results = await generationFn(...params);
      setGeneratedImages(results);
      if (results && results.length > 0) {
        setSelectedImage(results[0]);
      }
      setLastGenerationParams(params);
    } catch (e: any) {
      setError(e.message || 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  }, [generationFn]);

  const regenerate = useCallback(async () => {
    if (lastGenerationParams) {
      await generate(...lastGenerationParams);
    }
  }, [generate, lastGenerationParams]);
  
  const clearResults = () => {
      setGeneratedImages(null);
      setSelectedImage(null);
      setError(null);
  }

  return {
    isLoading,
    error,
    generatedImages,
    selectedImage,
    setSelectedImage,
    generate,
    regenerate,
    clearResults,
    canRegenerate: !!lastGenerationParams,
  };
};
