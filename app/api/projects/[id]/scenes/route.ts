import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { check, NAMESPACES, RELATIONS } from "@/lib/permissions";
import { NextResponse } from "next/server";

type Params = Promise<{ id: string }>;

/**
 * GET /api/projects/:id/scenes
 * 프로젝트의 모든 씬과 자산 조회
 */
export async function GET(
  request: Request,
  { params }: { params: Params }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: projectId } = await params;

    // 권한 확인
    const canView = await check(
      session.user.id,
      NAMESPACES.PROJECT,
      projectId,
      RELATIONS.VIEWER
    );

    if (!canView) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 씬 + 자산 조회 (명시적 Asset 관계 포함)
    const scenes = await prisma.scene.findMany({
      where: { projectId },
      include: {
        audioAsset: {
          select: {
            id: true,
            kind: true,
            type: true,
            url: true,
          },
        },
        avatarAsset: {
          select: {
            id: true,
            kind: true,
            type: true,
            url: true,
          },
        },
        backgroundAsset: {
          select: {
            id: true,
            kind: true,
            type: true,
            url: true,
          },
        },
      },
      orderBy: { sceneNumber: "asc" },
    });

    return NextResponse.json({ scenes });
  } catch (error) {
    console.error("Failed to fetch scenes:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
