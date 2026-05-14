import { PrismaClient } from "@prisma/client";

// Mock database layer
// We removed the live database integration for the conceptual portfolio piece.
// This mock PrismaClient stub ensures that any lingering `db.user.findUnique` 
// queries fail fast or return null safely before we switch those to explicit mock data.

export const hasDatabaseUrl = false;

export const db = null as unknown as PrismaClient;
