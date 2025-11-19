# Gini AI - API 설계

> Next.js App Router API Routes 설계 및 구현 가이드

## API 엔드포인트

### 프로젝트 API

#### GET /api/projects
프로젝트 목록 조회 (사용자가 접근 가능한 프로젝트만)

```typescript
// app/api/projects/route.ts
export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 })

  // ReBAC: 사용자가 접근 가능한 프로젝트 조회
  const tuples = await prisma.relationTuple.findMany({
    where: {
      namespace: 'project',
      subjectType: 'user',
      subjectId: session.user.id,
    },
    select: { objectId: true },
  })

  const projectIds = tuples.map((t) => t.objectId)

  const projects = await prisma.project.findMany({
    where: {
      id: { in: projectIds },
      deletedAt: null,
    },
    include: {
      _count: { select: { scenes: true, assets: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(projects)
}
```

#### POST /api/projects
프로젝트 생성 + Owner 권한 부여

```typescript
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 })

  const body = await request.json()

  // 1. 프로젝트 생성
  const project = await prisma.project.create({
    data: {
      title: body.title,
      description: body.description,
      organizationId: session.user.organizationId,
      createdById: session.user.id,
      settings: body.settings || {},
      avatarDesignMode: body.avatarDesignMode || 'preset',
      avatarDesignSettings: body.avatarDesignSettings || {},
    },
  })

  // 2. Owner 권한 부여
  await grant('project', project.id, 'owner', 'user', session.user.id)

  // 3. 커스텀 아바타 생성 (선택적)
  if (project.avatarDesignMode === 'custom') {
    await inngest.send({
      name: 'avatar-design/generate.requested',
      data: { projectId: project.id },
    })
  }

  return NextResponse.json(project, { status: 201 })
}
```

#### GET /api/projects/[id]
프로젝트 상세 조회

```typescript
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 })

  // Viewer 권한 체크
  const canView = await check(session.user.id, 'project', params.id, 'viewer')
  if (!canView) return new Response('Forbidden', { status: 403 })

  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: {
      scenes: { orderBy: { position: 'asc' } },
      documents: true,
      assets: { where: { kind: 'final_video' } },
    },
  })

  if (!project) return new Response('Not Found', { status: 404 })

  return NextResponse.json(project)
}
```

#### PATCH /api/projects/[id]
프로젝트 수정

```typescript
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 })

  // Editor 권한 체크
  const canEdit = await check(session.user.id, 'project', params.id, 'editor')
  if (!canEdit) return new Response('Forbidden', { status: 403 })

  const body = await req.json()

  const project = await prisma.project.update({
    where: { id: params.id },
    data: {
      title: body.title,
      description: body.description,
      settings: body.settings,
    },
  })

  return NextResponse.json(project)
}
```

#### POST /api/projects/[id]/render
영상 렌더링 시작

```typescript
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth()
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 })

  // Editor 권한 체크
  const canEdit = await check(session.user.id, 'project', params.id, 'editor')
  if (!canEdit) return new Response('Forbidden', { status: 403 })

  // 모든 씬 완료 확인
  const project = await prisma.project.findUnique({
    where: { id: params.id },
    include: { scenes: true },
  })

  const allScenesReady = project.scenes.every(
    (scene) =>
      scene.ttsStatus === 'completed' &&
      scene.avatarStatus === 'completed' &&
      scene.backgroundStatus === 'generated'
  )

  if (!allScenesReady) {
    return NextResponse.json({ error: 'All scenes must be completed' }, { status: 400 })
  }

  // Inngest 이벤트 발송
  await inngest.send({
    name: 'video/render.requested',
    data: { projectId: params.id },
  })

  await prisma.project.update({
    where: { id: params.id },
    data: { status: 'rendering' },
  })

  return NextResponse.json({ success: true })
}
```

### 문서 API

#### POST /api/documents
문서 업로드 (Supabase Storage 이미 업로드됨)

```typescript
// app/api/documents/route.ts
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) return new Response('Unauthorized', { status: 401 })

  const body = await request.json()
  const { projectId, fileUrl } = body

  // Editor 권한 체크
  const canEdit = await check(session.user.id, 'project', projectId, 'editor')
  if (!canEdit) return new Response('Forbidden', { status: 403 })

  // 문서 레코드 생성
  const document = await prisma.document.create({
    data: {
      projectId,
      fileUrl,
      status: 'pending',
    },
  })

  // Inngest 이벤트 발송
  await inngest.send({
    name: 'document/uploaded',
    data: { documentId: document.id },
  })

  return NextResponse.json(document, { status: 201 })
}
```

### 웹훅 API

#### POST /api/webhooks/did
D-ID 웹훅 수신

```typescript
// app/api/webhooks/did/route.ts
export async function POST(request: Request) {
  // 서명 검증
  const signature = request.headers.get('x-webhook-signature')
  const body = await request.text()

  const expectedSignature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')

  if (signature !== expectedSignature) {
    return new Response('Unauthorized', { status: 401 })
  }

  const payload = JSON.parse(body)
  const { talk_id, status, result_url } = payload

  // Scene 찾기
  const scene = await prisma.scene.findFirst({
    where: { metadata: { path: ['talk_id'], equals: talk_id } },
  })

  if (!scene) {
    return new Response('Scene not found', { status: 404 })
  }

  if (status === 'done') {
    // Inngest 이벤트 발송 (다운로드 및 저장)
    await inngest.send({
      name: 'avatar/completed',
      data: { sceneId: scene.id, resultUrl: result_url },
    })
  } else if (status === 'error') {
    await prisma.scene.update({
      where: { id: scene.id },
      data: { avatarStatus: 'failed' },
    })
  }

  return NextResponse.json({ success: true })
}
```

---

## 권한 체크 패턴

모든 API는 다음 패턴을 따릅니다:

```typescript
// 1. 인증 확인
const session = await auth()
if (!session?.user?.id) return new Response('Unauthorized', { status: 401 })

// 2. 권한 확인 (ReBAC)
const canAccess = await check(session.user.id, 'project', projectId, 'required_role')
if (!canAccess) return new Response('Forbidden', { status: 403 })

// 3. 비즈니스 로직 실행
// ...

// 4. 응답 반환
return NextResponse.json(data)
```

---

## 참고 문서

- [아키텍처 설계](./NEXTJS_ARCHITECTURE.md)
- [Prisma 스키마](./NEXTJS_PRISMA_SCHEMA.md)
- [백그라운드 작업](./NEXTJS_BACKGROUND_JOBS.md)
