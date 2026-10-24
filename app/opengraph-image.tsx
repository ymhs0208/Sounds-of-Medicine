import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "藥聲 YaoSheng";

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
        <div style={{ fontSize: 42 }}>YaoSheng</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 96, fontWeight: 700 }}>藥聲</div>
          <div style={{ fontSize: 36, marginTop: 16 }}>把藥袋上的字，說成你聽得懂的話。</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
