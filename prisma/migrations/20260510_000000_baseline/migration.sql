-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."ActivityCategory" AS ENUM ('EXERCISE', 'SLEEP', 'SOCIAL', 'FOCUS', 'MINDFULNESS', 'CREATIVE', 'ERRANDS', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."ActivityStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "public"."CorrelationDirection" AS ENUM ('POSITIVE', 'NEGATIVE', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "public"."HabitCategory" AS ENUM ('MOVEMENT', 'SLEEP', 'NOURISHMENT', 'MINDFULNESS', 'SOCIAL', 'DIGITAL', 'WORK', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."HabitLogStatus" AS ENUM ('COMPLETED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "public"."HabitType" AS ENUM ('POSITIVE', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "public"."InsightMetric" AS ENUM ('ACTIVITY_TO_MOOD', 'HABIT_TO_MOOD', 'SLEEP_TO_MOOD', 'SOCIAL_TO_MOOD', 'MOOD_STABILITY', 'PREVIOUS_DAY_TO_MOOD', 'JOURNAL_TO_MOOD', 'LIFE_EVENT_TO_MOOD');

-- CreateEnum
CREATE TYPE "public"."LifeEventCategory" AS ENUM ('ILLNESS', 'GRIEF_LOSS', 'FAMILY_STRESS', 'RELATIONSHIP_STRESS', 'FINANCIAL_STRESS', 'BURNOUT', 'TRAVEL', 'HORMONAL_HEALTH', 'MAJOR_POSITIVE', 'TRANSITION', 'CUSTOM', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."LifeEventRecurrencePattern" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."LifeEventSentiment" AS ENUM ('POSITIVE', 'NEGATIVE', 'NEUTRAL', 'MIXED');

-- CreateEnum
CREATE TYPE "public"."LifeEventSource" AS ENUM ('MANUAL', 'RECURRING_GENERATED', 'IMPORTED');

-- CreateEnum
CREATE TYPE "public"."RecurrencePattern" AS ENUM ('DAILY', 'WEEKLY', 'CUSTOM');

-- CreateTable
CREATE TABLE "public"."Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "public"."Activity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "public"."ActivityCategory" NOT NULL,
    "notes" TEXT,
    "recurring" BOOLEAN NOT NULL DEFAULT false,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "public"."ActivityStatus" NOT NULL DEFAULT 'SCHEDULED',
    "durationMinutes" INTEGER,
    "completionMoodScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "skippedAt" TIMESTAMP(3),
    "recurrenceCustom" TEXT,
    "recurrencePattern" "public"."RecurrencePattern",
    "isRecurringGenerated" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceGroupId" TEXT,
    "templateId" TEXT,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ActivityTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "normalizedTitle" TEXT NOT NULL,
    "category" "public"."ActivityCategory" NOT NULL,
    "notes" TEXT,
    "defaultDurationMinutes" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Habit" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "public"."HabitCategory" NOT NULL,
    "type" "public"."HabitType" NOT NULL,
    "notes" TEXT,
    "targetPerWeek" INTEGER NOT NULL DEFAULT 5,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."HabitLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "habitId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "status" "public"."HabitLogStatus" NOT NULL DEFAULT 'COMPLETED',
    "value" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HabitLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Insight" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "metric" "public"."InsightMetric" NOT NULL,
    "direction" "public"."CorrelationDirection" NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "windowStart" DATE NOT NULL,
    "windowEnd" DATE NOT NULL,
    "payload" JSONB NOT NULL,
    "surfacedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."JournalEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "moodScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LifeEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recurrenceSeriesId" TEXT,
    "title" TEXT NOT NULL,
    "category" "public"."LifeEventCategory" NOT NULL,
    "customCategoryLabel" TEXT,
    "description" TEXT,
    "severityScore" INTEGER NOT NULL DEFAULT 3,
    "sentiment" "public"."LifeEventSentiment",
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "isOngoing" BOOLEAN NOT NULL DEFAULT false,
    "tags" TEXT[],
    "source" "public"."LifeEventSource" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LifeEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LifeEventDayExposure" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lifeEventId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "overlapMinutes" INTEGER NOT NULL,
    "overlapRatio" DOUBLE PRECISION NOT NULL,
    "severityScore" INTEGER NOT NULL,
    "sentiment" "public"."LifeEventSentiment",
    "weightedImpact" DOUBLE PRECISION NOT NULL,
    "category" "public"."LifeEventCategory" NOT NULL,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LifeEventDayExposure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LifeEventSeries" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "public"."LifeEventCategory" NOT NULL,
    "customCategoryLabel" TEXT,
    "defaultSeverityScore" INTEGER NOT NULL DEFAULT 3,
    "defaultSentiment" "public"."LifeEventSentiment",
    "recurrencePattern" "public"."LifeEventRecurrencePattern" NOT NULL DEFAULT 'CUSTOM',
    "recurrenceInterval" INTEGER,
    "recurrenceRule" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LifeEventSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MoodEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "score" INTEGER NOT NULL,
    "energy" INTEGER,
    "stress" INTEGER,
    "sleepHours" DECIMAL(4,1),
    "notes" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "moodStability" INTEGER,
    "reflectionCompletedAt" TIMESTAMP(3),

    CONSTRAINT "MoodEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MoodPeriod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moodEntryId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "startMinute" INTEGER NOT NULL,
    "endMinute" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "notes" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MoodPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("sessionToken")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "passwordHash" TEXT,
    "image" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationToken_pkey" PRIMARY KEY ("identifier","token")
);

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "public"."Account"("userId" ASC);

-- CreateIndex
CREATE INDEX "Activity_category_idx" ON "public"."Activity"("category" ASC);

-- CreateIndex
CREATE INDEX "Activity_templateId_idx" ON "public"."Activity"("templateId" ASC);

-- CreateIndex
CREATE INDEX "Activity_userId_recurrenceGroupId_idx" ON "public"."Activity"("userId" ASC, "recurrenceGroupId" ASC);

-- CreateIndex
CREATE INDEX "Activity_userId_scheduledAt_idx" ON "public"."Activity"("userId" ASC, "scheduledAt" ASC);

-- CreateIndex
CREATE INDEX "Activity_userId_status_idx" ON "public"."Activity"("userId" ASC, "status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ActivityTemplate_userId_normalizedTitle_category_key" ON "public"."ActivityTemplate"("userId" ASC, "normalizedTitle" ASC, "category" ASC);

-- CreateIndex
CREATE INDEX "ActivityTemplate_userId_updatedAt_idx" ON "public"."ActivityTemplate"("userId" ASC, "updatedAt" ASC);

-- CreateIndex
CREATE INDEX "Habit_type_idx" ON "public"."Habit"("type" ASC);

-- CreateIndex
CREATE INDEX "Habit_userId_idx" ON "public"."Habit"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "HabitLog_habitId_day_key" ON "public"."HabitLog"("habitId" ASC, "day" ASC);

-- CreateIndex
CREATE INDEX "HabitLog_userId_day_idx" ON "public"."HabitLog"("userId" ASC, "day" ASC);

-- CreateIndex
CREATE INDEX "Insight_metric_idx" ON "public"."Insight"("metric" ASC);

-- CreateIndex
CREATE INDEX "Insight_userId_surfacedAt_idx" ON "public"."Insight"("userId" ASC, "surfacedAt" ASC);

-- CreateIndex
CREATE INDEX "JournalEntry_userId_day_idx" ON "public"."JournalEntry"("userId" ASC, "day" ASC);

-- CreateIndex
CREATE INDEX "LifeEvent_recurrenceSeriesId_idx" ON "public"."LifeEvent"("recurrenceSeriesId" ASC);

-- CreateIndex
CREATE INDEX "LifeEvent_userId_category_idx" ON "public"."LifeEvent"("userId" ASC, "category" ASC);

-- CreateIndex
CREATE INDEX "LifeEvent_userId_isOngoing_idx" ON "public"."LifeEvent"("userId" ASC, "isOngoing" ASC);

-- CreateIndex
CREATE INDEX "LifeEvent_userId_startAt_idx" ON "public"."LifeEvent"("userId" ASC, "startAt" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "LifeEventDayExposure_lifeEventId_day_key" ON "public"."LifeEventDayExposure"("lifeEventId" ASC, "day" ASC);

-- CreateIndex
CREATE INDEX "LifeEventDayExposure_userId_category_day_idx" ON "public"."LifeEventDayExposure"("userId" ASC, "category" ASC, "day" ASC);

-- CreateIndex
CREATE INDEX "LifeEventDayExposure_userId_day_idx" ON "public"."LifeEventDayExposure"("userId" ASC, "day" ASC);

-- CreateIndex
CREATE INDEX "LifeEventSeries_userId_isActive_idx" ON "public"."LifeEventSeries"("userId" ASC, "isActive" ASC);

-- CreateIndex
CREATE INDEX "LifeEventSeries_userId_updatedAt_idx" ON "public"."LifeEventSeries"("userId" ASC, "updatedAt" ASC);

-- CreateIndex
CREATE INDEX "MoodEntry_userId_day_idx" ON "public"."MoodEntry"("userId" ASC, "day" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MoodEntry_userId_day_key" ON "public"."MoodEntry"("userId" ASC, "day" ASC);

-- CreateIndex
CREATE INDEX "MoodPeriod_moodEntryId_startMinute_idx" ON "public"."MoodPeriod"("moodEntryId" ASC, "startMinute" ASC);

-- CreateIndex
CREATE INDEX "MoodPeriod_userId_day_idx" ON "public"."MoodPeriod"("userId" ASC, "day" ASC);

-- CreateIndex
CREATE INDEX "MoodPeriod_userId_day_startMinute_endMinute_idx" ON "public"."MoodPeriod"("userId" ASC, "day" ASC, "startMinute" ASC, "endMinute" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken" ASC);

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "public"."Session"("userId" ASC);

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token" ASC);

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "public"."ActivityTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ActivityTemplate" ADD CONSTRAINT "ActivityTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Habit" ADD CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HabitLog" ADD CONSTRAINT "HabitLog_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "public"."Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."HabitLog" ADD CONSTRAINT "HabitLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Insight" ADD CONSTRAINT "Insight_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JournalEntry" ADD CONSTRAINT "JournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LifeEvent" ADD CONSTRAINT "LifeEvent_recurrenceSeriesId_fkey" FOREIGN KEY ("recurrenceSeriesId") REFERENCES "public"."LifeEventSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LifeEvent" ADD CONSTRAINT "LifeEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LifeEventDayExposure" ADD CONSTRAINT "LifeEventDayExposure_lifeEventId_fkey" FOREIGN KEY ("lifeEventId") REFERENCES "public"."LifeEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LifeEventDayExposure" ADD CONSTRAINT "LifeEventDayExposure_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LifeEventSeries" ADD CONSTRAINT "LifeEventSeries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MoodEntry" ADD CONSTRAINT "MoodEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MoodPeriod" ADD CONSTRAINT "MoodPeriod_moodEntryId_fkey" FOREIGN KEY ("moodEntryId") REFERENCES "public"."MoodEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MoodPeriod" ADD CONSTRAINT "MoodPeriod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

