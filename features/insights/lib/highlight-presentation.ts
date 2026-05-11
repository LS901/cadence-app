import type { InsightAnalysisNullState } from "@/server/insights/types";

type InsightSurface = "dashboard" | "mood" | "planner";
type InsightHighlightMode = "PRIMARY" | "EXPLORATORY" | "EMPTY";

type EvidenceSummaryLike = {
  alignedDayCount: number;
  exposedDayCount: number;
  sampleSize: number;
  uncertaintySummary: string;
};

const EMPTY_FALLBACK_COPY: Record<InsightSurface, { description: string; recommendation: string | null }> = {
  dashboard: {
    description: "Insight highlights will appear here once Cadence has enough stable data to compare behavior and mood.",
    recommendation: null,
  },
  mood: {
    description: "A few complete days are enough to start surfacing early correlations between routines and mood movement.",
    recommendation: null,
  },
  planner: {
    description: "Planner highlights appear once Cadence has enough stable data to compare your planned rhythm against mood.",
    recommendation: null,
  },
};

const EXPLORATORY_BADGE_COPY: Record<InsightSurface, string> = {
  dashboard: "Exploratory only",
  mood: "Watch, don’t trust yet",
  planner: "Exploratory only",
};

export function getInsightSurfacePresentation(options: {
  surface: InsightSurface;
  mode: InsightHighlightMode;
  nullState: InsightAnalysisNullState | null;
}) {
  const fallback = EMPTY_FALLBACK_COPY[options.surface];

  return {
    exploratoryBadgeLabel:
      options.mode === "EXPLORATORY" ? EXPLORATORY_BADGE_COPY[options.surface] : null,
    emptyDescription: options.nullState?.description ?? fallback.description,
    emptyRecommendation: options.nullState?.recommendation ?? fallback.recommendation,
  };
}

export function formatInsightEvidenceLine(summary: EvidenceSummaryLike) {
  return `${summary.alignedDayCount} of ${Math.max(summary.exposedDayCount, summary.sampleSize)} relevant days align. ${summary.uncertaintySummary}`;
}