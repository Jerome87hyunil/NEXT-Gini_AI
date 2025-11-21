import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { generateScript } from "@/lib/services/gemini";
import { createServiceClient } from "@/lib/supabase/server";

export const scriptGenerator = inngest.createFunction(
  { id: "script-generator", retries: 2 },
  { event: "script/generation.requested" },
  async ({ event, step }) => {
    const { projectId, documentId } = event.data;

    // 1. 프로젝트 및 문서 조회
    const result = await step.run("fetch-project-and-document", async () => {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          documents: {
            where: { id: documentId },
          },
        },
      });

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      if (!project.documents[0]) {
        throw new Error(`Document ${documentId} not found`);
      }

      return { project, document: project.documents[0] };
    });

    const { project, document } = result;

    // 2. Supabase Storage에서 PDF 다운로드
    const pdfBuffer = await step.run("download-pdf", async () => {
      const supabase = createServiceClient();
      const { data, error } = await supabase.storage
        .from("documents")
        .download(document.storagePath);

      if (error) {
        throw new Error(`Failed to download PDF: ${error.message}`);
      }

      return Buffer.from(await data.arrayBuffer());
    });

    // 3. PDF를 Base64로 인코딩
    const pdfBase64 = await step.run("encode-pdf", async () => {
      // Supabase Storage download는 ArrayBuffer를 반환하므로 Buffer로 변환
      let buffer: Buffer;
      if (Buffer.isBuffer(pdfBuffer)) {
        buffer = pdfBuffer;
      } else if (typeof pdfBuffer === "object" && pdfBuffer !== null && "type" in pdfBuffer && pdfBuffer.type === "Buffer") {
        // JSON 직렬화된 Buffer: { type: "Buffer", data: number[] }
        buffer = Buffer.from((pdfBuffer as { type: string; data: number[] }).data);
      } else {
        // ArrayBuffer or other
        buffer = Buffer.from(pdfBuffer as unknown as ArrayBuffer);
      }
      return buffer.toString("base64");
    });

    // 4. Gemini로 대본 생성
    const script = await step.run("generate-script", async () => {
      const result = await generateScript(
        pdfBase64,
        project.duration as 30 | 60 | 180
      );

      // 디버깅: 생성된 스크립트 확인
      console.log("🎬 Generated script from Gemini:");
      console.log(JSON.stringify(result, null, 2));

      return result;
    });

    // 5. 씬 생성 (대본을 씬으로 분할)
    const scenes = await step.run("create-scenes", async () => {
      interface SceneScript {
        sceneNumber: number;
        script: string;
        visualDescription?: string;
        imagePrompt?: string;
        videoPrompt?: string;
        priority?: string;
      }

      const createdScenes = await prisma.$transaction(
        script.scenes.map((scene: SceneScript, index: number) => {
          // 디버깅: 각 씬 데이터 확인
          console.log(`📝 Creating scene ${index + 1}:`, {
            sceneNumber: scene.sceneNumber || index + 1,
            hasImagePrompt: !!scene.imagePrompt,
            hasVideoPrompt: !!scene.videoPrompt,
            imagePrompt: scene.imagePrompt?.substring(0, 50) + "...",
            videoPrompt: scene.videoPrompt?.substring(0, 50) + "...",
          });

          return prisma.scene.create({
            data: {
              projectId,
              sceneNumber: scene.sceneNumber || index + 1,
              position: index + 1,
              script: scene.script,
              duration: 8, // Veo 3.1 최적 길이
              visualDescription: scene.visualDescription || "",
              imagePrompt: scene.imagePrompt || null,
              videoPrompt: scene.videoPrompt || null,
              backgroundAnalysis: {
                priority: scene.priority || "high", // 기본값: high (Veo 영상 생성)
                visualDescription: scene.visualDescription || "",
              },
              ttsStatus: "pending",
              avatarStatus: "pending",
              backgroundStatus: "pending",
            },
          });
        })
      );

      console.log(`✅ Created ${createdScenes.length} scenes successfully`);
      return createdScenes;
    });

    // 6. 프로젝트 상태 업데이트
    await step.run("update-project-status", async () => {
      await prisma.project.update({
        where: { id: projectId },
        data: {
          status: "script_generated",
          metadata: {
            scriptGeneratedAt: new Date().toISOString(),
            sceneCount: scenes.length,
          },
        },
      });
    });

    // 7. 씬 처리 시작 (첫 번째 씬)
    await step.sendEvent("trigger-scene-processing", {
      name: "scene/process.requested",
      data: {
        projectId,
        sceneId: scenes[0].id,
        sceneNumber: 1,
        totalScenes: scenes.length,
      },
    });

    return {
      success: true,
      projectId,
      scenesCreated: scenes.length,
    };
  }
);
