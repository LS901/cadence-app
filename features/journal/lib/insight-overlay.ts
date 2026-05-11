import type {
  JournalInsightOverlay,
  JournalStoryWindow,
} from "@/features/journal/types";

type WeeklyReviewSnapshot = {
  title: string;
  summary: string;
  averageMoodScore: number | null;
};

type MoodArchiveSnapshot = {
  weekLabel: string;
  title: string;
  summary: string;
  averageMoodScore: number | null;
};

type JournalInsightOverlayInput = {
  storyWindows: JournalStoryWindow[];
  weeklyReview: WeeklyReviewSnapshot;
  moodArchive: MoodArchiveSnapshot[];
};

function buildComparison(windowAverage: number | null, referenceAverage: number | null, referenceLabel: string) {
  if (windowAverage == null || referenceAverage == null) {
    return `There is not enough mood-tag coverage to compare this story window against ${referenceLabel} yet.`;
  }

  const difference = windowAverage - referenceAverage;

  if (Math.abs(difference) >= 5) {
    return difference > 0
      ? `This story window is running ${difference} points above ${referenceLabel}.`
      : `This story window is running ${Math.abs(difference)} points below ${referenceLabel}.`;
  }

  return `This story window is sitting within ${Math.abs(difference)} points of ${referenceLabel}.`;
}

export function buildJournalInsightOverlays({
  storyWindows,
  weeklyReview,
  moodArchive,
}: JournalInsightOverlayInput): JournalInsightOverlay[] {
  return storyWindows.map((storyWindow, index) => {
    const archiveSnapshot = moodArchive[index] ?? moodArchive[0] ?? null;
    const weeklyComparison = buildComparison(
      storyWindow.averageMoodScore,
      weeklyReview.averageMoodScore,
      "the current dashboard weekly review"
    );
    const archiveComparison = archiveSnapshot
      ? buildComparison(
          storyWindow.averageMoodScore,
          archiveSnapshot.averageMoodScore,
          `${archiveSnapshot.weekLabel} in the mood archive`
        )
      : "No older mood archive window exists yet, so this stretch is still becoming the baseline for future comparisons.";

    return {
      storyWindowId: storyWindow.id,
      title: `${storyWindow.title} against the broader read`,
      summary: `${storyWindow.dateRangeLabel} can now be read against the same broader weekly framing used on the dashboard, instead of standing alone as narrative texture.`,
      weeklyReview: {
        ...weeklyReview,
        comparison: weeklyComparison,
      },
      moodArchive: archiveSnapshot
        ? {
            ...archiveSnapshot,
            comparison: archiveComparison,
          }
        : {
            weekLabel: null,
            title: "No archive comparison yet",
            summary: "Older mood archive windows will appear once Cadence has more prior weekly signal to compare against.",
            averageMoodScore: null,
            comparison: archiveComparison,
          },
    };
  });
}