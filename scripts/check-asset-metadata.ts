#!/usr/bin/env tsx

/**
 * Asset metadata 확인 스크립트
 * VEO operation name이 제대로 저장되어 있는지 확인
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function checkAssetMetadata() {
  try {
    console.log("📦 Asset Metadata 확인 중...\n");

    // background_image Asset 중 최근 5개 조회
    const imageAssets = await prisma.asset.findMany({
      where: {
        type: "background_image",
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

    console.log(`🖼️  최근 Background Image Assets (${imageAssets.length}개):\n`);

    for (const asset of imageAssets) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📦 Asset ID: ${asset.id}`);
      console.log(`📁 Project: ${asset.scene?.project.title || "N/A"}`);
      console.log(`🎬 Scene: ${asset.scene?.sceneNumber || "N/A"} (${asset.scene?.backgroundStatus || "N/A"})`);
      console.log(`📅 Created: ${asset.createdAt.toISOString()}`);
      console.log(`🔗 URL: ${asset.url || "N/A"}`);

      if (asset.metadata) {
        console.log(`\n📋 Metadata:`);
        console.log(JSON.stringify(asset.metadata, null, 2));
      } else {
        console.log(`\n⚠️  Metadata: NULL`);
      }

      console.log("");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAssetMetadata();
