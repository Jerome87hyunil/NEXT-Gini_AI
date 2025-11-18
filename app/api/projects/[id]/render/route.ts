import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { check, NAMESPACES, RELATIONS } from "@/lib/permissions";
import { inngest } from "@/lib/inngest/client";
import { NextResponse } from "next/server";

type Params = Promise<{ id: string }>;

/**
 * POST /api/projects/[id]/render
 * 프로젝트 렌더링 시작
 */
export async function POST(request: Request, { params }: { params: Params }) {
  const session = await auth();
  const { id } = await params;

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // 권한 확인 (editor 이상)
    const canEdit = await check(
      session.user.id,
      NAMESPACES.PROJECT,
      id,
      RELATIONS.EDITOR
    );

    if (!canEdit) {
      return new Response("Forbidden", { status: 403 });
    }

    // 프로젝트 상태 확인
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        scenes: true,
      },
    });

    if (!project) {
      return new Response("Not Found", { status: 404 });
    }

    if (project.scenes.length === 0) {
      return NextResponse.json(
        { error: "No scenes to render" },
        { status: 400 }
      );
    }

    // 이미 렌더링 중인지 확인
    if (project.status === "rendering") {
      return NextResponse.json(
        { error: "Project is already rendering" },
        { status: 400 }
      );
    }

    // 프로젝트 상태 업데이트
    await prisma.project.update({
      where: { id },
      data: {
        status: "rendering",
      },
    });

    // Inngest 이벤트 전송: 씬 처리 시작
    await inngest.send({
      name: "scene/process.requested",
      data: {
        projectId: id,
        sceneId: project.scenes[0].id, // 첫 번째 씬부터 시작
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      message: "Rendering started",
      projectId: id,
      scenesCount: project.scenes.length,
    });
  } catch (error) {
    console.error("Failed to start rendering:", error);

    // 에러 발생 시 상태 복구
    try {
      await prisma.project.update({
        where: { id },
        data: {
          status: "failed",
        },
      });
    } catch (updateError) {
      console.error("Failed to update project status:", updateError);
    }

    return new Response("Internal Server Error", { status: 500 });
  }
}
