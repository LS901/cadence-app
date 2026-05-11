import assert from "node:assert/strict";
import test from "node:test";
import { ZodError } from "zod";
import { deleteJournalEntry, upsertJournalEntry } from "./mutations";

type JournalDependencies = Parameters<typeof upsertJournalEntry>[1];

type Operation = {
  type: string;
  payload?: unknown;
};

function createDependencies(options?: {
  userId?: string | null;
  hasDatabase?: boolean;
  existingEntry?: { id: string } | null;
  createdId?: string;
}) {
  const operations: Operation[] = [];
  const hasDatabase = options?.hasDatabase ?? true;

  return {
    operations,
    dependencies: {
      getSession: async () =>
        options?.userId === null
          ? null
          : {
              user: {
                id: options?.userId ?? "user-1",
              },
            },
      hasDatabase,
      journalEntry: hasDatabase
        ? {
            findFirst: async (payload: unknown) => {
              operations.push({ type: "findFirst", payload });
              return options?.existingEntry ?? null;
            },
            create: async (payload: unknown) => {
              operations.push({ type: "create", payload });
              return { id: options?.createdId ?? "entry-1" };
            },
            update: async (payload: unknown) => {
              operations.push({ type: "update", payload });
            },
            delete: async (payload: unknown) => {
              operations.push({ type: "delete", payload });
            },
          } as unknown as JournalDependencies["journalEntry"]
        : null,
      revalidateSurfaces: () => {
        operations.push({ type: "revalidate" });
      },
    } satisfies JournalDependencies,
  };
}

test("upsertJournalEntry creates a trimmed journal entry and revalidates surfaces", async () => {
  const { dependencies, operations } = createDependencies({ createdId: "entry-created" });

  const result = await upsertJournalEntry(
    {
      day: new Date(2030, 4, 10, 15, 45, 0),
      title: "  A steadier day  ",
      content: "  I felt calmer across most of the afternoon.  ",
      moodScore: 68,
    },
    dependencies
  );

  assert.deepEqual(result, {
    ok: true,
    mode: "created",
    id: "entry-created",
  });
  assert.equal(operations.length, 2);
  assert.equal(operations[0]?.type, "create");
  assert.equal(operations[1]?.type, "revalidate");

  const createPayload = operations[0]?.payload as {
    data: {
      userId: string;
      day: Date;
      title: string | null;
      content: string;
      moodScore: number | null;
    };
  };

  assert.equal(createPayload.data.userId, "user-1");
  assert.equal(createPayload.data.title, "A steadier day");
  assert.equal(createPayload.data.content, "I felt calmer across most of the afternoon.");
  assert.equal(createPayload.data.moodScore, 68);
  assert.equal(createPayload.data.day.getFullYear(), 2030);
  assert.equal(createPayload.data.day.getMonth(), 4);
  assert.equal(createPayload.data.day.getDate(), 10);
  assert.equal(createPayload.data.day.getHours(), 0);
  assert.equal(createPayload.data.day.getMinutes(), 0);
});

test("upsertJournalEntry updates an owned entry and preserves the existing id", async () => {
  const { dependencies, operations } = createDependencies({
    existingEntry: { id: "entry-existing" },
  });

  const result = await upsertJournalEntry(
    {
      id: "entry-existing",
      day: new Date(2030, 4, 11, 19, 20, 0),
      title: "  Revised reflection  ",
      content: "  The evening was harder, but I recovered before bed.  ",
      moodScore: 55,
    },
    dependencies
  );

  assert.deepEqual(result, {
    ok: true,
    mode: "updated",
    id: "entry-existing",
  });
  assert.deepEqual(operations.map((operation) => operation.type), [
    "findFirst",
    "update",
    "revalidate",
  ]);

  const findPayload = operations[0]?.payload as {
    where: {
      id: string;
      userId: string;
    };
  };
  const updatePayload = operations[1]?.payload as {
    where: { id: string };
    data: {
      title: string | null;
      content: string;
      moodScore: number | null;
      day: Date;
    };
  };

  assert.deepEqual(findPayload.where, {
    id: "entry-existing",
    userId: "user-1",
  });
  assert.equal(updatePayload.where.id, "entry-existing");
  assert.equal(updatePayload.data.title, "Revised reflection");
  assert.equal(updatePayload.data.content, "The evening was harder, but I recovered before bed.");
  assert.equal(updatePayload.data.moodScore, 55);
  assert.equal(updatePayload.data.day.getHours(), 0);
  assert.equal(updatePayload.data.day.getMinutes(), 0);
});

test("deleteJournalEntry deletes an owned entry and revalidates surfaces", async () => {
  const { dependencies, operations } = createDependencies({
    existingEntry: { id: "entry-delete" },
  });

  const result = await deleteJournalEntry({ id: "entry-delete" }, dependencies);

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(operations.map((operation) => operation.type), [
    "findFirst",
    "delete",
    "revalidate",
  ]);

  const deletePayload = operations[1]?.payload as {
    where: {
      id: string;
    };
  };

  assert.deepEqual(deletePayload.where, { id: "entry-delete" });
});

test("upsertJournalEntry rejects invalid payloads before writing to the database", async () => {
  const { dependencies, operations } = createDependencies();

  await assert.rejects(
    () =>
      upsertJournalEntry(
        {
          day: new Date(2030, 4, 10, 15, 45, 0),
          content: "short",
        },
        dependencies
      ),
    ZodError
  );

  assert.deepEqual(operations, []);
});

test("upsertJournalEntry rejects unauthorized access before touching persistence", async () => {
  const { dependencies, operations } = createDependencies({ userId: null });

  await assert.rejects(
    () =>
      upsertJournalEntry(
        {
          day: new Date(2030, 4, 10, 15, 45, 0),
          content: "A valid entry that should never be written.",
        },
        dependencies
      ),
    /Unauthorized/
  );

  assert.deepEqual(operations, []);
});