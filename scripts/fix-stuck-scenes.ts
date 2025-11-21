#!/usr/bin/env tsx

/**
 * 멈춰있는 Scene 복구 스크립트
 *
 * generating 상태로 15분 이상 멈춰있는 Scene을 failed로 변경합니다.
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🔍 멈춰있는 Scene 검색 중...\n");

    // 15분 이상 generating 상태인 Scene 찾기
    const stuckScenes = await prisma.scene.findMany({
      where: {
        backgroundStatus: "generating",
        updatedAt: {
          lt: new Date(Date.now() - 15 * 60 * 1000), // 15분 전
        },
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: {
        updatedAt: "asc",
      },
    });

    console.log(`📊 발견된 멈춰있는 Scene: ${stuckScenes.length}개\n`);

    if (stuckScenes.length === 0) {
      console.log("✅ 멈춰있는 Scene이 없습니다!");
      return;
    }

    for (const scene of stuckScenes) {
      const elapsedMinutes = Math.floor(
        (Date.now() - scene.updatedAt.getTime()) / 1000 / 60
      );

      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📝 Scene ID: ${scene.id}`);
      console.log(`📁 Project: ${scene.project.title}`);
      console.log(`🎬 Scene Number: ${scene.sceneNumber}`);
      console.log(`⏱️  Updated: ${scene.updatedAt.toISOString()}`);
      console.log(`⏳ Stuck for: ${elapsedMinutes}분`);
      console.log(`📊 Background Status: ${scene.backgroundStatus}`);
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // 사용자 확인 (실제 실행 시에는 주석 해제)
    // const readline = require("readline");
    // const rl = readline.createInterface({
    //   input: process.stdin,
    //   output: process.stdout,
    // });

    // const answer = await new Promise<string>((resolve) => {
    //   rl.question(
    //     `⚠️  ${stuckScenes.length}개 Scene을 failed로 변경하시겠습니까? (yes/no): `,
    //     resolve
    //   );
    // });
    // rl.close();

    // if (answer.toLowerCase() !== "yes") {
    //   console.log("❌ 취소되었습니다.");
    //   return;
    // }

    console.log(`🔧 ${stuckScenes.length}개 Scene 복구 시작...\n`);

    // Scene 상태 업데이트
    for (const scene of stuckScenes) {
      await prisma.scene.update({
        where: { id: scene.id },
        data: {
          backgroundStatus: "failed",
        },
      });

      console.log(`✅ Scene ${scene.sceneNumber} (${scene.id}) → failed`);
    }

    // 관련 RenderJob도 failed로 변경
    const renderJobResult = await prisma.renderJob.updateMany({
      where: {
        sceneId: {
          in: stuckScenes.map((s) => s.id),
        },
        provider: "veo",
        status: "completed", // completed이지만 Scene은 generating인 경우
      },
      data: {
        status: "failed",
        errorMessage:
          "VEO operation completed but videoBuffer was null (recovered by script)",
      },
    });

    console.log(
      `\n✅ ${renderJobResult.count}개 RenderJob도 failed로 변경되었습니다.`
    );

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎉 복구 완료!");
    console.log(`   - Scene failed 처리: ${stuckScenes.length}개`);
    console.log(`   - RenderJob failed 처리: ${renderJobResult.count}개`);
    console.log("\n다음 단계:");
    console.log("   1. 개발 서버 재시작: npm run dev");
    console.log("   2. Inngest Dev Server 실행: npx inngest-cli dev");
    console.log("   3. 새 프로젝트 생성하여 VEO 생성 테스트");
    console.log("   4. 로그에서 자세한 에러 메시지 확인");
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
