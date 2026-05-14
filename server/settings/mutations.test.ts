import assert from "node:assert/strict";
import test from "node:test";
import { ZodError } from "zod";
import { updateSettingsProfile } from "./mutations";

type SettingsDependencies = Parameters<typeof updateSettingsProfile>[1];

type Operation = {
  type: string;
  payload?: unknown;
};

function createDependencies(options?: {
  userId?: string | null;
  hasDatabase?: boolean;
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
      dbClient: hasDatabase
        ? {
            user: {
              update: async (payload: unknown) => {
                operations.push({ type: "user.update", payload });
              },
            },
          } as unknown as SettingsDependencies["dbClient"]
        : null,
      revalidateSurfaces: () => {
        operations.push({ type: "revalidate" });
      },
    } satisfies SettingsDependencies,
  };
}

test("updateSettingsProfile trims the name, updates the user, and revalidates", async () => {
  const { dependencies, operations } = createDependencies();

  const result = await updateSettingsProfile(
    {
      name: "  Demo Carter  ",
      timezone: "Europe/London",
    },
    dependencies
  );

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(operations.map((operation) => operation.type), ["user.update", "revalidate"]);

  const updatePayload = operations[0]?.payload as {
    where: { id: string };
    data: { name: string; timezone: string };
  };

  assert.deepEqual(updatePayload, {
    where: { id: "user-1" },
    data: {
      name: "Demo Carter",
      timezone: "Europe/London",
    },
  });
});

test("updateSettingsProfile rejects invalid payloads before touching persistence", async () => {
  const { dependencies, operations } = createDependencies();

  await assert.rejects(
    () =>
      updateSettingsProfile(
        {
          name: "A",
          timezone: "Europe/London",
        },
        dependencies
      ),
    ZodError
  );

  assert.deepEqual(operations, []);
});

test("updateSettingsProfile rejects unauthorized access before touching persistence", async () => {
  const { dependencies, operations } = createDependencies({ userId: null });

  await assert.rejects(
    () =>
      updateSettingsProfile(
        {
          name: "Demo Carter",
          timezone: "Europe/London",
        },
        dependencies
      ),
    /Unauthorized/
  );

  assert.deepEqual(operations, []);
});