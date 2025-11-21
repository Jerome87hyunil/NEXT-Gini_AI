#!/usr/bin/env tsx

/**
 * VEO Operation 상태 직접 확인
 * 가장 최근 Veo RenderJob의 operation을 직접 조회하여 응답 형식 확인
 */

import { PrismaClient } from "@prisma/client";
import { checkVeoOperation } from "../lib/services/gemini";

const prisma = new PrismaClient();

async function main() {
  try {
    console.log("🔍 가장 최근 Veo RenderJob 조회 중...\n");

    // 가장 최근 Veo RenderJob 조회
    const latestVeoJob = await prisma.renderJob.findFirst({
      where: {
        provider: "veo",
        status: "completed",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!latestVeoJob) {
      console.log("❌ Veo RenderJob을 찾을 수 없습니다.");
      return;
    }

    console.log(`📦 RenderJob ID: ${latestVeoJob.id}`);
    console.log(`🔗 Operation Name: ${latestVeoJob.externalId}`);
    console.log(`📅 Created: ${latestVeoJob.createdAt.toISOString()}`);
    console.log(`📌 Status: ${latestVeoJob.status}\n`);

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
    console.log("🔍 VEO Operation 직접 조회 중...\n");

    // Operation 상태 확인
    const operationStatus = await checkVeoOperation(latestVeoJob.externalId!);

    console.log("📋 Operation Status:");
    console.log(JSON.stringify(operationStatus, null, 2));
    console.log("");

    if (!operationStatus.done) {
      console.log("⚠️  Operation이 아직 진행 중입니다.");
      return;
    }

    if (operationStatus.error) {
      console.log("❌ Operation 에러:");
      console.log(operationStatus.error);
      return;
    }

    if (!operationStatus.videoBuffer) {
      console.log("🚨 문제 발견!");
      console.log("   - Operation은 완료됨 (done: true)");
      console.log("   - 하지만 videoBuffer가 없음");
      console.log("\n가능한 원인:");
      console.log("   1. GCS URI가 operation.response.videos에 없음");
      console.log("   2. GCS 다운로드 권한 문제");
      console.log("   3. GCS URI 형식 오류");
      console.log("\n해결 방법:");
      console.log("   1. Google Cloud Storage API 활성화 확인");
      console.log("   2. Service Account에 storage.objects.get 권한 부여");
      console.log("   3. VEO API 응답 형식 확인 (operation.response.videos)");
    } else {
      console.log(`✅ videoBuffer 존재: ${operationStatus.videoBuffer.length} bytes`);
      console.log("\n이 경우는 정상입니다. Scene과 Asset이 생성되어야 합니다.");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
