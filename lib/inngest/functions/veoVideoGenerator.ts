import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { generateVeoVideo } from "@/lib/services/gemini";

/**
 * TTS 길이를 Veo 3.0 허용 값으로 올림
 * Veo 3.0: 4, 6, 8초만 허용
 */
function calculateVeoDuration(audioDuration?: number | null): number {
  // 기본값: 8초 (TTS 길이 없으면 기존 동작 유지)
  if (!audioDuration) {
    console.log("⚠️ No audio duration found, using default 8 seconds");
    return 8;
  }

  // Veo 3.0 허용 값으로 올림
  if (audioDuration <= 4) {
    return 4;
  } else if (audioDuration <= 6) {
    return 6;
  } else {
    return 8;
  }
}

export const veoVideoGenerator = inngest.createFunction(
  { id: "veo-video-generator", retries: 2, concurrency: [{ limit: 2 }] },
  { event: "veo/generation.requested" },
  async ({ event, step }) => {
    const { sceneId, imageAssetId, imageUrl, videoPrompt, emotion } = event.data;

    // 1. 씬 조회
    const scene = await step.run("fetch-scene", async () => {
      const scene = await prisma.scene.findUnique({
        where: { id: sceneId },
        select: {
          id: true,
          projectId: true,
          sceneNumber: true,
          videoPrompt: true,
          durationSeconds: true, // TTS 실제 길이
        },
      });

      if (!scene) {
        throw new Error(`Scene ${sceneId} not found`);
      }

      return scene;
    });

    // 2. Veo 영상 생성 시작
    const operation = await step.run("start-veo-generation", async () => {
      // TTS 길이 기반으로 Veo 길이 동적 계산
      const veoDuration = calculateVeoDuration(scene.durationSeconds);

      // 전달받은 또는 저장된 videoPrompt에서 하드코딩된 duration 패턴 제거
      const rawPrompt = videoPrompt || scene.videoPrompt || "";
      const basePrompt = rawPrompt
        .replace(/\b\d+\s*seconds?\s*duration\b/gi, "") // "8 seconds duration" 등 제거
        .replace(/,\s*,/g, ",") // 연속된 쉼표 정리
        .replace(/,\s*\./g, ".") // 쉼표+마침표 정리
        .trim()
        .replace(/,\s*$/g, ""); // 끝의 쉼표 제거

      // 동적으로 계산된 duration을 추가하여 최종 프롬프트 생성
      const prompt = basePrompt
        ? `${basePrompt}, ${veoDuration} seconds duration`
        : `Slow camera movement, subtle scene changes, ${veoDuration} seconds duration, cinematic motion`;

      console.log(`🎬 Veo generation starting:`);
      console.log(`   Scene ID: ${sceneId}`);
      console.log(`   Scene Number: ${scene.sceneNumber}`);
      console.log(`   Image URL: ${imageUrl}`);
      console.log(`   TTS Duration: ${scene.durationSeconds?.toFixed(2) || "unknown"}s`);
      console.log(`   Veo Duration (optimized): ${veoDuration}s`);
      console.log(`   Original Prompt: ${rawPrompt.substring(0, 80)}...`);
      console.log(`   Final Prompt: ${prompt.substring(0, 100)}...`);
      console.log(`   Emotion: ${emotion || "professional"}`);

      return await generateVeoVideo(imageUrl, prompt, emotion, veoDuration);
    });

    // 3. RenderJob 생성 (Veo LRO 추적)
    await step.run("create-veo-render-job", async () => {
      await prisma.renderJob.create({
        data: {
          sceneId: scene.id,
          projectId: scene.projectId,
          externalId: operation.name,
          provider: "veo",
          status: "processing",
          metadata: {
            operationName: operation.name,
            imageAssetId,
            imageUrl,
            startedAt: new Date().toISOString(),
          },
        },
      });
    });

    // 4. 폴링 시작 (Veo LRO 상태 확인)
    await step.sendEvent("start-veo-polling", {
      name: "veo/polling.requested",
      data: {
        sceneId: scene.id,
        operationName: operation.name,
        imageAssetId, // Veo 실패 시 이미지 fallback을 위해 전달
        maxAttempts: 120, // 5초 간격 × 120회 = 600초 (10분)
      },
    });

    return {
      success: true,
      sceneId,
      operationName: operation.name,
    };
  }
);
