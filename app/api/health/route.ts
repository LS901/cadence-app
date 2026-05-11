import { NextResponse } from "next/server";
import { db, hasDatabaseUrl } from "@/lib/db";

export const dynamic = "force-dynamic";

export type HealthResponse = {
  status: "ok" | "degraded";
  timestamp: string;
  mode: "database" | "mock";
  checks: {
    database: {
      status: "ok" | "skipped" | "error";
    };
  };
};

export async function getHealthCheckResult(options?: {
  hasDatabase?: boolean;
  queryDatabase?: () => Promise<unknown>;
  now?: () => Date;
  logError?: (message: string, error: unknown) => void;
}) {
  const hasDatabase = options?.hasDatabase ?? hasDatabaseUrl;
  const response: HealthResponse = {
    status: "ok",
    timestamp: (options?.now ?? (() => new Date()))().toISOString(),
    mode: hasDatabase ? "database" : "mock",
    checks: {
      database: {
        status: hasDatabase ? "ok" : "skipped",
      },
    },
  };

  if (!hasDatabase) {
    return {
      body: response,
      status: 200,
    };
  }

  try {
    if (options?.queryDatabase) {
      await options.queryDatabase();
    } else {
      await db!.$queryRaw`SELECT 1`;
    }

    return {
      body: response,
      status: 200,
    };
  } catch (error) {
    (options?.logError ?? console.error)("Health check failed", error);

    return {
      body: {
        ...response,
        status: "degraded",
        checks: {
          database: {
            status: "error",
          },
        },
      },
      status: 503,
    };
  }
}

export async function GET() {
  const result = await getHealthCheckResult();

  return NextResponse.json(result.body, {
    status: result.status,
    headers: {
      "cache-control": "no-store",
    },
  });
}