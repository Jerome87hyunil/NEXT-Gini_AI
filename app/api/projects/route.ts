import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { grant, NAMESPACES, RELATIONS } from "@/lib/permissions";
import { NextResponse } from "next/server";
import { z } from "zod";

// Zod 스키마: 프로젝트 생성
const createProjectSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  avatarDesignMode: z.enum(["preset", "custom"]).default("preset"),
  avatarDesignSettings: z.record(z.any()).optional(),
  settings: z.record(z.any()).optional(),
});

/**
 * GET /api/projects
 * 프로젝트 목록 조회 (사용자가 접근 가능한 프로젝트만)
 */
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // 사용자가 속한 조직의 프로젝트 조회
    const projects = await prisma.project.findMany({
      where: {
        organizationId: session.user.organizationId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: {
            documents: true,
            scenes: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(projects);
  } catch (error) {
    console.error("Failed to fetch projects:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}

/**
 * POST /api/projects
 * 새 프로젝트 생성
 */
export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = createProjectSchema.parse(body);

    // 프로젝트 생성
    const project = await prisma.project.create({
      data: {
        title: validated.title,
        description: validated.description,
        organizationId: session.user.organizationId,
        createdById: session.user.id,
        avatarDesignMode: validated.avatarDesignMode,
        avatarDesignSettings: validated.avatarDesignSettings || {},
        settings: validated.settings || {},
        status: "draft",
      },
    });

    // 생성자에게 owner 권한 부여
    await grant(
      session.user.id,
      NAMESPACES.PROJECT,
      project.id,
      RELATIONS.OWNER
    );

    return NextResponse.json(project, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Failed to create project:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
