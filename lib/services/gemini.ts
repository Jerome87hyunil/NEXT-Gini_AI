import "server-only";
import { VertexAI, HarmBlockThreshold, HarmCategory } from "@google-cloud/vertexai";

/**
 * Google Vertex AI 서비스
 *
 * - Gemini 2.5 Pro: 대본 생성 + PDF 분석
 * - Nano Banana: 커스텀 아바타 + 씬 배경 이미지
 * - Veo 3.1: 씬 배경 영상 (image-to-video)
 */

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT!;
const LOCATION = process.env.GOOGLE_CLOUD_LOCATION || "us-central1";

const vertexAI = new VertexAI({
  project: PROJECT_ID,
  location: LOCATION,
});

/**
 * Gemini 2.5 Pro - 대본 생성
 *
 * @param pdfBase64 - PDF 파일 Base64 인코딩
 * @param duration - 영상 길이 (30/60/180초)
 * @returns 생성된 대본 (씬 배열)
 */
export async function generateScript(
  pdfBase64: string,
  duration: 30 | 60 | 180
) {
  const model = vertexAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
    safetySettings: [
      {
        category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      },
    ],
  });

  const prompt = `
당신은 발표 자료를 분석하여 아바타가 발표할 대본을 생성하는 AI입니다.

첨부된 PDF 발표 자료를 분석하여 ${duration}초 길이의 영상 대본을 생성하세요.

요구사항:
1. 전체 영상 길이: 정확히 ${duration}초
2. 씬 구성: 15초씩 나눠서 총 ${duration / 15}개 씬
3. 각 씬마다 다음 정보를 포함:
   - 대본 (script): 아바타가 말할 내용
   - 시각적 설명 (visualDescription): 배경에 표시할 내용 설명
   - 우선순위 (priority): "high" (중요), "medium" (보통), "low" (덜 중요)

응답 형식 (JSON):
{
  "scenes": [
    {
      "sceneNumber": 1,
      "script": "안녕하세요...",
      "visualDescription": "제목 슬라이드 배경",
      "priority": "high"
    }
  ]
}
`;

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "application/pdf",
              data: pdfBase64,
            },
          },
        ],
      },
    ],
  });

  const response = result.response;
  const text = response.candidates?.[0].content.parts[0].text || "";

  // JSON 파싱
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse Gemini response");
  }

  return JSON.parse(jsonMatch[0]);
}

/**
 * Nano Banana - 커스텀 아바타 이미지 생성
 *
 * @param settings - 아바타 디자인 설정
 * @returns 생성된 이미지 Base64
 */
export async function generateAvatarDesign(settings: {
  gender: string;
  ageRange: string;
  style: string;
  expression: string;
  background: string;
}): Promise<string> {
  // TODO: Vertex AI Imagen API 구현
  // 현재는 placeholder
  throw new Error("Imagen API not implemented yet");
}

/**
 * Nano Banana - 씬 배경 이미지 생성
 *
 * @param visualDescription - 시각적 설명
 * @returns 생성된 이미지 Base64
 */
export async function generateBackgroundImage(
  visualDescription: string
): Promise<string> {
  // TODO: Vertex AI Imagen API 구현
  // 현재는 placeholder
  throw new Error("Imagen API not implemented yet");
}

/**
 * Veo 3.1 - 배경 영상 생성 (image-to-video)
 *
 * @param imageBase64 - 기준 이미지 Base64
 * @param description - 영상 설명
 * @returns Operation ID (LRO)
 */
export async function generateBackgroundVideo(
  imageBase64: string,
  description: string
): Promise<string> {
  // TODO: Veo 3.1 API 사용
  // 현재는 placeholder
  throw new Error("Veo API not implemented yet");
}

/**
 * Veo LRO (Long Running Operation) 상태 확인
 *
 * @param operationId - Operation ID
 * @returns 상태 및 결과 URL
 */
export async function checkVeoOperation(operationId: string): Promise<{
  status: "pending" | "processing" | "completed" | "failed";
  resultUrl?: string;
  error?: string;
}> {
  // TODO: Veo LRO 폴링 구현
  throw new Error("Veo polling not implemented yet");
}
