import { z } from "zod";
import { findOverlappingMoodPeriodIndex } from "@/lib/mood";

const moodPeriodSchema = z
  .object({
    startMinute: z.number().int().min(0).max(1_439),
    endMinute: z.number().int().min(1).max(1_440),
    score: z.number().int().min(1).max(100),
    notes: z.string().max(240).optional(),
    tags: z.array(z.string().trim().min(1).max(32)).max(6).default([]),
  })
  .refine((value) => value.endMinute > value.startMinute, {
    message: "Mood period end time must be after the start time.",
    path: ["endMinute"],
  });

export const moodEntrySchema = z.object({
  day: z.date(),
  score: z.number().int().min(1).max(100),
  energy: z.number().int().min(1).max(100).optional(),
  stress: z.number().int().min(1).max(100).optional(),
  sleepHours: z.number().min(0).max(24).optional(),
  sleepQuality: z.number().int().min(1).max(5).optional(),
  workStress: z.number().int().min(1).max(5).optional(),
  socialQuality: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(400).optional(),
  tags: z.array(z.string().trim().min(1).max(32)).max(8).default([]),
});

export const completeDayReflectionSchema = moodEntrySchema
  .extend({
    moodStability: z.number().int().min(1).max(100).optional(),
    periods: z.array(moodPeriodSchema).min(1).max(8),
  })
  .superRefine((value, context) => {
    const overlappingPeriodIndex = findOverlappingMoodPeriodIndex(value.periods);

    if (overlappingPeriodIndex >= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Mood blocks cannot overlap.",
        path: ["periods", overlappingPeriodIndex, "startMinute"],
      });
    }
  });

export const completeDayReflectionMutationSchema = z
  .object({
    day: z.string().min(1),
    sleepHours: z.number().min(0).max(24).optional(),
    sleepQuality: z.number().int().min(1).max(5).optional(),
    workStress: z.number().int().min(1).max(5).optional(),
    socialQuality: z.number().int().min(1).max(5).optional(),
    notes: z.string().max(600).optional(),
    tags: z.array(z.string().trim().min(1).max(32)).max(8).default([]),
    periods: z.array(moodPeriodSchema).min(1).max(8),
  })
  .superRefine((value, context) => {
    const overlappingPeriodIndex = findOverlappingMoodPeriodIndex(value.periods);

    if (overlappingPeriodIndex >= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Mood blocks cannot overlap.",
        path: ["periods", overlappingPeriodIndex, "startMinute"],
      });
    }
  });

export const quickMoodCaptureMutationSchema = z.object({
  day: z.string().min(1),
  score: z.number().int().min(1).max(100),
  notes: z.string().max(240).optional(),
});

export { moodPeriodSchema };