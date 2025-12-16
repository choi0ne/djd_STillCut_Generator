from PIL import Image
import os
import sys

def merge_png_images(image_dir, output_path='merged_selected.png'):
    print("=== PNG 이미지 합치기 ===")
    
    if isinstance(image_dir, str):
        if os.path.isdir(image_dir):
            image_files = []
            for filename in sorted(os.listdir(image_dir)):
                if filename.lower().endswith('.png'):
                    image_files.append(os.path.join(image_dir, filename))
        else:
            print(f"❌ 오류: '{image_dir}'는 디렉토리가 아닙니다.")
            return None
    else:
        image_files = image_dir
    
    if not image_files:
        print("❌ PNG 파일을 찾을 수 없습니다.")
        return None
    
    print(f"1. {len(image_files)}개의 PNG 파일 발견")
    for idx, filepath in enumerate(image_files, 1):
        print(f"   {idx}. {os.path.basename(filepath)}")
    
    print("\n2. 이미지 로드 중...")
    images = []
    for filepath in image_files:
        try:
            img = Image.open(filepath)
            if img.mode != 'RGB':
                img = img.convert('RGB')
            images.append(img)
            print(f"   ✅ {os.path.basename(filepath)}: {img.width} x {img.height}")
        except Exception as e:
            print(f"   ❌ 오류: {os.path.basename(filepath)} - {str(e)}")
    
    if not images:
        print("❌ 로드할 수 있는 이미지가 없습니다.")
        return None
    
    widths = [img.width for img in images]
    if len(set(widths)) > 1:
        print(f"\n⚠️  경고: 이미지 너비가 다릅니다: {set(widths)}")
        print("   가장 큰 너비로 통일합니다.")
        max_width = max(widths)
    else:
        max_width = widths[0]
    
    total_height = sum(img.height for img in images)
    
    print(f"\n3. 이미지 합치는 중...")
    print(f"   최종 크기: {max_width} x {total_height}")
    
    merged_image = Image.new('RGB', (max_width, total_height), (255, 255, 255))
    
    y_offset = 0
    for idx, img in enumerate(images, 1):
        x_offset = (max_width - img.width) // 2
        merged_image.paste(img, (x_offset, y_offset))
        print(f"   페이지 {idx}: Y 위치 {y_offset}")
        y_offset += img.height
    
    print(f"\n4. 저장 중...")
    merged_image.save(output_path, 'PNG', quality=95)
    
    print(f"✅ 완료! {output_path}로 저장되었습니다.")
    return output_path

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python merge_png.py <dir_or_file1> [file2] ... [output]")
        sys.exit(1)
    
    args = sys.argv[1:]
    
    if args[-1].endswith('.png') and not os.path.exists(args[-1]):
        output_path = args[-1]
        inputs = args[:-1]
    else:
        output_path = 'merged_output.png'
        inputs = args
    
    if len(inputs) == 1 and os.path.isdir(inputs[0]):
        merge_png_images(inputs[0], output_path)
    else:
        merge_png_images(inputs, output_path)
