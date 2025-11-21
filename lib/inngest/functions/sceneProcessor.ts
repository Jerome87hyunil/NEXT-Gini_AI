import { inngest } from "../client";
import { prisma } from "@/lib/prisma";

/**
 * SceneProcessor (씬 순차 처리 오케스트레이터)
 *
 * 각 씬을 순차적으로 처리:
 * 1. TTS 생성
 * 2. 아바타 생성
 * 3. 아바타 폴링
 * 4. 배경 생성
 * 5. 다음 씬 or 비디오 합성
 */
export const sceneProcessor = inngest.createFunction(
  {
    id: "scene-processor",
    name: "Scene Processor (Orchestrator)",
  },
  { event: "scene/process.requested" },
  async ({ event, step }) => {
    const { projectId, sceneId, userId } = event.data;

    // Scene 조회
    const scene = await step.run("fetch-scene", async () => {
      return prisma.scene.findUnique({
        where: { id: sceneId },
        include: {
          project: {
            include: {
              scenes: {
                orderBy: { position: "asc" },
              },
            },
          },
        },
      });
    });

    if (!scene) {
      throw new Error(`Scene not found: ${sceneId}`);
    }

    // Step 1: TTS 생성
    await step.sendEvent("trigger-tts", {
      name: "tts/generation.requested", // ttsGenerator가 리스닝하는 정확한 이벤트명
      data: {
        sceneId,
        projectId,
        userId,
      },
    });

    // TTS 완료 대기
    await step.waitForEvent("wait-for-tts", {
      event: "tts/completed",
      timeout: "5m",
      match: "data.sceneId",
    });

    // Step 2: 아바타 생성
    await step.sendEvent("trigger-avatar", {
      name: "avatar/generation.requested", // avatarGenerator가 리스닝하는 정확한 이벤트명
      data: {
        sceneId,
        projectId,
        userId,
      },
    });

    // 아바타 완료 대기 (폴링 포함)
    await step.waitForEvent("wait-for-avatar", {
      event: "avatar/completed",
      timeout: "5m",
      match: "data.sceneId",
    });

    // Step 3: 배경 생성
    await step.sendEvent("trigger-background", {
      name: "background/generation.requested", // backgroundGenerator가 리스닝하는 정확한 이벤트명
      data: {
        sceneId,
        projectId,
        userId,
      },
    });

    // 배경 완료 대기
    await step.waitForEvent("wait-for-background", {
      event: "background/completed",
      timeout: "15m", // Veo 영상은 최대 10분 소요
      match: "data.sceneId",
    });

    // Rate limiting (API 제한 방지)
    await step.sleep("rate-limit", "2s");

    // 다음 씬 처리 or 비디오 합성
    const currentIndex = scene.project.scenes.findIndex((s) => s.id === sceneId);
    const nextScene = scene.project.scenes[currentIndex + 1];

    if (nextScene) {
      // 다음 씬 처리
      await step.sendEvent("trigger-next-scene", {
        name: "scene/process.requested",
        data: {
          projectId,
          sceneId: nextScene.id,
          userId,
        },
      });
    } else {
      // 모든 씬 완료 → 비디오 합성
      await step.sendEvent("trigger-video-compositor", {
        name: "video/compose.requested",
        data: {
          projectId,
          userId,
        },
      });
    }

    return { success: true, sceneId };
  }
);
