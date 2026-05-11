import type {
  MoodReflectionEntry,
  MoodReflectionPeriod,
} from "@/features/mood/types";
import { sortMoodPeriods } from "@/lib/mood";

const QUICK_CAPTURE_DEFAULT_START_MINUTE = 9 * 60;
const QUICK_CAPTURE_WINDOW_MINUTES = 2 * 60;
const TOTAL_DAY_MINUTES = 24 * 60;

export function isQuickCaptureDraft(entry: MoodReflectionEntry | null | undefined) {
  return Boolean(
    entry && !entry.reflectionCompletedAtIso && !entry.periods.length
  );
}

function getStarterBlockWindow(capturedAtIso: string | null | undefined) {
  if (!capturedAtIso) {
    return {
      startMinute: QUICK_CAPTURE_DEFAULT_START_MINUTE,
      endMinute: QUICK_CAPTURE_DEFAULT_START_MINUTE + QUICK_CAPTURE_WINDOW_MINUTES,
    };
  }

  const capturedAt = new Date(capturedAtIso);

  if (Number.isNaN(capturedAt.getTime())) {
    return {
      startMinute: QUICK_CAPTURE_DEFAULT_START_MINUTE,
      endMinute: QUICK_CAPTURE_DEFAULT_START_MINUTE + QUICK_CAPTURE_WINDOW_MINUTES,
    };
  }

  const captureMinute = capturedAt.getHours() * 60 + capturedAt.getMinutes();
  const startMinute = Math.min(
    Math.max(0, Math.floor(captureMinute / 60) * 60),
    TOTAL_DAY_MINUTES - QUICK_CAPTURE_WINDOW_MINUTES
  );

  return {
    startMinute,
    endMinute: startMinute + QUICK_CAPTURE_WINDOW_MINUTES,
  };
}

export function getReflectionDraftPeriods(
  entry: MoodReflectionEntry | null | undefined
): MoodReflectionPeriod[] {
  if (!entry) {
    return [];
  }

  if (!isQuickCaptureDraft(entry)) {
    return sortMoodPeriods(entry.periods);
  }

  const starterBlockWindow = getStarterBlockWindow(entry.draftCapturedAtIso);

  return [
    {
      id: `${entry.id}-starter-block`,
      startMinute: starterBlockWindow.startMinute,
      endMinute: starterBlockWindow.endMinute,
      score: entry.score,
      notes: null,
      tags: entry.tags,
    },
  ];
}