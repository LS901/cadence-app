import { auth } from "@/auth";
import { demoUser } from "@/lib/data/mock-cadence";
import { MoodReflectionWorkspace } from "@/features/mood/components/mood-reflection-workspace";
import { getMoodPageData } from "@/server/mood/queries";

type MoodPageProps = {
  searchParams?: Promise<{
    compose?: string | string[];
    source?: string | string[];
    windowStart?: string | string[];
    windowEnd?: string | string[];
  }>;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getWindowLabel(windowStart: string | undefined, windowEnd: string | undefined) {
  if (!windowStart || !windowEnd) {
    return null;
  }

  const start = new Date(windowStart);
  const end = new Date(windowEnd);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return null;
  }

  const startLabel = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const endLabel = end.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
}

export default async function MoodPage({ searchParams }: MoodPageProps) {
  const session = await auth();
  const userId = session?.user?.id ?? demoUser.id;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const composeParam = resolvedSearchParams?.compose;
  const openTodayComposerOnLoad = Array.isArray(composeParam)
    ? composeParam.includes("today")
    : composeParam === "today";
  const windowStart = getSingleParam(resolvedSearchParams?.windowStart);
  const windowEnd = getSingleParam(resolvedSearchParams?.windowEnd);
  const focusWindow = windowStart && windowEnd
    ? {
        start: new Date(windowStart),
        end: new Date(windowEnd),
      }
    : null;
  const data = await getMoodPageData(userId, focusWindow);
  const windowLabel = getWindowLabel(
    windowStart,
    windowEnd
  );
  const focusContext = windowLabel
    ? {
        sourceLabel: getSingleParam(resolvedSearchParams?.source) === "journal" ? "Journal overlay" : "Linked view",
        windowLabel,
      }
    : null;

  return <MoodReflectionWorkspace data={data} openTodayComposerOnLoad={openTodayComposerOnLoad} focusContext={focusContext} />;
}