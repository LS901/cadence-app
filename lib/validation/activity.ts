import { z } from "zod";

export const activityCategoryValues = [
  "EXERCISE",
  "SLEEP",
  "SOCIAL",
  "FOCUS",
  "MINDFULNESS",
  "CREATIVE",
  "ERRANDS",
  "OTHER",
] as const;

export const activityStatusValues = ["SCHEDULED", "COMPLETED", "SKIPPED"] as const;
export const activityExperimentOutcomeValues = ["SUPPORTED", "MIXED", "NOT_SUPPORTED"] as const;
export const recurrencePatternValues = ["DAILY", "WEEKLY", "CUSTOM"] as const;
export const activityEntryModeValues = ["PLANNED", "RETROSPECTIVE"] as const;

export const activityCategorySchema = z.enum(activityCategoryValues);
export const activityStatusSchema = z.enum(activityStatusValues);
export const activityExperimentOutcomeSchema = z.enum(activityExperimentOutcomeValues);
export const recurrencePatternSchema = z.enum(recurrencePatternValues);
export const activityEntryModeSchema = z.enum(activityEntryModeValues);

export const activityFormSchema = z.object({
  templateId: z.string().optional().default(""),
  title: z.string().trim().min(2, "Title must be at least 2 characters.").max(80),
  category: activityCategorySchema,
  notes: z.string().trim().max(400).optional().or(z.literal("")),
  recurring: z.boolean().default(false),
  recurrencePattern: recurrencePatternSchema.optional().or(z.literal("")).default(""),
  recurrenceCustom: z.string().trim().max(120).optional().default(""),
  scheduledAt: z
    .string()
    .min(1, "Choose a date and time.")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), "Choose a valid date and time."),
  durationMinutes: z.string().optional().default(""),
  experimentHypothesis: z.string().trim().max(200).optional().or(z.literal("")).default(""),
  experimentObservationPrompt: z.string().trim().max(200).optional().or(z.literal("")).default(""),
  experimentReviewWindowDays: z.string().optional().default(""),
  experimentUncertaintyNote: z.string().trim().max(200).optional().or(z.literal("")).default(""),
  entryMode: activityEntryModeSchema.default("PLANNED"),
  completionMoodScore: z.string().optional().default(""),
}).superRefine((values, context) => {
  if (values.recurring && !values.recurrencePattern) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["recurrencePattern"],
      message: "Choose how this activity repeats.",
    });
  }

  if (
    values.recurring &&
    values.recurrencePattern === "CUSTOM" &&
    !values.recurrenceCustom.trim()
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["recurrenceCustom"],
      message: "Describe the custom recurrence rule.",
    });
  }

  const hasExperimentFields = Boolean(
    values.experimentHypothesis.trim() ||
    values.experimentObservationPrompt.trim() ||
    values.experimentReviewWindowDays.trim() ||
    values.experimentUncertaintyNote.trim()
  );

  if (hasExperimentFields && !values.experimentHypothesis.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["experimentHypothesis"],
      message: "Add the experiment hypothesis.",
    });
  }

  if (hasExperimentFields && !values.experimentObservationPrompt.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["experimentObservationPrompt"],
      message: "Add what to notice during the experiment.",
    });
  }
});

export const activitySchema = z.object({
  title: z.string().trim().min(2).max(80),
  category: activityCategorySchema,
  notes: z.string().max(400).optional(),
  recurring: z.boolean().default(false),
  recurrencePattern: recurrencePatternSchema.optional(),
  recurrenceCustom: z.string().max(120).optional(),
  scheduledAt: z.date(),
  durationMinutes: z.number().int().positive().max(600).optional(),
  experimentHypothesis: z.string().max(200).optional(),
  experimentObservationPrompt: z.string().max(200).optional(),
  experimentReviewWindowDays: z.number().int().min(1).max(30).optional(),
  experimentUncertaintyNote: z.string().max(200).optional(),
  completionMoodScore: z.number().int().min(1).max(100).optional(),
});

export const activityMutationSchema = activityFormSchema.extend({
  id: z.string().min(1).optional(),
});

function parseOptionalInteger(
  value: string | undefined,
  fieldName: string,
  min: number,
  max: number
) {
  if (!value?.trim()) {
    return undefined;
  }

  if (!/^\d+$/.test(value.trim())) {
    throw new Error(`${fieldName} must be a whole number.`);
  }

  const parsedValue = Number(value);

  if (parsedValue < min || parsedValue > max) {
    throw new Error(`${fieldName} must be between ${min} and ${max}.`);
  }

  return parsedValue;
}

export function normalizeActivityFormValues(values: unknown) {
  const parsedValues = activityFormSchema.parse(values);

  return activitySchema.parse({
    title: parsedValues.title,
    category: parsedValues.category,
    notes: parsedValues.notes?.trim() ? parsedValues.notes.trim() : undefined,
    recurring: parsedValues.recurring,
    recurrencePattern:
      parsedValues.recurring && parsedValues.recurrencePattern
        ? parsedValues.recurrencePattern
        : undefined,
    recurrenceCustom:
      parsedValues.recurring && parsedValues.recurrencePattern === "CUSTOM"
        ? parsedValues.recurrenceCustom.trim() || undefined
        : undefined,
    scheduledAt: new Date(parsedValues.scheduledAt),
    durationMinutes: parseOptionalInteger(
      parsedValues.durationMinutes,
      "Duration",
      1,
      600
    ),
    experimentHypothesis: parsedValues.experimentHypothesis.trim() || undefined,
    experimentObservationPrompt:
      parsedValues.experimentObservationPrompt.trim() || undefined,
    experimentReviewWindowDays: parseOptionalInteger(
      parsedValues.experimentReviewWindowDays,
      "Review window",
      1,
      30
    ),
    experimentUncertaintyNote:
      parsedValues.experimentUncertaintyNote.trim() || undefined,
    completionMoodScore: parseOptionalInteger(
      parsedValues.completionMoodScore,
      "Mood score",
      1,
      100
    ),
  });
}

export type ActivityFormValues = z.input<typeof activityFormSchema>;

export type ActivityEntryMode = z.infer<typeof activityEntryModeSchema>;

export const activityStatusMutationSchema = z.object({
  id: z.string().min(1),
  status: activityStatusSchema,
  completionMoodScore: z.string().optional().default(""),
  experimentOutcome: activityExperimentOutcomeSchema.optional().or(z.literal("")).default(""),
  experimentOutcomeNote: z.string().trim().max(300).optional().or(z.literal("")).default(""),
});

export function normalizeActivityStatusMutation(values: unknown) {
  const parsedValues = activityStatusMutationSchema.parse(values);

  return {
    id: parsedValues.id,
    status: parsedValues.status,
    completionMoodScore: parseOptionalInteger(
      parsedValues.completionMoodScore,
      "Mood score",
      1,
      100
    ),
    experimentOutcome: parsedValues.experimentOutcome || undefined,
    experimentOutcomeNote: parsedValues.experimentOutcomeNote.trim() || undefined,
  };
}