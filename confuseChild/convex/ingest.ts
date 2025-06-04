// In convex/ingest.ts
import { v } from "convex/values";
import { internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import OpenAI from 'openai';

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

// This internal action orchestrates the entire ingestion process.
export const ingestDocument = internalAction({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, { storageId }) => {
        // 1. Get the file from storage
        const blob = await ctx.storage.get(storageId);
        if (!blob) {
            console.error(`Could not find file with storage ID: ${storageId}`);
            return;
        }
        
        // 2. Read the file's content (assuming it's a text file for now)
        // Note: For PDFs, you would need a library like pdf-parse here.
        const text = await blob.text();

        // 3. Chunk the text into smaller pieces
        // A simple strategy is to split by paragraphs. More advanced strategies exist.
        const chunks = text.split("\n\n").filter(chunk => chunk.trim() !== "");
        console.log(`Document split into ${chunks.length} chunks.`);

        // 4. Loop through chunks, embed them, and store them
        for (const chunk of chunks) {
            try {
                // Call OpenRouter/OpenAI to generate an embedding for the chunk
                const embeddingResponse = await openrouter.embeddings.create({
                    model: "openai/text-embedding-ada-002", // A standard choice for RAG
                    input: chunk,
                });
                const embedding = embeddingResponse.data[0].embedding;

                // Call an internal mutation to store the chunk and its embedding
                await ctx.runMutation(internal.ingest.addChunk, {
                    chunk: chunk,
                    embedding: embedding
                });
            } catch (error) {
                console.error("Error processing chunk:", error);
                // Decide if you want to continue or stop on error
            }
        }
        console.log("Ingestion complete.");
    }
});

// This internal mutation writes a single chunk to the database.
// Actions cannot write to the DB, so they must call mutations.
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


// Add this to the end of convex/ingest.ts

import { mutation } from "./_generated/server";

// This is a public mutation you can run from the Convex Dashboard's "Functions" tab.
export const runIngestion = mutation({
    args: { storageId: v.id("_storage") },
    handler: async (ctx, { storageId }) => {
        // Schedule the ingestion action to run in the background
        await ctx.scheduler.runAfter(0, internal.ingest.ingestDocument, {
            storageId: storageId,
        });
        return "Ingestion process has been started.";
    }
});