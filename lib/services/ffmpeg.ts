/**
 * FFmpeg Command Builder and Executor
 * Rails의 VideoComposition::FfmpegCommandBuilder를 Next.js로 이식
 */

import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";

export class FFmpegService {
  /**
   * 배경 + 아바타 합성 명령 빌드
   * Avatar overlay: bottom-right corner, 28% width, circular mask
   * Audio mix: Background music 35% + Avatar voice 100%
   */
  buildCompositionCommand(
    backgroundPath: string,
    avatarVideoPath: string,
    outputPath: string
  ): string[] {
    const backgroundExt = path.extname(backgroundPath).toLowerCase();
    const isVideoBackground = this.isVideoExtension(backgroundExt);

    // Avatar overlay filter: bottom-right corner, 28% width, circular mask
    const videoFilter = [
      "[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080[bg]",
      "[1:v]scale=iw*0.28:-1,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lt(hypot(X-(W/2),Y-(H/2)),min(W,H)/2),255,0)'[avatar]",
      "[bg][avatar]overlay=x=W-w-64:y=H-h-64:format=auto[video_out]",
    ].join(";");

    // Audio mixing: Background music (35% volume) + Avatar voice (100% volume)
    const audioFilter = [
      "[0:a]volume=0.35[bg_audio]",
      "[1:a]volume=1.0[avatar_audio]",
      "[bg_audio][avatar_audio]amix=inputs=2:duration=first:dropout_transition=2[audio_out]",
    ].join(";");

    if (isVideoBackground) {
      // Video background (Veo): mix background music with avatar voice
      return [
        "ffmpeg",
        "-i",
        backgroundPath,
        "-i",
        avatarVideoPath,
        "-filter_complex",
        `${videoFilter};${audioFilter}`,
        "-map",
        "[video_out]", // Composed video output
        "-map",
        "[audio_out]", // Mixed audio output
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-shortest",
        "-y",
        outputPath,
      ];
    } else {
      // Image background (Nano): only avatar audio (no background music)
      const videoFilterImage = [
        "[0:v]scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080[bg]",
        "[1:v]scale=iw*0.28:-1,format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':a='if(lt(hypot(X-(W/2),Y-(H/2)),min(W,H)/2),255,0)'[avatar]",
        "[bg][avatar]overlay=x=W-w-64:y=H-h-64:format=auto[video_out]",
      ].join(";");

      return [
        "ffmpeg",
        "-loop",
        "1",
        "-i",
        backgroundPath,
        "-i",
        avatarVideoPath,
        "-filter_complex",
        videoFilterImage,
        "-map",
        "[video_out]", // Composed video output
        "-map",
        "1:a?", // Avatar audio only
        "-c:v",
        "libx264",
        "-c:a",
        "aac",
        "-shortest",
        "-y",
        outputPath,
      ];
    }
  }

  /**
   * 여러 씬 연결 명령 빌드
   */
  buildConcatenationCommand(
    concatFilePath: string,
    outputPath: string
  ): string[] {
    return [
      "ffmpeg",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatFilePath,
      "-c",
      "copy",
      "-y",
      outputPath,
    ];
  }

  /**
   * 비디오 duration 조회 명령 빌드 (ffprobe)
   */
  buildDurationProbeCommand(videoPath: string): string[] {
    return [
      "ffprobe",
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      videoPath,
    ];
  }

  /**
   * FFmpeg 명령 실행
   */
  async executeCommand(
    command: string[],
    context = "FFmpeg operation"
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command;
      const process = spawn(cmd, args);

      let stderr = "";

      process.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", (code) => {
        if (code !== 0) {
          const errorLines = stderr.split("\n").slice(-5).join("\n");
          console.error(`${context} failed`);
          console.error(`FFmpeg stderr: ${stderr}`);
          reject(new Error(`${context} failed. Error: ${errorLines}`));
        } else {
          resolve();
        }
      });

      process.on("error", (err) => {
        reject(new Error(`Failed to start ${cmd}: ${err.message}`));
      });
    });
  }

  /**
   * 명령 실행 및 출력 캡처
   */
  async executeAndCapture(command: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command;
      const process = spawn(cmd, args);

      let stdout = "";
      let stderr = "";

      process.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      process.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      process.on("close", (code) => {
        if (code !== 0) {
          console.error(`Command failed: ${command.join(" ")}`);
          console.error(`stderr: ${stderr}`);
          resolve("");
        } else {
          resolve(stdout.trim());
        }
      });

      process.on("error", (err) => {
        reject(err);
      });
    });
  }

  /**
   * 비디오 duration 조회 (ffprobe)
   */
  async getVideoDuration(videoPath: string): Promise<number> {
    const command = this.buildDurationProbeCommand(videoPath);
    const output = await this.executeAndCapture(command);
    return parseFloat(output) || 0;
  }

  /**
   * FFmpeg 설치 확인
   */
  static async isFFmpegAvailable(): Promise<boolean> {
    try {
      const process = spawn("which", ["ffmpeg"]);
      return new Promise((resolve) => {
        process.on("close", (code) => {
          resolve(code === 0);
        });
        process.on("error", () => {
          resolve(false);
        });
      });
    } catch {
      return false;
    }
  }

  /**
   * concat 파일 생성 (씬 연결용)
   */
  async createConcatFile(
    scenePaths: string[],
    concatFilePath: string
  ): Promise<void> {
    const content = scenePaths.map((p) => `file '${p}'`).join("\n");
    await fs.writeFile(concatFilePath, content, "utf-8");
  }

  // Helper methods

  private isVideoExtension(ext: string): boolean {
    return [".mp4", ".mov", ".avi", ".webm", ".mkv"].includes(ext);
  }

  private isImageExtension(ext: string): boolean {
    return [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp"].includes(ext);
  }
}
