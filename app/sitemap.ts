import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site-config";
import { publicFeaturePages, trustLinks } from "@/lib/public-content";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const trustRoutes = [...new Set(trustLinks.map((link) => link.href))];

  return [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/privacy"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: absoluteUrl("/features"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    ...publicFeaturePages.map((page) => ({
      url: absoluteUrl(`/features/${page.slug}`),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...trustRoutes
      .filter((path) => path !== "/privacy")
      .map((path) => ({
        url: absoluteUrl(path),
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.5,
      })),
  ];
}