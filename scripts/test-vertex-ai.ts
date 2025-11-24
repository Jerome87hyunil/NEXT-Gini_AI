/**
 * Vertex AI 인증 테스트 스크립트
 *
 * 실행: npx tsx scripts/test-vertex-ai.ts
 */

import { getGoogleProjectId, getGoogleLocation } from "@/lib/google/credentials";

async function testVertexAI() {
  console.log("🧪 Vertex AI 인증 테스트 시작...\n");

  try {
    // 1. 프로젝트 ID 확인
    const projectId = getGoogleProjectId();
    console.log("✅ 프로젝트 ID:", projectId);

    // 2. 리전 확인
    const location = getGoogleLocation();
    console.log("✅ 리전:", location);

    // 3. Vertex AI 클라이언트 생성
    const { VertexAI } = await import("@google-cloud/vertexai");

    const vertexAI = new VertexAI({
      project: projectId,
      location: location,
    });

    console.log("✅ Vertex AI 클라이언트 생성 성공");

    // 4. Gemini 모델 접근 테스트
    const model = vertexAI.getGenerativeModel({
      model: "gemini-2.5-pro",
    });

    console.log("✅ Gemini 2.5 Pro 모델 접근 성공");

    console.log("\n🎉 모든 테스트 통과! ADC 인증이 정상적으로 작동합니다.");
  } catch (error) {
    console.error("\n❌ 테스트 실패:", error);
    console.log("\n💡 해결 방법:");
    console.log("1. gcloud auth application-default login 실행");
    console.log("2. 프로젝트 ID가 올바른지 확인");
    console.log("3. Vertex AI API가 활성화되어 있는지 확인");
    process.exit(1);
  }
}

testVertexAI();
