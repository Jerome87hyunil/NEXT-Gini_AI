#!/usr/bin/env tsx

/**
 * VEO RenderJob 상태 확인 스크립트
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🔍 VEO RenderJob 상태 확인 중...\n");

    // VEO RenderJob 조회
    const veoJobs = await prisma.renderJob.findMany({
      where: {
        provider: "veo",
      },
      take: 10,
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`📦 최근 VEO RenderJob ${veoJobs.length}개:\n`);

    for (const job of veoJobs) {
      // Scene 정보 별도 조회
      const scene = job.sceneId
        ? await prisma.scene.findUnique({
            where: { id: job.sceneId },
            select: {
              sceneNumber: true,
              backgroundStatus: true,
              project: {
                select: {
                  title: true,
                },
              },
            },
          })
        : null;

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🆔 Job ID: ${job.id}`);
      console.log(`📁 Project: ${scene?.project.title || "N/A"}`);
      console.log(`📝 Scene: ${scene?.sceneNumber || "N/A"} (${scene?.backgroundStatus || "N/A"})`);
      console.log(`📊 Status: ${job.status}`);
      console.log(`🔗 External ID: ${job.externalId || "N/A"}`);
      console.log(`📅 Created: ${job.createdAt.toISOString()}`);
      console.log(`⏱️  Updated: ${job.updatedAt.toISOString()}`);

      if (job.errorMessage) {
        console.log(`❌ Error: ${job.errorMessage}`);
      }

      if (job.metadata) {
        const metadata = job.metadata as any;
        if (metadata.lastCheckedAt) {
          console.log(`🕐 Last Checked: ${metadata.lastCheckedAt}`);
        }
        if (metadata.attempt) {
          console.log(`🔄 Attempt: ${metadata.attempt}`);
        }
      }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
