import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// 회원가입 입력 검증 스키마
const signupSchema = z.object({
  email: z.string().email("유효한 이메일 주소를 입력해주세요"),
  password: z
    .string()
    .min(8, "비밀번호는 최소 8자 이상이어야 합니다")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다"
    ),
  name: z.string().min(2, "이름은 최소 2자 이상이어야 합니다"),
  organizationName: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 입력 검증
    const validatedData = signupSchema.parse(body);

    // 중복 이메일 체크
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "이미 등록된 이메일입니다" },
        { status: 400 }
      );
    }

    // 비밀번호 해싱 (bcrypt, salt rounds: 10)
    const hashedPassword = await hash(validatedData.password, 10);

    // Organization 생성 또는 기본 Organization 사용
    let organizationId: string;

    if (validatedData.organizationName) {
      // 새 Organization 생성
      const organization = await prisma.organization.create({
        data: {
          name: validatedData.organizationName,
          slug: validatedData.organizationName
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, ""),
          settings: {},
        },
      });
      organizationId = organization.id;
    } else {
      // 기본 Organization 찾기 또는 생성
      let defaultOrg = await prisma.organization.findUnique({
        where: { slug: "default-org" },
      });

      if (!defaultOrg) {
        defaultOrg = await prisma.organization.create({
          data: {
            name: "Default Organization",
            slug: "default-org",
            settings: {},
          },
        });
      }
      organizationId = defaultOrg.id;
    }

    // 사용자 생성
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
        role: "member",
        organizationId,
        emailVerified: new Date(), // 이메일 인증 건너뛰기 (간소화)
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        message: "회원가입이 완료되었습니다",
        user,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("회원가입 실패:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "입력값이 올바르지 않습니다",
          details: error.errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "회원가입 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
