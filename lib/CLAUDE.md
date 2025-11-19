# lib/CLAUDE.md

핵심 비즈니스 로직 및 서비스 레이어 가이드

---

## 📂 Directory Structure

```
lib/
├── prisma.ts               # Prisma 클라이언트 (싱글톤)
├── utils.ts                # 유틸리티 함수
├── permissions/            # ReBAC 권한 시스템
│   ├── index.ts            # 권한 체크 함수
│   └── constants.ts        # NAMESPACES, RELATIONS 상수
├── supabase/               # Supabase 클라이언트
│   ├── client.ts           # 브라우저용 클라이언트
│   ├── server.ts           # 서버용 클라이언트
│   └── storage.ts          # Storage 헬퍼 함수
├── services/               # 외부 API 서비스
│   ├── vertex-ai.ts        # Google Vertex AI
│   ├── elevenlabs.ts       # ElevenLabs TTS
│   └── did.ts              # D-ID 아바타
└── inngest/                # 백그라운드 작업
    ├── client.ts           # Inngest 클라이언트
    └── functions/          # Inngest 함수들
        ├── script-generator.ts
        ├── tts-generator.ts
        ├── avatar-generator.ts
        └── video-compositor.ts
```

---

## 🔧 Core Utilities

### Prisma Client (prisma.ts)

```typescript
// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

**Usage**:
```typescript
import { prisma } from "@/lib/prisma";

const projects = await prisma.project.findMany({
  where: { organizationId },
  include: { document: true },
});
```

### Utils (utils.ts)

```typescript
// lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
```

---

## 🔐 Permission System (permissions/)

### ReBAC 권한 체크

```typescript
// lib/permissions/index.ts
import { prisma } from "@/lib/prisma";
import { NAMESPACES, RELATIONS } from "./constants";

/**
 * 권한 확인
 */
export async function check(
  userId: string,
  namespace: string,
  objectId: string,
  relation: string
): Promise<boolean> {
  // 1. 직접 권한 확인
  const directPermission = await prisma.relationTuple.findUnique({
    where: {
      userId_namespace_objectId_relation: {
        userId,
        namespace,
        objectId,
        relation,
      },
    },
  });

  if (directPermission) return true;

  // 2. 상속 권한 확인 (owner > editor > viewer)
  const definition = await prisma.relationDefinition.findUnique({
    where: {
      namespace_relation: { namespace, relation },
    },
  });

  if (!definition?.inheritsFrom) return false;

  // 상위 권한 재귀 체크
  return check(userId, namespace, objectId, definition.inheritsFrom);
}

/**
 * 권한 부여
 */
export async function grant(
  userId: string,
  namespace: string,
  objectId: string,
  relation: string
): Promise<void> {
  await prisma.relationTuple.create({
    data: { userId, namespace, objectId, relation },
  });
}

/**
 * 권한 해제
 */
export async function revoke(
  userId: string,
  namespace: string,
  objectId: string,
  relation: string
): Promise<void> {
  await prisma.relationTuple.delete({
    where: {
      userId_namespace_objectId_relation: {
        userId,
        namespace,
        objectId,
        relation,
      },
    },
  });
}
```

### Constants

```typescript
// lib/permissions/constants.ts
export const NAMESPACES = {
  PROJECT: "project",
  ORGANIZATION: "organization",
} as const;

export const RELATIONS = {
  OWNER: "owner",
  EDITOR: "editor",
  VIEWER: "viewer",
} as const;
```

### Usage Example

```typescript
import { check, grant, revoke, NAMESPACES, RELATIONS } from "@/lib/permissions";

// 프로젝트 조회 권한 확인
const canView = await check(
  userId,
  NAMESPACES.PROJECT,
  projectId,
  RELATIONS.VIEWER
);

// 프로젝트 소유자로 권한 부여
await grant(userId, NAMESPACES.PROJECT, projectId, RELATIONS.OWNER);

// 권한 해제
await revoke(userId, NAMESPACES.PROJECT, projectId, RELATIONS.EDITOR);
```

---

## 📦 Supabase Services (supabase/)

### Server Client

```typescript
// lib/supabase/server.ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
}
```

### Browser Client

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

### Storage Helper

```typescript
// lib/supabase/storage.ts
import { createClient } from "./server";

const BUCKET_NAME = "gini-ai-assets";

/**
 * 파일 업로드
 */
export async function uploadFile(
  path: string,
  file: File | Buffer,
  contentType?: string
): Promise<{ url: string; path: string }> {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(path, file, {
      contentType,
      upsert: false,
    });

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    path: data.path,
  };
}

/**
 * 파일 다운로드
 */
export async function downloadFile(path: string): Promise<Blob> {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .download(path);

  if (error) throw error;
  return data;
}

/**
 * 파일 삭제
 */
export async function deleteFile(path: string): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([path]);

  if (error) throw error;
}

/**
 * 서명된 URL 생성 (1시간 유효)
 */
export async function createSignedUrl(
  path: string,
  expiresIn = 3600
): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}
```

---

## 🤖 External API Services (services/)

### Google Vertex AI (vertex-ai.ts)

```typescript
// lib/services/vertex-ai.ts
import { VertexAI } from "@google-cloud/vertexai";

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT!,
  location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
});

/**
 * Gemini 2.5 Pro - 대본 생성
 */
export async function generateScript(
  pdfBase64: string,
  duration: number
): Promise<{ scenes: Array<{ content: string; duration: number }> }> {
  const model = vertexAI.getGenerativeModel({
    model: "gemini-2.5-pro",
  });

  const prompt = `
PDF 문서를 분석하여 ${duration}초 분량의 발표 대본을 생성하세요.
각 씬은 15초 분량입니다.

출력 형식 (JSON):
{
  "scenes": [
    { "content": "씬 1 대본", "duration": 15 },
    { "content": "씬 2 대본", "duration": 15 }
  ]
}
  `.trim();

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: pdfBase64,
            },
          },
        ],
      },
    ],
  });

  const response = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!response) throw new Error("No response from Gemini");

  return JSON.parse(response);
}

/**
 * Nano Banana - 아바타 이미지 생성
 */
export async function generateAvatarImage(
  prompt: string
): Promise<{ imageUrl: string; cost: number }> {
  const model = vertexAI.getGenerativeModel({
    model: "nano-banana-001",
  });

  const result = await model.generateContent(prompt);

  // TODO: 실제 Nano API 응답 형식에 맞게 수정
  return {
    imageUrl: "https://...",
    cost: 0.039,
  };
}

/**
 * Veo 3.1 - 배경 영상 생성
 */
export async function generateBackgroundVideo(
  imageUrl: string,
  prompt: string
): Promise<{ operationName: string }> {
  // TODO: Veo API 통합
  return {
    operationName: "projects/.../operations/...",
  };
}

/**
 * Veo 폴링
 */
export async function pollVeoOperation(
  operationName: string
): Promise<{ status: string; videoUrl?: string }> {
  // TODO: LRO 폴링 구현
  return {
    status: "SUCCEEDED",
    videoUrl: "https://...",
  };
}
```

### ElevenLabs TTS (elevenlabs.ts)

```typescript
// lib/services/elevenlabs.ts
export async function generateTts(
  text: string,
  voiceId = process.env.ELEVEN_DEFAULT_VOICE_ID!
): Promise<{ audioUrl: string; cost: number }> {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVEN_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`ElevenLabs API error: ${response.statusText}`);
  }

  const audioBuffer = await response.arrayBuffer();

  // Supabase Storage에 업로드
  const { uploadFile } = await import("@/lib/supabase/storage");
  const fileName = `audio/${Date.now()}.mp3`;
  const { url } = await uploadFile(
    fileName,
    Buffer.from(audioBuffer),
    "audio/mpeg"
  );

  return {
    audioUrl: url,
    cost: 0.2, // 예상 비용
  };
}
```

### D-ID Avatar (did.ts)

```typescript
// lib/services/did.ts
export async function createTalk(
  avatarImageUrl: string,
  audioUrl: string
): Promise<{ id: string; status: string }> {
  const response = await fetch("https://api.d-id.com/talks", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${process.env.DID_API_KEY!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source_url: avatarImageUrl,
      script: {
        type: "audio",
        audio_url: audioUrl,
      },
      config: {
        fluent: true,
        pad_audio: 0,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`D-ID API error: ${response.statusText}`);
  }

  return response.json();
}

export async function getTalkStatus(
  talkId: string
): Promise<{ status: string; result_url?: string }> {
  const response = await fetch(`https://api.d-id.com/talks/${talkId}`, {
    headers: {
      Authorization: `Basic ${process.env.DID_API_KEY!}`,
    },
  });

  if (!response.ok) {
    throw new Error(`D-ID API error: ${response.statusText}`);
  }

  return response.json();
}
```

---

## ⚙️ Inngest Functions (inngest/)

### Client Setup

```typescript
// lib/inngest/client.ts
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "gini-ai",
  eventKey: process.env.INNGEST_EVENT_KEY!,
});
```

### Function Example: Script Generator

```typescript
// lib/inngest/functions/script-generator.ts
import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { generateScript } from "@/lib/services/vertex-ai";

export const scriptGenerator = inngest.createFunction(
  {
    id: "script-generator",
    name: "Generate Script from PDF",
    retries: 2,
  },
  { event: "project/script.generate" },
  async ({ event, step }) => {
    const { projectId } = event.data;

    // 1. 프로젝트 조회
    const project = await step.run("fetch-project", async () => {
      return prisma.project.findUniqueOrThrow({
        where: { id: projectId },
        include: { document: true },
      });
    });

    // 2. PDF 다운로드 및 Base64 인코딩
    const pdfBase64 = await step.run("encode-pdf", async () => {
      const { downloadFile } = await import("@/lib/supabase/storage");
      const blob = await downloadFile(project.document.storagePath);
      const buffer = Buffer.from(await blob.arrayBuffer());
      return buffer.toString("base64");
    });

    // 3. Gemini API 호출
    const { scenes } = await step.run("generate-script", async () => {
      return generateScript(pdfBase64, project.duration);
    });

    // 4. Scene 레코드 생성
    await step.run("create-scenes", async () => {
      await prisma.scene.createMany({
        data: scenes.map((scene, index) => ({
          projectId,
          sceneNumber: index + 1,
          content: scene.content,
          duration: scene.duration,
          backgroundAnalysis: {}, // 초기값
        })),
      });
    });

    // 5. 프로젝트 상태 업데이트
    await step.run("update-project-status", async () => {
      await prisma.project.update({
        where: { id: projectId },
        data: { status: "script_generated" },
      });
    });

    // 6. 다음 단계 이벤트 전송
    await step.sendEvent("trigger-scene-processing", {
      name: "project/scenes.process",
      data: { projectId },
    });

    return { projectId, scenesCount: scenes.length };
  }
);
```

### Function Best Practices

1. **멱등성**: 재시도 시 중복 실행 방지
   ```typescript
   const existing = await prisma.scene.findFirst({
     where: { projectId, sceneNumber },
   });
   if (existing) return; // 이미 존재하면 스킵
   ```

2. **에러 핸들링**: 의미 있는 에러 메시지
   ```typescript
   try {
     await generateScript(pdfBase64, duration);
   } catch (error) {
     throw new Error(`Script generation failed: ${error.message}`);
   }
   ```

3. **Step 분리**: 각 단계를 독립적인 step으로 분리
   ```typescript
   const data1 = await step.run("step-1", async () => { /* ... */ });
   const data2 = await step.run("step-2", async () => { /* ... */ });
   ```

4. **이벤트 체이닝**: 워크플로우 연결
   ```typescript
   await step.sendEvent("next-step", {
     name: "project/next.process",
     data: { projectId },
   });
   ```

---

## 🧪 Testing

### Service Function Testing

```typescript
// __tests__/services/vertex-ai.test.ts
import { generateScript } from "@/lib/services/vertex-ai";

describe("generateScript", () => {
  it("should generate script from PDF", async () => {
    const mockPdfBase64 = "base64_encoded_pdf";
    const result = await generateScript(mockPdfBase64, 60);

    expect(result.scenes).toHaveLength(4); // 60초 / 15초
    expect(result.scenes[0]).toHaveProperty("content");
    expect(result.scenes[0]).toHaveProperty("duration", 15);
  });
});
```

### Permission Testing

```typescript
// __tests__/permissions/index.test.ts
import { check, grant, NAMESPACES, RELATIONS } from "@/lib/permissions";

describe("Permission System", () => {
  it("should grant and check permission", async () => {
    const userId = "user_123";
    const projectId = "project_456";

    // 권한 부여
    await grant(userId, NAMESPACES.PROJECT, projectId, RELATIONS.OWNER);

    // 권한 확인
    const canEdit = await check(
      userId,
      NAMESPACES.PROJECT,
      projectId,
      RELATIONS.EDITOR
    );

    expect(canEdit).toBe(true); // owner는 editor 권한 상속
  });
});
```

---

**See Also**:
- [app/CLAUDE.md](../app/CLAUDE.md) - App Router 가이드
- [prisma/CLAUDE.md](../prisma/CLAUDE.md) - 데이터베이스 가이드
