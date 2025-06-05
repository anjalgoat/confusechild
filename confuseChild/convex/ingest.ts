// In convex/ingest.ts
import { v } from "convex/values";
import { internalAction, internalMutation, mutation } from "./_generated/server";
import { internal } from "./_generated/api";
import OpenAI from 'openai';

// Create a dedicated client for the OpenAI API using your OpenAI key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// This internal action orchestrates the entire ingestion process.
export const ingestDocument = internalAction({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, { storageId }) => {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.error("CRITICAL ERROR: OPENAI_API_KEY is not set in Convex environment variables.");
            return;
        }

        const blob = await ctx.storage.get(storageId);
        if (!blob) {
            console.error(`Could not find file with storage ID: ${storageId}`);
            return;
        }
        
        const text = await blob.text();
        const chunks = text.split("\n\n").filter(chunk => chunk.trim() !== "");
        console.log(`Document split into ${chunks.length} chunks.`);

        for (const chunk of chunks) {
            try {
                // *** THE FIX: This now correctly uses the 'openai' client ***
                const embeddingResponse = await openai.embeddings.create({
                    model: "text-embedding-ada-002",
                    input: chunk,
                });
                const embedding = embeddingResponse.data[0].embedding;

                // Call the mutation to store the chunk and its embedding
                await ctx.runMutation(internal.ingest.addChunk, {
                    chunk: chunk,
                    embedding: embedding
                });
            } catch (error) {
                console.error("Error processing chunk:", error);
            }
        }
        console.log("Ingestion complete.");
    }
});

// This internal mutation writes a single chunk to the database.
export const addChunk = internalMutation({
    args: {
        chunk: v.string(),
        embedding: v.array(v.float64())
    },
    handler: async (ctx, { chunk, embedding }) => {
        await ctx.db.insert("gks_knowledge", {
            chunk,
            embedding
        });
    }
});

// This is a public mutation you can run from the Convex Dashboard's "Functions" tab.
export const runIngestion = mutation({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, { storageId }) => {
        await ctx.scheduler.runAfter(0, internal.ingest.ingestDocument, {
            storageId: storageId,
        });
        return "Ingestion process has been started.";
    }
});