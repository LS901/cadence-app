"use client";

import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

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
};

export function MoodTrendChart({ data }: MoodTrendChartProps) {
  return (
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
      </AreaChart>
    </ChartContainer>
  );
}