import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";

const grantSchema = z.object({
  userId: z.string().cuid(),
  projectId: z.string().cuid(),
  relation: z.enum(["owner", "editor", "viewer"]),
});

/**
 * POST /api/permissions/grant
 * 프로젝트 권한 부여 (Admin만 가능)
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
    const { userId, projectId, relation } = grantSchema.parse(body);

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

    // 이미 권한이 있는지 확인
    const existing = await prisma.relationTuple.findFirst({
      where: {
        subjectId: userId,
        namespace: "project",
        objectId: projectId,
        relation,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "이미 동일한 권한이 부여되어 있습니다" },
        { status: 400 }
      );
    }

    // 권한 부여
    const relationTuple = await prisma.relationTuple.create({
      data: {
        subjectId: userId,
        subjectType: "user",
        namespace: "project",
        objectId: projectId,
        relation,
      },
    });

    return NextResponse.json({
      message: "권한이 부여되었습니다",
      relationTuple,
    });
  } catch (error) {
    console.error("Failed to grant permission:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "유효하지 않은 입력입니다", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "권한 부여에 실패했습니다" },
      { status: 500 }
    );
  }
}
