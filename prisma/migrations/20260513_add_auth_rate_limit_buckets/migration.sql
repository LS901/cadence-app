CREATE TABLE "AuthRateLimitBucket" (
  "key" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "count" INTEGER NOT NULL,
  "resetAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AuthRateLimitBucket_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "AuthRateLimitBucket_scope_resetAt_idx" ON "AuthRateLimitBucket"("scope", "resetAt");