// convex/users.ts
import { v } from "convex/values";
import { internalMutation, mutation, query, internalQuery } from "./_generated/server";
import { Id } from "./_generated/dataModel"; // Ensure Id is imported if used in other functions

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
      // onboardingResponses is intentionally not set here, will be set by saveOnboardingResponses
    });
  },
});

export const saveOnboardingResponses = mutation({
  args: {
    responses: v.array(v.object({ // This defines args.responses as the new array type
      question: v.string(),
      answer: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    // Log the exact arguments received from the frontend.
    console.log("[BACKEND LOG] Arguments received in mutation:", JSON.stringify(args, null, 2));
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

    await ctx.db.patch(user._id, {
      onboardingResponses: args.responses, // This should be correct
      onboardingCompleted: true,
    });

    return { success: true, userId: user._id };
  },
});

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
       // onboardingResponses is intentionally not set here
    });
    return userId;
  },
});

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