import type { InsightAnalysisNullState } from "@/server/insights/types";

type InsightSurface = "dashboard" | "mood" | "planner";
type InsightHighlightMode = "PRIMARY" | "EXPLORATORY" | "EMPTY";

type EvidenceSummaryLike = {
  alignedDayCount: number;
  exposedDayCount: number;
  sampleSize: number;
  uncertaintySummary: string;
};

type InsightConfidencePresentation = {
  label: string;
  description: string;
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

export function getInsightConfidencePresentation(confidence: number): InsightConfidencePresentation {
  if (confidence >= 0.8) {
    return {
      label: "Higher confidence",
      description: "Repeated enough to treat as a stronger lead rather than a fragile coincidence.",
    };
  }

  if (confidence >= 0.6) {
    return {
      label: "Moderate confidence",
      description: "Worth testing, but still easy to overread without more follow-through.",
    };
  }

  return {
    label: "Lower confidence",
    description: "Visible in the current window, but still too early or noisy to trust as a conclusion.",
  };
}

export function formatInsightContextLine(contextShare: number) {
  if (contextShare >= 0.5) {
    return "Life context overlaps with much of this signal, so Cadence softens the read before treating it as support.";
  }

  if (contextShare > 0) {
    return "Some relevant days were context-heavy, so keep this as a cautious read instead of a clean causal story.";
  }

  return "Recent life context is not heavily distorting this pattern, so the behavioural read is comparatively cleaner.";
}