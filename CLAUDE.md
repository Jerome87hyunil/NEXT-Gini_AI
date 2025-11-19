# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🌐 Communication Rules

**모든 응답은 한국어로 작성합니다.**
All responses must be written in Korean for this project.

---

## 📚 Documentation Hub

이 문서는 Gini AI Next.js 프로젝트의 메인 문서이며, 각 디렉토리별 상세 가이드로 연결됩니다.

### Directory-Specific Documentation

- **[app/CLAUDE.md](app/CLAUDE.md)** - Next.js App Router 구조 및 라우팅
- **[lib/CLAUDE.md](lib/CLAUDE.md)** - 핵심 비즈니스 로직 및 서비스
- **[prisma/CLAUDE.md](prisma/CLAUDE.md)** - 데이터베이스 스키마 및 마이그레이션

---

## 🚀 Quick Start

### Development Commands

```bash
# 개발 서버 실행
npm run dev

# 타입 체크
npm run type-check

# Lint 검사
npm run lint

# 프로덕션 빌드
npm run build

# 데이터베이스 마이그레이션
npm run db:migrate

# Prisma Studio (DB GUI)
npm run db:studio

# 권한 정의 Seed
npm run db:seed
```

### Testing Commands

```bash
# 단위 테스트 (TODO: 추가 예정)
npm run test

# 타입 체크 (필수)
npm run type-check

# Lint (필수)
npm run lint
```

---

## 🏗️ Project Overview

**Gini AI**는 PDF를 업로드하면 AI 아바타가 발표하는 영상을 자동 생성하는 Next.js 15 기반 웹 애플리케이션입니다.

### Tech Stack

- **Framework**: Next.js 15 (App Router) + React 19
- **Database**: Supabase PostgreSQL + Prisma ORM
- **Authentication**: NextAuth.js v5 (Google/GitHub OAuth)
- **Authorization**: ReBAC (Relationship-Based Access Control)
- **Background Jobs**: Inngest
- **Storage**: Supabase Storage
- **Styling**: Tailwind CSS 3.x
- **Type Safety**: TypeScript + Zod

### External APIs

- **Google Vertex AI**: Gemini 2.5 Pro, Nano Banana, Veo 3.1
- **ElevenLabs**: TTS (음성 합성)
- **D-ID**: 아바타 립싱크

---

## 📂 Architecture

### 5-Layer Architecture

```
┌─────────────────────────────────────────┐
│  1. Presentation Layer (app/)          │
│     - API Routes, Pages, Components    │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  2. Application Layer (lib/inngest/)   │
│     - Background Jobs & Workflows      │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  3. Business Logic (lib/services/)     │
│     - Service Objects                  │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  4. Data Layer (prisma/)               │
│     - Prisma Schema & Migrations       │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│  5. External Services                  │
│     - Vertex AI, ElevenLabs, D-ID      │
└─────────────────────────────────────────┘
```

### Video Generation Workflow

```
PDF 업로드
  ↓
DocumentValidator (검증)
  ↓
ScriptGenerator (Gemini 2.5 Pro - 대본 생성)
  ↓
AvatarDesignGenerator (선택적 - 커스텀 아바타)
  ↓
SceneProcessor (씬별 순차 처리)
  ├─ TtsGenerator (ElevenLabs)
  ├─ AvatarGenerator (D-ID)
  ├─ AvatarPoller (5초 간격, 최대 20회)
  └─ BackgroundGenerator
      ├─ High: Veo 영상
      ├─ Medium: Nano 이미지 (→ Veo 업그레이드)
      └─ Low: FFmpeg 그라데이션
  ↓
VideoCompositor + VideoRender (최종 합성)
```

---

## 🗂️ Database Schema

11개 테이블 구조:

### Core Models (7개)
- `Organization` - 조직 관리
- `User` - 사용자 (admin/member)
- `Project` - 영상 프로젝트
- `Document` - PDF 업로드
- `Scene` - 씬별 대본 및 상태
- `Asset` - 생성된 자산 (오디오/영상/이미지)
- `RenderJob` - D-ID 작업 추적

### NextAuth (2개)
- `Account` - OAuth 계정
- `Session` - 세션 관리

### ReBAC (2개)
- `RelationTuple` - 권한 튜플
- `RelationDefinition` - 권한 정의

상세 스키마: [prisma/CLAUDE.md](prisma/CLAUDE.md)

---

## 🔐 Permission System (ReBAC)

관계 기반 접근 제어 시스템:

```typescript
import { check, grant, NAMESPACES, RELATIONS } from "@/lib/permissions";

// 권한 확인
const canEdit = await check(
  userId,
  NAMESPACES.PROJECT,
  projectId,
  RELATIONS.EDITOR
);

// 권한 부여
await grant(
  userId,
  NAMESPACES.PROJECT,
  projectId,
  RELATIONS.OWNER
);
```

### 권한 계층 구조
- **owner**: 모든 권한 (편집 + 조회 + 삭제)
- **editor**: 편집 + 조회 (owner 상속)
- **viewer**: 조회만 가능 (editor 상속)

---

## 🔧 Development Guidelines

### File Creation Rules

1. **API Routes**: `app/api/{resource}/route.ts`
   - 각 HTTP 메서드별 export 함수 (GET, POST, PATCH, DELETE)
   - Zod validation 필수
   - ReBAC 권한 체크 필수

2. **Inngest Functions**: `lib/inngest/functions/{function-name}.ts`
   - 단일 책임 원칙
   - 멱등성 보장 (재시도 안전)
   - 에러 핸들링 필수

3. **Services**: `lib/services/{service-name}.ts`
   - 외부 API 호출 로직만 포함
   - 순수 함수로 작성 (side-effect 최소화)
   - 타입 안전성 보장

4. **Components**: `app/dashboard/{feature}/page.tsx`
   - Server Components 우선 사용
   - Client Components는 최소화 ("use client" 명시)

### Code Style

- **TypeScript Strict Mode**: 모든 타입 명시
- **Validation**: Zod 스키마로 입력 검증
- **Error Handling**: try-catch + 의미 있는 에러 메시지
- **Async/Await**: Promise 대신 async/await 사용
- **Naming**: camelCase (변수/함수), PascalCase (컴포넌트/타입)

### Performance Best Practices

- Server Components에서 DB 직접 조회
- Client Components는 필요 최소한만 사용
- Suspense로 로딩 상태 관리
- Prisma `select`로 필요한 필드만 조회
- Inngest로 무거운 작업 비동기 처리

---

## 🌍 Environment Variables

필수 환경 변수 (.env.local):

```bash
# Database
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...

# NextAuth
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000

# Google OAuth
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Google Vertex AI
GOOGLE_CLOUD_PROJECT=...
GOOGLE_CLOUD_LOCATION=us-central1

# ElevenLabs
ELEVEN_API_KEY=...
ELEVEN_DEFAULT_VOICE_ID=...

# D-ID
DID_API_KEY=...

# Inngest
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
```

---

## 📊 Cost Structure

### Infrastructure (월 기준)
- Vercel Pro: $20/month
- Supabase Free: $0 (1GB 이하)
- Inngest Free: $0
- **Total: $20/month**

### API Costs (프로젝트당)
- Gemini 2.5 Pro: ~$0.50
- ElevenLabs TTS: ~$0.20
- D-ID 아바타: ~$1.50
- Veo 영상 (High): ~$1.50/씬
- Nano 이미지 (Medium): ~$0.039/씬
- **Total: $2.20 ~ $25/프로젝트**

---

## 🐛 Troubleshooting

### Common Issues

**1. Prisma Client 에러**
```bash
npx prisma generate
```

**2. 데이터베이스 마이그레이션 실패**
```bash
npx prisma migrate reset
npx prisma migrate dev --name init
```

**3. NextAuth 세션 에러**
```bash
# NEXTAUTH_SECRET 재생성
openssl rand -base64 32
```

**4. Inngest 이벤트 전송 실패**
```bash
# Inngest Dev Server 실행
npx inngest-cli dev
```

**5. Supabase Storage 업로드 실패**
```bash
# Storage 버킷 권한 확인
# Supabase Dashboard → Storage → Policies
```

---

## 📖 References

### Internal Documentation
- [README.md](README.md) - 프로젝트 개요
- [app/CLAUDE.md](app/CLAUDE.md) - App Router 가이드
- [lib/CLAUDE.md](lib/CLAUDE.md) - 서비스 레이어 가이드
- [prisma/CLAUDE.md](prisma/CLAUDE.md) - 데이터베이스 가이드

### External Resources
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Inngest Docs](https://www.inngest.com/docs)
- [NextAuth.js v5 Docs](https://authjs.dev)
- [Supabase Docs](https://supabase.com/docs)

---

**Last Updated**: 2025-11-19
