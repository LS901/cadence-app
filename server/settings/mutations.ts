import type { PrismaClient } from "@prisma/client";
import { settingsProfileSchema } from "@/lib/validation/settings";

type SessionResult =
  | {
      user?: {
        id?: string | null;
      } | null;
    }
  | null
  | undefined;

type SettingsDbClient = Pick<PrismaClient, "user">;

type SettingsMutationDependencies = {
  getSession: () => Promise<SessionResult>;
  hasDatabase: boolean;
  dbClient: SettingsDbClient | null | undefined;
  revalidateSurfaces: () => void;
};

async function requireSettingsAccess(dependencies: SettingsMutationDependencies) {
  const session = await dependencies.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  if (!dependencies.hasDatabase || !dependencies.dbClient) {
    throw new Error("Profile settings require a configured database connection.");
  }

  return {
    userId,
    dbClient: dependencies.dbClient,
  };
}

export async function updateSettingsProfile(
  values: unknown,
  dependencies: SettingsMutationDependencies
) {
  const { userId, dbClient } = await requireSettingsAccess(dependencies);
  const parsedValues = settingsProfileSchema.parse(values);

  await dbClient.user.update({
    where: { id: userId },
    data: {
      name: parsedValues.name.trim(),
      timezone: parsedValues.timezone,
    },
  });

  dependencies.revalidateSurfaces();

  return {
    ok: true,
  };
}