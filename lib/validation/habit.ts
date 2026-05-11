import { z } from "zod";

export const habitSchema = z.object({
  name: z.string().min(2).max(60),
  category: z.enum(["MOVEMENT", "SLEEP", "NOURISHMENT", "MINDFULNESS", "SOCIAL", "DIGITAL", "WORK", "OTHER"]),
  type: z.enum(["POSITIVE", "NEGATIVE"]),
  notes: z.string().max(240).optional(),
  targetPerWeek: z.number().int().min(1).max(14),
});