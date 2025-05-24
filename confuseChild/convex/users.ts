// convex/users.ts
import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { GenericId } from "convex/values";

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

// Mutation to create a user (called from Clerk webhook or first authenticated action)
// Ensure onboardingCompleted is false by default
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
      onboardingCompleted: false, // Default to false
      // Initialize other fields as needed
    });
  },
});

// Mutation to save onboarding responses
export const saveOnboardingResponses = mutation({
  args: {
    // Define arguments matching the structure of your onboardingResponses object
    // This should mirror the 'onboardingResponses' field in your schema
    q1_perfectionism_pressure: v.optional(v.string()),
    q2_fear_of_failure_feeling: v.optional(v.string()),
    q3_imposter_syndrome_doubt: v.optional(v.string()),
    q4_procrastination_pressure: v.optional(v.string()),
    q5_sense_of_alienation: v.optional(v.string()),
    q6_career_dissatisfaction: v.optional(v.string()),
    // Add other questions as needed
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

    const responses = { ...args }; // Collect all args into the responses object

    await ctx.db.patch(user._id, {
      onboardingResponses: responses,
      onboardingCompleted: true,
    });

    return { success: true, userId: user._id };
  },
});

// You might also want a function to ensure user exists, called by authenticated components
export const ensureUser = mutation({
  args: {}, // No args needed, gets user from identity
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Called ensureUser without authentication present");
    }

    // Check if user already exists
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (user !== null) {
      // Optionally update user fields if they've changed in Clerk (e.g., email, name)
      // For now, just return the existing user ID
      if (user.email !== identity.email) {
         await ctx.db.patch(user._id, { email: identity.email! });
      }
      return user._id;
    }

    // If user doesn't exist, create them
    // Note: `onboardingCompleted` will be false by default from the `createUser` logic
    // if we were to call an internal mutation like `internal.users.createUser`.
    // Here we insert directly.
    const userId = await ctx.db.insert("users", {
      clerkUserId: identity.subject,
      email: identity.email!,
      name: identity.name,
      onboardingCompleted: false, // Explicitly set to false
      // initialize other fields
    });
    return userId;
  },
});

// Get user profile including onboarding status (client-callable)
export const getMyUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      // This case should ideally be handled by client-side auth checks first
      return null;
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();
    return user;
  },
});