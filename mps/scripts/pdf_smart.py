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
    
    print(f"\n1. PDF를 이미지로 변환 중... (DPI: {optimal_dpi})")
    images = convert_from_path(pdf_path, dpi=optimal_dpi)
    print(f"   총 {len(images)} 페이지 변환 완료")
    
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
    
    print("\n2. 모든 페이지의 좌우 여백 분석 중...")
    min_left = float('inf')
    max_right = 0
    
    for idx, img in enumerate(images):
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        bounds = detect_content_bounds(img)
        crop_left, _, crop_right, _ = bounds
        
        min_left = min(min_left, crop_left)
        max_right = max(max_right, crop_right)
    
    print(f"   전체 최소 좌측: {min_left}")
    print(f"   전체 최대 우측: {max_right}")
    unified_width = max_right - min_left
    print(f"   통일된 너비: {unified_width}px")
    
    needs_final_resize = unified_width > target_width
    if needs_final_resize:
        resize_ratio = target_width / unified_width
        print(f"   📏 최종 리사이즈 필요: {unified_width}px → {target_width}px (비율: {resize_ratio:.2%})")
    
    print(f"\n3. 페이지 처리 중...")
    processed_images = []
    
    for idx, img in enumerate(images):
        if img.mode != 'RGB':
            img = img.convert('RGB')
        
        width, height = img.size
        
        watermark_width = int(450 * (optimal_dpi / 300))
        watermark_height = int(130 * (optimal_dpi / 300))
        
        watermark_x1 = width - watermark_width
        watermark_y1 = height - watermark_height
        watermark_x2 = width
        watermark_y2 = height
        
        # 개선된 배경색 샘플링 (4방향, 중앙값)
        background_color = get_improved_background_color(
            img, watermark_x1, watermark_y1, watermark_x2, watermark_y2
        )
        
        # 그라디언트 블렌딩 적용
        img_array = np.array(img)
        img_array = apply_gradient_blend(
            img_array, watermark_x1, watermark_y1, watermark_x2, watermark_y2, background_color
        )
        img = Image.fromarray(img_array)
        
        # 로고 삽입 (선택적)
        if use_logo:
            logo_size = int(90 * (optimal_dpi / 300))
            logo_array = np.array(logo)
            new_logo = np.zeros_like(logo_array)
            
            for i in range(logo_array.shape[0]):
                for j in range(logo_array.shape[1]):
                    r, g, b, a = logo_array[i, j]
                    
                    if a < 10:
                        new_logo[i, j] = [background_color[0], background_color[1], background_color[2], 0]
                    elif r > 200 and g > 200 and b > 200:
                        new_logo[i, j] = [background_color[0], background_color[1], background_color[2], 255]
                    else:
                        new_logo[i, j] = [r, g, b, a]
            
            logo_converted = Image.fromarray(new_logo.astype('uint8'), 'RGBA')
            logo_resized = logo_converted.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
            
            logo_x = width - logo_size - int(30 * (optimal_dpi / 300))
            logo_y = height - logo_size - int(25 * (optimal_dpi / 300))
            
            img_rgba = img.convert('RGBA')
            img_rgba.paste(logo_resized, (logo_x, logo_y), logo_resized)
            img = img_rgba.convert('RGB')
        
        # 크롭 영역 계산
        crop_left = min_left
        crop_right = max_right
        crop_top = 0
        crop_bottom = height
        
        # 로고가 있으면 로고도 포함하도록 크롭 영역 조정
        if use_logo:
            logo_left = logo_x
            logo_right = logo_x + logo_size
            crop_left = min(crop_left, logo_left)
            crop_right = max(crop_right, logo_right)
        
        # 크롭
        img = img.crop((crop_left, crop_top, crop_right, crop_bottom))
        
        processed_images.append(img)
        
        if (idx + 1) % 5 == 0:
            print(f"   처리 완료: {idx + 1}/{len(images)} 페이지")
    
    print(f"   ✅ 모든 페이지 처리 완료")
    
    if merge_pages:
        print(f"\n4. 한 장으로 합치는 중...")
        
        total_height = sum(img.height for img in processed_images)
        unified_width = processed_images[0].width
        
        merged_image = Image.new('RGB', (unified_width, total_height), (255, 255, 255))
        
        y_offset = 0
        for img in processed_images:
            merged_image.paste(img, (0, y_offset))
            y_offset += img.height
        
        print(f"   최종 크기: {unified_width} x {total_height}px")
        
        if needs_final_resize:
            print(f"   📏 최종 리사이즈 실행 중...")
            final_height = int(total_height * resize_ratio)
            merged_image = merged_image.resize((target_width, final_height), Image.Resampling.LANCZOS)
            print(f"   ✅ 리사이즈 완료: {target_width} x {final_height}px")
            unified_width = target_width
            total_height = final_height
        
        saved_files = []
        
        if output_format in ['webp', 'all']:
            webp_path = os.path.join(output_dir, 'merged_optimized.webp')
            merged_image.save(webp_path, 'WebP', quality=85, method=6)
            webp_kb = os.path.getsize(webp_path) / 1024
            print(f"   ✅ WebP: {webp_path} ({webp_kb:.0f} KB)")
            saved_files.append(webp_path)
        
        if output_format in ['jpeg', 'all']:
            jpeg_path = os.path.join(output_dir, 'merged_optimized.jpg')
            merged_image.save(jpeg_path, 'JPEG', quality=85, optimize=True, progressive=True)
            jpeg_kb = os.path.getsize(jpeg_path) / 1024
            print(f"   ✅ JPEG: {jpeg_path} ({jpeg_kb:.0f} KB)")
            saved_files.append(jpeg_path)
        
        if output_format in ['png', 'all']:
            png_path = os.path.join(output_dir, 'merged_optimized.png')
            merged_image.save(png_path, 'PNG')
            png_size_mb = os.path.getsize(png_path) / (1024 * 1024)
            png_kb = os.path.getsize(png_path) / 1024
            
            # 10MB 초과 시 자동 압축
            if png_size_mb > 10:
                print(f"   ⚠️ PNG 용량이 10MB를 초과했습니다 ({png_size_mb:.2f} MB)")
                print(f"   네이버 블로그 업로드 한도에 맞춰 자동 압축합니다...")
                
                # 이미 리사이즈되어 있으므로 optimize만 적용
                merged_image.save(png_path, 'PNG', optimize=True)
                png_size_mb = os.path.getsize(png_path) / (1024 * 1024)
                png_kb = os.path.getsize(png_path) / 1024
                
                if png_size_mb <= 10:
                    print(f"   ✅ 압축 완료: {png_size_mb:.2f} MB")
                else:
                    print(f"   ⚠️ PNG로는 10MB 이하 압축 불가능 ({png_size_mb:.2f} MB)")
                    print(f"   💡 WebP 또는 JPEG 파일을 사용하세요")
            
            print(f"   ✅ PNG: {png_path} ({png_kb:.0f} KB)")
            saved_files.append(png_path)
        
        return saved_files
    else:
        print(f"\n4. 개별 파일로 저장 중...")
        saved_files = []
        
        for idx, img in enumerate(processed_images):
            page_num = idx + 1
            
            if needs_final_resize:
                new_height = int(img.height * resize_ratio)
                img = img.resize((target_width, new_height), Image.Resampling.LANCZOS)
            
            if output_format in ['webp', 'all']:
                webp_path = os.path.join(output_dir, f"page_{page_num:02d}.webp")
                img.save(webp_path, 'WebP', quality=85, method=6)
                saved_files.append(webp_path)
            
            if output_format in ['jpeg', 'all']:
                jpeg_path = os.path.join(output_dir, f"page_{page_num:02d}.jpg")
                img.save(jpeg_path, 'JPEG', quality=85, optimize=True, progressive=True)
                saved_files.append(jpeg_path)
            
            if output_format in ['png', 'all']:
                png_path = os.path.join(output_dir, f"page_{page_num:02d}.png")
                img.save(png_path, 'PNG')
                
                # 10MB 초과 체크
                png_size_mb = os.path.getsize(png_path) / (1024 * 1024)
                if png_size_mb > 10:
                    # optimize 옵션으로 재저장
                    img.save(png_path, 'PNG', optimize=True)
                    png_size_mb = os.path.getsize(png_path) / (1024 * 1024)
                    
                    if png_size_mb > 10:
                        print(f"   ⚠️ 페이지 {page_num}: PNG {png_size_mb:.2f} MB (10MB 초과)")
                
                saved_files.append(png_path)
        
        print(f"   ✅ {len(saved_files)}개 파일 저장 완료")
        
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
