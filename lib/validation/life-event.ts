import { z } from "zod";
import {
  LIFE_EVENT_CATEGORY_OPTIONS,
  LIFE_EVENT_RECURRENCE_OPTIONS,
  LIFE_EVENT_SENTIMENT_OPTIONS,
} from "@/lib/life-events";

const categoryValues = LIFE_EVENT_CATEGORY_OPTIONS.map((option) => option.value) as [
  (typeof LIFE_EVENT_CATEGORY_OPTIONS)[number]["value"],
  ...(typeof LIFE_EVENT_CATEGORY_OPTIONS)[number]["value"][]
];
const sentimentValues = LIFE_EVENT_SENTIMENT_OPTIONS.map((option) => option.value) as [
  (typeof LIFE_EVENT_SENTIMENT_OPTIONS)[number]["value"],
  ...(typeof LIFE_EVENT_SENTIMENT_OPTIONS)[number]["value"][]
];
const recurrencePatternValues = LIFE_EVENT_RECURRENCE_OPTIONS.map((option) => option.value) as [
  (typeof LIFE_EVENT_RECURRENCE_OPTIONS)[number]["value"],
  ...(typeof LIFE_EVENT_RECURRENCE_OPTIONS)[number]["value"][]
];

export const lifeEventSchema = z
  .object({
    title: z.string().trim().min(2).max(80),
    category: z.enum(categoryValues),
    customCategoryLabel: z.string().trim().max(40).optional(),
    description: z.string().trim().max(800).optional(),
    severityScore: z.number().int().min(1).max(5),
    sentiment: z.enum(sentimentValues).optional(),
    startAt: z.date(),
    endAt: z.date().optional(),
    isOngoing: z.boolean().default(false),
    recurrencePattern: z.enum(recurrencePatternValues).optional(),
    recurrenceInterval: z.number().int().min(1).max(30).optional(),
    recurrenceRule: z.string().trim().max(120).optional(),
    tags: z.array(z.string().trim().min(1).max(32)).max(6).default([]),
  })
  .superRefine((values, context) => {
    if (values.category === "CUSTOM" && !values.customCategoryLabel?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add a short custom label for custom context categories.",
        path: ["customCategoryLabel"],
      });
    }

    if (!values.isOngoing && !values.endAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add an end time or mark the event as ongoing.",
        path: ["endAt"],
      });
    }

    if (values.endAt && values.endAt < values.startAt) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End time needs to be after the start time.",
        path: ["endAt"],
      });
    }

    if (values.isOngoing && values.recurrencePattern) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ongoing events cannot also generate repeating future occurrences.",
        path: ["recurrencePattern"],
      });
    }

    if (values.recurrencePattern === "CUSTOM" && !values.recurrenceRule?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Add a short custom rule for recurring context.",
        path: ["recurrenceRule"],
      });
    }
  });