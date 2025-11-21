#!/usr/bin/env tsx

/**
 * VEO 생성 상태 확인 스크립트
 *
 * 현재 진행 중인 VEO 비디오 생성 작업의 상태를 데이터베이스에서 조회합니다.
 *
 * Usage:
 *   npx tsx scripts/check-veo-status.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkVeoStatus() {
  try {
    console.log("📊 VEO 생성 상태 확인 중...\n");

    // 1. background_status가 generating인 씬 찾기
    const generatingScenes = await prisma.scene.findMany({
      where: {
        backgroundStatus: "generating",
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        backgroundAsset: {
          select: {
            id: true,
            type: true,
            url: true,
            metadata: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    console.log(`🔍 Background generating 중인 씬: ${generatingScenes.length}개\n`);

    for (const scene of generatingScenes) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📝 Scene ID: ${scene.id}`);
      console.log(`📁 Project: ${scene.project.title} (${scene.project.status})`);
      console.log(`🎬 Scene: ${scene.sceneNumber}`);
      console.log(`📊 Background Status: ${scene.backgroundStatus}`);
      console.log(`⏱️  Updated At: ${scene.updatedAt.toISOString()}`);

      const elapsedMinutes = Math.floor(
        (Date.now() - scene.updatedAt.getTime()) / 1000 / 60
      );
      console.log(`⏳ Elapsed: ${elapsedMinutes}분`);

      if (scene.backgroundAnalysis) {
        const analysis = scene.backgroundAnalysis as any;
        console.log(`🎯 Priority: ${analysis.priority || "unknown"}`);
        console.log(`💭 Emotion: ${analysis.emotion || "unknown"}`);
      }

      if (scene.backgroundAsset) {
        console.log(`📦 Asset Type: ${scene.backgroundAsset.type}`);
        console.log(`📅 Asset Created: ${scene.backgroundAsset.createdAt.toISOString()}`);

        if (scene.backgroundAsset.metadata) {
          const metadata = scene.backgroundAsset.metadata as any;
          if (metadata.operationName) {
            console.log(`🔄 Operation Name: ${metadata.operationName}`);
          }
          if (metadata.status) {
            console.log(`📌 LRO Status: ${metadata.status}`);
          }
        }
      }

      console.log("");
    }

    // 2. 최근 생성된 background_video Asset 확인
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📹 최근 생성된 Background Video Assets:\n");

    const recentVideoAssets = await prisma.asset.findMany({
      where: {
        type: "background_video",
      },
      include: {
        scene: {
          select: {
            id: true,
            sceneNumber: true,
            backgroundStatus: true,
            project: {
              select: {
                title: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 5,
    });

    for (const asset of recentVideoAssets) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📦 Asset ID: ${asset.id}`);
      console.log(`📁 Project: ${asset.scene?.project.title || "N/A"}`);
      console.log(`🎬 Scene: ${asset.scene?.sceneNumber || "N/A"}`);
      console.log(`📊 Scene Status: ${asset.scene?.backgroundStatus || "N/A"}`);
      console.log(`📅 Created: ${asset.createdAt.toISOString()}`);
      console.log(`🔗 URL: ${asset.url || "N/A"}`);

      if (asset.metadata) {
        const metadata = asset.metadata as any;
        if (metadata.operationName) {
          console.log(`🔄 Operation: ${metadata.operationName}`);
        }
        if (metadata.status) {
          console.log(`📌 Status: ${metadata.status}`);
        }
        if (metadata.cost) {
          console.log(`💰 Cost: $${metadata.cost}`);
        }
      }

      console.log("");
    }

    // 3. Failed 상태 확인
    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("❌ Background Failed 씬:\n");

    const failedScenes = await prisma.scene.findMany({
      where: {
        backgroundStatus: "failed",
        updatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // 최근 24시간
        },
      },
      include: {
        project: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 3,
    });

    if (failedScenes.length > 0) {
      for (const scene of failedScenes) {
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📝 Scene ID: ${scene.id}`);
        console.log(`📁 Project: ${scene.project.title}`);
        console.log(`🎬 Scene: ${scene.sceneNumber}`);
        console.log(`⏱️  Failed At: ${scene.updatedAt.toISOString()}`);
        console.log("");
      }
    } else {
      console.log("✅ 최근 24시간 내 실패한 씬 없음\n");
    }

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

    // 요약
    console.log("📈 요약:");
    console.log(`   - Generating 중: ${generatingScenes.length}개`);
    console.log(`   - 최근 생성된 비디오: ${recentVideoAssets.length}개`);
    console.log(`   - 최근 실패: ${failedScenes.length}개`);

    if (generatingScenes.length > 0) {
      const maxElapsed = Math.max(
        ...generatingScenes.map(
          (s) => (Date.now() - s.updatedAt.getTime()) / 1000 / 60
        )
      );
      console.log(`   - 최대 경과 시간: ${Math.floor(maxElapsed)}분`);

      if (maxElapsed > 15) {
        console.log(
          "\n⚠️  경고: 15분 이상 경과한 작업이 있습니다. VEO API 상태를 확인해주세요."
        );
        console.log(
          "   정상적으로는 8초 비디오가 5-10분 내에 생성됩니다."
        );
      }
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkVeoStatus();
