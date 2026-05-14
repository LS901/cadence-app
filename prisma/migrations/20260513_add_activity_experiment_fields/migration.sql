CREATE TYPE "ActivityExperimentOutcome" AS ENUM ('SUPPORTED', 'MIXED', 'NOT_SUPPORTED');

ALTER TABLE "Activity"
ADD COLUMN "experimentHypothesis" TEXT,
ADD COLUMN "experimentObservationPrompt" TEXT,
ADD COLUMN "experimentReviewWindowDays" INTEGER,
ADD COLUMN "experimentUncertaintyNote" TEXT,
ADD COLUMN "experimentOutcome" "ActivityExperimentOutcome",
ADD COLUMN "experimentOutcomeNote" TEXT,
ADD COLUMN "experimentReviewedAt" TIMESTAMP(3);