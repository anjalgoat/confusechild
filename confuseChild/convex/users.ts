import { v } from "convex/values";
import { internalMutation, mutation, query, internalQuery } from "./_generated/server";

// Helper to get user by Clerk ID
export const getUserByClerkId = query({
  args: { clerkUserId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
      .unique();
    return user;
  },
});

/**
 * Internal helper to get a user's document from a session ID.
 */
export const getUserForSession = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }
    return await ctx.db.get(session.userId);
  },
});

// Mutation to create a user (called from Clerk webhook or first authenticated action)
export const createUser = internalMutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("users", {
      clerkUserId: args.clerkUserId,
      email: args.email,
      name: args.name,
      onboardingCompleted: false,
    });
  },
});

// Mutation to save onboarding responses
export const saveOnboardingResponses = mutation({
  args: {
    q1_perfectionism_pressure: v.optional(v.string()),
    q2_fear_of_failure_feeling: v.optional(v.string()),
    q3_imposter_syndrome_doubt: v.optional(v.string()),
    q4_procrastination_pressure: v.optional(v.string()),
    q5_sense_of_alienation: v.optional(v.string()),
    q6_career_dissatisfaction: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
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

    const responses = { ...args };

    await ctx.db.patch(user._id, {
      onboardingResponses: responses,
      onboardingCompleted: true,
    });

    return { success: true, userId: user._id };
  },
});

// Ensures a user document exists for the currently logged-in user.
export const ensureUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called ensureUser without authentication present");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (user !== null) {
      if (user.email !== identity.email) {
         await ctx.db.patch(user._id, { email: identity.email! });
      }
      return user._id;
    }

    const userId = await ctx.db.insert("users", {
      clerkUserId: identity.subject,
      email: identity.email!,
      name: identity.name,
      onboardingCompleted: false,
    });
    return userId;
  },
});

// Get the current user's profile
export const getMyUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();
    return user;
  },
});

// Internal mutation to update the user profile with analysis
export const updateUserProfileInsights = internalMutation({
    args: {
        userId: v.id("users"),
        longTermProfileSummary: v.string(),
        keyInsights: v.array(v.object({
            belief: v.string(),
            trigger: v.string(),
        })),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, {
            longTermProfileSummary: args.longTermProfileSummary,
            keyInsights: args.keyInsights,
        });
    },
});