import { v } from "convex/values";
import { internalMutation, mutation, query, internalQuery } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Internal mutation to create a new planner entry.
 * This is called by the `summarizeSession` action.
 */
export const createPlannerEntry = internalMutation({
    args: {
        userId: v.id("users"),
        sessionId: v.optional(v.id("sessions")),
        type: v.string(),
        title: v.string(),
        description: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("plannerEntries", {
            userId: args.userId,
            sessionId: args.sessionId,
            createdAt: Date.now(),
            type: args.type,
            title: args.title,
            description: args.description,
            status: "pending", // All new tasks start as pending
        });
    },
});

/**
 * Gets all planner entries for the currently logged-in user.
 */
export const getMyPlannerEntries = query({
    args: {},
    handler: async (ctx): Promise<Doc<"plannerEntries">[]> => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return [];
        }

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
            .unique();

        if (!user) {
            return [];
        }

        // Fetch planner entries for the user, newest first
        return await ctx.db
            .query("plannerEntries")
            .withIndex("by_userId_createdAt", (q) => q.eq("userId", user._id))
            .order("desc")
            .collect();
    },
});

/**
 * Updates the status of a specific planner entry.
 */
export const updatePlannerEntryStatus = mutation({
    args: {
        plannerEntryId: v.id("plannerEntries"),
        status: v.union(v.literal("pending"), v.literal("in_progress"), v.literal("completed"), v.literal("skipped")),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("User not authenticated.");
        }

        const plannerEntry = await ctx.db.get(args.plannerEntryId);
        if (!plannerEntry) {
            throw new Error("Planner entry not found.");
        }

        const user = await ctx.db.get(plannerEntry.userId);
        if (!user || user.clerkUserId !== identity.subject) {
            throw new Error("You are not authorized to modify this entry.");
        }

        // Patch the document with the new status
        await ctx.db.patch(args.plannerEntryId, {
            status: args.status,
        });
    },
});

/**
 * Internal query to get all planner entries for a specific user.
 * This can be called from other backend functions (actions or mutations).
 */
export const getEntriesForUser = internalQuery({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args): Promise<Doc<"plannerEntries">[]> => {
        // Fetch planner entries for the given user, newest first
        return await ctx.db
            .query("plannerEntries")
            .withIndex("by_userId_createdAt", (q) => q.eq("userId", args.userId))
            .order("desc")
            .collect();
    },
});