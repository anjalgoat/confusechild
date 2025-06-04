// In convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Add this new table definition
  gks_knowledge: defineTable({
    chunk: v.string(), // This will store the text chunk from your document
    embedding: v.array(v.float64()), // This will store the vector embedding of the chunk
  }).vectorIndex("by_embedding", { // This creates the index for vector search
    vectorField: "embedding",
    dimensions: 1536, // This is for OpenAI's 'text-embedding-ada-002' model.
  }),

  // ... keep all your other existing tables (knowledge, users, sessions, etc.)
  knowledge: defineTable({
    description: v.string(),
    storageId: v.id("_storage"),
    type: v.union(v.literal("core_methodology"), v.literal("general")),
  }).index("by_type", ["type"]),

  users: defineTable({
    clerkUserId: v.string(),
    email: v.string(), 
    name: v.optional(v.string()), 
    onboardingResponses: v.optional(v.array(v.object({
      question: v.string(),
      answer: v.string(),
    }))),
    onboardingCompleted: v.boolean(), 
    longTermProfileSummary: v.optional(v.string()),
    keyInsights: v.optional(v.array(v.object({
        belief: v.string(),
        trigger: v.string(),
    }))),
    currentGoals: v.optional(v.array(v.string())),
    preferences: v.optional(v.object({
      ttsVoice: v.optional(v.string()),
    })),
  }).index("by_clerkUserId", ["clerkUserId"]),

  sessions: defineTable({
    userId: v.id("users"),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    status: v.string(),
    sessionSummary: v.optional(v.string()),
    insightNotes: v.optional(v.array(v.string())),
    generatedPlannerEntryIds: v.optional(v.array(v.id("plannerEntries"))),
  }).index("by_userId_startTime", ["userId", "startTime"]),

  transcriptChunks: defineTable({
    sessionId: v.id("sessions"),
    userId: v.id("users"),
    timestamp: v.number(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    vadEvents: v.optional(v.any()),
  }).index("by_sessionId_timestamp", ["sessionId", "timestamp"]),

  plannerEntries: defineTable({
    userId: v.id("users"),
    sessionId: v.optional(v.id("sessions")),
    createdAt: v.number(),
    type: v.string(),
    title: v.string(),
    description: v.string(),
    status: v.union(v.literal("pending"), v.literal("in_progress"), v.literal("completed"), v.literal("skipped")),
  }).index("by_userId_createdAt", ["userId", "createdAt"]),
});