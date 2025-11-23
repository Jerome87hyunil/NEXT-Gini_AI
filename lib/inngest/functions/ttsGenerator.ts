import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { generateTTS } from "@/lib/services/elevenlabs";
import { uploadFromBuffer } from "@/lib/supabase/storage";

export const ttsGenerator = inngest.createFunction(
  { id: "tts-generator", retries: 2, concurrency: [{ limit: 3 }] },
  { event: "tts/generation.requested" },
  async ({ event, step }) => {
    const { sceneId } = event.data;

    // 1. 씬 및 프로젝트 조회 (아바타 설정 포함)
    const data = await step.run("fetch-scene", async () => {
      const scene = await prisma.scene.findUnique({
        where: { id: sceneId },
        include: {
          project: {
            select: {
              id: true,
              avatarDesignMode: true,
              avatarDesignSettings: true,
            },
          },
        },
      });

      if (!scene) {
        throw new Error(`Scene ${sceneId} not found`);
      }

      return scene;
    });

    const scene = data;

    // 2. 성별별 보이스 ID 결정
    const voiceId = await step.run("determine-voice-id", async () => {
      // 성별별 ElevenLabs 보이스 ID 매핑
      const VOICE_IDS = {
        female: "8jHHF8rMqMlg8if2mOUe", // Aria (여성)
        male: "jB1Cifc2UQbq1gR3wnb0", // Callum (남성)
      };

      // 커스텀 아바타인 경우 성별 기반 보이스 선택
      if (scene.project.avatarDesignMode === "custom") {
        const settings = scene.project.avatarDesignSettings as {
          gender?: "male" | "female";
        };
        const gender = settings?.gender || "female";

        console.log(
          `✅ Custom avatar detected - using ${gender} voice: ${VOICE_IDS[gender]}`
        );
        return VOICE_IDS[gender];
      }

      // 프리셋 아바타인 경우 기본 보이스 (여성)
      console.log(
        `📸 Preset avatar - using default female voice: ${VOICE_IDS.female}`
      );
      return VOICE_IDS.female;
    });

    // 3. TTS 상태 업데이트 (generating)
    await step.run("update-tts-status-generating", async () => {
      await prisma.scene.update({
        where: { id: sceneId },
        data: { ttsStatus: "generating" },
      });
    });

    // 4. ElevenLabs TTS 생성 및 임시 저장
    const { audioUrl, audioDuration } = await step.run("generate-and-upload-tts", async () => {
      const { promises: fs } = await import("fs");
      const os = await import("os");
      const path = await import("path");

      // TTS 생성 (성별별 보이스 적용)
      const ttsResult = await generateTTS(scene.script, voiceId);

      // API 응답이 JSON 직렬화된 Buffer일 수 있으므로 변환
      const audioBuffer = Buffer.isBuffer(ttsResult.audioBuffer)
        ? ttsResult.audioBuffer
        : Buffer.from(ttsResult.audioBuffer as unknown as ArrayBuffer);

      // 임시 파일로 저장 (길이 측정을 위해)
      const tempDir = os.tmpdir();
      const tempPath = path.join(tempDir, `tts_${scene.id}_${Date.now()}.mp3`);
      await fs.writeFile(tempPath, audioBuffer);

      console.log(`🎵 TTS audio saved temporarily: ${tempPath}`);

      // FFprobe로 정확한 오디오 길이 측정
      const { FFmpegService } = await import("@/lib/services/ffmpeg");
      const ffmpegService = new FFmpegService();
      const audioDuration = await ffmpegService.getAudioDuration(tempPath);

      console.log(`✅ Measured audio duration: ${audioDuration.toFixed(2)}s for scene ${scene.sceneNumber}`);

      // Supabase Storage에 업로드
      const fileName = `scene_${scene.sceneNumber}_audio.mp3`;
      const storagePath = `projects/${scene.projectId}/audio/${fileName}`;
      const { url } = await uploadFromBuffer(
        audioBuffer,
        storagePath,
        "audio/mpeg"
      );

      // 임시 파일 삭제
      await fs.unlink(tempPath);

      return { audioUrl: url, audioDuration };
    });

    // 5. Asset 생성
    const asset = await step.run("create-asset", async () => {
      return await prisma.asset.create({
        data: {
          projectId: scene.projectId,
          kind: "audio",
          type: "audio",
          url: audioUrl,
          storagePath: `projects/${scene.projectId}/audio/scene_${scene.sceneNumber}_audio.mp3`,
          metadata: {
            sceneId: scene.id,
            sceneNumber: scene.sceneNumber,
            duration: scene.duration,
            provider: "elevenlabs",
          },
        },
      });
    });

    // 6. 씬의 audioAssetId 업데이트 및 TTS 상태 완료
    await step.run("update-scene-audio-asset", async () => {
      await prisma.scene.update({
        where: { id: sceneId },
        data: {
          audioAssetId: asset.id,
          ttsStatus: "completed",
          durationSeconds: audioDuration, // 실제 측정된 오디오 길이 저장
        },
      });

      console.log(`✅ Scene ${scene.sceneNumber} updated with audio duration: ${audioDuration.toFixed(2)}s`);
    });

    // 7. TTS 완료 이벤트 발송 (Scene Processor가 대기 중)
    await step.sendEvent("tts-completed", {
      name: "tts/completed",
      data: {
        sceneId,
        projectId: scene.projectId,
        assetId: asset.id,
        audioUrl,
      },
    });

    return {
      success: true,
      sceneId,
      assetId: asset.id,
      audioUrl,
    };
  }
);
