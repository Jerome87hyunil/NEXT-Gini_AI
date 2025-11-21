import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { checkVeoOperation } from "@/lib/services/gemini";
import { uploadFromBuffer } from "@/lib/supabase/storage";

export const veoVideoPolling = inngest.createFunction(
  { id: "veo-video-polling" },
  { event: "veo/polling.requested" },
  async ({ event, step }) => {
    const { sceneId, operationName, maxAttempts = 120, currentAttempt = 1 } = event.data;

    // 첫 번째 시도: 더 긴 대기 (operation 생성 전파 대기)
    // 이후 시도: 5초 대기
    const waitTime = currentAttempt === 1 ? "30s" : "5s";
    console.log(`⏳ Attempt ${currentAttempt}/${maxAttempts}: Waiting ${waitTime} before polling...`);
    await step.sleep("wait-before-check", waitTime);

    // Veo LRO 상태 확인
    const operationStatus = await step.run("check-veo-status", async () => {
      return await checkVeoOperation(operationName);
    });

    // RenderJob 업데이트
    await step.run("update-render-job", async () => {
      await prisma.renderJob.updateMany({
        where: {
          sceneId,
          externalId: operationName,
        },
        data: {
          status: operationStatus.done ? "completed" : "processing",
          metadata: {
            lastCheckedAt: new Date().toISOString(),
            attempt: currentAttempt,
          },
        },
      });
    });

    if (operationStatus.done && operationStatus.videoBuffer) {
      // 완료: 비디오 저장
      const scene = await step.run("fetch-scene", async () => {
        return await prisma.scene.findUnique({
          where: { id: sceneId },
        });
      });

      if (!scene) {
        throw new Error(`Scene ${sceneId} not found`);
      }

      // Supabase Storage에 배경 비디오 저장
      const videoUrl = await step.run("save-background-video", async () => {
        const fileName = `scene_${scene.sceneNumber}_background.mp4`;
        const storagePath = `projects/${scene.projectId}/backgrounds/${fileName}`;

        // API 응답이 JSON 직렬화된 Buffer일 수 있으므로 변환
        const videoBuffer = Buffer.isBuffer(operationStatus.videoBuffer)
          ? operationStatus.videoBuffer!
          : Buffer.from(operationStatus.videoBuffer! as unknown as ArrayBuffer);

        const { url } = await uploadFromBuffer(
          videoBuffer,
          storagePath,
          "video/mp4"
        );
        return url;
      });

      // Asset 생성
      const asset = await step.run("create-background-video-asset", async () => {
        return await prisma.asset.create({
          data: {
            projectId: scene.projectId,
            kind: "background_video",
            type: "background_video",
            url: videoUrl,
            storagePath: `projects/${scene.projectId}/backgrounds/scene_${scene.sceneNumber}_background.mp4`,
            metadata: {
              sceneId: scene.id,
              sceneNumber: scene.sceneNumber,
              provider: "veo",
              operationName,
              duration: scene.duration,
              cost: 1.5, // 예상 비용
            },
          },
        });
      });

      // 씬의 backgroundAssetId 업데이트 및 배경 상태 완료
      await step.run("update-scene-background-video-asset", async () => {
        await prisma.scene.update({
          where: { id: sceneId },
          data: {
            backgroundAssetId: asset.id,
            backgroundStatus: "completed",
          },
        });
      });

      // 배경 완료 이벤트 발송 (Scene Processor가 대기 중)
      // High priority 경로: Veo 영상 생성 완료
      await step.sendEvent("background-completed-video", {
        name: "background/completed",
        data: {
          sceneId,
          projectId: scene.projectId,
          assetId: asset.id,
          videoUrl,
        },
      });

      console.log(`✅ Veo video polling completed successfully for scene ${sceneId}`);

      return {
        success: true,
        sceneId,
        assetId: asset.id,
        videoUrl,
      };
    } else if (operationStatus.done && !operationStatus.videoBuffer) {
      // 🚨 완료되었지만 videoBuffer가 없는 경우
      console.error(`❌ VEO completed but no videoBuffer!`);
      console.error(`   Scene ID: ${sceneId}`);
      console.error(`   Operation: ${operationName}`);
      console.error(`   Error: ${operationStatus.error || "Unknown - videoBuffer is null"}`);
      console.error(`   Attempt: ${currentAttempt}/${maxAttempts}`);

      // Scene 상태를 failed로 변경
      await step.run("mark-background-failed-no-video", async () => {
        await prisma.scene.update({
          where: { id: sceneId },
          data: { backgroundStatus: "failed" },
        });

        // RenderJob도 failed로 변경
        await prisma.renderJob.updateMany({
          where: {
            sceneId,
            externalId: operationName,
            provider: "veo",
          },
          data: {
            status: "failed",
            errorMessage: operationStatus.error || "VEO completed but videoBuffer is null",
          },
        });
      });

      throw new Error(
        `VEO operation completed but videoBuffer is null: ${operationStatus.error || "Unknown error"}`
      );
    } else if (operationStatus.error) {
      // 실패 (404는 제외 - 아래에서 재시도)
      // 404가 아닌 실제 에러인 경우만 실패 처리
      const is404Error = operationStatus.error.includes("404") || operationStatus.error.includes("Not Found");

      if (!is404Error) {
        // 실제 API 에러 (권한, 할당량, GCS 다운로드 실패 등)
        console.error(`❌ VEO operation error (non-404):`);
        console.error(`   Scene ID: ${sceneId}`);
        console.error(`   Operation: ${operationName}`);
        console.error(`   Error: ${operationStatus.error}`);
        console.error(`   Attempt: ${currentAttempt}/${maxAttempts}`);

        await step.run("mark-background-failed", async () => {
          await prisma.scene.update({
            where: { id: sceneId },
            data: { backgroundStatus: "failed" },
          });

          // RenderJob도 failed로 변경
          await prisma.renderJob.updateMany({
            where: {
              sceneId,
              externalId: operationName,
              provider: "veo",
            },
            data: {
              status: "failed",
              errorMessage: operationStatus.error,
            },
          });
        });

        throw new Error(
          `Veo operation ${operationName} failed: ${operationStatus.error}`
        );
      }

      // 404 에러는 재시도 로직으로 넘어감 (operation이 아직 전파되지 않았을 가능성)
      console.log(`⚠️ 404 error on attempt ${currentAttempt}/${maxAttempts}, will retry...`);
    }

    if (currentAttempt < maxAttempts) {
      // 아직 처리 중: 재시도
      await step.sendEvent("retry-veo-polling", {
        name: "veo/polling.requested",
        data: {
          sceneId,
          operationName,
          maxAttempts,
          currentAttempt: currentAttempt + 1,
        },
      });

      return {
        success: false,
        sceneId,
        status: "polling",
        attempt: currentAttempt,
      };
    } else {
      // 최대 시도 횟수 초과
      console.error(`❌ VEO polling timeout after ${maxAttempts} attempts`);
      console.error(`   Scene ID: ${sceneId}`);
      console.error(`   Operation: ${operationName}`);

      await step.run("mark-background-timeout", async () => {
        await prisma.scene.update({
          where: { id: sceneId },
          data: { backgroundStatus: "failed" },
        });

        // RenderJob도 failed로 변경
        await prisma.renderJob.updateMany({
          where: {
            sceneId,
            externalId: operationName,
            provider: "veo",
          },
          data: {
            status: "failed",
            errorMessage: `Polling timeout after ${maxAttempts} attempts (10+ minutes)`,
          },
        });
      });

      throw new Error(
        `Veo operation ${operationName} timeout after ${maxAttempts} attempts`
      );
    }
  }
);
