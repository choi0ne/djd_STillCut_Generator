from PIL import Image
import sys
import os

Image.MAX_IMAGE_PIXELS = None

input_path = sys.argv[1]
output_webp = sys.argv[2] if len(sys.argv) > 2 else 'optimized.webp'
output_jpeg = output_webp.replace('.webp', '.jpg')

print("=== 블로그 이미지 최적화 ===")

img = Image.open(input_path)
if img.mode == 'RGBA':
    background = Image.new('RGB', img.size, (255, 255, 255))
    background.paste(img, mask=img.split()[3])
    img = background
elif img.mode != 'RGB':
    img = img.convert('RGB')

original_width, original_height = img.size
print(f"원본: {original_width} x {original_height}px")

if original_width > 1200:
    ratio = 1200 / original_width
    new_height = int(original_height * ratio)
    img = img.resize((1200, new_height), Image.Resampling.LANCZOS)
    print(f"조정: 1200 x {new_height}px")

img.save(output_webp, 'WebP', quality=85, method=6)
img.save(output_jpeg, 'JPEG', quality=85, optimize=True, progressive=True)

webp_kb = os.path.getsize(output_webp) / 1024
jpeg_kb = os.path.getsize(output_jpeg) / 1024

print(f"\n✅ WebP: {output_webp} ({webp_kb:.0f} KB)")
print(f"✅ JPEG: {output_jpeg} ({jpeg_kb:.0f} KB)")
