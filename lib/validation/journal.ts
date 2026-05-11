import { z } from "zod";

export const journalEntrySchema = z.object({
  day: z.date(),
  title: z.string().max(80).optional(),
  content: z.string().min(8).max(4000),
  moodScore: z.number().int().min(1).max(100).optional(),
});