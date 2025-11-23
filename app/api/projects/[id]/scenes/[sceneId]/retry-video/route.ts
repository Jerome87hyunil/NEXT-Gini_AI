import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { check, NAMESPACES, RELATIONS } from "@/lib/permissions";
import { inngest } from "@/lib/inngest/client";
import { z } from "zod";

const retryVideoSchema = z.object({
  videoPrompt: z.string().min(10, "영상 프롬프트는 최소 10자 이상이어야 합니다."),
  emotion: z.string().optional(),
});

/**
 * POST /api/projects/[id]/scenes/[sceneId]/retry-video
 *
 * Veo 영상 재생성 (프롬프트 수정 후 재시도)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; sceneId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId, sceneId } = await params;

    // 권한 확인
    const canEdit = await check(
      session.user.id,
      NAMESPACES.PROJECT,
      projectId,
      RELATIONS.EDITOR
    );

    if (!canEdit) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 요청 본문 검증
    const body = await req.json();
    const { videoPrompt, emotion } = retryVideoSchema.parse(body);

    // Scene 조회
    const scene = await prisma.scene.findUnique({
      where: { id: sceneId },
      include: {
        backgroundAsset: true,
      },
    });

    if (!scene) {
      return NextResponse.json({ error: "Scene not found" }, { status: 404 });
    }

    if (scene.projectId !== projectId) {
      return NextResponse.json(
        { error: "Scene does not belong to this project" },
        { status: 400 }
      );
    }

    // 배경 이미지 Asset 확인 (Veo는 이미지로 시작)
    const imageAsset = await prisma.asset.findFirst({
      where: {
        sceneId: scene.id,
        kind: "background_image",
      },
      orderBy: { createdAt: "desc" },
    });

    if (!imageAsset) {
      return NextResponse.json(
        { error: "배경 이미지가 생성되지 않았습니다. Medium 이상 우선순위로 먼저 이미지를 생성해주세요." },
        { status: 400 }
      );
    }

    // videoPrompt 업데이트
    await prisma.scene.update({
      where: { id: sceneId },
      data: {
        videoPrompt,
        backgroundStatus: "processing", // 재생성 시작
      },
    });

    // Veo 영상 생성 이벤트 발송
    await inngest.send({
      name: "veo/generation.requested",
      data: {
        sceneId: scene.id,
        imageAssetId: imageAsset.id,
        imageUrl: imageAsset.url,
        videoPrompt,
        emotion: emotion || "professional",
      },
    });

    return NextResponse.json({
      success: true,
      message: "영상 재생성이 시작되었습니다.",
      sceneId,
      videoPrompt,
    });
  } catch (error) {
    console.error("Retry video generation error:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "영상 재생성에 실패했습니다." },
      { status: 500 }
    );
  }
}
