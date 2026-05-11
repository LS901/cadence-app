import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { startOfDay } from "date-fns";
import { journalEntrySchema } from "@/lib/validation/journal";

const journalMutationSchema = journalEntrySchema.extend({
  id: z.string().min(1).optional(),
});

const deleteJournalEntrySchema = z.object({
  id: z.string().min(1),
});

type SessionResult =
  | {
      user?: {
        id?: string | null;
      } | null;
    }
  | null
  | undefined;

type JournalEntryPayload = {
  day: Date;
  title: string | null;
  content: string;
  moodScore: number | null;
};

type JournalEntryDelegate = PrismaClient["journalEntry"];

type JournalMutationDependencies = {
  getSession: () => Promise<SessionResult>;
  hasDatabase: boolean;
  journalEntry: JournalEntryDelegate | null | undefined;
  revalidateSurfaces: () => void;
};

async function requireJournalAccess(dependencies: JournalMutationDependencies) {
  const session = await dependencies.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  if (!dependencies.hasDatabase || !dependencies.journalEntry) {
    throw new Error("Journal entries require a configured database connection.");
  }

  return {
    userId,
    journalEntry: dependencies.journalEntry,
  };
}

function buildJournalEntryPayload(values: z.infer<typeof journalMutationSchema>): JournalEntryPayload {
  return {
    day: startOfDay(values.day),
    title: values.title?.trim() || null,
    content: values.content.trim(),
    moodScore: values.moodScore ?? null,
  };
}

export async function upsertJournalEntry(
  values: unknown,
  dependencies: JournalMutationDependencies
) {
  const { userId, journalEntry } = await requireJournalAccess(dependencies);
  const parsedValues = journalMutationSchema.parse(values);
  const payload = buildJournalEntryPayload(parsedValues);

  if (parsedValues.id) {
    const existingEntry = await journalEntry.findFirst({
      where: {
        id: parsedValues.id,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!existingEntry) {
      throw new Error("Journal entry not found.");
    }

    await journalEntry.update({
      where: { id: existingEntry.id },
      data: payload,
    });

    dependencies.revalidateSurfaces();

    return {
      ok: true,
      mode: "updated" as const,
      id: existingEntry.id,
    };
  }

  const entry = await journalEntry.create({
    data: {
      userId,
      ...payload,
    },
  });

  dependencies.revalidateSurfaces();

  return {
    ok: true,
    mode: "created" as const,
    id: entry.id,
  };
}

export async function deleteJournalEntry(
  values: unknown,
  dependencies: JournalMutationDependencies
) {
  const { userId, journalEntry } = await requireJournalAccess(dependencies);
  const parsedValues = deleteJournalEntrySchema.parse(values);
  const existingEntry = await journalEntry.findFirst({
    where: {
      id: parsedValues.id,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!existingEntry) {
    throw new Error("Journal entry not found.");
  }

  await journalEntry.delete({
    where: { id: existingEntry.id },
  });

  dependencies.revalidateSurfaces();

  return {
    ok: true,
  };
}