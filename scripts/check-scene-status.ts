#!/usr/bin/env tsx

/**
 * 최근 Scene 상태 확인 스크립트
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🔍 최근 Scene 상태 확인 중...\n");

    // 최근 Scene 조회
    const scenes = await prisma.scene.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    console.log(`📊 최근 Scene ${scenes.length}개:\n`);

    for (const scene of scenes) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📝 Scene ID: ${scene.id}`);
      console.log(`📁 Project: ${scene.project.title}`);
      console.log(`🎬 Scene Number: ${scene.sceneNumber}`);
      console.log(`📊 Background Status: ${scene.backgroundStatus}`);
      console.log(`📅 Created: ${scene.createdAt.toISOString()}`);
      console.log(`⏱️  Updated: ${scene.updatedAt.toISOString()}`);

      // Background Analysis 확인
      if (scene.backgroundAnalysis) {
        const analysis = scene.backgroundAnalysis as any;
        console.log(`🎯 Priority: ${analysis.priority || "N/A"}`);
        console.log(`🎨 Visual: ${analysis.visualDescription?.substring(0, 100) || "N/A"}...`);
      }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // VEO RenderJob 조회
    const veoJobs = await prisma.renderJob.findMany({
      where: {
        provider: "veo",
      },
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
    });

    console.log(`📦 최근 VEO RenderJob ${veoJobs.length}개:\n`);

    for (const job of veoJobs) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`🆔 Job ID: ${job.id}`);
      console.log(`📝 Scene ID: ${job.sceneId || "N/A"}`);
      console.log(`📊 Status: ${job.status}`);
      console.log(`🔗 External ID: ${job.externalId || "N/A"}`);
      console.log(`📅 Created: ${job.createdAt.toISOString()}`);
      console.log(`⏱️  Updated: ${job.updatedAt.toISOString()}`);

      if (job.errorMessage) {
        console.log(`❌ Error: ${job.errorMessage}`);
      }
    }

  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
