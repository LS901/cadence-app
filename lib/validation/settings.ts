import { z } from "zod";
import { TIMEZONE_OPTIONS } from "@/lib/settings";

export const settingsProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  timezone: z.enum(TIMEZONE_OPTIONS),
});