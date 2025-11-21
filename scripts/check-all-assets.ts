#!/usr/bin/env tsx

import { prisma } from "../lib/prisma";

async function main() {
  // 프로젝트의 모든 Asset 조회
  const projectId = "cmi7kw1330001siyste5aaklh";

  const assets = await prisma.asset.findMany({
    where: { projectId },
    include: {
      scene: {
        select: { sceneNumber: true },
      },
    },
    orderBy: [{ scene: { sceneNumber: "asc" } }, { kind: "asc" }],
  });

  console.log("📊 프로젝트 전체 Asset:\n");

  const grouped = assets.reduce(
    (acc, asset) => {
      const sceneNum = asset.scene?.sceneNumber || 0;
      if (!acc[sceneNum]) acc[sceneNum] = [];
      acc[sceneNum].push(asset);
      return acc;
    },
    {} as Record<number, typeof assets>
  );

  for (const [sceneNum, sceneAssets] of Object.entries(grouped).sort(
    (a, b) => Number(a[0]) - Number(b[0])
  )) {
    console.log(`🎬 씬 ${sceneNum}:`);
    for (const asset of sceneAssets) {
      console.log(`  - ${asset.kind} (${asset.type})`);
      const metadata = asset.metadata as any;
      if (metadata?.provider) console.log(`    Provider: ${metadata.provider}`);
    }
    console.log("");
  }
}

main()
  .catch(console.error)
  .finally(() => process.exit(0));
