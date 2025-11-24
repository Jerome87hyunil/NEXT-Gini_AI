# Gini AI 개발 환경 설정 가이드

새로운 PC에서 프로젝트를 설정하는 방법입니다.

---

## 🚀 빠른 시작 (5분)

```bash
# 1. 클론
git clone <저장소-URL>
cd NEXT-Gini_AI

# 2. 의존성 설치
npm install

# 3. 환경 변수 설정
cp .env.local.example .env.local
# .env.local 파일을 열어서 필요한 값 입력

# 4. Google Cloud 인증
gcloud auth login
gcloud auth application-default login
gcloud config set project project-8949f8d3-b8f3-458d-afd
gcloud auth application-default set-quota-project project-8949f8d3-b8f3-458d-afd

# 5. Prisma 설정
npx prisma generate

# 6. 개발 서버 실행
npm run dev
```

브라우저에서 http://localhost:3001 접속

---

## 📋 상세 설정 가이드

### 1. 사전 요구사항

- Node.js 18.17.0 이상
- npm 또는 yarn
- Git

### 2. gcloud CLI 설치

#### macOS
```bash
brew install --cask google-cloud-sdk
```

#### Windows
[Google Cloud SDK 설치 프로그램](https://cloud.google.com/sdk/docs/install) 다운로드

#### Linux
```bash
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

### 3. 환경 변수 설정

`.env.local` 파일에 다음 값들을 설정하세요:

#### 필수 환경 변수

```env
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# NextAuth
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=<랜덤-시크릿>

# Google OAuth
GOOGLE_CLIENT_ID=<구글-클라이언트-ID>
GOOGLE_CLIENT_SECRET=<구글-시크릿>

# Supabase
NEXT_PUBLIC_SUPABASE_URL=<수파베이스-URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<수파베이스-익명-키>
SUPABASE_SERVICE_ROLE_KEY=<수파베이스-서비스-키>

# Google Cloud (Vertex AI)
GOOGLE_CLOUD_PROJECT=project-8949f8d3-b8f3-458d-afd
GOOGLE_CLOUD_LOCATION=us-central1
# GOOGLE_APPLICATION_CREDENTIALS는 설정 안함 (ADC 사용)

# ElevenLabs
ELEVEN_API_KEY=<일레븐랩스-API-키>
ELEVEN_DEFAULT_VOICE_ID=<음성-ID>

# D-ID
DID_API_KEY=<D-ID-API-키>
```

**주의**: 팀 리더에게 실제 키 값들을 요청하세요.

### 4. Google Cloud 인증

**중요**: JSON 키 파일 대신 Application Default Credentials (ADC)를 사용합니다.

```bash
# Step 1: Google 계정 로그인
gcloud auth login
# → 브라우저가 열리면 Google 계정으로 로그인

# Step 2: ADC 설정
gcloud auth application-default login
# → 다시 브라우저가 열리면 로그인 및 허용

# Step 3: 프로젝트 설정
gcloud config set project project-8949f8d3-b8f3-458d-afd

# Step 4: Quota Project 설정
gcloud auth application-default set-quota-project project-8949f8d3-b8f3-458d-afd
```

**인증 확인:**
```bash
gcloud auth list
gcloud config get-value project
ls -la ~/.config/gcloud/application_default_credentials.json
```

### 5. 데이터베이스 설정

```bash
# Prisma Client 생성
npx prisma generate

# (선택적) 데이터베이스 푸시
# 주의: Supabase는 이미 설정되어 있으므로 보통 필요 없음
npx prisma db push

# (선택적) Prisma Studio 실행 (DB GUI)
npx prisma studio
```

### 6. 개발 서버 실행

2개의 터미널을 열어야 합니다:

**터미널 1: Next.js 서버**
```bash
npm run dev
```
→ http://localhost:3001

**터미널 2: Inngest Dev Server** (백그라운드 작업용)
```bash
npm run inngest:dev
```
→ http://localhost:8288 (Inngest UI)

---

## 🔧 문제 해결

### "gcloud: command not found"
gcloud CLI를 설치하지 않았습니다. 위 2단계를 다시 확인하세요.

### "Application Default Credentials not found"
```bash
gcloud auth application-default login
```

### "Permission denied" (Vertex AI)
Google Cloud 프로젝트에 접근 권한이 없습니다. 프로젝트 관리자에게 다음 역할을 요청하세요:
- Vertex AI User
- Storage Admin

### Prisma Client 에러
```bash
npx prisma generate
```

### 포트 3001 이미 사용 중
```bash
# 다른 포트 사용
npm run dev -- -p 3002
```

---

## 📝 개발 워크플로우

1. **작업 시작**
   ```bash
   git pull
   npm install  # package.json이 변경되었을 때만
   npm run dev
   ```

2. **코드 작성**
   - API Routes: `app/api/`
   - Pages: `app/dashboard/`
   - Services: `lib/services/`
   - Inngest Functions: `lib/inngest/functions/`

3. **테스트**
   ```bash
   npm run type-check  # TypeScript 타입 체크
   npm run lint        # ESLint 검사
   ```

4. **커밋**
   ```bash
   git add .
   git commit -m "feat: 새로운 기능 추가"
   git push
   ```

---

## 🆘 도움이 필요하면

- 프로젝트 문서: [CLAUDE.md](./CLAUDE.md)
- App Router 가이드: [app/CLAUDE.md](./app/CLAUDE.md)
- 서비스 레이어: [lib/CLAUDE.md](./lib/CLAUDE.md)
- 데이터베이스: [prisma/CLAUDE.md](./prisma/CLAUDE.md)

---

## 🔐 보안 주의사항

### ❌ 절대 하지 말 것
- `.env.local` 파일을 Git에 커밋
- API 키를 코드에 하드코딩
- Service Account JSON 키 파일을 공개 저장소에 업로드

### ✅ 해야 할 것
- `.env.local` 파일은 로컬에만 보관
- `.gitignore`에 `.env.local` 포함 확인
- 민감한 정보는 환경 변수 사용
- ADC 사용 (JSON 키 파일 대신)

---

## 📞 연락처

문제가 해결되지 않으면 팀 리더에게 연락하세요.

**작성일**: 2025-11-24
**업데이트**: 정기적으로 업데이트 예정
