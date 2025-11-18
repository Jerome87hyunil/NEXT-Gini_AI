import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import * as functions from "@/lib/inngest/functions";

/**
 * Inngest API 엔드포인트
 *
 * /api/inngest에서 모든 Inngest 함수를 서빙
 */
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: Object.values(functions),
  servePath: "/api/inngest",
});
