import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { generateAvatarDesign } from "@/lib/services/gemini";
import { uploadFromBuffer } from "@/lib/supabase/storage";

export const avatarDesignGenerator = inngest.createFunction(
  { id: "avatar-design-generator", retries: 2 },
  { event: "avatar-design/generation.requested" },
  async ({ event, step }) => {
    const { projectId } = event.data;

    // 1. 프로젝트 조회
    const project = await step.run("fetch-project", async () => {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new Error(`Project ${projectId} not found`);
      }

      // avatarDesignMode가 "custom"인지 확인
      if (project.avatarDesignMode !== "custom") {
        throw new Error(`Project ${projectId} is not in custom avatar mode`);
      }

      if (!project.avatarDesignSettings) {
        throw new Error(`Project ${projectId} has no avatar design settings`);
      }

      return project;
    });

    // 2. 아바타 디자인 상태 업데이트 (generating)
    await step.run("update-avatar-design-status-generating", async () => {
      await prisma.project.update({
        where: { id: projectId },
        data: { avatarDesignStatus: "generating" },
      });
    });

    const settings = project.avatarDesignSettings as {
      gender: string;
      ageRange: string;
      style: string;
      expression: string;
      background: string;
    };

    // 3. Imagen API로 아바타 이미지 생성
    const imageBuffer = await step.run("generate-avatar-image", async () => {
      return await generateAvatarDesign(settings);
    });

    // 4. Supabase Storage에 업로드
    const imageUrl = await step.run("upload-avatar-image", async () => {
      const fileName = `avatar_design.png`;
      const storagePath = `projects/${projectId}/avatars/${fileName}`;

      // API 응답이 JSON 직렬화된 Buffer일 수 있으므로 변환
      const buffer = Buffer.isBuffer(imageBuffer)
        ? imageBuffer
        : Buffer.from(imageBuffer as unknown as ArrayBuffer);

      const { url } = await uploadFromBuffer(buffer, storagePath, "image/png");
      return url;
    });

    // 5. Asset 생성
    const asset = await step.run("create-avatar-design-asset", async () => {
      return await prisma.asset.create({
        data: {
          projectId,
          kind: "avatar_design",
          type: "avatar_design",
          url: imageUrl,
          storagePath: `projects/${projectId}/avatars/avatar_design.png`,
          metadata: {
            provider: "imagen",
            settings,
            cost: 0.039, // Imagen 예상 비용
          },
        },
      });
    });

    // 6. 프로젝트 상태 업데이트 (completed)
    await step.run("update-avatar-design-status-completed", async () => {
      await prisma.project.update({
        where: { id: projectId },
        data: {
          avatarDesignStatus: "completed",
          metadata: {
            avatarDesignAssetId: asset.id,
            avatarDesignCompletedAt: new Date().toISOString(),
          },
        },
      });
    });

    return {
      success: true,
      projectId,
      assetId: asset.id,
      imageUrl,
    };
  }
);
