import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const revokeSchema = z.object({
  userId: z.string().cuid(),
  projectId: z.string().cuid(),
  relation: z.enum(["owner", "editor", "viewer"]),
});

/**
 * POST /api/permissions/revoke
 * 프로젝트 권한 해제 (Admin만 가능)
 */
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Admin 권한 확인
    if (session.user.role !== "admin") {
      return new Response("Forbidden", { status: 403 });
    }

    const body = await request.json();
    const { userId, projectId, relation } = revokeSchema.parse(body);

    // 사용자가 같은 조직인지 확인
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.organizationId !== session.user.organizationId) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 프로젝트가 같은 조직인지 확인
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project || project.organizationId !== session.user.organizationId) {
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 권한 튜플 찾기
    const relationTuple = await prisma.relationTuple.findFirst({
      where: {
        subjectId: userId,
        namespace: "project",
        objectId: projectId,
        relation,
      },
    });

    if (!relationTuple) {
      return NextResponse.json(
        { error: "해제할 권한이 없습니다" },
        { status: 404 }
      );
    }

    // 권한 해제
    await prisma.relationTuple.delete({
      where: { id: relationTuple.id },
    });

    return NextResponse.json({
      message: "권한이 해제되었습니다",
    });
  } catch (error) {
    console.error("Failed to revoke permission:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "유효하지 않은 입력입니다", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "권한 해제에 실패했습니다" },
      { status: 500 }
    );
  }
}
