import { ImageResponse } from "next/og";
import { APP_NAME, APP_NAME_LATIN, APP_TITLE } from "@/lib/brand";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = APP_TITLE;

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#1b5e45",
          color: "#f6f1e8",
          padding: 72,
        }}
      >
        <div style={{ fontSize: 42 }}>{APP_NAME_LATIN}</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, fontWeight: 700 }}>{APP_NAME}</div>
          <div style={{ fontSize: 36, marginTop: 16 }}>把藥袋上的字，說成你聽得懂的話。</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
