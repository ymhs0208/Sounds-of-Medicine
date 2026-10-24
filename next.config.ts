import type { NextConfig } from "next";

const staticExport = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(staticExport
    ? {
        output: "export" as const,
        trailingSlash: true,
        images: { unoptimized: true },
      }
    : {}),
};

export default nextConfig;

// Workers bindings for `next dev`. Skip static export: `output: "export"` has no
// server, and starting the Wrangler dev proxy during that build fails it.
if (!staticExport) {
  void import("@opennextjs/cloudflare").then(({ initOpenNextCloudflareForDev }) => {
    void initOpenNextCloudflareForDev();
  });
}
