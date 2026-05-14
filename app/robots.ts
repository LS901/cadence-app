import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/planner", "/habits", "/mood", "/life-events", "/journal", "/insights", "/settings", "/sign-in", "/sign-up", "/forgot-password", "/reset-password", "/verify-email", "/api/"],
      },
    ],
    sitemap: `${siteUrl.toString().replace(/\/$/, "")}/sitemap.xml`,
    host: siteUrl.toString().replace(/\/$/, ""),
  };
}