import React, { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import ImageDropzone from './ImageDropzone';
import PromptLibraryModal from './PromptLibraryModal';
import { ImageFile, StoredPrompt } from '../types';
import { generateImageWithPrompt } from '../services/geminiService';
import { downloadImageFromGoogleDrive } from '../services/googleDriveService';
import GoogleDrivePickerModal from './GoogleDrivePickerModal';
import useLocalStorage from '../hooks/useLocalStorage';
import { useImageGenerator } from '../hooks/useImageGenerator';
import GenerationResultPanel from './GenerationResultPanel';
import Panel from './common/Panel';
import { SparklesIcon, LibraryIcon, XIcon, PlusIcon } from './Icons';

const defaultPrompts: StoredPrompt[] = [
  // Category: Consultation
  { id: 'consultation-1', title: "모형으로 설명 샷", text: "Transform this photo to show the same doctor using anatomical model to explain treatment. Medium shot (waist up) with focus on model and hands, shot at f/2.8 for beautiful bokeh, educational scene with depth and clarity. Background: Modern Korean medicine consultation room with clean, professional atmosphere. Warm white and beige tones, minimalist design with natural wood accents. Soft, even lighting creating a calm, trustworthy mood. Medical books and subtle traditional Korean medicine elements visible. Contemporary furniture with clean lines." },
  { id: 'consultation-2', title: "진료실 환자 상담 컷", text: "Transform this photo to show the same doctor in white scrubs, sitting at a modern clinic consultation desk, engaged in conversation with a patient (back of patient visible in soft blur). Medium shot (waist up), shot at f/2.8 for layered depth, rule of thirds composition, professional consultation scene with spatial depth. Background: Modern Korean medicine consultation room with clean, professional atmosphere. Warm white and beige tones, minimalist design with natural wood accents. Soft, even lighting creating a calm, trustworthy mood. Medical books and subtle traditional Korean medicine elements visible. Contemporary furniture with clean lines." },
  { id: 'consultation-3', title: "의료기기 조작 샷 (바스트)", text: "Transform this photo to show the same doctor in white scrubs, operating modern medical equipment in a treatment room with focused, professional expression. Bust shot (chest up) with emphasis on hands and equipment in sharp focus, shot at f/2.5, technical expertise scene with depth. Background: Modern Korean medicine consultation room with clean, professional atmosphere. Warm white and beige tones, minimalist design with natural wood accents. Soft, even lighting creating a calm, trustworthy mood. Medical books and subtle traditional Korean medicine elements visible. Contemporary furniture with clean lines." },
  { id: 'consultation-4', title: "차트 함께 보는 샷", text: "Transform this photo to show the same doctor sitting with patient reviewing charts together. Over-shoulder medium shot, shot at f/2.5 for smooth bokeh, collaborative scene with dimensional composition showing partnership in care. Background: Modern Korean medicine consultation room with clean, professional atmosphere. Warm white and beige tones, minimalist design with natural wood accents. Soft, even lighting creating a calm, trustworthy mood. Medical books and subtle traditional Korean medicine elements visible. Contemporary furniture with clean lines." },
  { id: 'consultation-5', title: "한약재 설명 샷 (미디엄)", text: "Doctor in white coat holding and explaining medicinal herbs in modern Korean medicine consultation room. Medium shot waist up f/2.8, educational scene, contemporary office with warm beige and white tones, natural wood furniture, minimalist professional design." },
  { id: 'consultation-6', title: "경청하는 모습 샷", text: "Transform this photo to show the same doctor listening attentively with empathetic expression. Close-up shot (head and shoulders), shot at f/1.8 for ultra-shallow depth of field, compassionate portrait with beautiful background separation and professional warmth. Background: Modern Korean medicine consultation room with clean, professional atmosphere. Warm white and beige tones, minimalist design with natural wood accents. Soft, even lighting creating a calm, trustworthy mood. Medical books and subtle traditional Korean medicine elements visible. Contemporary furniture with clean lines." },
  { id: 'consultation-7', title: "치료실 측면 각도 샷", text: "Doctor in white coat working in modern Korean medicine treatment room, side angle view. Medium shot waist up f/2.8, contemporary clinic with clean white walls and natural wood accents, minimalist professional atmosphere." },
  { id: 'consultation-8', title: "전화 상담 샷", text: "Transform this photo to show the same doctor on phone consultation while looking at screen. Medium shot (waist up), shot at f/2.5 for pleasant bokeh, remote care scene with modern professional feel. Background: Modern Korean medicine consultation room with clean, professional atmosphere. Warm white and beige tones, minimalist design with natural wood accents. Soft, even lighting creating a calm, trustworthy mood. Medical books and subtle traditional Korean medicine elements visible. Contemporary furniture with clean lines." },
  { id: 'consultation-9', title: "태블릿 설명 샷", text: "Transform this photo to show the same doctor showing information on tablet to patient. Medium shot (waist up), shot at f/2.8 for pleasant bokeh, patient and background softly blurred creating focus on interaction. Natural lighting, patient education scene with professional depth and modern feel. Background: Modern Korean medicine consultation room with clean, professional atmosphere. Warm white and beige tones, minimalist design with natural wood accents. Soft, even lighting creating a calm, trustworthy mood. Medical books and subtle traditional Korean medicine elements visible. Contemporary furniture with clean lines." },
  { id: 'consultation-10', title: "설명하는 손동작 (미디엄)", text: "Doctor in white coat making explanatory hand gestures while consulting in modern Korean medicine office. Medium shot waist up f/2.5, warm consultation room with contemporary beige and white design, natural wood furniture, soft professional lighting." },
  { id: 'consultation-11', title: "환자 차트 확인 샷", text: "Transform this photo to show the same doctor in white medical gown, reviewing patient charts or medical records with a thoughtful expression. Medium shot (waist up), shot at f/2.5 for smooth bokeh, professional documentation scene with environmental context. Background: Modern Korean medicine consultation room with clean, professional atmosphere. Warm white and beige tones, minimalist design with natural wood accents. Soft, even lighting creating a calm, trustworthy mood. Medical books and subtle traditional Korean medicine elements visible. Contemporary furniture with clean lines." },

  // Category: Environment
  { id: 'environment-1', title: "책장 일부 디테일", text: "Section of modern wooden bookshelf with medical reference books in Korean medicine consultation room. Medium shot f/2.8, book spines slightly out of focus to keep text unreadable, clean contemporary clinic interior with white walls and natural wood, organized professional atmosphere, warm lighting." },
  { id: 'environment-2', title: "문손잡이와 표지판", text: "Close-up shot of modern door handle and clean signage on clinic room door. Shot at f/2.8 for smooth bokeh, handle and sign in focus with corridor softly blurred in background creating spatial depth. Clean professional lighting, no people visible. Professional organization detail with dimensional quality. Background: Professional clinic entrance area. Modern glass doors, reception desk visible. Welcoming atmosphere with clean design, neutral colors (white, beige, natural wood). Bright lighting, indoor plants. Contemporary professional medical facility entrance." },
  { id: 'environment-3', title: "벽 액자와 인증서", text: "Angled shot of professional certificates and framed artwork on clean white clinic wall. Shot at f/2.8 with front frame in focus, no people visible. Professional credibility detail with spatial composition. Background: Modern Korean medicine consultation room with clean, professional atmosphere. Warm white and beige tones, minimalist design with natural wood accents. Soft, even lighting creating a calm, trustworthy mood. Medical books and subtle traditional Korean medicine elements visible. Contemporary furniture with clean lines." },
  { id: 'environment-4', title: "조명과 그림자", text: "Artistic shot of natural sunlight casting soft shadows on clean white clinic wall, with edge of window frame visible. Shot at f/4 for subtle depth of field, gentle bokeh in distant elements. Natural directional lighting creating peaceful patterns, no people visible. Minimalist healing environment with atmospheric depth. Background: Modern Korean medicine consultation room with clean, professional atmosphere. Warm white and beige tones, minimalist design with natural wood accents. Soft, even lighting creating a calm, trustworthy mood. Medical books and subtle traditional Korean medicine elements visible. Contemporary furniture with clean lines." },
  { id: 'environment-5', title: "책상 위 정돈된 물품", text: "Close-up shot of neatly organized desk items - pen holder, notebook, small plant, minimalist decor. Shot at f/2.5 for pleasant bokeh, foreground items in focus with background softly blurred creating layered depth. Soft professional lighting with organized aesthetic, no people visible. Clean workspace detail with spatial quality. Background: Modern clinic desk surface, softly blurred. Clean, organized workspace with neutral tones (white, light wood, beige). Professional medical environment with subtle natural lighting. Minimalist, contemporary office setting. Soft focus on background maintaining professional medical atmosphere." },
  { id: 'environment-6', title: "치료 도구 준비 트레이", text: "Close-up shot of sterile medical instruments neatly arranged on a clean tray, ready for treatment. Shot at f/2.5 for smooth bokeh, foreground instruments in sharp focus with background softly blurred showing organization depth. Clean professional lighting highlighting sterility, no people visible. Medical preparation detail with clarity. Background: Professional Korean medicine treatment room. Clinical yet warm atmosphere with white and light wood tones. Medical equipment and treatment tools neatly organized. Soft, focused lighting. Clean, sterile environment balanced with natural elements. Contemporary medical interior design." },
  { id: 'environment-7', title: "티슈박스와 소품", text: "Close-up shot of tissue box, small plant, and care items on side table. Shot at f/2.5 for pleasant bokeh, foreground items in focus with background softly blurred showing caring space depth. Soft natural lighting with gentle atmosphere, no people visible. Patient comfort detail with layered composition. Background: Modern Korean medicine consultation room with clean, professional atmosphere. Warm white and beige tones, minimalist design with natural wood accents. Soft, even lighting creating a calm, trustworthy mood. Medical books and subtle traditional Korean medicine elements visible. Contemporary furniture with clean lines." },
  { id: 'environment-8', title: "창가 식물 디테일 샷", text: "Close-up shot of green plants on clinic windowsill with soft natural sunlight streaming through. Shot at f/2.2 for beautiful bokeh, plants in sharp focus with softly blurred clinic interior in background creating peaceful depth. Natural window lighting with gentle shadows, no people visible. Tranquil healing atmosphere with dimensional quality. Background: Modern Korean medicine consultation room with clean, professional atmosphere. Warm white and beige tones, minimalist design with natural wood accents. Soft, even lighting creating a calm, trustworthy mood. Medical books and subtle traditional Korean medicine elements visible. Contemporary furniture with clean lines." },
  { id: 'environment-9', title: "탕약 준비 장면", text: "Korean herbal medicine decoction pouring into modern glass container, no person visible. Close-up shot f/2.5, dark brown liquid stream, steam rising, clean white counter with natural wood elements, contemporary clinic preparation area, professional still life photography." },
  { id: 'environment-10', title: "한약 보온 용기", text: "Row of modern glass storage bottles with Korean herbal medicine decoction on clean counter in contemporary clinic. Close-up shot f/2.8, dark brown liquid visible through clear glass, sealed caps, organized clinical preparation area with white and natural wood, no person visible, professional pharmaceutical aesthetic." },
  { id: 'environment-11', title: "한약 처방 라벨", text: "Modern Korean medicine package with prescription sticker on white surface. Close-up macro f/2.8, realistic commercial packaging with label design elements and barcode visible but text blurred or out of focus, professional product photography, warm beige and white tones, soft shadows, organized clinical aesthetic." },
  { id: 'environment-12', title: "개별 포장 한약", text: "Individual serving of Korean herbal medicine powder in modern single-dose foil pouch on clean white surface. Close-up macro f/2.5, realistic commercial packaging with printed patterns and design elements but text out of focus, sealed edge detail, professional product photography with soft shadows, warm beige and white tones." },
  { id: 'environment-13', title: "탕약 컵 클로즈업", text: "Traditional Korean herbal medicine tea in modern ceramic cup on wooden surface in contemporary clinic. Close-up macro f/2.5, steam rising, warm brown liquid, minimalist presentation, natural wood table with clean white background, professional food photography style." },
  { id: 'environment-14', title: "한약재 병 진열", text: "Glass jars of traditional medicinal herbs displayed on modern wooden shelf in Korean medicine consultation room. Medium shot f/2.8, organized herb storage, clean contemporary clinic interior with white walls and natural wood, minimalist professional atmosphere." },
  { id: 'environment-15', title: "한약 파우치 디테일", text: "Modern Korean medicine herbal pouches arranged on clean white surface in contemporary clinic. Close-up shot f/2.8, sleek packaging design with minimalist labels, natural lighting, professional product photography with soft shadows, warm beige and white tones." },
  { id: 'environment-16', title: "한약 파우치 스택", text: "Stack of modern Korean medicine herbal pouches on clean desk in contemporary consultation room. Medium shot f/2.8, organized packaging with patient information labels, warm white and beige clinic interior, natural wood furniture, professional clinical product display." },

  // Category: Hands
  { id: 'hands-1', title: "한의 도구 준비 샷", text: "Doctor's hands preparing Korean medicine treatment tools - cupping cups, moxa, herbal applicators on wooden tray in modern treatment room. Close-up macro f/2.8, traditional instruments in contemporary clinic with white walls and natural wood, clean organized space." },
  { id: 'hands-2', title: "소독제 펌프 샷", text: "Doctor's hands using hand sanitizer dispenser in modern Korean medicine treatment room. Close-up macro shot f/2.8, hands and dispenser in sharp focus, clean white walls with natural wood accents, minimalist contemporary clinic interior, soft professional lighting." },
  { id: 'hands-3', title: "약 계수 샷", text: "Doctor's hands sorting and counting traditional medicinal herbs on wooden tray in modern treatment room. Close-up macro f/2.5, dried herbs in focus, contemporary Korean medicine clinic with warm white and beige interior, natural wood furniture." },
  { id: 'hands-4', title: "진단서 검토 샷", text: "Doctor's hands reviewing medical documents in modern Korean medicine consultation room. Close-up f/2.5, papers in focus, contemporary office with warm beige tones and natural wood furniture, minimalist professional atmosphere." },
  { id: 'hands-5', title: "처방전 작성 클로즈업", text: "Doctor's hands writing prescription with pen in modern Korean medicine consultation room. Close-up macro f/2.5, medical chart writing, contemporary office with clean white and beige design, natural wood desk, professional setting." },
  { id: 'hands-6', title: "침술 준비 샷", text: "Doctor's hands selecting acupuncture needles from sterile package in modern Korean medicine treatment room. Close-up macro f/2.8, professional needle preparation, contemporary clinic with minimalist white and wood design, clean clinical environment." },
  { id: 'hands-7', title: "약봉투 준비 샷", text: "Doctor's hands preparing herbal medicine packets in modern Korean medicine treatment room. Close-up macro f/2.5, packaging prescription, contemporary clinic with clean white design and natural wood accents, organized professional workspace." },
  { id: 'hands-8', title: "온도계 확인 샷", text: "Doctor's hands checking digital thermometer in modern treatment room. Close-up macro f/2.8, medical device in focus, contemporary Korean medicine clinic with minimalist white and wood design, soft clinical lighting." },
  { id: 'hands-9', title: "의료 기록 입력 샷", text: "Doctor's hands typing medical records on computer in modern Korean medicine consultation room. Close-up f/2.8, keyboard in focus, contemporary office with warm beige and white tones, natural wood desk, minimalist professional design." },
  { id: 'hands-10', title: "손 클로즈업 - 진맥", text: "Doctor's hands performing pulse diagnosis on patient wrist in modern Korean medicine treatment room. Close-up macro f/2.8, professional pulse reading technique, contemporary clinic with white and beige tones, natural wood elements, clean minimalist design." },
  { id: 'hands-11', title: "청진기 사용 샷", text: "Doctor's hands holding stethoscope in modern treatment room. Close-up macro f/2.5, diagnostic instrument in focus, contemporary Korean medicine clinic with white walls and natural wood accents, clean professional atmosphere." },
  { id: 'hands-12', title: "한약재 계량 작업", text: "Doctor's hands measuring traditional medicinal herbs with scale in modern treatment room. Close-up macro f/2.5, herb preparation with tools, contemporary Korean medicine clinic with white and natural wood interior, organized professional workspace." },
  { id: 'hands-13', title: "혈압계 조작 샷", text: "Doctor's hands operating blood pressure monitor in modern treatment room. Close-up macro f/2.8, medical device controls in focus, contemporary Korean medicine clinic with clean white design and natural wood elements, professional clinical setting." },

  // Category: Hero
  { id: 'hero-1', title: "대기실 정면 팔짱낀 샷 (바스트)", text: "Transform this photo to show the same doctor in white medical gown, standing in a modern clinic waiting room with arms crossed, facing the camera with a confident professional smile. Bust shot (chest up, shoulders to head), cinematic bokeh background with softly blurred waiting area featuring comfortable seating. Shot at f/2.8 aperture for beautiful background separation, natural window lighting with soft fill light. Rule of thirds composition, professional environmental portrait with depth and dimension. Background: Welcoming Korean medicine clinic waiting area. Comfortable seating, warm neutral color palette (beige, soft gray, light wood). Natural light from windows, indoor plants adding freshness. Modern minimalist interior with a calming, professional ambiance. Clean and organized space." },
  { id: 'hero-2', title: "진료실 책장 앞 샷", text: "Transform this photo to show the same doctor in white scrubs, standing in front of medical bookshelves in a modern clinic with a professional smile. Medium shot (waist up), shot at f/2.8 for beautiful bokeh, professional environmental portrait with spatial depth and dimensional quality. Background: Modern Korean medicine consultation room with clean, professional atmosphere. Warm white and beige tones, minimalist design with natural wood accents. Soft, even lighting creating a calm, trustworthy mood. Medical books and subtle traditional Korean medicine elements visible. Contemporary furniture with clean lines." },
  { id: 'hero-3', title: "복도 걸어가는 샷", text: "Transform this photo to show the same doctor in white scrubs standing confidently in modern clinic hallway. Medium shot (waist up), shot at f/2.8 for cinematic bokeh, hallway background softly blurred with visible depth. Natural lighting with professional composition, dynamic yet grounded portrait showing confidence. Background: Modern clinic hallway with clean, minimalist design. Bright, well-lit corridor with white walls and natural wood accents. Professional signage, potted plants. Contemporary institutional interior with welcoming atmosphere. Clean lines and organized space." },
  { id: 'hero-4', title: "치료실 침 시술 장면", text: "Doctor in white coat performing acupuncture treatment with hands in focus. Medium shot waist up f/2.8, modern Korean medicine treatment room with white and natural wood design, professional precision technique, contemporary clinical setting." },
  { id: 'hero-5', title: "진료실 의자 앉은 전신 샷", text: "Transform this photo to show the same doctor in white medical gown, sitting comfortably in a modern clinic chair with professional smile. Medium shot (waist up), shot at f/2.5 for pleasant bokeh, relaxed yet professional portrait. Background: Modern Korean medicine consultation room with clean, professional atmosphere. Warm white and beige tones, minimalist design with natural wood accents. Soft, even lighting creating a calm, trustworthy mood. Medical books and subtle traditional Korean medicine elements visible. Contemporary furniture with clean lines." },
  { id: 'hero-6', title: "태블릿 들고 서있는 샷", text: "Transform this photo to show the same doctor in white scrubs holding digital tablet with professional smile. Bust shot (chest up), shot at f/2.5 for pleasant bokeh, clinic interior softly blurred in background. Clean professional lighting, modern tech-savvy portrait with depth and professionalism. Background: Modern Korean medicine consultation room with clean, professional atmosphere. Warm white and beige tones, minimalist design with natural wood accents. Soft, even lighting creating a calm, trustworthy mood. Medical books and subtle traditional Korean medicine elements visible. Contemporary furniture with clean lines." },
  { id: 'hero-7', title: "벽에 기대선 캐주얼 샷", text: "Transform this photo to show the same doctor in white medical gown casually leaning against clinic wall with arms crossed and confident smile. Bust shot (chest up), shot at f/2.2 for smooth bokeh, wall and corridor softly blurred creating depth. Natural directional lighting with professional yet approachable feel, relaxed environmental portrait. Background: Modern Korean medicine consultation room with clean, professional atmosphere. Warm white and beige tones, minimalist design with natural wood accents. Soft, even lighting creating a calm, trustworthy mood. Medical books and subtle traditional Korean medicine elements visible. Contemporary furniture with clean lines." },
  { id: 'hero-8', title: "상담 중 미소 (클로즈업)", text: "Transform this photo to show the same doctor in white medical gown, close-up portrait with a warm, reassuring smile while looking at a patient. Shot at f/1.8 for ultra-shallow depth of field, creamy bokeh background with softly blurred modern clinic interior. Natural soft lighting from window, subtle rim light for depth. Head and shoulders composition, professional headshot style with beautiful background compression. Background: Modern Korean medicine consultation room with clean, professional atmosphere. Warm white and beige tones, minimalist design with natural wood accents. Soft, even lighting creating a calm, trustworthy mood. Medical books and subtle traditional Korean medicine elements visible. Contemporary furniture with clean lines." },
  { id: 'hero-9', title: "문 앞 환영 샷", text: "Transform this photo to show the same doctor in white scrubs at clinic entrance with welcoming gesture and warm smile. Medium shot (waist up), shot at f/2.8 for beautiful bokeh, entrance area softly blurred in background creating depth and warmth. Natural lighting with inviting atmosphere, professional environmental portrait. Background: Professional clinic entrance area. Modern glass doors, reception desk visible. Welcoming atmosphere with clean design, neutral colors (white, beige, natural wood). Bright lighting, indoor plants. Contemporary professional medical facility entrance." },
  { id: 'hero-10', title: "진료실 창가 샷 (바스트)", text: "Transform this photo to show the same doctor in white scrubs, standing near a window in a modern clinic with natural soft lighting. Bust shot (chest up), shot at f/2.0 for creamy bokeh, window backlighting creating beautiful rim light, softly blurred clinic interior in background. Natural window light as key light with subtle fill, professional portrait with dimensional lighting and depth. Background: Modern Korean medicine consultation room with clean, professional atmosphere. Warm white and beige tones, minimalist design with natural wood accents. Soft, even lighting creating a calm, trustworthy mood. Medical books and subtle traditional Korean medicine elements visible. Contemporary furniture with clean lines." },
  { id: 'hero-11', title: "진료실 책상 앞 앉은 샷 (미디엄)", text: "Transform this photo to show the same doctor in white medical gown, sitting at a modern clinic desk with a warm professional smile, looking at camera. Medium shot (waist up), shot at f/2.8 for pleasant bokeh, environmental portrait with layered composition and professional depth of field. Background: Modern Korean medicine consultation room with clean, professional atmosphere. Warm white and beige tones, minimalist design with natural wood accents. Soft, even lighting creating a calm, trustworthy mood. Medical books and subtle traditional Korean medicine elements visible. Contemporary furniture with clean lines." },
];

interface PromptEditorProps {
  isApiKeyReady: boolean;
  openSettings: () => void;
}

const PromptEditor: React.FC<PromptEditorProps> = ({ isApiKeyReady, openSettings }) => {
  const [image, setImage] = useState<ImageFile | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selectedPrompts, setSelectedPrompts] = useState<StoredPrompt[]>([]);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libraryInitialText, setLibraryInitialText] = useState<string | null>(null);

  // Google Drive State
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);

  const handleOpenGoogleDrive = () => {
    setIsDriveModalOpen(true);
  };

  const handleSelectDriveFile = async (fileId: string, mimeType: string, fileName: string) => {
    setIsDriveModalOpen(false);
    setIsLoadingDrive(true);
    try {
      const imageData = await downloadImageFromGoogleDrive(fileId, mimeType);
      handleImageUpload(imageData);
    } catch (err: any) {
      alert(err.message || '이미지를 다운로드할 수 없습니다.');
    } finally {
      setIsLoadingDrive(false);
    }
  };

  const [storedPrompts, setStoredPrompts] = useLocalStorage<StoredPrompt[]>('storedPrompts', defaultPrompts);

  const generationWrapper = useCallback(async (
    baseImage: ImageFile,
    manualPrompt: string,
    libraryPrompts: StoredPrompt[]
  ) => {
    if (libraryPrompts.length > 1) {
      // Multi-prompt library generation (2-4 prompts): 1 image per prompt
      const generationTasks = libraryPrompts.map(p =>
        generateImageWithPrompt(baseImage, p.text, 1)
      );
      const imageArrays = await Promise.all(generationTasks);
      return imageArrays.flat().filter((img): img is string => img !== null);
    } else {
      // Single prompt generation (manual or 1 from library): 4 variations
      const promptToUse = libraryPrompts.length === 1 ? libraryPrompts[0].text : manualPrompt;
      return generateImageWithPrompt(baseImage, promptToUse, 4);
    }
  }, []);

  const {
    isLoading,
    error,
    generatedImages,
    selectedImage,
    setSelectedImage,
    generate,
    regenerate,
    clearResults,
    canRegenerate,
  } = useImageGenerator({ generationFn: generationWrapper });

  const handleImageUpload = (file: ImageFile) => {
    setImage(file);
    clearResults();
  };

  const clearImage = () => {
    setImage(null);
    clearResults();
  }

  const handleSubmit = () => {
    if (!isApiKeyReady) {
      openSettings();
      return;
    }
    if (selectedPrompts.length === 0 && !prompt.trim()) {
      setPromptError('프롬프트를 입력하거나 라이브러리에서 선택해주세요.');
      return;
    }
    setPromptError(null);
    generate(image, prompt, selectedPrompts);
  };

  const handleAddPrompt = (title: string, text: string) => {
    if (title.trim() && text.trim()) {
      const newPrompt = { id: uuidv4(), title, text };
      if (storedPrompts.length >= 50) { // Increased limit
        setStoredPrompts(prev => [newPrompt, ...prev.slice(0, 49)]);
      } else {
        setStoredPrompts(prev => [newPrompt, ...prev]);
      }
    }
  };

  const handleSaveCurrentPrompt = () => {
    if (!prompt.trim()) {
      alert("저장할 프롬프트가 없습니다.");
      return;
    }
    setLibraryInitialText(prompt);
    setIsLibraryOpen(true);
  };

  const handleUpdatePrompt = (id: string, title: string, text: string) => {
    setStoredPrompts(prompts => prompts.map(p => p.id === id ? { ...p, title, text } : p));
  };

  const handleDeletePrompt = (id: string) => {
    setStoredPrompts(prompts => prompts.filter(p => p.id !== id));
  };

  const handleUsePrompt = (prompts: StoredPrompt[]) => {
    setSelectedPrompts(prompts);
    setPrompt('');
    setIsLibraryOpen(false);
  };

  const handleRemoveSelectedPrompt = (idToRemove: string) => {
    setSelectedPrompts(prev => prev.filter(p => p.id !== idToRemove));
  };

  const handleImportPrompts = (importedPrompts: StoredPrompt[]) => {
    setStoredPrompts(currentPrompts => {
      const currentIds = new Set(currentPrompts.map(p => p.id));
      const newPrompts = importedPrompts.filter(p => !currentIds.has(p.id));

      if (newPrompts.length === 0) {
        alert("새로운 프롬프트가 없습니다. 모든 프롬프트가 이미 라이브러리에 존재합니다.");
        return currentPrompts;
      }

      alert(`${newPrompts.length}개의 새로운 프롬프트를 추가했습니다.`);
      return [...newPrompts, ...currentPrompts];
    });
  };

  const handleCloseLibrary = () => {
    setIsLibraryOpen(false);
    setLibraryInitialText(null);
  }

  const renderGenerateButton = () => {
    const isReadyToGenerate = !!prompt.trim() || selectedPrompts.length > 0;
    return (
      <button
        onClick={handleSubmit}
        disabled={isLoading || !isReadyToGenerate || !isApiKeyReady}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white font-bold py-3 px-4 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed text-lg mt-6"
      >
        {isLoading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        ) : (
          <SparklesIcon className="w-6 h-6" />
        )}
        <span>{isLoading ? '생성 중...' : '이미지 생성'}</span>
      </button>
    );
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        <Panel>
          <div className="flex flex-col gap-6 flex-grow">
            <div className="flex flex-col">
              <label className="block text-lg font-semibold mb-2 text-gray-300">1. 이미지 업로드 (선택사항)</label>
              {image ? (
                <div className="relative group h-64 rounded-lg overflow-hidden">
                  <img src={image.base64} alt="업로드된 얼굴" className="w-full h-full object-contain" />
                  <button
                    onClick={clearImage}
                    className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 hover:bg-black/80 transition-opacity"
                    title="이미지 제거"
                    aria-label="이미지 제거"
                  >
                    <XIcon className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="h-64 flex flex-col gap-2">
                  <div className="flex-1">
                    <ImageDropzone onImageUpload={handleImageUpload} label="인물 사진 (PNG, JPG)" showDriveButton={false} />
                  </div>
                  <button
                    onClick={handleOpenGoogleDrive}
                    disabled={isLoadingDrive}
                    className="w-full py-2 bg-blue-600/20 text-blue-300 text-sm rounded-lg hover:bg-blue-600/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span>☁️</span>
                    <span>{isLoadingDrive ? '로딩...' : 'Google Drive에서 가져오기'}</span>
                  </button>
                </div>
              )}
            </div>

            <GoogleDrivePickerModal
              isOpen={isDriveModalOpen}
              onClose={() => setIsDriveModalOpen(false)}
              onSelect={handleSelectDriveFile}
            />

            <div>
              <label htmlFor="prompt-input" className="block text-lg font-semibold mb-2 text-gray-300">2. 변경사항 설명</label>
              {selectedPrompts.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-400 mb-2">선택된 라이브러리 프롬프트:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedPrompts.map(p => (
                      <span key={p.id} className="flex items-center gap-2 bg-indigo-500/20 text-indigo-300 text-sm font-medium px-3 py-1 rounded-full">
                        {p.title}
                        <button onClick={() => handleRemoveSelectedPrompt(p.id)} className="text-indigo-200 hover:text-white" aria-label={`"${p.title}" 프롬프트 제거`}>
                          <XIcon className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-sm text-gray-400 mb-3">
                {(() => {
                  if (selectedPrompts.length === 1) {
                    return '선택된 프롬프트로 4개의 이미지를 생성합니다.';
                  }
                  if (selectedPrompts.length > 1) {
                    return '선택된 프롬프트들로 각각 이미지를 생성합니다.';
                  }
                  return '첨부한 파일의 인물의 얼굴은 그대로 유지하면서, 의상과 배경을 어떻게 바꿀지 설명해주세요.';
                })()}
              </p>
              <div className="flex gap-2">
                <input
                  id="prompt-input"
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={selectedPrompts.length > 0 ? "라이브러리 프롬프트 사용 중" : "예: 미래형 우주복을 입고, 화성에서"}
                  disabled={selectedPrompts.length > 0}
                  className="flex-grow bg-gray-700 text-white placeholder-gray-400 border border-gray-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow disabled:bg-gray-800 disabled:cursor-not-allowed"
                />
                <button
                  onClick={handleSaveCurrentPrompt}
                  className="p-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500 disabled:bg-gray-700 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
                  title="현재 프롬프트 저장"
                  aria-label="현재 프롬프트 라이브러리에 저장"
                  disabled={!prompt.trim() || selectedPrompts.length > 0}
                >
                  <PlusIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setIsLibraryOpen(true)}
                  className="p-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500"
                  title="프롬프트 라이브러리"
                  aria-label="프롬프트 라이브러리 열기"
                >
                  <LibraryIcon className="w-5 h-5" />
                </button>
              </div>
              {promptError && <p className="text-sm text-red-400 mt-2">{promptError}</p>}
            </div>
          </div>

          {renderGenerateButton()}
        </Panel>

        <GenerationResultPanel
          isLoading={isLoading}
          error={error || promptError}
          generatedImages={generatedImages}
          selectedImage={selectedImage}
          onSelectImage={setSelectedImage}
          onRegenerate={regenerate}
          canRegenerate={canRegenerate}
        />
      </div>

      <PromptLibraryModal
        isOpen={isLibraryOpen}
        onClose={handleCloseLibrary}
        prompts={storedPrompts}
        onAddPrompt={handleAddPrompt}
        onUpdatePrompt={handleUpdatePrompt}
        onDeletePrompt={handleDeletePrompt}
        onUsePrompt={handleUsePrompt}
        onImport={handleImportPrompts}
        initialText={libraryInitialText}
      />
    </>
  );
};

export default PromptEditor;
