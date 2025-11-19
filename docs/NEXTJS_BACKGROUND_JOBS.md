# Gini AI - 백그라운드 작업 설계

> Inngest 기반 백그라운드 작업 워크플로우

## Inngest 함수 (12개)

### 1. DocumentParserJob

**트리거**: `document/uploaded`
**목적**: PDF 검증

```typescript
// inngest/functions/document-parser.ts
export const documentParser = inngest.createFunction(
  { id: 'document-parser' },
  { event: 'document/uploaded' },
  async ({ event, step }) => {
    const { documentId } = event.data

    const document = await step.run('verify-pdf', async () => {
      const doc = await prisma.document.findUnique({ where: { id: documentId } })

      // Supabase Storage 파일 확인
      const supabase = createClient()
      const { data } = await supabase.storage
        .from('assets')
        .download(doc.fileUrl)

      if (!data) throw new Error('File not found')

      return await prisma.document.update({
        where: { id: documentId },
        data: { status: 'processed', metadata: { fileSize: data.size } },
      })
    })

    await step.sendEvent('trigger-script-generator', {
      name: 'script/generate.requested',
      data: { projectId: document.projectId },
    })
  }
)
```

---

### 2. ScriptGeneratorJob

**트리거**: `script/generate.requested`
**목적**: Gemini 2.5 Pro로 대본 생성

```typescript
export const scriptGenerator = inngest.createFunction(
  { id: 'script-generator' },
  { event: 'script/generate.requested' },
  async ({ event, step }) => {
    const { projectId } = event.data

    const pdfData = await step.run('load-pdf', async () => {
      // Supabase Storage에서 PDF 다운로드 → Base64
    })

    const scenes = await step.run('generate-script', async () => {
      const service = new GoogleGeminiService()
      return await service.generateScript(pdfData)
    })

    await step.run('create-scenes', async () => {
      for (const [index, sceneData] of scenes.entries()) {
        await prisma.scene.create({
          data: {
            projectId,
            sceneNumber: index + 1,
            position: index + 1,
            script: sceneData.script,
            visualDescription: sceneData.visualDescription,
            durationSeconds: sceneData.duration,
          },
        })
      }

      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'script_generated', scriptGeneratedAt: new Date() },
      })
    })

    // 첫 번째 씬 처리 시작
    const firstScene = scenes[0]
    await step.sendEvent('trigger-first-scene', {
      name: 'scene/process.requested',
      data: { sceneId: firstScene.id, queueNext: true },
    })
  }
)
```

---

### 3. SceneProcessorJob

**트리거**: `scene/process.requested`
**목적**: 씬별 순차 처리 오케스트레이터

```typescript
export const sceneProcessor = inngest.createFunction(
  { id: 'scene-processor' },
  { event: 'scene/process.requested' },
  async ({ event, step }) => {
    const { sceneId, queueNext } = event.data

    // Step 1: TTS 생성 (동기)
    await step.run('generate-tts', async () => {
      const service = new ElevenLabsService()
      const scene = await prisma.scene.findUnique({ where: { id: sceneId } })

      await prisma.scene.update({
        where: { id: sceneId },
        data: { ttsStatus: 'processing' },
      })

      const audioData = await service.generateSpeech(scene.script)

      // Supabase Storage 업로드
      const supabase = createClient()
      await supabase.storage
        .from('assets')
        .upload(`projects/${scene.projectId}/scenes/${sceneId}/audio.mp3`, audioData)

      return await prisma.scene.update({
        where: { id: sceneId },
        data: { ttsStatus: 'completed' },
      })
    })

    // Step 2: 아바타 생성 요청
    await step.sendEvent('trigger-avatar', {
      name: 'avatar/generate.requested',
      data: { sceneId },
    })

    // Step 3: 아바타 완료 대기 (waitForEvent)
    await step.waitForEvent('avatar-completed', {
      event: 'avatar/generated',
      timeout: '5m',
      match: 'data.sceneId',
    })

    // Step 4: 배경 생성
    await step.sendEvent('trigger-background', {
      name: 'background/generate.requested',
      data: { sceneId },
    })

    // Step 5: 다음 씬 큐잉
    if (queueNext) {
      await step.sleep('rate-limit', '2s')

      const nextScene = await step.run('find-next-scene', async () => {
        const scene = await prisma.scene.findUnique({ where: { id: sceneId } })
        return await prisma.scene.findFirst({
          where: {
            projectId: scene.projectId,
            position: { gt: scene.position },
          },
          orderBy: { position: 'asc' },
        })
      })

      if (nextScene) {
        await step.sendEvent('next-scene', {
          name: 'scene/process.requested',
          data: { sceneId: nextScene.id, queueNext: true },
        })
      } else {
        // 모든 씬 완료 → 렌더링 트리거
        await step.sendEvent('trigger-render', {
          name: 'video/render.requested',
          data: { projectId: scene.projectId },
        })
      }
    }
  }
)
```

---

### 4. AvatarPollingJob

**트리거**: `avatar/polling.start`
**목적**: D-ID 상태 폴링

```typescript
export const avatarPoller = inngest.createFunction(
  { id: 'avatar-poller' },
  { event: 'avatar/polling.start' },
  async ({ event, step }) => {
    const { sceneId, talkId } = event.data

    const result = await step.run('poll-did', async () => {
      const service = new DidService()
      return await service.getTalkStatus(talkId)
    }, {
      retries: 20,  // 최대 20회
      delay: '5s',  // 5초 간격
    })

    if (result.status === 'done') {
      const videoData = await step.run('download-video', async () => {
        return await fetch(result.result_url).then((r) => r.arrayBuffer())
      })

      await step.run('save-asset', async () => {
        const supabase = createClient()
        await supabase.storage
          .from('assets')
          .upload(`projects/.../scenes/${sceneId}/avatar.mp4`, videoData)

        await prisma.scene.update({
          where: { id: sceneId },
          data: { avatarStatus: 'completed' },
        })
      })

      await step.sendEvent('avatar-done', {
        name: 'avatar/generated',
        data: { sceneId },
      })
    } else {
      await prisma.scene.update({
        where: { id: sceneId },
        data: { avatarStatus: 'failed' },
      })
    }
  }
)
```

---

### 5. VeoVideoPollingJob

**트리거**: `veo/polling.start`
**목적**: Veo 3.1 operation 폴링

```typescript
export const veoPoller = inngest.createFunction(
  { id: 'veo-poller' },
  { event: 'veo/polling.start' },
  async ({ event, step }) => {
    const { sceneId, operationId } = event.data

    const result = await step.run('poll-veo', async () => {
      const service = new GoogleGeminiService()
      return await service.getOperation(operationId)
    }, {
      retries: 120,  // 최대 120회 (10분)
      delay: '5s',   // 5초 간격
    })

    if (result.status === 'SUCCEEDED') {
      const videoData = await step.run('download-video', async () => {
        return await fetch(result.data.videoUrl).then((r) => r.arrayBuffer())
      })

      await step.run('save-asset', async () => {
        const supabase = createClient()
        await supabase.storage
          .from('assets')
          .upload(`projects/.../scenes/${sceneId}/background.mp4`, videoData)

        await prisma.scene.update({
          where: { id: sceneId },
          data: { backgroundStatus: 'generated', backgroundType: 'veo_video' },
        })
      })

      await step.sendEvent('veo-done', {
        name: 'veo/generated',
        data: { sceneId },
      })
    }
  }
)
```

---

### 6. VideoRenderJob

**트리거**: `video/render.requested`
**목적**: AWS Lambda FFmpeg 호출

```typescript
export const videoRender = inngest.createFunction(
  { id: 'video-render' },
  { event: 'video/render.requested' },
  async ({ event, step }) => {
    const { projectId } = event.data

    const scenes = await step.run('prepare-scenes', async () => {
      return await prisma.scene.findMany({
        where: { projectId },
        include: { assets: true },
        orderBy: { position: 'asc' },
      })
    })

    const result = await step.run('invoke-lambda', async () => {
      const lambda = new LambdaClient({ region: 'us-east-1' })

      const command = new InvokeCommand({
        FunctionName: 'ffmpeg-video-compositor',
        Payload: JSON.stringify({
          projectId,
          scenes: scenes.map((s) => ({
            sceneId: s.id,
            avatarUrl: s.assets.find((a) => a.kind === 'avatar_video')?.fileUrl,
            backgroundUrl: s.assets.find((a) => a.kind.startsWith('background'))?.fileUrl,
            duration: s.durationSeconds,
          })),
        }),
      })

      const response = await lambda.send(command)
      return JSON.parse(new TextDecoder().decode(response.Payload))
    })

    await step.run('save-final-video', async () => {
      await prisma.asset.create({
        data: {
          projectId,
          kind: 'final_video',
          storageProvider: 'supabase',
          storageBucket: 'assets',
          storagePath: result.outputPath,
          fileUrl: result.publicUrl,
        },
      })

      await prisma.project.update({
        where: { id: projectId },
        data: { status: 'rendered' },
      })
    })
  }
)
```

---

## Inngest 특징 활용

### 1. 자동 재시도
```typescript
await step.run('api-call', async () => {
  // ...
}, {
  retries: 3,
  delay: '2s',
})
```

### 2. 이벤트 대기
```typescript
await step.waitForEvent('event-name', {
  event: 'avatar/generated',
  timeout: '5m',
  match: 'data.sceneId',
})
```

### 3. Sleep (Rate Limit)
```typescript
await step.sleep('wait', '2s')
```

### 4. 이벤트 발송
```typescript
await step.sendEvent('event-id', {
  name: 'scene/process.requested',
  data: { sceneId: '...' },
})
```

---

## 참고 문서

- [마이그레이션 계획](./NEXTJS_MIGRATION_PLAN.md)
- [아키텍처 설계](./NEXTJS_ARCHITECTURE.md)
- [API 설계](./NEXTJS_API_DESIGN.md)
- [Inngest 공식 문서](https://www.inngest.com/docs)
