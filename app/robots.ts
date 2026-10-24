import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/privacy", "/terms", "/disclaimer", "/start"],
      disallow: ["/today", "/meds", "/scan", "/settings", "/family", "/report", "/talk", "/emergency", "/visit", "/refill", "/review", "/circle", "/line", "/api"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
