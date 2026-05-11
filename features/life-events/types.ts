import type {
  LifeEventCategoryValue,
  LifeEventRecurrencePatternValue,
  LifeEventSentimentValue,
  LifeEventSourceValue,
} from "@/lib/life-events";

export type LifeEventItem = {
  id: string;
  title: string;
  category: LifeEventCategoryValue;
  categoryLabel: string;
  customCategoryLabel: string | null;
  description: string | null;
  severityScore: number;
  severityLabel: string;
  sentiment: LifeEventSentimentValue | null;
  sentimentLabel: string;
  startAtIso: string;
  endAtIso: string | null;
  isOngoing: boolean;
  source: LifeEventSourceValue;
  isRecurring: boolean;
  recurrencePattern: LifeEventRecurrencePatternValue | null;
  recurrenceInterval: number | null;
  recurrenceRule: string | null;
  recurrenceLabel: string | null;
  seriesTitle: string | null;
  tags: string[];
  windowLabel: string;
};

export type LifeEventsSummary = {
  totalEvents: number;
  activeEvents: number;
  ongoingEvents: number;
  highSeverityEvents: number;
  negativeEvents: number;
};

export type LifeEventsContextData = {
  dataSource: "mock" | "database";
  lifeEvents: LifeEventItem[];
  summary: LifeEventsSummary;
};

export type LifeEventsPageData = {
  dataSource: "mock" | "database";
  summary: LifeEventsSummary;
  activeLifeEvents: LifeEventItem[];
  recentLifeEvents: LifeEventItem[];
  allLifeEvents: LifeEventItem[];
};