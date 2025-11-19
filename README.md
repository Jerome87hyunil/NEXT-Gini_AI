# Gini AI - Next.js 마이그레이션

Rails 8에서 Next.js 15 + FDP 백엔드 아키텍처로 마이그레이션한 AI 아바타 영상 생성 플랫폼입니다.

## 📚 개요

PDF 문서를 업로드하면 AI가 대본을 생성하고, 아바타가 발표하는 영상을 자동으로 제작합니다.

### 핵심 기능

- **문서 분석**: Gemini 2.5 Pro 멀티모달로 PDF 직접 분석
- **대본 생성**: LLM 기반 자동 스크립트 생성 (30/60/180초)
- **커스텀 아바타**: Nano Banana로 맞춤형 아바타 디자인 생성
- **음성 합성**: ElevenLabs TTS
- **아바타 영상**: D-ID 립싱크
- **배경 생성**: 우선순위 기반 (Veo 3.1 영상 / Nano 이미지 / FFmpeg)
- **비디오 렌더링**: 최종 합성 및 배포

## 🏗️ 기술 스택

### 백엔드
- **Framework**: Next.js 15 (App Router)
- **Database**: Supabase PostgreSQL
- **ORM**: Prisma 6.x
- **Authentication**: NextAuth.js v5 (Google, GitHub OAuth)
- **Authorization**: ReBAC (Relationship-Based Access Control)
- **Background Jobs**: Inngest
- **Storage**: Supabase Storage (1GB Free)
- **Realtime**: Supabase Realtime

### 프론트엔드
- **UI**: React 19 + TypeScript
- **Styling**: Tailwind CSS 3.x
- **Validation**: Zod

### 외부 API
- **Google Vertex AI**:
  - Gemini 2.5 Pro (대본 생성 + PDF 분석)
  - Nano Banana (아바타 + 배경 이미지)
  - Veo 3.1 (배경 영상)
- **ElevenLabs**: TTS
- **D-ID**: 아바타 립싱크

### 배포
- **Hosting**: Vercel Pro ($20/month)
- **Execution Time**: 60초 (Pro), 배경 작업은 Inngest
- **CDN**: Supabase Storage 내장

## 🚀 시작하기

### 1. 의존성 설치

```bash
cd nextjs-new
npm install
```

### 2. 환경 변수 설정

`.env.local.example`을 복사하여 `.env.local`을 생성하고 값을 입력합니다:

```bash
cp .env.local.example .env.local
```

필수 환경 변수:
- `DATABASE_URL`: Supabase PostgreSQL URL
- `NEXTAUTH_SECRET`: NextAuth 시크릿
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`: Google OAuth
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase
- `GOOGLE_CLOUD_PROJECT`: Vertex AI 프로젝트 ID
- `ELEVEN_API_KEY`: ElevenLabs API 키
- `DID_API_KEY`: D-ID API 키
- `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`: Inngest 키

### 3. 데이터베이스 마이그레이션

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 4. 권한 정의 Seed

```bash
npm run db:seed
```

### 5. Supabase Storage 버킷 생성

```bash
npm run storage:setup
```

이 명령은 자동으로 다음을 수행합니다:
- `assets` 버킷 생성 (공개, 10MB 제한)
- Storage 정책 설정 (읽기/쓰기 권한)

**또는 수동으로 설정**:
1. Supabase Dashboard > Storage 접속
2. "Create a new bucket" 클릭
3. 버킷 이름: `assets`, Public: ✅, Size limit: 10MB
4. 또는 `prisma/migrations/storage_setup.sql` 파일을 SQL Editor에서 실행

### 6. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 http://localhost:3001 접속

## 📂 프로젝트 구조

```
nextjs-new/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/     # NextAuth API
│   │   ├── projects/               # 프로젝트 CRUD
│   │   ├── documents/              # 문서 업로드
│   │   ├── webhooks/did/           # D-ID 웹훅
│   │   └── inngest/                # Inngest 엔드포인트
│   ├── auth/                       # 인증 페이지
│   ├── dashboard/                  # 대시보드 및 프로젝트
│   ├── layout.tsx                  # 루트 레이아웃
│   └── page.tsx                    # 홈 페이지
├── lib/
│   ├── prisma.ts                   # Prisma 클라이언트
│   ├── permissions/                # ReBAC 권한 시스템
│   ├── supabase/                   # Supabase 클라이언트 및 Storage
│   ├── inngest/                    # Inngest 함수들
│   └── services/                   # 외부 API 클라이언트
├── prisma/
│   └── schema.prisma               # 데이터베이스 스키마
├── types/
│   └── next-auth.d.ts              # NextAuth 타입 확장
├── .env.local.example              # 환경 변수 템플릿
├── auth.ts                         # NextAuth 설정
├── middleware.ts                   # 인증 미들웨어
└── package.json                    # 의존성
```

## 🗂️ 데이터베이스 스키마

11개 테이블:

### 핵심 모델 (7개)
- `Organization`: 조직 관리
- `User`: 사용자
- `Project`: 영상 프로젝트
- `Document`: PDF 업로드
- `Scene`: 씬별 대본 및 상태
- `Asset`: 생성된 자산 (오디오, 영상, 이미지)
- `RenderJob`: D-ID 작업 추적

### NextAuth (2개)
- `Account`: OAuth 계정
- `Session`: 세션 관리

### ReBAC (2개)
- `RelationTuple`: 권한 튜플 (user → project)
- `RelationDefinition`: 권한 정의 (owner → editor → viewer)

## 🔄 워크플로우

```
1. PDF 업로드 → DocumentValidator
2. 대본 생성 → ScriptGenerator (Gemini 2.5 Pro)
3. (선택) 커스텀 아바타 생성 → AvatarDesignGenerator
4. 씬 순차 처리 → SceneProcessor
   - TTS 생성 → TtsGenerator (ElevenLabs)
   - 아바타 생성 → AvatarGenerator (D-ID)
   - 아바타 폴링 → AvatarPoller (5초 간격, 최대 20회)
   - 배경 생성 → BackgroundGenerator
     - High: Veo 영상 → VeoGenerator + VeoPoller
     - Medium: Nano 이미지 (High면 Veo 자동 업그레이드)
     - Low: FFmpeg 그라데이션
5. 비디오 합성 → VideoCompositor + VideoRender
```

## 🔐 권한 시스템 (ReBAC)

상속 구조:
- **owner**: 모든 권한 (편집 + 조회 + 삭제)
- **editor**: 편집 + 조회
- **viewer**: 조회만 가능

사용 예시:

```typescript
import { check, grant, NAMESPACES, RELATIONS } from "@/lib/permissions";

// 권한 확인
const canEdit = await check(userId, NAMESPACES.PROJECT, projectId, RELATIONS.EDITOR);

// 권한 부여
await grant(userId, NAMESPACES.PROJECT, projectId, RELATIONS.OWNER);
```

## 📊 비용 구조 (월 100개 프로젝트 기준)

### 인프라
- Vercel Pro: $20/month
- Supabase Free: $0 (1GB 이하)
- Inngest Free: $0
- Total: **$20/month** (Rails $50 → 60% 절감)

### API 비용 (프로젝트당)
- Gemini 2.5 Pro: ~$0.50
- ElevenLabs TTS: ~$0.20
- D-ID 아바타: ~$1.50
- Veo 영상 (High priority): ~$1.50/씬
- Nano 이미지 (Medium): ~$0.039/씬
- Total: $2.20 ~ $25/프로젝트 (배경 설정에 따라)

## 🧪 테스트

```bash
# 단위 테스트 (TODO: 추가 예정)
npm run test

# 타입 체크
npm run type-check

# Lint
npm run lint
```

## 📝 개발 스크립트

```bash
# 개발 서버
npm run dev

# 프로덕션 빌드
npm run build

# 프로덕션 실행
npm run start

# Prisma Studio (DB GUI)
npx prisma studio

# 마이그레이션 생성
npx prisma migrate dev --name <migration-name>

# 권한 정의 Seed
npm run seed
```

## 🚧 다음 단계 (구현 필요)

- [ ] 나머지 Inngest 함수 구현 (TTS, 아바타, 배경, 비디오)
- [ ] 클라이언트 컴포넌트 구현 (프로젝트 목록, 상세, 폼)
- [ ] Realtime 업데이트 UI
- [ ] 테스트 작성
- [ ] Veo API 통합
- [ ] FFmpeg 처리 (AWS Lambda)
- [ ] 에러 핸들링 개선
- [ ] 로깅 및 모니터링
- [ ] CI/CD 파이프라인

## 📖 참고 문서

- [마이그레이션 계획](../docs/nextjs-migration/NEXTJS_MIGRATION_PLAN.md)
- [Prisma 스키마](../docs/nextjs-migration/NEXTJS_PRISMA_SCHEMA.md)
- [시스템 아키텍처](../docs/nextjs-migration/NEXTJS_ARCHITECTURE.md)
- [API 설계](../docs/nextjs-migration/NEXTJS_API_DESIGN.md)
- [백그라운드 작업](../docs/nextjs-migration/NEXTJS_BACKGROUND_JOBS.md)

## 📄 라이선스

MIT

---

**마지막 업데이트**: 2025-11-19
