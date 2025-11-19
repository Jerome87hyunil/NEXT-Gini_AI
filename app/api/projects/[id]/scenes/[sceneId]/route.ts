import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { check, NAMESPACES, RELATIONS } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { z } from "zod";

// Zod 스키마: Scene 수정
const updateSceneSchema = z.object({
  script: z.string().min(1, "스크립트는 비워둘 수 없습니다.").max(5000, "스크립트는 최대 5000자입니다.").optional(),
  visualDescription: z.string().max(1000, "시각적 설명은 최대 1000자입니다.").optional(),
  duration: z.number().min(1).max(60).optional(),
});

type Params = Promise<{ id: string; sceneId: string }>;

/**
 * PATCH /api/projects/[id]/scenes/[sceneId]
 * Scene 수정 (스크립트 편집)
 */
export async function PATCH(request: Request, { params }: { params: Params }) {
  const session = await auth();
  const { id: projectId, sceneId } = await params;

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

    // Scene이 해당 프로젝트에 속하는지 확인
    const existingScene = await prisma.scene.findFirst({
      where: {
        id: sceneId,
        projectId,
      },
    });

    if (!existingScene) {
      return NextResponse.json(
        { error: "Scene을 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validated = updateSceneSchema.parse(body);

    // Scene 업데이트
    const updatedScene = await prisma.scene.update({
      where: { id: sceneId },
      data: {
        ...validated,
        // duration이 변경되면 durationSeconds도 동기화
        ...(validated.duration && { durationSeconds: validated.duration }),
      },
    });

    return NextResponse.json(updatedScene);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "입력 검증 실패", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Failed to update scene:", error);

    let errorMessage = "Scene 업데이트에 실패했습니다.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
