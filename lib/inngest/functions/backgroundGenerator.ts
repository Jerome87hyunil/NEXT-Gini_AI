import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { generateBackgroundImage } from "@/lib/services/gemini";
import { uploadFromBuffer } from "@/lib/supabase/storage";

export const backgroundGenerator = inngest.createFunction(
  { id: "background-generator", retries: 2, concurrency: [{ limit: 1 }] }, // Rate Limit 회피: 3 → 1
  { event: "background/generation.requested" },
  async ({ event, step }) => {
    const { sceneId } = event.data;

    // 1. 씬 조회
    const scene = await step.run("fetch-scene", async () => {
      const scene = await prisma.scene.findUnique({
        where: { id: sceneId },
      });

      if (!scene) {
        throw new Error(`Scene ${sceneId} not found`);
      }

      return scene;
    });

    // 2. 배경 상태 업데이트 (generating)
    await step.run("update-background-status-generating", async () => {
      await prisma.scene.update({
        where: { id: sceneId },
        data: { backgroundStatus: "generating" },
      });
    });

    const analysis = scene.backgroundAnalysis as {
      priority: "high" | "medium" | "low";
      emotion?: string;
      visualDescription?: string;
    };

    const priority = analysis?.priority || "low";

    if (priority === "low") {
      // Low priority: FFmpeg 그라데이션 (클라이언트 처리 또는 간단한 이미지)
      await step.run("create-gradient-background", async () => {
        // 간단한 그라데이션 메타데이터만 저장
        await prisma.scene.update({
          where: { id: sceneId },
          data: {
            backgroundStatus: "completed",
            metadata: {
              backgroundType: "gradient",
              priority: "low",
            },
          },
        });
      });

      // 배경 완료 이벤트 발송 (Scene Processor가 대기 중)
      await step.sendEvent("background-completed-gradient", {
        name: "background/completed",
        data: {
          sceneId,
          projectId: scene.projectId,
          backgroundType: "gradient",
        },
      });

      return {
        success: true,
        sceneId,
        backgroundType: "gradient",
      };
    }

    // Medium/High priority: Nano Banana 이미지 생성 및 업로드 (Inngest output size 제한 회피)
    // imagePrompt 우선 사용, 없으면 visualDescription, 그것도 없으면 개선된 기본값
    const imagePrompt =
      scene.imagePrompt ||
      analysis?.visualDescription ||
      `Modern professional presentation environment featuring clean minimalist design.
      Sophisticated office or conference setting with contemporary architecture and elegant furnishings.
      Subtle business context elements including workspace details and professional ambiance.`;

    const imageUrl = await step.run("generate-and-upload-nano-image", async () => {
      // 이미지 생성 (emotion 파라미터 전달하여 조명/색상 최적화)
      const emotion = analysis?.emotion || "professional";
      const imageBuffer = await generateBackgroundImage(imagePrompt, emotion);

      // 즉시 Supabase Storage에 업로드 (Buffer를 step output으로 반환하지 않음)
      const fileName = `scene_${scene.sceneNumber}_background.png`;
      const storagePath = `projects/${scene.projectId}/backgrounds/${fileName}`;

      // API 응답이 JSON 직렬화된 Buffer일 수 있으므로 변환
      const buffer = Buffer.isBuffer(imageBuffer)
        ? imageBuffer
        : Buffer.from(imageBuffer as unknown as ArrayBuffer);

      const { url } = await uploadFromBuffer(buffer, storagePath, "image/png");
      return url; // URL만 반환 (크기 작음)
    });

    // 5. Asset 생성
    const asset = await step.run("create-background-asset", async () => {
      return await prisma.asset.create({
        data: {
          projectId: scene.projectId,
          kind: "background_image",
          type: "background_image",
          url: imageUrl,
          storagePath: `projects/${scene.projectId}/backgrounds/scene_${scene.sceneNumber}_background.png`,
          metadata: {
            sceneId: scene.id,
            sceneNumber: scene.sceneNumber,
            priority,
            provider: "nano_banana",
            imagePrompt: imagePrompt,
            cost: 0.039,
          },
        },
      });
    });

    // 6. 씬의 backgroundAssetId 업데이트
    await step.run("update-scene-background-asset", async () => {
      await prisma.scene.update({
        where: { id: sceneId },
        data: {
          backgroundAssetId: asset.id,
          backgroundStatus: priority === "high" ? "generating" : "completed",
        },
      });
    });

    // 7. High priority: Veo 영상 생성 트리거
    if (priority === "high") {
      // videoPrompt 우선 사용, 없으면 기본값
      const videoPrompt =
        scene.videoPrompt ||
        "Slow camera movement, subtle scene changes, 8 seconds duration, cinematic motion";

      await step.sendEvent("trigger-veo-generation", {
        name: "veo/generation.requested",
        data: {
          sceneId: scene.id,
          imageAssetId: asset.id,
          imageUrl,
          videoPrompt, // videoPrompt 전달
          emotion: analysis?.emotion || "professional", // emotion 전달
        },
      });

      // High priority는 Veo 완료 후에 background/completed 이벤트가 발송됨
      // (veoVideoPolling.ts에서 처리)
    } else {
      // Medium priority: Nano 이미지만 생성 완료
      // 배경 완료 이벤트 발송 (Scene Processor가 대기 중)
      await step.sendEvent("background-completed-image", {
        name: "background/completed",
        data: {
          sceneId,
          projectId: scene.projectId,
          assetId: asset.id,
          imageUrl,
        },
      });
    }

    return {
      success: true,
      sceneId,
      assetId: asset.id,
      imageUrl,
      priority,
    };
  }
);
