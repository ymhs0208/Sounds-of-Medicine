/** Build-time public origin. Set NEXT_PUBLIC_SITE_URL before the production build. */
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://yaosheng.example").replace(/\/$/, "");
