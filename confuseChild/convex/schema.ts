// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    email: v.string(), 
    name: v.optional(v.string()), 
    onboardingResponses: v.optional(v.object({ 
      q1_perfectionism_pressure: v.optional(v.string()), 
      q2_fear_of_failure_feeling: v.optional(v.string()), 
      q3_imposter_syndrome_doubt: v.optional(v.string()),
      q4_procrastination_pressure: v.optional(v.string()),
      q5_sense_of_alienation: v.optional(v.string()),
      q6_career_dissatisfaction: v.optional(v.string()),
    })),
    onboardingCompleted: v.boolean(), 
    longTermProfileSummary: v.optional(v.string()),
    
    // --- UPDATE THIS LINE ---
    keyInsights: v.optional(v.array(v.object({
        belief: v.string(),
        trigger: v.string(),
    }))),

    currentGoals: v.optional(v.array(v.string())),
    preferences: v.optional(v.object({
      ttsVoice: v.optional(v.string()),
    })),
  })
  .index("by_clerkUserId", ["clerkUserId"]),

  // ... rest of the file is unchanged
  sessions: defineTable({
    userId: v.id("users"),
    startTime: v.number(),
    endTime: v.optional(v.number()),
    status: v.string(),
    sessionSummary: v.optional(v.string()),
    insightNotes: v.optional(v.array(v.string())),
    generatedPlannerEntryIds: v.optional(v.array(v.id("plannerEntries"))),
  })
  .index("by_userId_startTime", ["userId", "startTime"]),

  transcriptChunks: defineTable({
    sessionId: v.id("sessions"),
    userId: v.id("users"),
    timestamp: v.number(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    vadEvents: v.optional(v.any()),
  })
  .index("by_sessionId_timestamp", ["sessionId", "timestamp"])
  .index("by_userId", ["userId"]),

  plannerEntries: defineTable({
    userId: v.id("users"),
    sessionId: v.optional(v.id("sessions")),
    createdAt: v.number(),
    type: v.string(),
    title: v.string(),
    description: v.string(),
    status: v.union(v.literal("pending"), v.literal("in_progress"), v.literal("completed"), v.literal("skipped")),
    dueDate: v.optional(v.number()),
    userNotes: v.optional(v.string()),
  })
  .index("by_userId_createdAt", ["userId", "createdAt"]),
});