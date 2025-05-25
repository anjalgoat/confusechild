// anjalgoat/confusechild/confusechild-d50e6dfd94d03cf8af81dcc64bdfb6203a08d3de/confuseChild/convex/sessions.ts
import { mutation, query, internalMutation } from "./_generated/server"; // Added internalMutation
import { v } from "convex/values";

/**
 * Creates a new session for the authenticated user.
 */
export const createSession = mutation({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("User not authenticated");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user) {
      throw new Error("User not found in Convex database.");
    }

    const sessionId = await ctx.db.insert("sessions", {
      userId: user._id,
      startTime: Date.now(),
      status: "active",
    });

    return sessionId;
  },
});

/**
 * Retrieves a session by its ID.
 */
export const get = query({
  args: { id: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.id);
    return session;
  },
});

/**
 * Internal mutation to update a session's summary and mark it as completed.
 */
export const updateSessionSummary = internalMutation({
  args: { sessionId: v.id("sessions"), summary: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.sessionId, {
      sessionSummary: args.summary,
      status: "completed",
      endTime: Date.now(),
    });
  },
});