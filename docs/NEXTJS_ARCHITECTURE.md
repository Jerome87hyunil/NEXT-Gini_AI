# Gini AI - Next.js 아키텍처

> FDP 백엔드 아키텍처 기반 Next.js 시스템 설계

## 목차
1. [시스템 개요](#시스템-개요)
2. [아키텍처 레이어](#아키텍처-레이어)
3. [기술 스택](#기술-스택)
4. [데이터 플로우](#데이터-플로우)
5. [디렉토리 구조](#디렉토리-구조)
6. [핵심 컴포넌트](#핵심-컴포넌트)

---

## 시스템 개요

### 아키텍처 원칙

- **서버리스 우선**: Vercel Edge Functions, Inngest Functions
- **타입 안정성**: TypeScript Strict Mode, Prisma 타입 생성
- **React Server Components**: 초기 로딩 속도 최적화
- **단일 책임 원칙**: 각 함수/컴포넌트는 하나의 명확한 책임
- **비동기 처리**: 모든 외부 API 호출은 백그라운드 처리
- **실시간 피드백**: Supabase Realtime으로 진행 상황 브로드캐스트

### 아키텍처 다이어그램

```
┌────────────────────────────────────────────────────────────┐
│                    Client Layer                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ React    │  │ Server   │  │ Supabase │  │ shadcn   │   │
│  │ Client   │  │ Component│  │ Realtime │  │ /ui      │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└────────────────────────────────────────────────────────────┘
                              ↕
┌────────────────────────────────────────────────────────────┐
│                    API Layer (Next.js)                      │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ API Routes       │  │ Server Actions   │                │
│  │ - Projects       │  │ - Form Submit    │                │
│  │ - Documents      │  │ - File Upload    │                │
│  │ - Scenes         │  │ - Data Mutation  │                │
│  │ - Webhooks       │  │                  │                │
│  └──────────────────┘  └──────────────────┘                │
└────────────────────────────────────────────────────────────┘
                              ↕
┌────────────────────────────────────────────────────────────┐
│               Business Logic Layer (Inngest)                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Background Functions (12개)                          │  │
│  │ - DocumentParser, ScriptGenerator                   │  │
│  │ - SceneProcessor, TtsGenerator                      │  │
│  │ - AvatarGenerator, BackgroundGenerator              │  │
│  │ - VeoGenerator, VideoCompositor                     │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
                              ↕
┌────────────────────────────────────────────────────────────┐
│                    Data Layer (Prisma)                      │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ Supabase         │  │ Supabase         │                │
│  │ PostgreSQL       │  │ Storage          │                │
│  │ - 11 Tables      │  │ - Assets Bucket  │                │
│  └──────────────────┘  └──────────────────┘                │
└────────────────────────────────────────────────────────────┘
                              ↕
┌────────────────────────────────────────────────────────────┐
│              External Services Layer                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Google   │  │ Google   │  │ Eleven   │  │ D-ID     │   │
│  │ Gemini   │  │ Veo 3.1  │  │ Labs     │  │ API      │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│  ┌──────────┐                                               │
│  │ AWS      │                                               │
│  │ Lambda   │  (FFmpeg)                                    │
│  └──────────┘                                               │
└────────────────────────────────────────────────────────────┘
```

---

## 아키텍처 레이어

### 1. Client Layer (클라이언트)

**구성 요소**:
- React Client Components (상호작용)
- React Server Components (초기 렌더링)
- Supabase Realtime (실시간 업데이트)
- shadcn/ui (UI 컴포넌트)

**책임**:
- 사용자 인터페이스 렌더링
- 사용자 입력 처리
- 실시간 진행률 표시
- 클라이언트 측 상태 관리

---

### 2. API Layer (API 레이어)

**구성 요소**:
- Next.js App Router API Routes
- Server Actions (Form 처리)
- NextAuth.js (인증)
- ReBAC 권한 체크

**책임**:
- HTTP 요청 처리
- 인증 및 권한 확인
- 데이터 검증
- Inngest 이벤트 발송

**주요 엔드포인트**:
```
GET    /api/projects              # 프로젝트 목록
POST   /api/projects              # 프로젝트 생성
GET    /api/projects/[id]         # 프로젝트 조회
PATCH  /api/projects/[id]         # 프로젝트 수정
POST   /api/projects/[id]/render  # 렌더링 시작
POST   /api/documents             # 문서 업로드
POST   /api/webhooks/did          # D-ID 웹훅
```

---

### 3. Business Logic Layer (비즈니스 로직)

**구성 요소**:
- Inngest Functions (12개)
- Service Clients (Gemini, ElevenLabs, D-ID)
- AWS Lambda (FFmpeg)

**책임**:
- 백그라운드 작업 처리
- 외부 API 호출 및 재시도
- 작업 오케스트레이션
- 에러 처리 및 재시도

**Inngest Functions**:
1. `document-parser` - PDF 검증
2. `script-generator` - 대본 생성
3. `avatar-design-generator` - 커스텀 아바타 생성
4. `scene-processor` - 씬 순차 처리 오케스트레이터
5. `tts-generator` - TTS 생성
6. `avatar-generator` - D-ID 아바타 생성
7. `avatar-poller` - D-ID 폴링
8. `background-generator` - 배경 생성
9. `veo-generator` - Veo 영상 생성
10. `veo-poller` - Veo 폴링
11. `video-compositor` - 비디오 합성 트리거
12. `video-render` - AWS Lambda 호출

---

### 4. Data Layer (데이터)

**구성 요소**:
- Prisma ORM
- Supabase PostgreSQL (11 Tables)
- Supabase Storage (파일)

**책임**:
- 데이터베이스 CRUD
- 파일 저장 및 조회
- 트랜잭션 관리
- 데이터 검증

---

### 5. External Services Layer (외부 서비스)

**구성 요소**:
- Google Vertex AI (Gemini, Veo)
- ElevenLabs (TTS)
- D-ID (아바타)
- AWS Lambda (FFmpeg)

**책임**:
- API 호출
- 응답 파싱
- 에러 처리
- 재시도 로직

---

## 기술 스택

### 프론트엔드

| 기술 | 버전 | 용도 |
|------|------|------|
| Next.js | 15.x | React 프레임워크 (App Router) |
| React | 19.x | UI 라이브러리 |
| TypeScript | 5.x | 타입 시스템 |
| Tailwind CSS | 3.x | 스타일링 |
| shadcn/ui | Latest | UI 컴포넌트 |
| Radix UI | Latest | 헤드리스 UI |
| Lucide Icons | Latest | 아이콘 |

### 백엔드

| 기술 | 버전 | 용도 |
|------|------|------|
| Prisma | 5.x | ORM |
| Supabase | Latest | PostgreSQL + Storage + Realtime |
| NextAuth.js | 5.x (beta) | 인증 (OAuth) |
| Inngest | 3.x | 백그라운드 작업 |
| AWS Lambda | - | FFmpeg 처리 |

### 개발 도구

| 기술 | 버전 | 용도 |
|------|------|------|
| Vitest | 1.x | Unit 테스트 |
| Playwright | 1.x | E2E 테스트 |
| ESLint | 9.x | 린팅 |
| Prettier | 3.x | 코드 포맷팅 |

### 배포

| 기술 | 플랜 | 용도 |
|------|------|------|
| Vercel | Pro ($20/월) | Next.js 배포 (60초 실행) |
| Supabase | Free (1GB) | DB + Storage |
| Inngest | Free (250K steps) | 백그라운드 작업 |
| AWS Lambda | Pay-as-you-go | FFmpeg 처리 |

---

## 데이터 플로우

### 1. 프로젝트 생성 플로우

```
User → POST /api/projects
  ↓
1. NextAuth 인증 확인
2. Prisma: Project 생성
3. ReBAC: Owner 권한 부여
  ↓
Response: { id, title, status: "draft" }
```

### 2. PDF 업로드 → 대본 생성 플로우

```
User → Upload PDF
  ↓
1. Client: Supabase Storage 업로드
2. Client: POST /api/documents { fileUrl }
  ↓
3. API Route: Document 레코드 생성
4. Inngest: document/uploaded 이벤트 발송
  ↓
5. DocumentParserJob: PDF 검증
6. Inngest: script/generate.requested 이벤트
  ↓
7. ScriptGeneratorJob:
   - Supabase Storage에서 PDF 다운로드
   - Gemini 2.5 Pro 멀티모달 호출
   - Scene 레코드 생성
8. Inngest: scene/process.requested 이벤트 (첫 씬)
  ↓
Response: Real-time progress via Supabase Realtime
```

### 3. 씬별 순차 처리 플로우

```
SceneProcessorJob (Scene N)
  ↓
1. TtsGeneratorJob (동기)
   - ElevenLabs API 호출
   - Audio Asset 저장
  ↓
2. AvatarGeneratorJob (동기)
   - D-ID API 호출 (커스텀/프리셋 아바타)
   - talk_id 저장
  ↓
3. AvatarPollingJob (비동기)
   - 5초 간격 폴링 (최대 20회)
   - Video Asset 저장
  ↓
4. BackgroundGeneratorJob (비동기)
   - SceneBackgroundAnalyzer: 우선순위 결정
   - High → VeoVideoGeneratorJob
   - Medium → Nano Banana (High면 Veo 업그레이드)
   - Low → FFmpeg Gradient
  ↓
5. VeoVideoPollingJob (if applicable)
   - 5초 간격 폴링 (최대 120회)
   - Video Asset 저장
  ↓
6. 다음 씬 큐잉 (2초 지연)
   - scene/process.requested (Scene N+1)
```

### 4. 최종 렌더링 플로우

```
모든 씬 완료 확인
  ↓
1. VideoCompositorJob
2. Inngest: video/render.requested 이벤트
  ↓
3. VideoRenderJob:
   - AWS Lambda 호출 (FFmpeg)
   - 씬 비디오 + 배경 합성
   - Supabase Storage에 최종 영상 업로드
  ↓
4. Project.status = "rendered"
  ↓
Response: Real-time completion via Supabase Realtime
```

---

## 디렉토리 구조

```
gini-ai-nextjs/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx          # 로그인 페이지
│   ├── (dashboard)/
│   │   ├── layout.tsx            # 대시보드 레이아웃
│   │   ├── projects/
│   │   │   ├── page.tsx          # 프로젝트 목록
│   │   │   ├── new/
│   │   │   │   └── page.tsx      # 프로젝트 생성
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # 프로젝트 상세
│   │   │       └── edit/
│   │   │           └── page.tsx  # 프로젝트 편집
│   │   └── jobs/
│   │       └── page.tsx          # Job 모니터링
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   │       └── route.ts      # NextAuth
│   │   ├── projects/
│   │   │   ├── route.ts          # GET, POST
│   │   │   └── [id]/
│   │   │       ├── route.ts      # GET, PATCH, DELETE
│   │   │       ├── render/
│   │   │       │   └── route.ts  # POST (렌더링 시작)
│   │   │       └── documents/
│   │   │           └── route.ts  # POST (문서 업로드)
│   │   ├── documents/
│   │   │   └── route.ts
│   │   ├── scenes/
│   │   │   └── [id]/
│   │   │       ├── tts/
│   │   │       │   └── route.ts
│   │   │       └── avatar/
│   │   │           └── route.ts
│   │   ├── webhooks/
│   │   │   └── did/
│   │   │       └── route.ts
│   │   └── inngest/
│   │       └── route.ts          # Inngest Serve Endpoint
│   ├── layout.tsx                # Root Layout
│   └── page.tsx                  # Landing Page
│
├── components/                   # React 컴포넌트
│   ├── ui/                       # shadcn/ui 컴포넌트
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── dialog.tsx
│   │   └── ...
│   ├── ProjectList.tsx
│   ├── ProjectForm.tsx
│   ├── SceneEditor.tsx
│   ├── DocumentStatus.tsx       # Supabase Realtime
│   ├── RenderProgress.tsx       # Supabase Realtime
│   ├── VideoPlayer.tsx
│   └── FileUpload.tsx
│
├── inngest/                      # Inngest 함수
│   ├── client.ts                 # Inngest 클라이언트
│   └── functions/
│       ├── document-parser.ts
│       ├── script-generator.ts
│       ├── avatar-design-generator.ts
│       ├── scene-processor.ts
│       ├── tts-generator.ts
│       ├── avatar-generator.ts
│       ├── avatar-poller.ts
│       ├── background-generator.ts
│       ├── veo-generator.ts
│       ├── veo-poller.ts
│       ├── video-compositor.ts
│       └── video-render.ts
│
├── lib/                          # 유틸리티 및 서비스
│   ├── auth.ts                   # NextAuth 설정
│   ├── prisma.ts                 # Prisma Client 싱글톤
│   ├── permissions.ts            # ReBAC 권한 시스템
│   ├── supabase/
│   │   ├── client.ts             # Supabase 클라이언트 (브라우저)
│   │   └── server.ts             # Supabase 클라이언트 (서버)
│   ├── services/
│   │   ├── google-gemini.ts      # Gemini, Nano, Veo API
│   │   ├── elevenlabs.ts         # ElevenLabs TTS
│   │   ├── did.ts                # D-ID 아바타
│   │   └── aws-lambda.ts         # AWS Lambda FFmpeg
│   └── utils/
│       ├── file-upload.ts
│       └── video-utils.ts
│
├── prisma/
│   ├── schema.prisma             # Prisma 스키마
│   ├── seed.ts                   # Seed 데이터
│   └── migrations/               # 마이그레이션 파일
│
├── scripts/
│   └── migrate-data.ts           # Rails → Next.js 데이터 마이그레이션
│
├── tests/
│   ├── unit/
│   │   └── lib/
│   │       └── permissions.test.ts
│   ├── integration/
│   │   └── api/
│   │       └── projects.test.ts
│   └── e2e/
│       └── project-creation.spec.ts
│
├── .env.local                    # 환경 변수
├── next.config.mjs               # Next.js 설정
├── tailwind.config.ts            # Tailwind 설정
├── tsconfig.json                 # TypeScript 설정
└── package.json
```

---

## 핵심 컴포넌트

### 1. NextAuth 설정

```typescript
// lib/auth.ts
import { NextAuthOptions } from 'next-auth'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    session: async ({ session, user }) => {
      if (session.user) {
        session.user.id = user.id
        session.user.role = user.role
        session.user.organizationId = user.organizationId
      }
      return session
    },
  },
  session: {
    strategy: 'database',
  },
}
```

### 2. ReBAC 권한 시스템

```typescript
// lib/permissions.ts
import { prisma } from '@/lib/prisma'

export async function check(
  userId: string,
  namespace: string,
  objectId: string,
  relation: string
): Promise<boolean> {
  // 1. 직접 권한 체크
  const directTuple = await prisma.relationTuple.findFirst({
    where: { namespace, objectId, relation, subjectType: 'user', subjectId: userId }
  })
  if (directTuple) return true

  // 2. 상속 권한 체크
  const definition = await prisma.relationDefinition.findFirst({
    where: { namespace, relation },
    select: { inherits: true }
  })

  if (definition?.inherits?.length) {
    for (const inheritedRelation of definition.inherits) {
      const tuple = await prisma.relationTuple.findFirst({
        where: {
          namespace,
          objectId,
          relation: inheritedRelation,
          subjectType: 'user',
          subjectId: userId
        }
      })
      if (tuple) return true
    }
  }

  return false
}

export async function grant(
  namespace: string,
  objectId: string,
  relation: string,
  subjectType: string,
  subjectId: string
): Promise<void> {
  await prisma.relationTuple.create({
    data: { namespace, objectId, relation, subjectType, subjectId }
  })
}

export async function revoke(
  namespace: string,
  objectId: string,
  relation: string,
  subjectType: string,
  subjectId: string
): Promise<void> {
  await prisma.relationTuple.deleteMany({
    where: { namespace, objectId, relation, subjectType, subjectId }
  })
}
```

### 3. Inngest 클라이언트

```typescript
// inngest/client.ts
import { Inngest } from 'inngest'

export const inngest = new Inngest({
  id: 'gini-ai',
  name: 'Gini AI Background Jobs',
})
```

### 4. Supabase 클라이언트

```typescript
// lib/supabase/client.ts (브라우저)
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// lib/supabase/server.ts (서버)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}
```

---

## 참고 문서

- [마이그레이션 계획](./NEXTJS_MIGRATION_PLAN.md)
- [Prisma 스키마](./NEXTJS_PRISMA_SCHEMA.md)
- [API 설계](./NEXTJS_API_DESIGN.md)
- [백그라운드 작업](./NEXTJS_BACKGROUND_JOBS.md)
