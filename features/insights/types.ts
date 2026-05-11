import type { LifeEventsContextData } from "@/features/life-events/types";
import type { InsightAnalysisSnapshot } from "@/server/insights/types";

export type InsightsPageData = {
  dataSource: "mock" | "database";
  analysis: InsightAnalysisSnapshot;
  context: LifeEventsContextData;
};