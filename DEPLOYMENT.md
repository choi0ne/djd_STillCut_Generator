# 🚀 GitHub & Netlify 배포 가이드

## 📋 준비사항

### 1. GitHub 계정 및 레포지토리
- GitHub 계정 필요
- 새 레포지토리 생성 권한

### 2. Netlify 계정
- [Netlify](https://netlify.com) 가입 (무료)
- GitHub 계정 연동 권장

---

## 🔧 1단계: Git 초기화 및 GitHub 업로드

### Git 저장소 초기화
```bash
# Git 초기화
git init

# 모든 파일 스테이징 (.gitignore가 자동으로 필터링)
git add .

# 첫 커밋
git commit -m "Initial commit: STillCutGenerator v1.0"
```

### GitHub에 푸시
```bash
# GitHub에서 새 레포지토리 생성 후 URL 복사
# 예: https://github.com/yourusername/djd-stillcut-generator.git

# 원격 저장소 연결
git remote add origin https://github.com/yourusername/djd-stillcut-generator.git

# 메인 브랜치로 푸시
git branch -M main
git push -u origin main
```

---

## 🌐 2단계: Netlify 배포

### 방법 1: Netlify UI에서 배포 (권장)

1. **Netlify 로그인**
   - [Netlify](https://app.netlify.com) 접속
   - "Add new site" → "Import an existing project" 클릭

2. **GitHub 연동**
   - "Deploy with GitHub" 선택
   - 방금 생성한 레포지토리 선택

3. **빌드 설정 확인**
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Branch**: `main`
   - (netlify.toml이 있으면 자동 인식됨)

4. **환경변수 설정**
   - "Site settings" → "Environment variables" 이동
   - 다음 변수들을 추가:

   | Key | Value | 설명 |
   |-----|-------|------|
   | `VITE_GEMINI_API_KEY` | (실제 Gemini API 키) | 필수 |
   | `VITE_OPENAI_API_KEY` | (실제 OpenAI API 키) | 선택 |
   | `VITE_GOOGLE_API_KEY` | (실제 Google API 키) | 선택 |
   | `VITE_GOOGLE_CLIENT_ID` | (실제 Client ID) | 선택 |

5. **배포 시작**
   - "Deploy site" 클릭
   - 빌드 로그 확인 (약 1-3분 소요)
   - 성공 시 자동으로 URL 생성 (예: `https://your-site-name.netlify.app`)

### 방법 2: Netlify CLI로 배포

```bash
# Netlify CLI 설치
npm install -g netlify-cli

# Netlify 로그인
netlify login

# 프로젝트 초기화
netlify init

# 배포
netlify deploy --prod
```

---

## ⚙️ 3단계: 환경변수 관리

### 로컬 개발 환경
```bash
# .env.local 파일 생성 (Git에 커밋되지 않음)
cp .env.example .env.local

# .env.local 파일에 실제 API 키 입력
# VITE_GEMINI_API_KEY=your_actual_key_here
```

### Netlify 환경변수
- Netlify 대시보드에서 설정
- 또는 `netlify.toml`에 추가 (보안 주의!)

---

## 🔄 업데이트 배포

코드 수정 후 자동 배포:

```bash
git add .
git commit -m "Update: 기능 추가/수정 내용"
git push
```

- GitHub에 푸시하면 Netlify가 자동으로 감지하여 재배포

---

## ✅ 배포 확인 체크리스트

- [ ] Git 초기화 완료
- [ ] GitHub 레포지토리 생성 및 푸시 완료
- [ ] Netlify 사이트 생성 완료
- [ ] 환경변수 설정 완료
- [ ] 빌드 성공 (Netlify 대시보드에서 확인)
- [ ] 배포된 사이트 접속 가능
- [ ] API 키 정상 작동 확인
- [ ] 모든 기능 테스트 완료

---

## 🐛 트러블슈팅

### 빌드 실패 시
1. `package.json`의 `build` 스크립트 확인
2. Node.js 버전 확인 (Netlify는 기본 18+)
3. 환경변수 설정 확인

### API 키 오류 시
1. 환경변수 이름이 `VITE_` 접두사로 시작하는지 확인
2. Netlify 대시보드에서 환경변수 재설정
3. 배포 재시도

### 404 에러 시
- `netlify.toml`의 리다이렉트 규칙 확인
- `publish = "dist"` 설정 확인

---

## 📞 지원

문제 발생 시:
- [Netlify 문서](https://docs.netlify.com)
- [GitHub 문서](https://docs.github.com)
