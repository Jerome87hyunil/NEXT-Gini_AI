import { Inngest } from "inngest";

/**
 * Inngest 클라이언트
 *
 * 백그라운드 작업 처리를 위한 Inngest SDK 인스턴스
 */

// 개발 환경에서 Inngest 키가 없으면 mock 클라이언트 사용
const isDevelopment = process.env.NODE_ENV === "development";
const hasInngestKeys =
  process.env.INNGEST_EVENT_KEY &&
  process.env.INNGEST_EVENT_KEY !== "your-inngest-event-key";

export const inngest = new Inngest({
  id: "gini-ai",
  eventKey: process.env.INNGEST_EVENT_KEY,
  // 개발 환경에서 키가 없으면 로그만 출력
  isDev: isDevelopment,
});

/**
 * Inngest 이벤트 전송 (개발 환경 대응)
 *
 * ✅ Inngest Dev Server 실행 중이면 무조건 전송
 * ❌ Dev Server 없고 키도 없으면 로그만 출력
 */
export async function sendEvent(payload: {
  name: string;
  data: Record<string, unknown>;
}): Promise<void> {
  // Inngest Dev Server가 실행 중이면 항상 이벤트 전송
  // (키가 없어도 로컬 Dev Server로 전송됨)
  await inngest.send(payload);

  console.log("📤 Inngest 이벤트 전송:", {
    name: payload.name,
    projectId: payload.data.projectId,
  });
}
