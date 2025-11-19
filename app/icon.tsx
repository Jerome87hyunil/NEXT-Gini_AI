import { ImageResponse } from "next/og";

// 아이콘 메타데이터
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

// 동적 favicon 생성
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontWeight: "bold",
          borderRadius: "20%",
        }}
      >
        G
      </div>
    ),
    {
      ...size,
    }
  );
}
