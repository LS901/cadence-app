import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const dbModulePath = require.resolve("./db.ts");

declare global {
  var __cadencePrisma__: { $disconnect?: () => Promise<void> } | null | undefined;
  var __cadencePool__: { end?: () => Promise<void> } | undefined;
}

function requireFreshDbModule() {
  delete require.cache[dbModulePath];
  return require(dbModulePath) as typeof import("./db");
}

async function cleanupDbGlobals() {
  await global.__cadencePrisma__?.$disconnect?.();
  await global.__cadencePool__?.end?.();
  global.__cadencePrisma__ = undefined;
  global.__cadencePool__ = undefined;
}

test("db module disables the client when DATABASE_URL is absent", async () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  delete process.env.DATABASE_URL;
  process.env.NODE_ENV = "development";
  await cleanupDbGlobals();

  try {
    const dbModule = requireFreshDbModule();

    assert.equal(dbModule.hasDatabaseUrl, false);
    assert.equal(dbModule.db, null);
    assert.equal(global.__cadencePrisma__, null);
    assert.equal(global.__cadencePool__, undefined);
  } finally {
    await cleanupDbGlobals();
    process.env.DATABASE_URL = originalDatabaseUrl;
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test("db module reuses the same prisma client in development", async () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  process.env.DATABASE_URL = "postgresql://cadence:cadence@localhost:5432/cadence_test";
  process.env.NODE_ENV = "development";
  await cleanupDbGlobals();

  try {
    const firstImport = requireFreshDbModule();

    assert.equal(firstImport.hasDatabaseUrl, true);
    assert.ok(firstImport.db);
    assert.equal(global.__cadencePrisma__, firstImport.db);

    const secondImport = requireFreshDbModule();

    assert.equal(secondImport.db, firstImport.db);
    assert.equal(global.__cadencePrisma__, firstImport.db);
  } finally {
    await cleanupDbGlobals();
    process.env.DATABASE_URL = originalDatabaseUrl;
    process.env.NODE_ENV = originalNodeEnv;
  }
});