# app/CLAUDE.md

Next.js 15 App Router 구조 및 라우팅 가이드

---

## 📂 Directory Structure

```
app/
├── api/                    # API Routes
│   ├── auth/
│   │   └── [...nextauth]/  # NextAuth.js 인증 엔드포인트
│   ├── projects/           # 프로젝트 CRUD
│   │   └── [id]/
│   │       └── route.ts    # GET, PATCH, DELETE /api/projects/:id
│   ├── documents/          # 문서 업로드
│   │   └── route.ts        # POST /api/documents
│   ├── webhooks/
│   │   └── did/            # D-ID 웹훅
│   │       └── route.ts    # POST /api/webhooks/did
│   └── inngest/            # Inngest 엔드포인트
│       └── route.ts        # POST /api/inngest
├── auth/                   # 인증 페이지
│   ├── signin/
│   │   └── page.tsx        # 로그인 페이지
│   ├── signout/
│   │   └── page.tsx        # 로그아웃 페이지
│   └── error/
│       └── page.tsx        # 인증 에러 페이지
├── dashboard/              # 대시보드 (인증 필요)
│   ├── page.tsx            # 대시보드 메인
│   └── projects/           # 프로젝트 관리
│       ├── page.tsx        # 프로젝트 목록
│       ├── [id]/
│       │   └── page.tsx    # 프로젝트 상세
│       └── new/
│           └── page.tsx    # 프로젝트 생성
├── layout.tsx              # 루트 레이아웃
├── page.tsx                # 홈 페이지
└── globals.css             # 글로벌 스타일
```

---

## 🛣️ Routing Patterns

### API Routes

**프로젝트 CRUD**
```typescript
// app/api/projects/route.ts
export async function GET(request: Request) {
  // 프로젝트 목록 조회
}

export async function POST(request: Request) {
  // 프로젝트 생성
}

// app/api/projects/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // 프로젝트 상세 조회
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  // 프로젝트 수정
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  // 프로젝트 삭제
}
```

**웹훅**
```typescript
// app/api/webhooks/did/route.ts
export async function POST(request: Request) {
  const body = await request.json();

  // 1. 웹훅 서명 검증
  // 2. D-ID 이벤트 처리
  // 3. RenderJob 상태 업데이트

  return new Response(null, { status: 200 });
}
```

### Page Routes

**Server Components (기본)**
```typescript
// app/dashboard/projects/page.tsx
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function ProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  const projects = await prisma.project.findMany({
    where: { organizationId: session.user.organizationId },
    include: { document: true },
    orderBy: { createdAt: "desc" },
  });

  return <ProjectList projects={projects} />;
}
```

**Client Components (필요시만)**
```typescript
// app/dashboard/projects/[id]/page.tsx
"use client";

import { useState } from "react";

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const [isPlaying, setIsPlaying] = useState(false);

  // 클라이언트 상태 관리 필요한 경우만 "use client"

  return <VideoPlayer isPlaying={isPlaying} />;
}
```

---

## 🔒 Authentication & Authorization

### NextAuth.js 세션 확인

```typescript
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ProtectedPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return <div>Hello, {session.user.name}</div>;
}
```

### ReBAC 권한 체크

```typescript
import { auth } from "@/auth";
import { check, NAMESPACES, RELATIONS } from "@/lib/permissions";
import { notFound } from "next/navigation";

export default async function ProjectDetailPage({
  params
}: {
  params: { id: string }
}) {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin");

  // 프로젝트 조회 권한 확인
  const canView = await check(
    session.user.id,
    NAMESPACES.PROJECT,
    params.id,
    RELATIONS.VIEWER
  );

  if (!canView) {
    notFound();
  }

  // 권한 있음 - 프로젝트 조회
  const project = await prisma.project.findUnique({
    where: { id: params.id },
  });

  return <ProjectDetail project={project} />;
}
```

---

## 📝 API Route Best Practices

### 1. Input Validation (Zod)

```typescript
import { z } from "zod";

const createProjectSchema = z.object({
  title: z.string().min(1).max(100),
  duration: z.enum(["30", "60", "180"]),
  documentId: z.string().cuid(),
  avatarDesignMode: z.enum(["preset", "custom"]).default("preset"),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const validatedData = createProjectSchema.parse(body);

  // 프로젝트 생성 로직...
}
```

### 2. Error Handling

```typescript
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    const projects = await prisma.project.findMany({
      where: { organizationId: session.user.organizationId },
    });

    return Response.json(projects);
  } catch (error) {
    console.error("Failed to fetch projects:", error);

    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### 3. Response Format

```typescript
// 성공 응답
return Response.json(
  { data: project, message: "Project created successfully" },
  { status: 201 }
);

// 에러 응답
return Response.json(
  { error: "Project not found" },
  { status: 404 }
);

// 검증 에러
return Response.json(
  { error: "Validation failed", details: validationErrors },
  { status: 400 }
);
```

---

## 🎨 Layout & UI Patterns

### Root Layout

```typescript
// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Gini AI - AI 아바타 영상 생성",
  description: "PDF를 업로드하면 AI 아바타가 발표하는 영상을 자동 생성",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

### Dashboard Layout

```typescript
// app/dashboard/layout.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  return (
    <div className="flex h-screen">
      <Sidebar user={session.user} />
      <div className="flex-1 flex flex-col">
        <Header user={session.user} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

---

## 🔄 Data Fetching Patterns

### Server Components (권장)

```typescript
// app/dashboard/projects/page.tsx
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export default async function ProjectsPage() {
  const session = await auth();

  // Server Component에서 직접 DB 조회
  const projects = await prisma.project.findMany({
    where: { organizationId: session!.user.organizationId },
    include: {
      document: true,
      scenes: {
        select: { id: true, status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <h1>Projects</h1>
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}
```

### Client Components (필요시만)

```typescript
"use client";

import { useEffect, useState } from "react";

export default function ProjectStatus({ projectId }: { projectId: string }) {
  const [status, setStatus] = useState<string>("idle");

  useEffect(() => {
    // Realtime 업데이트 구독
    const channel = supabase
      .channel(`project:${projectId}`)
      .on("postgres_changes", { event: "*", schema: "public" }, (payload) => {
        setStatus(payload.new.status);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  return <StatusBadge status={status} />;
}
```

---

## 🚀 Performance Optimization

### 1. Streaming with Suspense

```typescript
import { Suspense } from "react";

export default function ProjectsPage() {
  return (
    <div>
      <h1>Projects</h1>
      <Suspense fallback={<LoadingSpinner />}>
        <ProjectList />
      </Suspense>
    </div>
  );
}

async function ProjectList() {
  const projects = await prisma.project.findMany();
  return <>{/* 렌더링 */}</>;
}
```

### 2. Partial Prerendering

```typescript
// app/dashboard/projects/page.tsx
export const experimental_ppr = true;

export default async function ProjectsPage() {
  // Static part: 즉시 렌더링
  return (
    <div>
      <Header />
      <Suspense fallback={<Skeleton />}>
        {/* Dynamic part: 스트리밍 */}
        <ProjectList />
      </Suspense>
    </div>
  );
}
```

### 3. Route Segment Config

```typescript
// 정적 페이지
export const dynamic = "force-static";

// 동적 페이지 (기본값)
export const dynamic = "force-dynamic";

// 재검증 주기 (ISR)
export const revalidate = 60; // 60초
```

---

## 📋 Common Patterns

### Form Submission

```typescript
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateProjectForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.get("title"),
          duration: formData.get("duration"),
        }),
      });

      if (!response.ok) throw new Error("Failed to create project");

      const { data } = await response.json();
      router.push(`/dashboard/projects/${data.id}`);
      router.refresh(); // Server Component 재렌더링
    } catch (error) {
      console.error(error);
      alert("프로젝트 생성 실패");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      {/* 폼 필드 */}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "생성 중..." : "프로젝트 생성"}
      </button>
    </form>
  );
}
```

### File Upload

```typescript
"use client";

import { useState } from "react";

export default function DocumentUpload({ projectId }: { projectId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleUpload() {
    if (!file) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", projectId);

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      alert("업로드 성공");
    } catch (error) {
      console.error(error);
      alert("업로드 실패");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <input
        type="file"
        accept=".pdf"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button onClick={handleUpload} disabled={!file || uploading}>
        {uploading ? "업로드 중..." : "업로드"}
      </button>
    </div>
  );
}
```

---

## 🧪 Testing

### API Route Testing (TODO)

```typescript
// __tests__/api/projects.test.ts
import { GET, POST } from "@/app/api/projects/route";

describe("GET /api/projects", () => {
  it("should return projects for authenticated user", async () => {
    const request = new Request("http://localhost:3000/api/projects");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
```

---

**See Also**:
- [lib/CLAUDE.md](../lib/CLAUDE.md) - 서비스 레이어 가이드
- [prisma/CLAUDE.md](../prisma/CLAUDE.md) - 데이터베이스 가이드
