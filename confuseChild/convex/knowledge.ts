// convex/knowledge.ts
import { v } from "convex/values";
import { internalQuery, mutation, QueryCtx } from "./_generated/server"; // Added QueryCtx for explicit typing
import { Id, Doc } from "./_generated/dataModel"; // Added Doc and Id for explicit typing

export const addCoreMethodologyFile = mutation({
  args: {
    storageId: v.id("_storage"),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("knowledge")
      .withIndex("by_type", (q) => q.eq("type", "core_methodology"))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }

    await ctx.db.insert("knowledge", {
      storageId: args.storageId,
      description: args.description,
      type: "core_methodology",
    });

    return { success: true };
  },
});

export const getCoreMethodology = internalQuery({
  handler: async (ctx: QueryCtx): Promise<string | null> => { // Explicitly type ctx
    const doc: Doc<"knowledge"> | null = await ctx.db
      .query("knowledge")
      .withIndex("by_type", q => q.eq("type", "core_methodology"))
      .first();
    
    if (!doc) {
        return null;
    }

    // The ctx.storage.get method should exist on StorageReader, which is part of QueryCtx.
    // If this still errors, it might be an issue with your Convex version or generated types.
    const content: ArrayBuffer | null = await ctx.storage.get(doc.storageId);
    if (!content) {
        return null;
    }

    return new TextDecoder().decode(content);
  }
});