#!/usr/bin/env tsx

/**
 * RenderJob 확인 스크립트
 * VEO 생성이 실제로 시작되었는지 확인
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkRenderJobs() {
  try {
    console.log("🔍 RenderJob 확인 중...\n");

    const renderJobs = await prisma.renderJob.findMany({
      include: {
        project: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    console.log(`📊 총 RenderJob 개수: ${renderJobs.length}개\n`);

    if (renderJobs.length === 0) {
      console.log("❌ RenderJob이 하나도 없습니다!");
      console.log("\n🚨 문제 진단:");
      console.log("   1. veoVideoGenerator 함수가 실행되지 않음");
      console.log("   2. backgroundGenerator에서 이벤트 전송이 실패");
      console.log("   3. Inngest Dev Server가 실행되지 않음");
      console.log("\n해결 방법:");
      console.log("   - Inngest Dev Server 실행: npx inngest-cli dev");
      console.log("   - 또는 Vercel 배포 후 Inngest 연결 확인");
      return;
    }

    for (const job of renderJobs) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📦 RenderJob ID: ${job.id}`);
      console.log(`📁 Project: ${job.project.title}`);
      console.log(`🎬 Scene ID: ${job.sceneId || "N/A"}`);
      console.log(`🏭 Provider: ${job.provider || "N/A"}`);
      console.log(`📌 Status: ${job.status}`);
      console.log(`🔗 External ID: ${job.externalId || "N/A"}`);
      console.log(`📅 Created: ${job.createdAt.toISOString()}`);

      if (job.metadata) {
        console.log(`\n📋 Metadata:`);
        console.log(JSON.stringify(job.metadata, null, 2));
      }

      console.log("");
    }

    // Veo RenderJob 필터링
    const veoJobs = renderJobs.filter((job) => job.provider === "veo");
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📊 Veo RenderJob: ${veoJobs.length}개`);

    if (veoJobs.length === 0) {
      console.log("\n⚠️  Veo RenderJob이 없습니다!");
      console.log("   - backgroundGenerator가 이벤트를 전송했지만");
      console.log("   - veoVideoGenerator가 실행되지 않았습니다.");
      console.log("\n확인 사항:");
      console.log("   1. Inngest Dev Server가 실행 중인지 확인");
      console.log("   2. 이벤트 이름이 일치하는지 확인 (veo/generation.requested)");
      console.log("   3. Inngest 대시보드에서 이벤트 로그 확인");
    } else {
      console.log(`\n✅ Veo 작업 상태:`);
      const processing = veoJobs.filter((j) => j.status === "processing").length;
      const completed = veoJobs.filter((j) => j.status === "completed").length;
      const failed = veoJobs.filter((j) => j.status === "failed").length;

      console.log(`   - Processing: ${processing}개`);
      console.log(`   - Completed: ${completed}개`);
      console.log(`   - Failed: ${failed}개`);
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkRenderJobs();
