import { db, hasDatabaseUrl } from "@/lib/db";

export type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type PersistentRateLimitRecord = {
  key: string;
  scope: string;
  count: number;
  resetAt: Date;
};

type PersistentRateLimitDelegate = {
  findUnique: (args: { where: { key: string } }) => Promise<PersistentRateLimitRecord | null>;
  create: (args: {
    data: {
      key: string;
      scope: string;
      count: number;
      resetAt: Date;
    };
  }) => Promise<unknown>;
  update: (args: {
    where: { key: string };
    data: {
      count?: number;
      resetAt?: Date;
      scope?: string;
    };
  }) => Promise<unknown>;
  delete: (args: { where: { key: string } }) => Promise<unknown>;
  deleteMany: (args: {
    where: {
      scope?: string;
      resetAt?: { lte: Date };
      key?: { in: string[] };
    };
  }) => Promise<unknown>;
  count: (args: { where: { scope: string } }) => Promise<number>;
  findMany: (args: {
    where: { scope: string };
    orderBy: { resetAt: "asc" };
    select: { key: true };
    take: number;
  }) => Promise<Array<{ key: string }>>;
};

export type RateLimitDependencies = {
  hasDatabase?: boolean;
  rateLimitBucket?: PersistentRateLimitDelegate;
  now?: () => Date;
};

type RateLimitOperationOptions = {
  key: string;
  scope: string;
  inMemoryStore: Map<string, RateLimitEntry>;
  maxAttempts: number;
  maxKeys: number;
  windowMs: number;
  dependencies?: RateLimitDependencies;
};

function pruneInMemoryEntries(
  inMemoryStore: Map<string, RateLimitEntry>,
  now: number,
  maxKeys: number
) {
  for (const [key, entry] of inMemoryStore.entries()) {
    if (entry.resetAt <= now) {
      inMemoryStore.delete(key);
    }
  }

  if (inMemoryStore.size <= maxKeys) {
    return;
  }

  const sortedEntries = [...inMemoryStore.entries()].sort(
    (left, right) => left[1].resetAt - right[1].resetAt
  );

  while (inMemoryStore.size > maxKeys && sortedEntries.length) {
    const oldestEntry = sortedEntries.shift();

    if (!oldestEntry) {
      break;
    }

    inMemoryStore.delete(oldestEntry[0]);
  }
}

async function getPersistentDelegate(dependencies?: RateLimitDependencies) {
  const shouldUseDatabase = dependencies?.hasDatabase ?? hasDatabaseUrl;

  if (!shouldUseDatabase) {
    return null;
  }

  return dependencies?.rateLimitBucket ?? db?.authRateLimitBucket ?? null;
}

async function prunePersistentEntries(
  delegate: PersistentRateLimitDelegate,
  scope: string,
  now: Date,
  maxKeys: number
) {
  await delegate.deleteMany({
    where: {
      scope,
      resetAt: {
        lte: now,
      },
    },
  });

  const entryCount = await delegate.count({
    where: { scope },
  });

  if (entryCount <= maxKeys) {
    return;
  }

  const overflowEntries = await delegate.findMany({
    where: { scope },
    orderBy: { resetAt: "asc" },
    select: { key: true },
    take: entryCount - maxKeys,
  });

  if (!overflowEntries.length) {
    return;
  }

  await delegate.deleteMany({
    where: {
      key: {
        in: overflowEntries.map((entry) => entry.key),
      },
    },
  });
}

export async function isRateLimitKeyBlocked({
  key,
  scope,
  inMemoryStore,
  maxAttempts,
  maxKeys,
  dependencies,
}: Omit<RateLimitOperationOptions, "windowMs">) {
  const now = (dependencies?.now ?? (() => new Date(Date.now())))();
  const nowMs = now.getTime();

  pruneInMemoryEntries(inMemoryStore, nowMs, maxKeys);
  const inMemoryEntry = inMemoryStore.get(key);

  const delegate = await getPersistentDelegate(dependencies);

  if (delegate) {
    try {
      await prunePersistentEntries(delegate, scope, now, maxKeys);
      const persistedEntry = await delegate.findUnique({ where: { key } });

      return Boolean(
        persistedEntry &&
          persistedEntry.count >= maxAttempts &&
          persistedEntry.resetAt.getTime() > nowMs
      );
    } catch {
      return Boolean(
        inMemoryEntry &&
          inMemoryEntry.count >= maxAttempts &&
          inMemoryEntry.resetAt > nowMs
      );
    }
  }

  return Boolean(
    inMemoryEntry && inMemoryEntry.count >= maxAttempts && inMemoryEntry.resetAt > nowMs
  );
}

export async function recordRateLimitKeyAttempt({
  key,
  scope,
  inMemoryStore,
  maxKeys,
  windowMs,
  dependencies,
}: Omit<RateLimitOperationOptions, "maxAttempts">) {
  const now = (dependencies?.now ?? (() => new Date(Date.now())))();
  const nowMs = now.getTime();
  const resetAt = new Date(nowMs + windowMs);

  pruneInMemoryEntries(inMemoryStore, nowMs, maxKeys);

  const existingInMemoryEntry = inMemoryStore.get(key);

  if (!existingInMemoryEntry || existingInMemoryEntry.resetAt <= nowMs) {
    inMemoryStore.set(key, {
      count: 1,
      resetAt: nowMs + windowMs,
    });
  } else {
    inMemoryStore.set(key, {
      count: existingInMemoryEntry.count + 1,
      resetAt: existingInMemoryEntry.resetAt,
    });
  }

  const delegate = await getPersistentDelegate(dependencies);

  if (!delegate) {
    return;
  }

  try {
    await prunePersistentEntries(delegate, scope, now, maxKeys);

    const existingPersistedEntry = await delegate.findUnique({ where: { key } });

    if (!existingPersistedEntry) {
      await delegate.create({
        data: {
          key,
          scope,
          count: 1,
          resetAt,
        },
      });
      return;
    }

    if (existingPersistedEntry.resetAt <= now) {
      await delegate.update({
        where: { key },
        data: {
          count: 1,
          resetAt,
          scope,
        },
      });
      return;
    }

    await delegate.update({
      where: { key },
      data: {
        count: existingPersistedEntry.count + 1,
      },
    });
  } catch {
    return;
  }
}

export async function clearRateLimitKey({
  key,
  inMemoryStore,
  dependencies,
}: Pick<RateLimitOperationOptions, "key" | "inMemoryStore" | "dependencies">) {
  inMemoryStore.delete(key);

  const delegate = await getPersistentDelegate(dependencies);

  if (!delegate) {
    return;
  }

  try {
    await delegate.delete({
      where: { key },
    });
  } catch {
    return;
  }
}