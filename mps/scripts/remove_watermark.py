from PIL import Image, ImageDraw
import numpy as np
import sys
import os

Image.MAX_IMAGE_PIXELS = None

def get_available_logos():
    """사용 가능한 로고 목록 반환"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    logos_dir = os.path.join(os.path.dirname(script_dir), 'logos')
    
    if not os.path.exists(logos_dir):
        return {}
    
    logos = {}
    for filename in os.listdir(logos_dir):
        if filename.lower().endswith(('.png', '.jpg', '.jpeg')):
            name = os.path.splitext(filename)[0]
            logos[name] = os.path.join(logos_dir, filename)
    
    return logos

def get_watermark_region(width, height):
    """
    NotebookLM 워터마크의 정밀한 영역
    
    실측: 137x13px
    여유: 150x35px
    """
    if width >= 1000:
        offset_right = 9
        offset_bottom = 8
        wm_width = 150
        wm_height = 35
    else:
        offset_right = 1
        offset_bottom = 1
        wm_width = 150
        wm_height = 40
    
    x1 = width - wm_width - offset_right
    y1 = height - wm_height - offset_bottom
    x2 = width - offset_right
    y2 = height - offset_bottom
    
    return {
        'x1': x1,
        'y1': y1,
        'x2': x2,
        'y2': y2,
        'width': wm_width,
        'height': wm_height,
        'offset_right': offset_right,
        'offset_bottom': offset_bottom
    }

def get_local_background_color(img, wm_x1, wm_y1, wm_x2, wm_y2):
    """
    워터마크 주변 4방향에서 배경색 샘플링 (개선된 버전)
    
    - 왼쪽, 위쪽, 오른쪽, 아래쪽에서 각각 샘플링
    - 중앙값(median)을 사용하여 이상치 제거
    - 더 자연스러운 배경색 추출
    """
    arr = np.array(img)
    height, width = arr.shape[:2]
    
    samples = []
    sample_size = 40  # 샘플링 영역 크기
    
    # 1. 왼쪽 샘플링
    left_x1 = max(0, wm_x1 - sample_size)
    left_x2 = max(0, wm_x1 - 5)
    left_y1 = max(0, wm_y1 + 5)
    left_y2 = min(height, wm_y2 - 5)
    
    if left_x2 > left_x1 and left_y2 > left_y1:
        left_sample = arr[left_y1:left_y2, left_x1:left_x2]
        samples.append(left_sample)
    
    # 2. 위쪽 샘플링
    top_x1 = max(0, wm_x1 + 5)
    top_x2 = min(width, wm_x2 - 5)
    top_y1 = max(0, wm_y1 - sample_size)
    top_y2 = max(0, wm_y1 - 5)
    
    if top_x2 > top_x1 and top_y2 > top_y1:
        top_sample = arr[top_y1:top_y2, top_x1:top_x2]
        samples.append(top_sample)
    
    # 3. 오른쪽 샘플링 (워터마크가 우측 끝이 아닌 경우)
    if wm_x2 < width - 10:
        right_x1 = min(width, wm_x2 + 5)
        right_x2 = min(width, wm_x2 + sample_size)
        right_y1 = max(0, wm_y1 + 5)
        right_y2 = min(height, wm_y2 - 5)
        
        if right_x2 > right_x1 and right_y2 > right_y1:
            right_sample = arr[right_y1:right_y2, right_x1:right_x2]
            samples.append(right_sample)
    
    # 4. 아래쪽 샘플링 (워터마크가 하단 끝이 아닌 경우)
    if wm_y2 < height - 10:
        bottom_x1 = max(0, wm_x1 + 5)
        bottom_x2 = min(width, wm_x2 - 5)
        bottom_y1 = min(height, wm_y2 + 5)
        bottom_y2 = min(height, wm_y2 + sample_size)
        
        if bottom_x2 > bottom_x1 and bottom_y2 > bottom_y1:
            bottom_sample = arr[bottom_y1:bottom_y2, bottom_x1:bottom_x2]
            samples.append(bottom_sample)
    
    # 모든 샘플의 중앙값 사용 (이상치 제거)
    if samples:
        all_samples = np.concatenate([s.reshape(-1, 3) for s in samples])
        bg_color = tuple(np.median(all_samples, axis=0).astype(int))
        return bg_color
    
    return (240, 240, 240)

def create_gradient_fill(img, wm_x1, wm_y1, wm_x2, wm_y2, bg_color):
    """
    워터마크 영역을 그라디언트로 부드럽게 채우기
    
    - 주변 픽셀과 자연스럽게 블렌딩
    - 경계 부분에 페더링 적용
    - 더 자연스러운 결과
    """
    arr = np.array(img)
    height, width = arr.shape[:2]
    
    # 워터마크 영역 크기
    wm_width = wm_x2 - wm_x1
    wm_height = wm_y2 - wm_y1
    
    # 페더링 영역 크기 (경계를 부드럽게)
    feather_size = min(10, wm_width // 4, wm_height // 4)
    
    # 배경색으로 기본 채우기
    arr[wm_y1:wm_y2, wm_x1:wm_x2] = bg_color
    
    # 좌측 경계 블렌딩
    if wm_x1 >= feather_size:
        for i in range(feather_size):
            t = (i + 1) / feather_size
            alpha = t * t * (3 - 2 * t) # Smoothstep blending
            x = wm_x1 + i
            # 왼쪽 원본 픽셀과 블렌딩
            for y in range(wm_y1, wm_y2):
                if x - feather_size >= 0:
                    original = arr[y, x - feather_size].astype(float)
                    blended = original * (1 - alpha) + np.array(bg_color) * alpha
                    arr[y, x] = blended.astype(np.uint8)
    
    # 상단 경계 블렌딩
    if wm_y1 >= feather_size:
        for i in range(feather_size):
            t = (i + 1) / feather_size
            alpha = t * t * (3 - 2 * t)
            y = wm_y1 + i
            # 위쪽 원본 픽셀과 블렌딩
            for x in range(wm_x1, wm_x2):
                if y - feather_size >= 0:
                    original = arr[y - feather_size, x].astype(float)
                    blended = original * (1 - alpha) + np.array(bg_color) * alpha
                    arr[y, x] = blended.astype(np.uint8)
    
    # 우측 경계 블렌딩 (워터마크가 이미지 끝이 아닌 경우)
    if wm_x2 < width - feather_size:
        for i in range(feather_size):
            t = (i + 1) / feather_size
            alpha = 1 - (t * t * (3 - 2 * t))
            x = wm_x2 - 1 - i
            # 오른쪽 원본 픽셀과 블렌딩
            for y in range(wm_y1, wm_y2):
                if x + feather_size < width:
                    original = arr[y, x + feather_size].astype(float)
                    blended = np.array(bg_color) * alpha + original * (1 - alpha)
                    arr[y, x] = blended.astype(np.uint8)
    
    # 하단 경계 블렌딩 (워터마크가 이미지 끝이 아닌 경우)
    if wm_y2 < height - feather_size:
        for i in range(feather_size):
            t = (i + 1) / feather_size
            alpha = 1 - (t * t * (3 - 2 * t))
            y = wm_y2 - 1 - i
            # 아래쪽 원본 픽셀과 블렌딩
            for x in range(wm_x1, wm_x2):
                if y + feather_size < height:
                    original = arr[y + feather_size, x].astype(float)
                    blended = np.array(bg_color) * alpha + original * (1 - alpha)
                    arr[y, x] = blended.astype(np.uint8)
    
    return Image.fromarray(arr)

def remove_watermark(image_path, logo_path=None, output_path=None):
    """
    NotebookLM 워터마크 제거 + 로고 삽입 (선택)
    
    워터마크: 150 x 35px (최소)
    로고: 40px (원래 크기)
    
    Parameters:
    - image_path: 입력 이미지 경로
    - logo_path: 로고 경로/이름 (None=기본, "none"=로고없음)
    - output_path: 출력 경로 (None=자동생성)
    """
    print(f"=== NotebookLM 워터마크 제거 ===")
    
    # 로고 사용 여부 결정 (기본값: 비활성화)
    use_logo = False
    if logo_path is not None and logo_path.lower() == "none":
        use_logo = False
        print(f"✅ 로고 없이 워터마크만 제거")
    elif logo_path is None:
        use_logo = False
        print(f"✅ 워터마크만 제거 (로고 비활성화)")
    elif not os.path.exists(logo_path):
        available_logos = get_available_logos()
        if logo_path in available_logos:
            logo_path = available_logos[logo_path]
            use_logo = True
            print(f"✅ 로고 선택: {os.path.basename(logo_path)}")
        else:
            print(f"❌ 오류: 로고를 찾을 수 없습니다: {logo_path}")
            print(f"\n사용 가능한 로고:")
            for name in available_logos.keys():
                print(f"  - {name}")
            sys.exit(1)
    else:
        use_logo = True
        print(f"✅ 커스텀 로고: {logo_path}")
    
    if use_logo and not os.path.exists(logo_path):
        print(f"❌ 오류: 로고 파일 없음: {logo_path}")
        sys.exit(1)
    
    if output_path is None:
        base, ext = os.path.splitext(image_path)
        output_path = f"{base}_clean{ext}"
    
    # 이미지 로드
    img = Image.open(image_path)
    if img.mode != 'RGB':
        img = img.convert('RGB')
    
    width, height = img.size
    print(f"이미지 크기: {width} x {height}px")
    
    # 워터마크 영역
    wm = get_watermark_region(width, height)
    
    print(f"워터마크 제거: {wm['width']} x {wm['height']}px")
    print(f"  좌표: ({wm['x1']}, {wm['y1']}) → ({wm['x2']}, {wm['y2']})")
    
    # 배경색 (4방향 샘플링, 중앙값 사용)
    background_color = get_local_background_color(img, wm['x1'], wm['y1'], wm['x2'], wm['y2'])
    print(f"배경색: RGB{background_color}")
    
    # 워터마크 제거 (그라디언트 블렌딩 적용)
    print(f"  그라디언트 블렌딩 적용 중...")
    img = create_gradient_fill(img, wm['x1'], wm['y1'], wm['x2'], wm['y2'], background_color)
    print(f"✅ 워터마크 제거 완료 (자연스러운 블렌딩)")
    
    # 로고 삽입
    if use_logo:
        logo = Image.open(logo_path)
        if logo.mode != 'RGBA':
            logo = logo.convert('RGBA')
        
        # 로고 색상 변환
        logo_array = np.array(logo)
        new_logo = np.zeros_like(logo_array)
        
        for i in range(logo_array.shape[0]):
            for j in range(logo_array.shape[1]):
                r, g, b, a = logo_array[i, j]
                
                if a < 10:
                    new_logo[i, j] = [background_color[0], background_color[1], 
                                     background_color[2], 0]
                elif r > 200 and g > 200 and b > 200:
                    new_logo[i, j] = [background_color[0], background_color[1], 
                                     background_color[2], 255]
                else:
                    new_logo[i, j] = [r, g, b, a]
        
        logo_converted = Image.fromarray(new_logo.astype('uint8'), 'RGBA')
        
        # 로고 크기: 40px (원래대로)
        logo_size = 40
        logo_resized = logo_converted.resize((logo_size, logo_size), 
                                            Image.Resampling.LANCZOS)
        
        # 로고 위치 (워터마크 영역 중앙)
        center_x = (wm['x1'] + wm['x2']) // 2
        center_y = (wm['y1'] + wm['y2']) // 2
        logo_x = center_x - logo_size // 2
        logo_y = center_y - logo_size // 2
        
        print(f"로고: {logo_size}px")
        
        # 합성
        img_rgba = img.convert('RGBA')
        img_rgba.paste(logo_resized, (logo_x, logo_y), logo_resized)
        img = img_rgba.convert('RGB')
        
        print(f"✅ 로고 삽입 완료")
    
    # 저장
    img.save(output_path, 'PNG', quality=95)
    
    file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
    file_kb = os.path.getsize(output_path) / 1024
    
    # 10MB 초과 시 자동 압축
    if file_size_mb > 10:
        print(f"\n⚠️ PNG 용량이 10MB를 초과했습니다 ({file_size_mb:.2f} MB)")
        print(f"   네이버 블로그 업로드 한도에 맞춰 자동 압축합니다...")
        
        original_width, original_height = img.size
        
        # 1단계: 1200px로 리사이즈
        if original_width > 1200:
            target_width = 1200
            aspect_ratio = original_height / original_width
            target_height = int(target_width * aspect_ratio)
            
            img_resized = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
            print(f"   리사이즈: {original_width}px → {target_width}px")
            
            # 리사이즈된 이미지 저장
            img_resized.save(output_path, 'PNG', optimize=True)
            file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
            file_kb = os.path.getsize(output_path) / 1024
            
            print(f"   압축 후: {file_size_mb:.2f} MB")
        
        # 2단계: 여전히 10MB 초과면 JPEG로 변환
        if file_size_mb > 10:
            print(f"   PNG로는 10MB 이하 압축 불가능")
            print(f"   JPEG로 변환합니다...")
            
            # JPEG로 변환
            base, _ = os.path.splitext(output_path)
            jpg_path = f"{base}.jpg"
            
            rgb_img = img.convert('RGB') if img.mode != 'RGB' else img
            quality = 85
            rgb_img.save(jpg_path, 'JPEG', quality=quality, optimize=True)
            jpg_size = os.path.getsize(jpg_path) / (1024 * 1024)
            
            # 10MB 이하가 될 때까지 품질 낮추기
            while jpg_size > 10 and quality > 60:
                quality -= 5
                rgb_img.save(jpg_path, 'JPEG', quality=quality, optimize=True)
                jpg_size = os.path.getsize(jpg_path) / (1024 * 1024)
            
            print(f"   JPEG 저장: {jpg_path}")
            print(f"   용량: {jpg_size:.2f} MB (품질 {quality}%)")
            print(f"\n✅ PNG는 고품질 원본으로 유지됩니다")
            print(f"   PNG: {output_path} ({file_size_mb:.2f} MB)")
            print(f"   JPEG: {jpg_path} ({jpg_size:.2f} MB) ⭐ 블로그 업로드용")
        else:
            print(f"✅ 압축 완료: {file_size_mb:.2f} MB (10MB 이하)")
    
    print(f"\n✅ 저장: {output_path} ({file_kb:.0f} KB)")
    
    return output_path

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python remove_watermark.py <image> [logo] [output]")
        print("\n💡 NotebookLM 워터마크 제거:")
        print("  - 제거 영역: 150 x 35px (최소)")
        print("  - 로고 크기: 40px")
        print("\n💡 로고 옵션 (기본: 비활성화):")
        print("  - 미지정 또는 none: 워터마크만 제거")
        print("  - 로고 경로 지정: 해당 로고 삽입")
        print("  - 로고명: favicon, horizontal 등")
        print("\n📋 사용 가능한 로고:")
        
        available_logos = get_available_logos()
        if available_logos:
            for name in sorted(available_logos.keys()):
                print(f"  ✅ {name}")
        else:
            print("  (로고 없음)")
        
        print("\n📝 Examples:")
        print("  python remove_watermark.py input.png")
        print("    → 워터마크만 제거 (로고 비활성화)")
        print()
        print("  python remove_watermark.py input.png favicon")
        print("    → 워터마크 제거 + favicon 로고 (40px)")
        sys.exit(1)
    
    image_path = sys.argv[1]
    logo_path = sys.argv[2] if len(sys.argv) > 2 else None
    output_path = sys.argv[3] if len(sys.argv) > 3 else None
    
    remove_watermark(image_path, logo_path, output_path)
