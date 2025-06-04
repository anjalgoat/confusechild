// convex/knowledge.ts
import { v } from "convex/values";
import { internalAction, internalQuery, mutation, ActionCtx, QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api"; // Import 'internal' for server-side calls
import { Id, Doc } from "./_generated/dataModel";

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

// Helper query to get the document metadata
export const getCoreMethodologyDoc = internalQuery({
  handler: async (ctx: QueryCtx): Promise<Doc<"knowledge"> | null> => {
    return await ctx.db
      .query("knowledge")
      .withIndex("by_type", q => q.eq("type", "core_methodology"))
      .first();
  }
});

// Action to get the file content
export const getCoreMethodology = internalAction({
  handler: async (ctx: ActionCtx): Promise<string | null> => {
    // FIX 1: Call the internal query using the 'internal' object, not 'api.internal'
    const doc = await ctx.runQuery(internal.knowledge.getCoreMethodologyDoc);
    
    if (!doc) {
        return null;
    }

    // FIX 2: Handle the Blob return type and convert it to an ArrayBuffer
    const blob: Blob | null = await ctx.storage.get(doc.storageId);
    if (blob === null) {
        return null;
    }
    const content = await blob.arrayBuffer();

    return new TextDecoder().decode(content);
  }
});