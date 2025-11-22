import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { check, NAMESPACES, RELATIONS } from "@/lib/permissions";
import { downloadFile } from "@/lib/supabase/storage";
import { inngest } from "@/lib/inngest/client";
import { NextResponse } from "next/server";
import { generateScript } from "@/lib/services/gemini";

type Params = Promise<{ id: string }>;

/**
 * POST /api/projects/[id]/generate-script
 * PDF로부터 스크립트 생성
 */
export async function POST(request: Request, { params }: { params: Params }) {
  const session = await auth();
  const { id: projectId } = await params;

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // 권한 확인 (editor 이상)
    const canEdit = await check(
      session.user.id,
      NAMESPACES.PROJECT,
      projectId,
      RELATIONS.EDITOR
    );

    if (!canEdit) {
      return new Response("Forbidden", { status: 403 });
    }

    // 프로젝트 조회
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        documents: {
          orderBy: { createdAt: "desc" },
          take: 1, // 가장 최근 문서 1개만
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (!project.documents || project.documents.length === 0) {
      return NextResponse.json(
        { error: "업로드된 문서가 없습니다." },
        { status: 400 }
      );
    }

    const document = project.documents[0];

    // Supabase Storage에서 PDF 다운로드
    const blob = await downloadFile(document.storagePath);
    const arrayBuffer = await blob.arrayBuffer();
    const pdfBase64 = Buffer.from(arrayBuffer).toString("base64");

    // lib/services/gemini.ts의 generateScript() 함수 사용
    // (Gemini 2.5 Pro + Flash 검증/요약 포함)
    const scriptData = await generateScript(
      pdfBase64,
      project.duration as 30 | 60 | 180
    );

    // Scene 레코드 생성
    const scenes = await Promise.all(
      scriptData.scenes.map(async (scene: {
        sceneNumber?: number;
        script?: string;
        text?: string;
        duration?: number;
        visualDescription?: string;
        imagePrompt?: string;
        videoPrompt?: string;
        priority?: string;
        emotion?: string
      }, index: number) => {
        return prisma.scene.create({
          data: {
            projectId,
            sceneNumber: scene.sceneNumber || index + 1,
            position: index,
            script: scene.script || scene.text || "",
            duration: scene.duration || 8,
            durationSeconds: scene.duration || 8,
            visualDescription: scene.visualDescription || "",
            imagePrompt: scene.imagePrompt || null,
            videoPrompt: scene.videoPrompt || null,
            ttsStatus: "pending",
            avatarStatus: "pending",
            backgroundStatus: "pending",
            backgroundAnalysis: {
              priority: scene.priority || "medium",
              emotion: scene.emotion || "neutral",
            },
            metadata: {},
          },
        });
      })
    );

    // 프로젝트 상태 업데이트
    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: "script_generated",
        scriptGeneratedAt: new Date(),
      },
    });

    // Document 상태 업데이트
    await prisma.document.update({
      where: { id: document.id },
      data: {
        status: "completed",
      },
    });

    // 워크플로우 자동 실행: 커스텀 아바타 생성 + 씬 처리
    // 1. 커스텀 아바타 모드면 아바타 디자인 생성 이벤트
    if (project.avatarDesignMode === "custom") {
      await inngest.send({
        name: "avatar-design/generation.requested",
        data: {
          projectId,
        },
      });
    }

    // 2. 첫 번째 씬부터 순차 처리 시작 (TTS → 아바타 → 배경)
    if (scenes.length > 0) {
      await inngest.send({
        name: "scene/process.requested",
        data: {
          projectId,
          sceneId: scenes[0].id,
          userId: session.user.id,
        },
      });
    }

    return NextResponse.json({
      message: "스크립트 생성 및 워크플로우 시작 완료",
      scenesCount: scenes.length,
      scenes,
    });
  } catch (error) {
    console.error("Failed to generate script:", error);

    let errorMessage = "스크립트 생성에 실패했습니다.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
