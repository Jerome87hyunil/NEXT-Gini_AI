import { prisma } from "../lib/prisma";

async function main() {
  const scenes = await prisma.scene.findMany({
    select: {
      id: true,
      sceneNumber: true,
      script: true,
      imagePrompt: true,
      videoPrompt: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 5,
  });

  console.log("\n=== 최근 생성된 씬 5개 ===\n");

  if (scenes.length === 0) {
    console.log("❌ 씬이 하나도 없습니다. 프로젝트를 생성하고 PDF를 업로드해주세요.\n");
    return;
  }

  scenes.forEach((scene) => {
    console.log(`\n씬 ${scene.sceneNumber}:`);
    console.log(`  대본: ${scene.script.substring(0, 50)}...`);
    console.log(`  이미지 프롬프트: ${scene.imagePrompt ? `✅ ${scene.imagePrompt.substring(0, 60)}...` : "❌ NULL"}`);
    console.log(`  영상 프롬프트: ${scene.videoPrompt ? `✅ ${scene.videoPrompt.substring(0, 60)}...` : "❌ NULL"}`);
    console.log(`  생성 시간: ${scene.createdAt.toISOString()}`);
  });

  console.log("\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
