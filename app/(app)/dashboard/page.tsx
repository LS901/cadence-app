import { auth } from "@/auth";
import { DashboardOverview } from "@/features/dashboard/components/dashboard-overview";
import { getDashboardData } from "@/server/dashboard/queries";

type DashboardPageProps = {
  searchParams?: Promise<{
    focus?: string | string[];
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

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const session = await auth();
  const userId = session?.user?.id ?? "demo-user";
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const focus = getSingleParam(resolvedSearchParams?.focus);
  const windowStart = getSingleParam(resolvedSearchParams?.windowStart);
  const windowEnd = getSingleParam(resolvedSearchParams?.windowEnd);
  const focusWindow = windowStart && windowEnd
    ? {
        start: new Date(windowStart),
        end: new Date(windowEnd),
      }
    : null;
  const dashboardData = await getDashboardData(userId, focusWindow);
  const windowLabel = getWindowLabel(
    windowStart,
    windowEnd
  );
  const focusContext = focus === "weekly-review" && windowLabel
    ? {
        sourceLabel: getSingleParam(resolvedSearchParams?.source) === "journal" ? "Journal overlay" : "Linked view",
        windowLabel,
      }
    : null;

  return <DashboardOverview data={dashboardData} focusContext={focusContext} />;
}