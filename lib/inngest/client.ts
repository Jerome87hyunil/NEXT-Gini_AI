import { Inngest } from "inngest";

/**
 * Inngest 클라이언트
 *
 * 백그라운드 작업 처리를 위한 Inngest SDK 인스턴스
 */
export const inngest = new Inngest({
  id: "gini-ai",
  eventKey: process.env.INNGEST_EVENT_KEY,
});
