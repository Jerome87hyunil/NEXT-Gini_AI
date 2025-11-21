import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { uploadFromBuffer } from "@/lib/supabase/storage";
import { FFmpegService } from "@/lib/services/ffmpeg";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

interface SceneData {
  sceneNumber: number;
  duration: number;
  audioUrl: string;
  avatarUrl: string;
  backgroundUrl: string;
  backgroundType: string;
}

export const videoRender = inngest.createFunction(
  { id: "video-render", retries: 1 },
  { event: "video/render.requested" },
  async ({ event, step }) => {
    const { projectId, sceneData } = event.data as {
      projectId: string;
      sceneData: SceneData[];
    };

    // 0. FFmpeg 설치 확인
    const ffmpegAvailable = await step.run("check-ffmpeg", async () => {
      return await FFmpegService.isFFmpegAvailable();
    });

    if (!ffmpegAvailable) {
      throw new Error(
        "FFmpeg is not installed. Please install FFmpeg to render videos."
      );
    }

    const ffmpeg = new FFmpegService();

    // 1. 임시 디렉토리 생성
    const tempDir = await step.run("create-temp-directory", async () => {
      const dir = path.join(
        os.tmpdir(),
        `render_${projectId}_${Date.now()}`
      );
      await fs.mkdir(dir, { recursive: true });
      return dir;
    });

    // 2. 씬별 자산 다운로드 및 배경 합성
    const composedScenes: string[] = [];

    for (let i = 0; i < sceneData.length; i++) {
      const scene = sceneData[i];

      const composedScenePath = await step.run(
        `compose-scene-${scene.sceneNumber}`,
        async () => {
          // 2-1. 배경 다운로드
          const backgroundExt = scene.backgroundType.includes("video")
            ? ".mp4"
            : ".png";
          const backgroundPath = path.join(
            tempDir,
            `bg_${scene.sceneNumber}${backgroundExt}`
          );

          const bgResponse = await fetch(scene.backgroundUrl);
          const bgBuffer = Buffer.from(await bgResponse.arrayBuffer());
          await fs.writeFile(backgroundPath, bgBuffer);

          // 2-2. 아바타 비디오 다운로드
          const avatarPath = path.join(
            tempDir,
            `avatar_${scene.sceneNumber}.mp4`
          );

          const avatarResponse = await fetch(scene.avatarUrl);
          const avatarBuffer = Buffer.from(await avatarResponse.arrayBuffer());
          await fs.writeFile(avatarPath, avatarBuffer);

          // 2-3. 배경 + 아바타 합성
          const composedPath = path.join(
            tempDir,
            `composed_${scene.sceneNumber}.mp4`
          );

          const command = ffmpeg.buildCompositionCommand(
            backgroundPath,
            avatarPath,
            composedPath
          );

          await ffmpeg.executeCommand(
            command,
            `Scene ${scene.sceneNumber} composition`
          );

          return composedPath;
        }
      );

      composedScenes.push(composedScenePath);
    }

    // 3. 모든 씬 연결 (concat)
    const finalVideoPath = await step.run("concatenate-scenes", async () => {
      if (composedScenes.length === 1) {
        return composedScenes[0]; // 씬이 1개면 concat 불필요
      }

      // concat 파일 생성
      const concatFilePath = path.join(tempDir, "concat.txt");
      await ffmpeg.createConcatFile(composedScenes, concatFilePath);

      // 최종 비디오 경로
      const finalPath = path.join(tempDir, "final_video.mp4");

      // concat 명령 실행
      const command = ffmpeg.buildConcatenationCommand(
        concatFilePath,
        finalPath
      );

      await ffmpeg.executeCommand(command, "Scene concatenation");

      return finalPath;
    });

    // 4. 최종 비디오 파일 읽기 및 업로드
    const { videoUrl, storagePath } = await step.run(
      "upload-final-video",
      async () => {
        const videoBuffer = await fs.readFile(finalVideoPath);

        const fileName = `final_video.mp4`;
        const storagePath = `projects/${projectId}/final/${fileName}`;

        const { url, path } = await uploadFromBuffer(
          videoBuffer,
          storagePath,
          "video/mp4"
        );

        return { videoUrl: url, storagePath: path };
      }
    );

    // 5. 비디오 duration 및 파일 크기 조회
    const { duration, fileSize } = await step.run(
      "get-video-metadata",
      async () => {
        const duration = await ffmpeg.getVideoDuration(finalVideoPath);
        const stats = await fs.stat(finalVideoPath);
        return { duration, fileSize: stats.size };
      }
    );

    // 6. Asset 생성
    const asset = await step.run("create-final-video-asset", async () => {
      return await prisma.asset.create({
        data: {
          projectId,
          kind: "final_video",
          type: "final_video",
          url: videoUrl,
          storagePath,
          metadata: {
            sceneCount: sceneData.length,
            totalDuration: duration,
            fileSize,
            renderedAt: new Date().toISOString(),
          },
        },
      });
    });

    // 7. 프로젝트 상태 업데이트 (rendered)
    await step.run("update-project-status-rendered", async () => {
      await prisma.project.update({
        where: { id: projectId },
        data: {
          status: "rendered",
          finalVideoAssetId: asset.id,
        },
      });
    });

    // 8. 임시 파일 정리
    await step.run("cleanup-temp-files", async () => {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.error(`Failed to cleanup temp directory: ${error}`);
        // 정리 실패는 무시 (중요하지 않음)
      }
    });

    return {
      success: true,
      projectId,
      assetId: asset.id,
      videoUrl,
      duration,
      fileSize,
    };
  }
);
