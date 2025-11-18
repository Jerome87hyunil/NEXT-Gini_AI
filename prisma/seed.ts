import { PrismaClient } from "@prisma/client";
import { seedPermissionDefinitions } from "../lib/permissions/seed";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // ReBAC 권한 정의 Seed
  await seedPermissionDefinitions();

  // TODO: 추가 시드 데이터 (테스트 조직, 사용자 등)
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
