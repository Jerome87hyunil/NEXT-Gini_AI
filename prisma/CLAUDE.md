# prisma/CLAUDE.md

데이터베이스 스키마 및 마이그레이션 가이드

---

## 📂 Files

```
prisma/
├── schema.prisma           # Prisma 스키마 정의
├── migrations/             # 마이그레이션 히스토리
│   └── {timestamp}_{name}/ # 각 마이그레이션 폴더
│       └── migration.sql   # SQL 마이그레이션 파일
└── seed.ts                 # 시드 데이터 (권한 정의)
```

---

## 🗂️ Database Schema Overview

총 **11개 테이블**:

### Core Models (7개)
1. `Organization` - 조직 관리
2. `User` - 사용자
3. `Project` - 영상 프로젝트
4. `Document` - PDF 업로드
5. `Scene` - 씬별 대본 및 상태
6. `Asset` - 생성된 자산
7. `RenderJob` - D-ID 작업 추적

### NextAuth (2개)
8. `Account` - OAuth 계정
9. `Session` - 세션 관리

### ReBAC (2개)
10. `RelationTuple` - 권한 튜플
11. `RelationDefinition` - 권한 정의

---

## 📊 Entity Relationship Diagram

```
Organization
    ↓ 1:N
   User ←─────┐
    ↓ 1:N     │
  Project     │ RelationTuple (ReBAC)
    ↓ 1:1     │
 Document     │
    ↓ 1:N     │
   Scene ─────┘
    ↓ 1:N
   Asset
    ↑ N:1
 RenderJob
```

---

## 📋 Detailed Schema

### 1. Organization

```prisma
model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  settings  Json?    @default("{}")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users    User[]
  projects Project[]
}
```

**설명**:
- SaaS 멀티테넌트 지원
- `slug`: URL 친화적 식별자 (예: `acme-corp`)
- `settings`: 조직별 설정 (JSONB)

**Usage**:
```typescript
const org = await prisma.organization.create({
  data: {
    name: "Acme Corporation",
    slug: "acme-corp",
    settings: { maxProjects: 100 },
  },
});
```

---

### 2. User

```prisma
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

  organization    Organization      @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  accounts        Account[]
  sessions        Session[]
  projects        Project[]         @relation("CreatedProjects")
  relationTuples  RelationTuple[]
}
```

**역할**:
- `admin`: 조직 관리자 (모든 권한)
- `member`: 일반 사용자 (프로젝트별 권한)

**Usage**:
```typescript
// 관리자 확인
const isAdmin = user.role === "admin";

// 사용자의 프로젝트 조회
const projects = await prisma.project.findMany({
  where: {
    OR: [
      { createdById: user.id },
      {
        relationTuples: {
          some: {
            userId: user.id,
            namespace: "project",
          },
        },
      },
    ],
  },
});
```

---

### 3. Project

```prisma
model Project {
  id                    String   @id @default(cuid())
  title                 String
  description           String?
  duration              Int      // 30, 60, 180 (초)
  status                String   @default("draft") // draft, document_uploaded, script_generating, rendering, rendered
  avatarDesignMode      String   @default("preset") // preset, custom
  avatarDesignStatus    String?  // pending, generating, completed, failed
  avatarDesignSettings  Json?    // 커스텀 아바타 설정
  organizationId        String
  createdById           String
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  organization   Organization      @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  createdBy      User              @relation("CreatedProjects", fields: [createdById], references: [id])
  document       Document?
  scenes         Scene[]
  assets         Asset[]
  relationTuples RelationTuple[]
}
```

**상태 플로우**:
```
draft → document_uploaded → script_generating → rendering → rendered
```

**커스텀 아바타 설정** (JSONB):
```typescript
{
  gender: "male" | "female",
  ageGroup: "20s" | "30s" | "40s" | "50s",
  style: "professional" | "casual" | "friendly",
  expression: "neutral" | "smiling",
  background: "office" | "studio" | "outdoor"
}
```

**Usage**:
```typescript
const project = await prisma.project.create({
  data: {
    title: "Q1 실적 발표",
    duration: 60,
    avatarDesignMode: "custom",
    avatarDesignSettings: {
      gender: "female",
      ageGroup: "30s",
      style: "professional",
      expression: "smiling",
      background: "office",
    },
    organizationId: org.id,
    createdById: user.id,
  },
});
```

---

### 4. Document

```prisma
model Document {
  id            String   @id @default(cuid())
  projectId     String   @unique
  filename      String
  originalName  String
  mimeType      String
  fileSize      Int
  storagePath   String   // Supabase Storage 경로
  status        String   @default("pending") // pending, validated, failed
  validatedAt   DateTime?
  createdAt     DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
}
```

**Usage**:
```typescript
const document = await prisma.document.create({
  data: {
    projectId: project.id,
    filename: "document.pdf",
    originalName: "Q1 실적보고.pdf",
    mimeType: "application/pdf",
    fileSize: 1024000,
    storagePath: "documents/project_123/document.pdf",
    status: "validated",
    validatedAt: new Date(),
  },
});
```

---

### 5. Scene

```prisma
model Scene {
  id                  String   @id @default(cuid())
  projectId           String
  sceneNumber         Int
  content             String   @db.Text
  duration            Int      // 15초
  ttsStatus           String   @default("pending") // pending, generating, completed, failed
  avatarStatus        String   @default("pending")
  backgroundStatus    String   @default("pending")
  backgroundAnalysis  Json     // { priority: "high" | "medium" | "low", emotion: string, visualDescription: string }
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  project Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assets  Asset[]
  renderJobs RenderJob[]

  @@unique([projectId, sceneNumber])
}
```

**3개 독립 상태**:
1. `ttsStatus`: TTS 생성 상태
2. `avatarStatus`: 아바타 생성 상태
3. `backgroundStatus`: 배경 생성 상태

**배경 분석** (JSONB):
```typescript
{
  priority: "high" | "medium" | "low",
  emotion: "professional" | "energetic" | "calm",
  visualDescription: "오피스 환경, 차트와 그래프 배경"
}
```

**Usage**:
```typescript
const scene = await prisma.scene.create({
  data: {
    projectId: project.id,
    sceneNumber: 1,
    content: "안녕하세요, Q1 실적을 발표하겠습니다.",
    duration: 15,
    backgroundAnalysis: {
      priority: "high",
      emotion: "professional",
      visualDescription: "현대적인 오피스, 차트 배경",
    },
  },
});

// 상태 업데이트
await prisma.scene.update({
  where: { id: scene.id },
  data: { ttsStatus: "completed" },
});
```

---

### 6. Asset

```prisma
model Asset {
  id           String   @id @default(cuid())
  projectId    String
  sceneId      String?
  assetType    String   // avatar_design, audio, avatar_video, background_image, background_video, final_video
  storagePath  String
  storageUrl   String
  metadata     Json?    // { cost: number, apiParams: object }
  createdAt    DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  scene   Scene?  @relation(fields: [sceneId], references: [id], onDelete: Cascade)
}
```

**자산 종류**:
- `avatar_design`: 커스텀 아바타 이미지
- `audio`: TTS 오디오 (씬별)
- `avatar_video`: 아바타 립싱크 영상 (씬별)
- `background_image`: 배경 이미지 (씬별)
- `background_video`: 배경 영상 (씬별)
- `final_video`: 최종 합성 영상

**메타데이터** (JSONB):
```typescript
{
  cost: 0.039, // API 비용
  apiParams: {
    model: "nano-banana-001",
    prompt: "...",
  },
  duration: 15, // 영상 길이 (초)
}
```

**Usage**:
```typescript
const asset = await prisma.asset.create({
  data: {
    projectId: project.id,
    sceneId: scene.id,
    assetType: "audio",
    storagePath: "audio/scene_1.mp3",
    storageUrl: "https://...",
    metadata: {
      cost: 0.2,
      apiParams: { voiceId: "rachel" },
    },
  },
});
```

---

### 7. RenderJob

```prisma
model RenderJob {
  id                String   @id @default(cuid())
  sceneId           String
  didTalkId         String   @unique
  didStatus         String   // created, processing, done, error
  didResultUrl      String?
  didError          String?
  webhookReceivedAt DateTime?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  scene Scene @relation(fields: [sceneId], references: [id], onDelete: Cascade)
}
```

**D-ID 상태**:
- `created`: D-ID API 호출 완료
- `processing`: 렌더링 중
- `done`: 완료
- `error`: 실패

**Usage**:
```typescript
const renderJob = await prisma.renderJob.create({
  data: {
    sceneId: scene.id,
    didTalkId: "tlk_123456",
    didStatus: "created",
  },
});

// 웹훅 수신 시 업데이트
await prisma.renderJob.update({
  where: { didTalkId: "tlk_123456" },
  data: {
    didStatus: "done",
    didResultUrl: "https://...",
    webhookReceivedAt: new Date(),
  },
});
```

---

### 8-9. NextAuth Models

```prisma
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
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

**NextAuth.js v5가 자동 관리합니다.**

---

### 10-11. ReBAC Models

```prisma
model RelationTuple {
  id        String   @id @default(cuid())
  userId    String
  namespace String   // "project", "organization"
  objectId  String   // project.id, organization.id
  relation  String   // "owner", "editor", "viewer"
  createdAt DateTime @default(now())

  user    User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  project Project? @relation(fields: [objectId], references: [id], onDelete: Cascade)

  @@unique([userId, namespace, objectId, relation])
}

model RelationDefinition {
  id           String   @id @default(cuid())
  namespace    String
  relation     String
  inheritsFrom String?  // 상위 권한 (owner → editor → viewer)
  createdAt    DateTime @default(now())

  @@unique([namespace, relation])
}
```

**권한 계층**:
```
owner (inheritsFrom: null)
  ↓
editor (inheritsFrom: "owner")
  ↓
viewer (inheritsFrom: "editor")
```

**Usage**:
```typescript
// 권한 정의 (seed.ts에서 실행)
await prisma.relationDefinition.createMany({
  data: [
    { namespace: "project", relation: "owner", inheritsFrom: null },
    { namespace: "project", relation: "editor", inheritsFrom: "owner" },
    { namespace: "project", relation: "viewer", inheritsFrom: "editor" },
  ],
});

// 권한 부여
await prisma.relationTuple.create({
  data: {
    userId: user.id,
    namespace: "project",
    objectId: project.id,
    relation: "owner",
  },
});
```

---

## 🔧 Database Commands

### 마이그레이션

```bash
# 새 마이그레이션 생성
npx prisma migrate dev --name add_background_analysis

# 프로덕션 마이그레이션 적용
npx prisma migrate deploy

# 마이그레이션 리셋 (개발 전용)
npx prisma migrate reset
```

### Prisma Client

```bash
# Prisma Client 재생성
npx prisma generate

# Prisma Studio 실행 (DB GUI)
npx prisma studio
```

### Seeding

```bash
# 권한 정의 Seed
npm run db:seed

# 또는
tsx prisma/seed.ts
```

---

## 📝 Seed Script (seed.ts)

```typescript
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // 1. 권한 정의 생성
  await prisma.relationDefinition.createMany({
    data: [
      { namespace: "project", relation: "owner", inheritsFrom: null },
      { namespace: "project", relation: "editor", inheritsFrom: "owner" },
      { namespace: "project", relation: "viewer", inheritsFrom: "editor" },
      { namespace: "organization", relation: "owner", inheritsFrom: null },
      { namespace: "organization", relation: "member", inheritsFrom: "owner" },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Relation definitions created");

  // 2. 테스트 조직 생성 (개발 환경만)
  if (process.env.NODE_ENV === "development") {
    const org = await prisma.organization.upsert({
      where: { slug: "demo-org" },
      update: {},
      create: {
        name: "Demo Organization",
        slug: "demo-org",
        settings: {},
      },
    });

    console.log("✅ Demo organization created:", org.slug);
  }

  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## 🔍 Common Queries

### 프로젝트 목록 (권한 필터링)

```typescript
import { check, NAMESPACES, RELATIONS } from "@/lib/permissions";

const projects = await prisma.project.findMany({
  where: {
    OR: [
      // 본인이 생성한 프로젝트
      { createdById: userId },
      // 권한이 있는 프로젝트
      {
        relationTuples: {
          some: {
            userId,
            namespace: NAMESPACES.PROJECT,
            relation: { in: [RELATIONS.OWNER, RELATIONS.EDITOR, RELATIONS.VIEWER] },
          },
        },
      },
    ],
  },
  include: {
    document: true,
    scenes: {
      select: { id: true, sceneNumber: true, ttsStatus: true, avatarStatus: true },
    },
    _count: { select: { scenes: true } },
  },
  orderBy: { createdAt: "desc" },
});
```

### 씬별 자산 조회

```typescript
const scene = await prisma.scene.findUnique({
  where: { id: sceneId },
  include: {
    assets: {
      where: { assetType: { in: ["audio", "avatar_video", "background_video"] } },
    },
  },
});

const audioAsset = scene.assets.find((a) => a.assetType === "audio");
const avatarAsset = scene.assets.find((a) => a.assetType === "avatar_video");
const backgroundAsset = scene.assets.find((a) => a.assetType === "background_video");
```

### 프로젝트 진행률 계산

```typescript
const project = await prisma.project.findUnique({
  where: { id: projectId },
  include: {
    scenes: {
      select: {
        ttsStatus: true,
        avatarStatus: true,
        backgroundStatus: true,
      },
    },
  },
});

const totalScenes = project.scenes.length;
const completedScenes = project.scenes.filter(
  (s) =>
    s.ttsStatus === "completed" &&
    s.avatarStatus === "completed" &&
    s.backgroundStatus === "completed"
).length;

const progress = Math.round((completedScenes / totalScenes) * 100);
```

---

## 🧪 Testing

### DB 리셋 (테스트 전)

```bash
npx prisma migrate reset --force
npm run db:seed
```

### 테스트 데이터 생성

```typescript
// __tests__/helpers/db.ts
export async function createTestUser(organizationId: string) {
  return prisma.user.create({
    data: {
      email: `test-${Date.now()}@example.com`,
      name: "Test User",
      role: "member",
      organizationId,
    },
  });
}

export async function createTestProject(userId: string, organizationId: string) {
  return prisma.project.create({
    data: {
      title: "Test Project",
      duration: 60,
      createdById: userId,
      organizationId,
    },
  });
}
```

---

## 🚨 Important Notes

### JSONB 필드 업데이트

```typescript
// ❌ 잘못된 방법 (전체 덮어쓰기)
await prisma.project.update({
  where: { id },
  data: {
    avatarDesignSettings: { gender: "male" },
  },
});

// ✅ 올바른 방법 (병합)
const project = await prisma.project.findUnique({ where: { id } });
await prisma.project.update({
  where: { id },
  data: {
    avatarDesignSettings: {
      ...project.avatarDesignSettings,
      gender: "male",
    },
  },
});
```

### Cascade Delete

모든 관계에 `onDelete: Cascade` 설정됨:
- Organization 삭제 → User, Project 자동 삭제
- Project 삭제 → Document, Scene, Asset 자동 삭제
- Scene 삭제 → Asset, RenderJob 자동 삭제

---

**See Also**:
- [app/CLAUDE.md](../app/CLAUDE.md) - App Router 가이드
- [lib/CLAUDE.md](../lib/CLAUDE.md) - 서비스 레이어 가이드
