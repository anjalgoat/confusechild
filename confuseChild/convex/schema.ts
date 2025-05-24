// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    email: v.string(), // Store email for easier reference if needed
    name: v.optional(v.string()), // Optional: if you capture name
    onboardingResponses: v.optional(v.object({ // Store answers here
      q1_perfectionism_pressure: v.optional(v.string()), // Example: Likert scale 1-5 or text
      q2_fear_of_failure_feeling: v.optional(v.string()), // Example: Text response
      q3_imposter_syndrome_doubt: v.optional(v.string()),
      q4_procrastination_pressure: v.optional(v.string()),
      q5_sense_of_alienation: v.optional(v.string()),
      q6_career_dissatisfaction: v.optional(v.string()),
      // Add more questions as needed, matching their keys
    })),
    onboardingCompleted: v.boolean(), // Flag to check completion
    longTermProfileSummary: v.optional(v.string()),
    currentGoals: v.optional(v.array(v.string())),
    preferences: v.optional(v.object({
      ttsVoice: v.optional(v.string()),
    })),
  })
  .index("by_clerkUserId", ["clerkUserId"]),

  sessions: defineTable({
    userId: v.id("users"), // Reference Convex user ID
    startTime: v.number(),
    endTime: v.optional(v.number()),
    status: v.string(), // e.g., "active", "completed", "interrupted"
    sessionSummary: v.optional(v.string()),
    insightNotes: v.optional(v.array(v.string())),
    generatedPlannerEntryIds: v.optional(v.array(v.id("plannerEntries"))),
  })
  .index("by_userId_startTime", ["userId", "startTime"]),

  transcriptChunks: defineTable({
    sessionId: v.id("sessions"),
    userId: v.id("users"), // Reference Convex user ID
    timestamp: v.number(),
    role: v.union(v.literal("user"), v.literal("assistant")),
    content: v.string(),
    vadEvents: v.optional(v.any()), // Consider a more specific schema if using
  })
  .index("by_sessionId_timestamp", ["sessionId", "timestamp"])
  .index("by_userId", ["userId"]),

  plannerEntries: defineTable({
    userId: v.id("users"), // Reference Convex user ID
    sessionId: v.optional(v.id("sessions")), // Optional if created outside a session
    createdAt: v.number(),
    type: v.string(), // e.g., "journal_prompt", "mindfulness_exercise"
    title: v.string(),
    description: v.string(),
    status: v.union(v.literal("pending"), v.literal("in_progress"), v.literal("completed"), v.literal("skipped")),
    dueDate: v.optional(v.number()),
    userNotes: v.optional(v.string()),
  })
  .index("by_userId_createdAt", ["userId", "createdAt"]),

  // You might also need a way to store the questions themselves if they are dynamic
  // For now, we assume questions are hardcoded in the frontend questionnaire component
});