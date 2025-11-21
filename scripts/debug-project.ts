#!/usr/bin/env tsx
import { prisma } from "../lib/prisma";

async function main() {
  const projectId = "cmi8e6x5k0001sicxckty5qa8";

  // 1. 프로젝트 정보
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      scenes: {
        orderBy: { sceneNumber: "asc" },
        include: {
          audioAsset: true,
          avatarAsset: true,
          backgroundAsset: true,
        },
      },
    },
  });

  if (!project) {
    console.log("프로젝트를 찾을 수 없습니다.");
    return;
  }

  console.log("\n📋 프로젝트 정보:");
  console.log(`  ID: ${project.id}`);
  console.log(`  제목: ${project.title}`);
  console.log(`  아바타 모드: ${project.avatarDesignMode}`);
  console.log(`  아바타 상태: ${project.avatarDesignStatus}`);
  console.log(`  아바타 설정:`, project.avatarDesignSettings);

  // 2. 아바타 디자인 Asset 확인
  const avatarDesignAsset = await prisma.asset.findFirst({
    where: {
      projectId,
      kind: "avatar_design",
    },
  });

  console.log("\n🎨 커스텀 아바타 디자인 Asset:");
  if (avatarDesignAsset) {
    console.log(`  ID: ${avatarDesignAsset.id}`);
    console.log(`  URL: ${avatarDesignAsset.url}`);
    console.log(`  Metadata:`, avatarDesignAsset.metadata);
  } else {
    console.log("  ❌ 커스텀 아바타 디자인 Asset 없음");
  }

  // 3. 씬별 상세 정보
  console.log("\n🎬 씬별 Asset 정보:");
  for (const scene of project.scenes) {
    console.log(`\n씬 ${scene.sceneNumber}:`);
    console.log(`  TTS 상태: ${scene.ttsStatus}`);
    console.log(`  아바타 상태: ${scene.avatarStatus}`);
    console.log(`  배경 상태: ${scene.backgroundStatus}`);

    if (scene.audioAsset) {
      console.log(`  ✅ 오디오: ${scene.audioAsset.url}`);
    } else {
      console.log(`  ❌ 오디오 없음`);
    }

    if (scene.avatarAsset) {
      console.log(`  ✅ 아바타: ${scene.avatarAsset.url}`);
      console.log(`     Metadata:`, scene.avatarAsset.metadata);
    } else {
      console.log(`  ❌ 아바타 없음`);
    }

    if (scene.backgroundAsset) {
      console.log(`  ✅ 배경 (${scene.backgroundAsset.kind}):`);
      console.log(`     URL: ${scene.backgroundAsset.url}`);
      console.log(`     Type: ${scene.backgroundAsset.type}`);
      console.log(`     Metadata:`, scene.backgroundAsset.metadata);
    } else {
      console.log(`  ❌ 배경 없음`);
    }
  }

  // 4. 모든 프로젝트 Asset 확인
  const allAssets = await prisma.asset.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });

  console.log("\n📦 전체 Asset 목록:");
  for (const asset of allAssets) {
    console.log(`\n${asset.kind} (${asset.type}):`);
    console.log(`  ID: ${asset.id}`);
    console.log(`  sceneId: ${asset.sceneId || "null"}`);
    console.log(`  URL: ${asset.url}`);
    if (asset.metadata) {
      console.log(`  Metadata:`, asset.metadata);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
