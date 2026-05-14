import { NextResponse } from "next/server";
import { getAuthEmailConfigStatus, type AuthEmailConfigStatus } from "@/lib/auth/auth-env";
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
    authEmail: {
      status: "ok" | "degraded";
      appBaseUrlConfigured: boolean;
      smtpConfigured: boolean;
      smtpFieldsMissing: string[];
    };
  };
};

export async function getHealthCheckResult(options?: {
  hasDatabase?: boolean;
  queryDatabase?: () => Promise<unknown>;
  authEmailConfig?: AuthEmailConfigStatus;
  now?: () => Date;
  runtimeEnv?: string | undefined;
  logError?: (message: string, error: unknown) => void;
}) {
  const hasDatabase = options?.hasDatabase ?? hasDatabaseUrl;
  const authEmailConfig = options?.authEmailConfig ?? getAuthEmailConfigStatus();
  const authEmailStatus =
    (options?.runtimeEnv ?? process.env.NODE_ENV) === "production" && !authEmailConfig.smtpConfigured
      ? "degraded"
      : "ok";
  const response: HealthResponse = {
    status: authEmailStatus === "degraded" ? "degraded" : "ok",
    timestamp: (options?.now ?? (() => new Date()))().toISOString(),
    mode: hasDatabase ? "database" : "mock",
    checks: {
      database: {
        status: hasDatabase ? "ok" : "skipped",
      },
      authEmail: {
        status: authEmailStatus,
        appBaseUrlConfigured: authEmailConfig.appBaseUrlConfigured,
        smtpConfigured: authEmailConfig.smtpConfigured,
        smtpFieldsMissing: authEmailConfig.smtpFieldsMissing,
      },
    },
  };

  if (!hasDatabase) {
    return {
      body: response,
      status: response.status === "ok" ? 200 : 503,
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
              authEmail: response.checks.authEmail,
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