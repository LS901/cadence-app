"use client";

import { Area, AreaChart, CartesianGrid, ReferenceDot, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { LifeEventTimelinePoint } from "@/lib/life-events";
import { cn } from "@/lib/utils";

const chartConfig = {
  score: {
    label: "Mood",
    color: "var(--chart-1)",
  },
  energy: {
    label: "Energy",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

type MoodTrendChartProps = {
  data: Array<{ day: string; score: number; energy: number }>;
  contextTimeline?: LifeEventTimelinePoint[];
};

function getContextMarkerTone(point: LifeEventTimelinePoint | undefined) {
  if (!point?.activeCount) {
    return "border-border/40 bg-background/40 text-muted-foreground";
  }

  if (point.dominantSentiment === "POSITIVE") {
    return "border-[color:color-mix(in_oklab,var(--mood-4)_36%,transparent)] bg-[color:color-mix(in_oklab,var(--mood-4)_12%,transparent)] text-foreground";
  }

  if (point.dominantSentiment === "NEGATIVE") {
    return "border-[color:color-mix(in_oklab,var(--mood-2)_38%,transparent)] bg-[color:color-mix(in_oklab,var(--mood-2)_12%,transparent)] text-foreground";
  }

  return "border-[color:color-mix(in_oklab,var(--mood-3)_32%,transparent)] bg-[color:color-mix(in_oklab,var(--mood-3)_10%,transparent)] text-foreground";
}

export function MoodTrendChart({ data, contextTimeline = [] }: MoodTrendChartProps) {
  const contextTimelineByDay = new Map(contextTimeline.map((point) => [point.day, point]));
  const visibleContextPoints = data.flatMap((point) => {
    const contextPoint = contextTimelineByDay.get(point.day);

    if (!contextPoint?.activeCount) {
      return [];
    }

    return [{ point, contextPoint }];
  });

  return (
    <div className="space-y-4">
      <ChartContainer config={chartConfig} className="h-[320px] w-full">
        <AreaChart data={data} margin={{ left: 0, right: 12, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="fillMood" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-score)" stopOpacity={0.36} />
              <stop offset="95%" stopColor="var(--color-score)" stopOpacity={0.04} />
            </linearGradient>
            <linearGradient id="fillEnergy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-energy)" stopOpacity={0.22} />
              <stop offset="95%" stopColor="var(--color-energy)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis axisLine={false} dataKey="day" tickLine={false} tickMargin={12} />
          <ChartTooltip content={<ChartTooltipContent indicator="line" />} cursor={false} />
          <Area
            dataKey="energy"
            stroke="var(--color-energy)"
            strokeWidth={2}
            type="monotone"
            fill="url(#fillEnergy)"
          />
          <Area
            dataKey="score"
            stroke="var(--color-score)"
            strokeWidth={3}
            type="monotone"
            fill="url(#fillMood)"
          />
          {visibleContextPoints.map(({ point, contextPoint }) => (
            <ReferenceDot
              key={contextPoint.dateIso}
              x={point.day}
              y={point.score}
              r={6}
              fill="var(--background)"
              stroke="var(--color-score)"
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ChartContainer>

      {contextTimeline.length ? (
        <div className="space-y-3 rounded-[24px] border border-border/40 bg-background/35 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-foreground">Context markers on the mood curve</p>
              <p className="text-xs leading-5 text-muted-foreground">
                Marked points indicate days where a logged life event belongs in the reading of the trend, not beside it.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/40 px-3 py-1">
                <span className="size-2 rounded-full bg-[var(--color-score)]" /> Mood score
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/40 px-3 py-1">
                <span className="size-2 rounded-full border-2 border-[var(--color-score)] bg-background" /> Context day
              </span>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-7">
            {data.map((point) => {
              const contextPoint = contextTimelineByDay.get(point.day);

              return (
                <div
                  key={point.day}
                  className={cn("rounded-[18px] border px-3 py-3", getContextMarkerTone(contextPoint))}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{point.day}</p>
                    <span className={cn(
                      "size-2 rounded-full",
                      contextPoint?.activeCount ? "bg-[var(--color-score)]" : "bg-border/60"
                    )} />
                  </div>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {contextPoint?.activeCount ? `${contextPoint.activeCount} context ${contextPoint.activeCount === 1 ? "event" : "events"}` : "Clear day"}
                  </p>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                    {contextPoint?.dominantTitle ?? "No major life event logged against this point in the curve."}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}