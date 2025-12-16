from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import uvicorn
import shutil
import os
import subprocess
import uuid
from typing import List, Optional
import json

app = FastAPI()

# CORS 설정 (React 앱 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 실제 배포 시에는 구체적인 도메인으로 제한 권장
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 디렉토리 설정
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCRIPTS_DIR = os.path.join(BASE_DIR, "scripts")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")

os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# 정적 파일 서빙 (결과 이미지 접근용)
app.mount("/output", StaticFiles(directory=OUTPUT_DIR), name="output")

@app.post("/process-image")
def process_image(
    file: UploadFile = File(...),
    remove_watermark: bool = Form(True),
    optimize_blog: bool = Form(True),
    output_format: str = Form('webp')
):
    try:
        # 파일 저장
        file_id = str(uuid.uuid4())
        ext = os.path.splitext(file.filename)[1]
        input_path = os.path.join(UPLOAD_DIR, f"{file_id}{ext}")
        
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        output_files = []
        current_path = input_path

        # 1. 워터마크 제거
        if remove_watermark:
            script_path = os.path.join(SCRIPTS_DIR, "remove_watermark.py")
            # remove_watermark.py는 원본을 덮어쓰거나 _no_wm을 붙임. 
            subprocess.run(["python", script_path, current_path], check=True)
            
            # remove_watermark.py는 output 인자가 없으면 {파일명}_clean{확장자}로 저장함
            # 다음 단계(최적화)에서 이 clean 파일을 사용하도록 current_path 업데이트
            base, ext = os.path.splitext(current_path)
            current_path = f"{base}_clean{ext}"

        # 2. 블로그 최적화
        if optimize_blog:
            script_path = os.path.join(SCRIPTS_DIR, "optimize_blog.py")
            final_output_name = f"{file_id}_optimized.{output_format if output_format != 'both' else 'webp'}"
            final_output_path = os.path.join(OUTPUT_DIR, final_output_name)
            
            subprocess.run([
                "python", script_path, 
                current_path, 
                final_output_path
            ], check=True)
             
            output_files.append(f"/output/{final_output_name}")
            if output_format == 'both':
                 output_files.append(f"/output/{final_output_name.replace('.webp', '.jpg')}")

        return {
            "success": True,
            "outputFiles": output_files
        }

    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/process-pdf")
def process_pdf(
    file: UploadFile = File(...),
    merge_pages: bool = Form(True),
    target_width: int = Form(1200),
    output_format: str = Form('webp'),
    selected_pages: str = Form(None) # JSON String "[1, 2, 3]" or None
):
    try:
        file_id = str(uuid.uuid4())
        input_path = os.path.join(UPLOAD_DIR, f"{file_id}.pdf")
        
        with open(input_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # PDF 처리 스크립트 실행
        script_path = os.path.join(SCRIPTS_DIR, "pdf_smart.py")
        output_subdir = os.path.join(OUTPUT_DIR, file_id) # 별도 폴더 사용
        
        cmd = [
            "python", script_path,
            input_path,
            "none", # logo path
            output_subdir,
            str(merge_pages).lower(),
            str(target_width),
            output_format
        ]
        
        # 선택된 페이지가 있으면 인자로 추가
        if selected_pages:
            try:
                # JSON 파싱 검증
                pages_list = json.loads(selected_pages)
                if isinstance(pages_list, list) and len(pages_list) > 0:
                    cmd.append("--pages")
                    cmd.append(",".join(map(str, pages_list)))
            except:
                pass # 파싱 실패 시 전체 처리
        
        subprocess.run(cmd, check=True)
        
        # 생성된 파일 목록 조회
        generated_files = []
        if os.path.exists(output_subdir):
            for f in os.listdir(output_subdir):
                 generated_files.append(f"/output/{file_id}/{f}")

        return {
            "success": True,
            "outputFiles": generated_files
        }

    except Exception as e:
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
