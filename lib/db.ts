import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  var __cadencePrisma__: PrismaClient | null | undefined;
  var __cadencePool__: Pool | undefined;
}

export const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);

const pool =
  hasDatabaseUrl && process.env.DATABASE_URL
    ? global.__cadencePool__ ?? new Pool({ connectionString: process.env.DATABASE_URL })
    : undefined;

if (pool && process.env.NODE_ENV !== "production") {
  global.__cadencePool__ = pool;
}

export const db = hasDatabaseUrl
  ? global.__cadencePrisma__ ??
    new PrismaClient({
      adapter: new PrismaPg(pool!),
      log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    })
  : null;

if (process.env.NODE_ENV !== "production") {
  global.__cadencePrisma__ = db;
}