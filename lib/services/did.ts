import "server-only";

/**
 * D-ID 아바타 서비스
 *
 * 아바타 립싱크 영상 생성
 */

const API_KEY = process.env.DID_API_KEY!;
const BASE_URL = "https://api.d-id.com";

/**
 * D-ID Talk 생성 (Mode B: 사전 생성 오디오)
 *
 * @param avatarImageUrl - 아바타 이미지 URL
 * @param audioUrl - 오디오 파일 URL
 * @param webhookUrl - 웹훅 URL (선택적)
 * @returns Talk ID
 */
export async function createTalk(
  avatarImageUrl: string,
  audioUrl: string,
  webhookUrl?: string
): Promise<string> {
  const payload: Record<string, unknown> = {
    source_url: avatarImageUrl,
    script: {
      type: "audio",
      audio_url: audioUrl,
    },
    config: {
      fluent: true,
      pad_audio: 0,
      stitch: true,
    },
  };

  // 웹훅 URL이 있을 때만 추가 (HTTPS만 허용됨)
  if (webhookUrl) {
    payload.webhook = webhookUrl;
  }

  const response = await fetch(`${BASE_URL}/talks`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`D-ID API error: ${error}`);
  }

  const data = await response.json();
  return data.id; // Talk ID
}

/**
 * D-ID Talk 상태 조회
 *
 * @param talkId - Talk ID
 * @returns 상태 및 결과 URL
 */
export async function getTalkStatus(talkId: string): Promise<{
  status: "created" | "processing" | "done" | "error" | "rejected";
  resultUrl?: string;
  error?: { description: string };
}> {
  const response = await fetch(`${BASE_URL}/talks/${talkId}`, {
    headers: {
      Authorization: `Basic ${API_KEY}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`D-ID API error: ${error}`);
  }

  const data = await response.json();

  return {
    status: data.status,
    resultUrl: data.result_url,
    error: data.error,
  };
}

/**
 * D-ID Talk 삭제
 *
 * @param talkId - Talk ID
 */
export async function deleteTalk(talkId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/talks/${talkId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Basic ${API_KEY}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Failed to delete D-ID talk: ${error}`);
  }
}
