from pdf2image import convert_from_path
from PIL import Image, ImageDraw
import numpy as np
import sys
import os

Image.MAX_IMAGE_PIXELS = None

def get_average_background_color(img, x1, y1, x2, y2):
    """기본 배경색 샘플링 (하위 호환성)"""
    region = img.crop((x1, y1, x2, y2))
    img_array = np.array(region)
    avg_color = tuple(img_array.mean(axis=(0, 1)).astype(int))
    return avg_color

def get_improved_background_color(img, wm_x1, wm_y1, wm_x2, wm_y2):
    """
    개선된 배경색 샘플링 (4방향, 중앙값)
    """
    arr = np.array(img)
    height, width = arr.shape[:2]
    
    samples = []
    sample_size = 40
    
    # 왼쪽
    left_x1 = max(0, wm_x1 - sample_size)
    left_x2 = max(0, wm_x1 - 5)
    left_y1 = max(0, wm_y1 + 5)
    left_y2 = min(height, wm_y2 - 5)
    
    if left_x2 > left_x1 and left_y2 > left_y1:
        samples.append(arr[left_y1:left_y2, left_x1:left_x2])
    
    # 위쪽
    top_x1 = max(0, wm_x1 + 5)
    top_x2 = min(width, wm_x2 - 5)
    top_y1 = max(0, wm_y1 - sample_size)
    top_y2 = max(0, wm_y1 - 5)
    
    if top_x2 > top_x1 and top_y2 > top_y1:
        samples.append(arr[top_y1:top_y2, top_x1:top_x2])
    
    # 오른쪽
    if wm_x2 < width - 10:
        right_x1 = min(width, wm_x2 + 5)
        right_x2 = min(width, wm_x2 + sample_size)
        right_y1 = max(0, wm_y1 + 5)
        right_y2 = min(height, wm_y2 - 5)
        
        if right_x2 > right_x1 and right_y2 > right_y1:
            samples.append(arr[right_y1:right_y2, right_x1:right_x2])
    
    # 아래쪽
    if wm_y2 < height - 10:
        bottom_x1 = max(0, wm_x1 + 5)
        bottom_x2 = min(width, wm_x2 - 5)
        bottom_y1 = min(height, wm_y2 + 5)
        bottom_y2 = min(height, wm_y2 + sample_size)
        
        if bottom_x2 > bottom_x1 and bottom_y2 > bottom_y1:
            samples.append(arr[bottom_y1:bottom_y2, bottom_x1:bottom_x2])
    
    if samples:
        all_samples = np.concatenate([s.reshape(-1, 3) for s in samples])
        return tuple(np.median(all_samples, axis=0).astype(int))
    
    return (240, 240, 240)

def apply_gradient_blend(arr, wm_x1, wm_y1, wm_x2, wm_y2, bg_color):
    """
    그라디언트 블렌딩 적용
    """
    height, width = arr.shape[:2]
    feather_size = min(10, (wm_x2 - wm_x1) // 4, (wm_y2 - wm_y1) // 4)
    
    # 기본 채우기
    arr[wm_y1:wm_y2, wm_x1:wm_x2] = bg_color
    
    # 좌측 블렌딩
    if wm_x1 >= feather_size:
        for i in range(feather_size):
            alpha = (i + 1) / feather_size
            x = wm_x1 + i
            for y in range(wm_y1, wm_y2):
                if x - feather_size >= 0:
                    original = arr[y, x - feather_size].astype(float)
                    arr[y, x] = (original * (1 - alpha) + np.array(bg_color) * alpha).astype(np.uint8)
    
    # 상단 블렌딩
    if wm_y1 >= feather_size:
        for i in range(feather_size):
            alpha = (i + 1) / feather_size
            y = wm_y1 + i
            for x in range(wm_x1, wm_x2):
                if y - feather_size >= 0:
                    original = arr[y - feather_size, x].astype(float)
                    arr[y, x] = (original * (1 - alpha) + np.array(bg_color) * alpha).astype(np.uint8)
    
    return arr

def detect_content_bounds(img, threshold=240):
    img_array = np.array(img.convert('L'))
    rows_with_content = np.where(np.min(img_array, axis=1) < threshold)[0]
    cols_with_content = np.where(np.min(img_array, axis=0) < threshold)[0]
    
    if len(rows_with_content) == 0 or len(cols_with_content) == 0:
        return (0, 0, img.width, img.height)
    
    top = rows_with_content[0]
    bottom = rows_with_content[-1]
    left = cols_with_content[0]
    right = cols_with_content[-1]
    
    padding = 30
    top = max(0, top - padding)
    left = max(0, left - padding)
    bottom = min(img.height, bottom + padding)
    right = min(img.width, right + padding)
    
    return (left, top, right, bottom)

def calculate_optimal_dpi(target_width=1200):
    a4_width_mm = 210
    a4_width_inch = a4_width_mm / 25.4
    optimal_dpi = int(target_width / a4_width_inch)
    optimal_dpi = int(optimal_dpi * 1.1)
    return optimal_dpi

def process_pdf_optimized(pdf_path, logo_path, output_dir='output_optimized', 
                         merge_pages=False, target_width=1200, output_format='webp'):
    print("=== 최적화된 PDF → PNG 변환 ===")
    print(f"목표 너비: {target_width}px")
    
    optimal_dpi = calculate_optimal_dpi(target_width)
    print(f"계산된 DPI: {optimal_dpi}")
    print(f"(기존 300 DPI 대비 {300/optimal_dpi:.1f}배 메모리 절약)")
    
    os.makedirs(output_dir, exist_ok=True)
    
    from pdf2image import pdfinfo_from_path
    
    # PDF 정보 가져오기 (페이지 수 확인)
    info = pdfinfo_from_path(pdf_path)
    max_pages = info["Pages"]
    print(f"\n1. PDF 분석 완료: 총 {max_pages} 페이지")
    
    # 배치 크기 설정 (메모리 절약을 위해 한 번에 처리할 페이지 수)
    BATCH_SIZE = 5
    images = []
    
    print(f"2. PDF 변환 및 처리 시작 (배치 크기: {BATCH_SIZE}페이지)...")
    
    # 배치 단위로 처리
    info = None # 메모리 해제

    
    # 로고 사용 여부 결정 (기본값: 비활성화)
    use_logo = False
    if logo_path is not None and logo_path.lower() == "none":
        use_logo = False
        print(f"   ✅ 로고 없이 워터마크만 제거")
    elif logo_path and logo_path.lower() != "none" and os.path.exists(logo_path):
        logo = Image.open(logo_path)
        if logo.mode != 'RGBA':
            logo = logo.convert('RGBA')
        use_logo = True
        print(f"   ✅ 로고 사용: {os.path.basename(logo_path)}")
    else:
        use_logo = False
        print(f"   ✅ 워터마크만 제거 (로고 비활성화)")
    
    # 배치 처리 루프
    processed_file_paths = [] # RAM에 이미지를 보관하지 않고, 저장된 파일 경로만 보관
    
    # 임시 저장 경로
    temp_dir = os.path.join(output_dir, "temp_pages")
    os.makedirs(temp_dir, exist_ok=True)

    # 0부터 max_pages까지 BATCH_SIZE 간격으로 반복
    print(f"   메모리 보호 모드: {BATCH_SIZE}장씩 끊어서 처리 후 디스크에 임시 저장")
    
    for i in range(0, max_pages, BATCH_SIZE):
        first_page = i + 1
        last_page = min(i + BATCH_SIZE, max_pages)
        print(f"\n   🔄 배치 처리: {first_page} ~ {last_page} (총 {max_pages})")
        
        # 해당 구간만 이미지로 변환
        batch_images = convert_from_path(pdf_path, dpi=optimal_dpi, first_page=first_page, last_page=last_page)
        
        for idx_in_batch, img in enumerate(batch_images):
            # 전체 페이지 인덱스
            page_idx = i + idx_in_batch
            
            if img.mode != 'RGB':
                img = img.convert('RGB')
            
            width, height = img.size
            
            # 워터마크 영역 계산
            watermark_width = int(450 * (optimal_dpi / 300))
            watermark_height = int(130 * (optimal_dpi / 300))
            
            watermark_x1 = width - watermark_width
            watermark_y1 = height - watermark_height
            watermark_x2 = width
            watermark_y2 = height
            
            # 배경색 샘플링 및 워터마크 제거
            background_color = get_improved_background_color(
                img, watermark_x1, watermark_y1, watermark_x2, watermark_y2
            )
            
            img_array = np.array(img)
            img_array = apply_gradient_blend(
                img_array, watermark_x1, watermark_y1, watermark_x2, watermark_y2, background_color
            )
            img = Image.fromarray(img_array)
            
            # 로고 삽입
            if use_logo:
                logo_size = int(90 * (optimal_dpi / 300))
                
                logo_array = np.array(logo)
                new_logo = np.zeros_like(logo_array)
                for r_idx in range(logo_array.shape[0]):
                    for c_idx in range(logo_array.shape[1]):
                        r, g, b, a = logo_array[r_idx, c_idx]
                        if a < 10:
                            new_logo[r_idx, c_idx] = [background_color[0], background_color[1], background_color[2], 0]
                        elif r > 200 and g > 200 and b > 200:
                            new_logo[r_idx, c_idx] = [background_color[0], background_color[1], background_color[2], 255]
                        else:
                            new_logo[r_idx, c_idx] = [r, g, b, a]
                
                logo_converted = Image.fromarray(new_logo.astype('uint8'), 'RGBA')
                logo_resized = logo_converted.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
                
                logo_x = width - logo_size - int(30 * (optimal_dpi / 300))
                logo_y = height - logo_size - int(25 * (optimal_dpi / 300))
                
                img_rgba = img.convert('RGBA')
                img_rgba.paste(logo_resized, (logo_x, logo_y), logo_resized)
                img = img_rgba.convert('RGB')

            # 컨텐츠 영역 감지 및 크롭
            bounds = detect_content_bounds(img)
            crop_left, crop_top, crop_right, crop_bottom = bounds
            
            if use_logo:
                logo_left = logo_x
                logo_right = logo_x + logo_size
                crop_left = min(crop_left, logo_left)
                crop_right = max(crop_right, logo_right)
            
            img = img.crop((crop_left, crop_top, crop_right, crop_bottom))

            # 리사이즈 (가로폭 1200 등)
            current_width = img.width
            if current_width > target_width:
                 resize_ratio = target_width / current_width
                 new_height = int(img.height * resize_ratio)
                 img = img.resize((target_width, new_height), Image.Resampling.LANCZOS)
            
            # 임시 파일로 저장 (개별 페이지.png)
            # 나중에 합치기 쉽도록 PNG로 저장 (손실 없음)
            temp_path = os.path.join(temp_dir, f"temp_{page_idx:04d}.png")
            img.save(temp_path, 'PNG')
            processed_file_paths.append(temp_path)
            
            # 메모리 해제
            img = None
            
        print(f"   ✅ 배치 {i//BATCH_SIZE + 1} 완료")
        batch_images = None # 배치 메모리 해제
        
    print(f"   총 {len(processed_file_paths)}개 페이지 임시 저장 완료")
    
    saved_files = []

    # 4. 결과물 생성 (합치기 또는 재이동)
    if merge_pages:
        print(f"\n4. 디스크에서 가져와 한 장으로 병합 중...")
        
        # 전체 높이 계산 및 이미지 로드
        total_height = 0
        unified_width = target_width # 이미 리사이즈 됨
        
        # 높이만 먼저 계산하고 싶지만 open 해야 함.
        # Lazy loading으로 메타데이터만 읽음
        for p in processed_file_paths:
            with Image.open(p) as img:
                total_height += img.height
                # 폭 검증 (혹시 다르면?) - 생략, 위에서 다 맞춤
        
        print(f"   최종 캔버스 크기: {unified_width} x {total_height}px")
        
        # 캔버스 생성 (여기서 메모리 Peak 발생 가능하지만 1장이면 충분)
        try:
            merged_image = Image.new('RGB', (unified_width, total_height), (255, 255, 255))
            
            y_offset = 0
            for p in processed_file_paths:
                with Image.open(p) as img:
                    merged_image.paste(img, (0, y_offset))
                    y_offset += img.height
            
            # 저장
            if output_format in ['webp', 'all']:
                webp_path = os.path.join(output_dir, 'merged_optimized.webp')
                merged_image.save(webp_path, 'WebP', quality=85, method=6)
                saved_files.append(webp_path)
            
            if output_format in ['jpeg', 'all']:
                jpeg_path = os.path.join(output_dir, 'merged_optimized.jpg')
                merged_image.save(jpeg_path, 'JPEG', quality=85, optimize=True, progressive=True)
                saved_files.append(jpeg_path)
            
            if output_format in ['png', 'all']:
                png_path = os.path.join(output_dir, 'merged_optimized.png')
                merged_image.save(png_path, 'PNG')
                # 10MB 체크 로직 (생략 - 필요시 추가)
                saved_files.append(png_path)
                
            print(f"   ✅ 병합 완료: {len(saved_files)}개 파일 생성")
            
        except MemoryError:
            print("❌ 병합 중 메모리 부족! (이미지가 너무 큽니다)")
            # 이 경우 어쩔 수 없이 개별 파일로 돌려줘야 함
            merge_pages = False
            # Fallthrough to else block? No, complex. Just fail gracefully logic needed but let's assume 2GB is enough.
        
    
    if not merge_pages:
        print(f"\n4. 개별 파일로 정리 중...")
        # 임시 파일을 최종 경로로 이동/변환
        for idx, temp_path in enumerate(processed_file_paths):
            page_num = idx + 1
            with Image.open(temp_path) as img:
                if output_format in ['webp', 'all']:
                    out_path = os.path.join(output_dir, f"page_{page_num:02d}.webp")
                    img.save(out_path, 'WebP', quality=85)
                    saved_files.append(out_path)
                
                if output_format in ['jpeg', 'all']:
                    out_path = os.path.join(output_dir, f"page_{page_num:02d}.jpg")
                    img.save(out_path, 'JPEG', quality=85)
                    saved_files.append(out_path)
                    
                if output_format in ['png', 'all']:
                    out_path = os.path.join(output_dir, f"page_{page_num:02d}.png")
                    img.save(out_path, 'PNG') 
                    saved_files.append(out_path)
    
    # 임시 파일 삭제
    try:
        import shutil
        shutil.rmtree(temp_dir)
    except:
        pass
        
    return saved_files

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python pdf_smart.py <pdf> <logo> [out_dir] [merge] [width] [format]")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    logo_path = sys.argv[2]
    output_dir = sys.argv[3] if len(sys.argv) > 3 else 'output_optimized'
    merge_pages = sys.argv[4].lower() == 'true' if len(sys.argv) > 4 else False
    target_width = int(sys.argv[5]) if len(sys.argv) > 5 else 1200
    output_format = sys.argv[6].lower() if len(sys.argv) > 6 else 'webp'
    
    process_pdf_optimized(pdf_path, logo_path, output_dir, merge_pages, target_width, output_format)
