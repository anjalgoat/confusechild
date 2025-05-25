// anjalgoat/confusechild/confusechild-d50e6dfd94d03cf8af81dcc64bdfb6203a08d3de/confuseChild/convex/planner.ts
import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

/**
 * Internal mutation to create a new planner entry.
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
            status: "pending",
        });
    },
});