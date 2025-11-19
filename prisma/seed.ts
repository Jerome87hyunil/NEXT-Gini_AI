import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { seedPermissionDefinitions } from "../lib/permissions/seed";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // ReBAC 권한 정의 Seed
  await seedPermissionDefinitions();

  // 테스트 조직 생성
  const testOrg = await prisma.organization.upsert({
    where: { slug: "test-organization" },
    update: {},
    create: {
      name: "Test Organization",
      slug: "test-organization",
      settings: {},
    },
  });
  console.log("✅ Test organization created:", testOrg.slug);

  // 테스트 어드민 계정 생성
  const adminPassword = await hash("Admin123!@#", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      password: adminPassword,
      name: "Admin User",
      role: "admin",
      organizationId: testOrg.id,
      emailVerified: new Date(),
    },
  });
  console.log("✅ Admin user created:", admin.email);

  // 테스트 에디터 계정 생성
  const editorPassword = await hash("Editor123!@#", 10);
  const editor = await prisma.user.upsert({
    where: { email: "editor@example.com" },
    update: {},
    create: {
      email: "editor@example.com",
      password: editorPassword,
      name: "Editor User",
      role: "member",
      organizationId: testOrg.id,
      emailVerified: new Date(),
    },
  });
  console.log("✅ Editor user created:", editor.email);

  console.log("\n📋 Test Accounts:");
  console.log("  Admin:  admin@example.com / Admin123!@#");
  console.log("  Editor: editor@example.com / Editor123!@#\n");

  console.log("🎉 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
