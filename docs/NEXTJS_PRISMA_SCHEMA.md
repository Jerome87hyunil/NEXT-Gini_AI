# Gini AI - Prisma 스키마 설계

> Next.js + FDP 백엔드 아키텍처를 위한 Prisma 데이터베이스 스키마

## 목차
1. [개요](#개요)
2. [전체 스키마](#전체-스키마)
3. [모델 상세](#모델-상세)
4. [관계 다이어그램](#관계-다이어그램)
5. [인덱스 및 제약조건](#인덱스-및-제약조건)
6. [마이그레이션 가이드](#마이그레이션-가이드)

---

## 개요

### 데이터베이스 구조

- **총 테이블 수**: 11개
- **기존 모델**: 7개 (Organization, User, Project, Document, Scene, Asset, RenderJob)
- **NextAuth 모델**: 2개 (Account, Session)
- **ReBAC 모델**: 2개 (RelationTuple, RelationDefinition)

### 기술 스택

- **데이터베이스**: Supabase PostgreSQL
- **ORM**: Prisma 5.x
- **마이그레이션**: Prisma Migrate
- **타입 생성**: Prisma Client

---

## 전체 스키마

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
  // Vercel 배포를 위한 바이너리 타겟
  binaryTargets = ["native", "rhel-openssl-3.0.x"]
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ============================================
// 1. 조직 관리
// ============================================

model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  settings  Json?    @default("{}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  users    User[]
  projects Project[]

  @@map("organizations")
}

// ============================================
// 2. 사용자 (NextAuth 통합)
// ============================================

model User {
  id             String    @id @default(cuid())
  email          String    @unique
  emailVerified  DateTime?
  name           String?
  image          String?
  role           String    @default("member") // admin, member
  organizationId String
  lastSignInAt   DateTime?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  // Relations
  organization    Organization      @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  accounts        Account[]
  sessions        Session[]
  projects        Project[]         @relation("CreatedProjects")
  relationTuples  RelationTuple[]

  @@index([organizationId])
  @@index([email])
  @@map("users")
}

// ============================================
// 3. NextAuth 모델
// ============================================

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
  @@map("accounts")
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("sessions")
}

// ============================================
// 4. ReBAC 권한 시스템
// ============================================

model RelationTuple {
  id          String   @id @default(cuid())
  namespace   String   // "project"
  objectId    String   // project.id
  relation    String   // "owner", "editor", "viewer"
  subjectType String   // "user"
  subjectId   String   // user.id
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Relations
  user User @relation(fields: [subjectId], references: [id], onDelete: Cascade)

  @@unique([namespace, objectId, relation, subjectType, subjectId])
  @@index([namespace, objectId])
  @@index([subjectId])
  @@map("relation_tuples")
}

model RelationDefinition {
  id        String   @id @default(cuid())
  namespace String   // "project"
  relation  String   // "owner"
  inherits  String[] // ["editor", "viewer"]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([namespace, relation])
  @@map("relation_definitions")
}

// ============================================
// 5. 프로젝트
// ============================================

model Project {
  id          String   @id @default(cuid())
  title       String
  description String?  @db.Text
  status      String   @default("draft") // draft, script_generating, script_generated, rendering, rendered, failed

  // 조직 및 생성자
  organizationId String
  createdById    String

  // 설정
  settings Json? @default("{}")

  // 커스텀 아바타
  avatarDesignMode     String? @default("preset") // preset, custom
  avatarDesignStatus   String? @default("pending") // pending, generating, generated, failed
  avatarDesignSettings Json?   @default("{}")

  // 배경 생성 비용
  backgroundTotalCost      Decimal? @db.Decimal(10, 2)
  backgroundCostBreakdown  Json?

  // 타임스탬프
  scriptGeneratedAt DateTime?
  deletedAt         DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  // Relations
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdBy    User         @relation("CreatedProjects", fields: [createdById], references: [id], onDelete: Cascade)
  documents    Document[]
  scenes       Scene[]
  assets       Asset[]
  renderJobs   RenderJob[]

  @@index([organizationId])
  @@index([createdById])
  @@index([status])
  @@map("projects")
}

// ============================================
// 6. 문서
// ============================================

model Document {
  id        String   @id @default(cuid())
  projectId String
  status    String   @default("pending") // pending, processing, processed, failed
  metadata  Json?    @default("{}")

  // Supabase Storage
  fileUrl String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@index([status])
  @@map("documents")
}

// ============================================
// 7. 씬
// ============================================

model Scene {
  id             String  @id @default(cuid())
  projectId      String
  sceneNumber    Int
  position       Int
  script         String  @db.Text
  visualDescription String? @db.Text
  durationSeconds   Float?

  // TTS 설정
  ttsVoiceId String?
  ttsParams  Json?   @default("{}")
  ttsStatus  String  @default("pending") // pending, processing, completed, failed

  // 아바타 설정
  avatarId     String?
  avatarParams Json?   @default("{}")
  avatarStatus String  @default("pending") // pending, processing, completed, failed

  // 배경 설정
  backgroundSettings Json?   @default("{}")
  backgroundStatus   String  @default("pending") // pending, generating, generated, failed
  backgroundType     String? // veo_video, nano_image, ffmpeg_gradient
  backgroundAnalysis Json?
  backgroundMetadata Json?
  backgroundError    String? @db.Text

  // 기타 메타데이터
  metadata Json? @default("{}")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assets  Asset[]

  @@unique([projectId, sceneNumber])
  @@index([projectId])
  @@index([position])
  @@map("scenes")
}

// ============================================
// 8. 에셋 (파일)
// ============================================

model Asset {
  id        String  @id @default(cuid())
  projectId String
  sceneId   String?
  kind      String  // audio, avatar_video, avatar_design, background_image, background_video, background_gradient, final_video, subtitle
  metadata  Json?   @default("{}")

  // Supabase Storage
  storageProvider String  @default("supabase") // supabase, s3
  storageBucket   String  @default("assets")
  storagePath     String
  fileUrl         String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  scene   Scene?  @relation(fields: [sceneId], references: [id], onDelete: SetNull)

  @@index([projectId])
  @@index([sceneId])
  @@index([kind])
  @@map("assets")
}

// ============================================
// 9. 렌더링 작업
// ============================================

model RenderJob {
  id           String    @id @default(cuid())
  projectId    String
  status       String    @default("pending") // pending, processing, completed, failed
  traceId      String    @unique
  params       Json?     @default("{}")
  errorMessage String?   @db.Text
  completedAt  DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  // Relations
  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
  @@index([status])
  @@map("render_jobs")
}
```

---

## 모델 상세

### 1. Organization (조직)

**목적**: 멀티 테넌시 지원, 조직별 데이터 격리

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | String (CUID) | Primary Key |
| `name` | String | 조직명 |
| `slug` | String (Unique) | URL 친화적 식별자 |
| `settings` | Json | 조직 설정 (JSON) |
| `createdAt` | DateTime | 생성 시간 |
| `updatedAt` | DateTime | 업데이트 시간 |

**관계**:
- `users`: User[] (1:N)
- `projects`: Project[] (1:N)

---

### 2. User (사용자)

**목적**: 사용자 인증 및 권한 관리 (NextAuth 통합)

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | String (CUID) | Primary Key |
| `email` | String (Unique) | 이메일 |
| `emailVerified` | DateTime? | 이메일 인증 시간 (NextAuth) |
| `name` | String? | 사용자명 |
| `image` | String? | 프로필 이미지 URL (OAuth) |
| `role` | String | 역할 (admin, member) |
| `organizationId` | String | Foreign Key → organizations |
| `lastSignInAt` | DateTime? | 마지막 로그인 시간 |

**관계**:
- `organization`: Organization (N:1)
- `accounts`: Account[] (1:N, NextAuth)
- `sessions`: Session[] (1:N, NextAuth)
- `projects`: Project[] (1:N, 생성한 프로젝트)
- `relationTuples`: RelationTuple[] (1:N, 권한)

---

### 3. Account (NextAuth OAuth 계정)

**목적**: OAuth 제공자 연동 (Google, GitHub)

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | String (CUID) | Primary Key |
| `userId` | String | Foreign Key → users |
| `type` | String | "oauth" |
| `provider` | String | "google", "github" |
| `providerAccountId` | String | OAuth 제공자의 사용자 ID |
| `access_token` | String? | Access Token (Text) |
| `refresh_token` | String? | Refresh Token (Text) |
| `expires_at` | Int? | 토큰 만료 시간 (Unix timestamp) |

**유니크 제약**: `[provider, providerAccountId]`

---

### 4. Session (NextAuth 세션)

**목적**: 사용자 세션 관리 (DB 전략)

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | String (CUID) | Primary Key |
| `sessionToken` | String (Unique) | 세션 토큰 |
| `userId` | String | Foreign Key → users |
| `expires` | DateTime | 세션 만료 시간 |

---

### 5. RelationTuple (ReBAC 권한 튜플)

**목적**: 사용자-리소스 간 권한 관계 저장

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | String (CUID) | Primary Key |
| `namespace` | String | 네임스페이스 ("project") |
| `objectId` | String | 리소스 ID (project.id) |
| `relation` | String | 권한 관계 ("owner", "editor", "viewer") |
| `subjectType` | String | 주체 타입 ("user") |
| `subjectId` | String | 주체 ID (user.id) |

**유니크 제약**: `[namespace, objectId, relation, subjectType, subjectId]`

**예시**:
```typescript
// 사용자 "user123"이 프로젝트 "proj456"의 owner
{
  namespace: "project",
  objectId: "proj456",
  relation: "owner",
  subjectType: "user",
  subjectId: "user123"
}
```

---

### 6. RelationDefinition (ReBAC 관계 정의)

**목적**: 권한 상속 관계 정의

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | String (CUID) | Primary Key |
| `namespace` | String | 네임스페이스 ("project") |
| `relation` | String | 권한 관계 ("owner") |
| `inherits` | String[] | 상속하는 권한 (["editor", "viewer"]) |

**시드 데이터**:
```typescript
const projectRelations = [
  {
    namespace: "project",
    relation: "owner",
    inherits: ["editor", "viewer"],
  },
  {
    namespace: "project",
    relation: "editor",
    inherits: ["viewer"],
  },
  {
    namespace: "project",
    relation: "viewer",
    inherits: [],
  },
]
```

---

### 7. Project (프로젝트)

**목적**: 영상 프로젝트 관리

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | String (CUID) | Primary Key |
| `title` | String | 프로젝트 제목 |
| `description` | String? (Text) | 프로젝트 설명 |
| `status` | String | 상태 (draft, script_generating, ...) |
| `organizationId` | String | Foreign Key → organizations |
| `createdById` | String | Foreign Key → users |
| `settings` | Json | 프로젝트 설정 (톤, 길이 등) |
| `avatarDesignMode` | String | 아바타 모드 (preset, custom) |
| `avatarDesignStatus` | String | 아바타 생성 상태 |
| `avatarDesignSettings` | Json | 커스텀 아바타 설정 |
| `backgroundTotalCost` | Decimal(10,2) | 배경 생성 총 비용 (USD) |
| `backgroundCostBreakdown` | Json | 배경 비용 상세 |
| `scriptGeneratedAt` | DateTime? | 대본 생성 완료 시간 |
| `deletedAt` | DateTime? | Soft delete |

**상태 값**:
- `draft`: 초안
- `script_generating`: 대본 생성 중
- `script_generated`: 대본 생성 완료
- `rendering`: 렌더링 중
- `rendered`: 렌더링 완료
- `failed`: 실패

---

### 8. Document (문서)

**목적**: PDF 문서 관리

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | String (CUID) | Primary Key |
| `projectId` | String | Foreign Key → projects |
| `status` | String | 상태 (pending, processing, processed, failed) |
| `metadata` | Json | 파일 메타데이터 (크기, MIME 타입) |
| `fileUrl` | String? | Supabase Storage URL |

**Supabase Storage 경로**:
```
supabase-storage:assets/
  projects/{projectId}/documents/{documentId}.pdf
```

---

### 9. Scene (씬)

**목적**: 영상 씬 관리 (대본, 상태, 메타데이터)

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | String (CUID) | Primary Key |
| `projectId` | String | Foreign Key → projects |
| `sceneNumber` | Int | 씬 번호 (1, 2, 3...) |
| `position` | Int | 정렬 순서 |
| `script` | String (Text) | 대본 |
| `visualDescription` | String (Text) | 시각적 장면 묘사 |
| `durationSeconds` | Float? | 씬 길이 (초) |

**TTS 필드**:
- `ttsVoiceId`: ElevenLabs 음성 ID
- `ttsParams`: TTS 파라미터 (JSON)
- `ttsStatus`: TTS 상태 (pending, processing, completed, failed)

**아바타 필드**:
- `avatarId`: D-ID 아바타 ID
- `avatarParams`: 아바타 파라미터 (JSON)
- `avatarStatus`: 아바타 상태 (pending, processing, completed, failed)

**배경 필드**:
- `backgroundSettings`: 배경 설정 (JSON)
- `backgroundStatus`: 배경 상태 (pending, generating, generated, failed)
- `backgroundType`: 배경 타입 (veo_video, nano_image, ffmpeg_gradient)
- `backgroundAnalysis`: 씬 분석 결과 (priority, emotion, ...)
- `backgroundMetadata`: 배경 생성 메타데이터 (operation_id, ...)
- `backgroundError`: 배경 생성 에러 메시지

**유니크 제약**: `[projectId, sceneNumber]`

---

### 10. Asset (에셋)

**목적**: 생성된 파일 관리 (오디오, 비디오, 이미지 등)

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | String (CUID) | Primary Key |
| `projectId` | String | Foreign Key → projects |
| `sceneId` | String? | Foreign Key → scenes (nullable) |
| `kind` | String | 에셋 종류 |
| `metadata` | Json | 메타데이터 (cost, duration, ...) |
| `storageProvider` | String | 저장소 제공자 (supabase, s3) |
| `storageBucket` | String | 버킷 이름 |
| `storagePath` | String | 파일 경로 |
| `fileUrl` | String? | Public URL (CDN) |

**kind 값**:
- `audio`: TTS 생성 오디오 (MP3)
- `avatar_video`: D-ID 아바타 영상 (MP4)
- `avatar_design`: 커스텀 아바타 이미지 (PNG/JPG)
- `background_image`: Nano Banana 배경 이미지
- `background_video`: Veo 3.1 배경 영상
- `background_gradient`: FFmpeg 그라데이션
- `final_video`: 최종 렌더링 영상
- `subtitle`: 자막 파일 (SRT)

**Supabase Storage 구조**:
```
supabase-storage:assets/
  ├─ projects/{projectId}/
  │   ├─ documents/{documentId}.pdf
  │   ├─ avatar-design/{projectId}.png
  │   └─ scenes/{sceneId}/
  │       ├─ audio.mp3
  │       ├─ avatar.mp4
  │       ├─ background.png
  │       ├─ background.mp4
  │       └─ final.mp4
```

---

### 11. RenderJob (렌더링 작업)

**목적**: 비디오 렌더링 작업 추적

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | String (CUID) | Primary Key |
| `projectId` | String | Foreign Key → projects |
| `status` | String | 상태 (pending, processing, completed, failed) |
| `traceId` | String (Unique) | 추적 ID (UUID) |
| `params` | Json | 렌더링 파라미터 |
| `errorMessage` | String? (Text) | 에러 메시지 |
| `completedAt` | DateTime? | 완료 시간 |

---

## 관계 다이어그램

```
Organization (1) ──< (N) User
Organization (1) ──< (N) Project

User (1) ──< (N) Account (NextAuth)
User (1) ──< (N) Session (NextAuth)
User (1) ──< (N) RelationTuple (ReBAC)
User (1) ──< (N) Project (created)

Project (1) ──< (N) Document
Project (1) ──< (N) Scene
Project (1) ──< (N) Asset
Project (1) ──< (N) RenderJob

Scene (1) ──< (N) Asset (scene-specific)
```

---

## 인덱스 및 제약조건

### 유니크 제약

```prisma
// Organization
@@unique([slug])

// User
@@unique([email])

// Account
@@unique([provider, providerAccountId])

// Session
@@unique([sessionToken])

// RelationTuple
@@unique([namespace, objectId, relation, subjectType, subjectId])

// RelationDefinition
@@unique([namespace, relation])

// Scene
@@unique([projectId, sceneNumber])

// RenderJob
@@unique([traceId])
```

### 인덱스

```prisma
// User
@@index([organizationId])
@@index([email])

// Account
@@index([userId])

// Session
@@index([userId])

// RelationTuple
@@index([namespace, objectId])
@@index([subjectId])

// Project
@@index([organizationId])
@@index([createdById])
@@index([status])

// Document
@@index([projectId])
@@index([status])

// Scene
@@index([projectId])
@@index([position])

// Asset
@@index([projectId])
@@index([sceneId])
@@index([kind])

// RenderJob
@@index([projectId])
@@index([status])
```

---

## 마이그레이션 가이드

### 1. Prisma 설정

```bash
# Prisma 설치
npm install @prisma/client
npm install -D prisma

# Prisma 초기화
npx prisma init
```

### 2. 환경 변수 설정

```env
# .env.local
DATABASE_URL="postgresql://postgres.xxx:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxx:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"
```

- `DATABASE_URL`: 트랜잭션 풀러 (6543 포트, pgbouncer)
- `DIRECT_URL`: 직접 연결 (5432 포트, 마이그레이션용)

### 3. 스키마 복사

위의 전체 스키마를 `prisma/schema.prisma`에 복사

### 4. Prisma Client 생성

```bash
npx prisma generate
```

### 5. 마이그레이션 실행

```bash
# 개발 환경
npx prisma migrate dev --name init

# 프로덕션 환경
npx prisma migrate deploy
```

### 6. Seed 데이터 생성

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // 1. RelationDefinition 시드
  await prisma.relationDefinition.createMany({
    data: [
      { namespace: 'project', relation: 'owner', inherits: ['editor', 'viewer'] },
      { namespace: 'project', relation: 'editor', inherits: ['viewer'] },
      { namespace: 'project', relation: 'viewer', inherits: [] },
    ],
    skipDuplicates: true,
  })

  // 2. 조직 생성
  const org = await prisma.organization.upsert({
    where: { slug: 'demo' },
    update: {},
    create: {
      name: 'Demo Organization',
      slug: 'demo',
    },
  })

  // 3. 사용자 생성
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
      role: 'admin',
      organizationId: org.id,
    },
  })

  console.log('Seed completed:', { org, user })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

실행:
```bash
npx prisma db seed
```

### 7. Prisma Client 사용

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

사용:
```typescript
import { prisma } from '@/lib/prisma'

const projects = await prisma.project.findMany({
  where: { status: 'rendered' },
  include: {
    scenes: true,
    assets: { where: { kind: 'final_video' } },
  },
})
```

---

## 참고 문서

- [Prisma 공식 문서](https://www.prisma.io/docs)
- [Supabase PostgreSQL](https://supabase.com/docs/guides/database)
- [NextAuth Prisma Adapter](https://next-auth.js.org/adapters/prisma)
- [마이그레이션 계획](./NEXTJS_MIGRATION_PLAN.md)
- [아키텍처 설계](./NEXTJS_ARCHITECTURE.md)
