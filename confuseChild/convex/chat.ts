import { v } from "convex/values";
import { action, mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import OpenAI from 'openai';
import { Doc } from "./_generated/dataModel";

// Initialize the OpenAI client to point to OpenRouter with more explicit headers
const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "Content-Type": "application/json",
    "HTTP-Referer": "http://localhost:3000", // Replace with your actual app URL in production
    "X-Title": "ConfuseChild AI Therapist",
  },
});

// --- Part 1: Core Conversation Loop ---

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const chat = action({
    args: {
        storageId: v.id("_storage"),
        sessionId: v.id("sessions"),
    },
    handler: async (ctx, args) => {
        const audioBlob = await ctx.storage.get(args.storageId);
        if (!audioBlob) throw new Error("Audio not found.");
        
        const audioFile = new File([audioBlob], "audio.webm", { type: "audio/webm" });
        const transcriptResponse = await openrouter.audio.transcriptions.create({
            model: "openai/whisper-1",
            file: audioFile,
        });
        const transcript = transcriptResponse.text;

        const user = await ctx.runQuery(internal.users.getUserForSession, { sessionId: args.sessionId });
        if (!user) throw new Error("User not found.");

        await ctx.runMutation(internal.chat.addTranscriptChunk, {
            sessionId: args.sessionId,
            userId: user._id,
            role: "user",
            content: transcript,
        });

        const history = await ctx.runQuery(api.chat.getRecentTranscriptChunks, { sessionId: args.sessionId });
        const systemPrompt = `You are an AI psychiatrist specialized in helping adults who struggle with Gifted Kid Syndrome. Listen thoughtfully and provide therapeutic responses. Your goal is to help the user understand their patterns, explore their emotions, and grow. Address the user directly in a warm and empathetic tone.`;
        
        const messages = [
            { role: "system" as const, content: systemPrompt },
            ...history.map((msg: Doc<"transcriptChunks">) => ({ role: msg.role, content: msg.content })).reverse()
        ];

        const chatResponse = await openrouter.chat.completions.create({ model: "openai/gpt-4o", messages: messages });
        const aiResponseText = chatResponse.choices[0].message?.content ?? "I'm not sure what to say.";

        await ctx.runMutation(internal.chat.addTranscriptChunk, {
            sessionId: args.sessionId,
            userId: user._id,
            role: "assistant",
            content: aiResponseText,
        });

        const ttsResponse = await openrouter.audio.speech.create({ model: "openai/tts-1", input: aiResponseText, voice: "alloy" });
        return await ttsResponse.arrayBuffer();
    },
});

// --- Part 2: Therapeutic Flow Management ---

export const startConversation = action({
    args: { sessionId: v.id("sessions") },
    handler: async (ctx, args) => {
        const greeting = "Welcome back. What's been on your mind lately?";
        const ttsResponse = await openrouter.audio.speech.create({ model: "openai/tts-1", input: greeting, voice: "alloy" });
        
        const user = await ctx.runQuery(internal.users.getUserForSession, { sessionId: args.sessionId });
        if (!user) throw new Error("User not found for this session.");

        await ctx.runMutation(internal.chat.addTranscriptChunk, {
            sessionId: args.sessionId,
            userId: user._id,
            role: "assistant",
            content: greeting,
        });
        
        return await ttsResponse.arrayBuffer();
    }
});

export const summarizeSession = action({
    args: { sessionId: v.id("sessions") },
    handler: async (ctx, args) => {
        const history = await ctx.runQuery(api.chat.getRecentTranscriptChunks, { sessionId: args.sessionId });
        const summaryPrompt = `Please act as a therapist and provide a concise summary of this session's key themes, emotional patterns, and core beliefs. The transcript is provided in reverse chronological order. Address the user directly in the second person. Transcript: ${history.map(m => `${m.role}: ${m.content}`).join("\n")}`;
        
        const summaryResponse = await openrouter.chat.completions.create({ model: "openai/gpt-4o", messages: [{role: "system", content: summaryPrompt}] });
        const summary = summaryResponse.choices[0].message?.content ?? "Could not generate a summary.";

        await ctx.runMutation(internal.sessions.updateSessionSummary, { sessionId: args.sessionId, summary: summary });

        // FIX: Updated prompt and parsing logic
        const plannerPrompt = `Based on the following session summary, generate a JSON object with a single key "tasks". This key should contain an array of 3 actionable tasks. Use these types: 'journal_prompt', 'mindfulness_exercise', 'reflection_question'. Each object in the array should have 'type', 'title', and 'description' keys. Return ONLY the JSON object. Summary: ${summary}`;
        
        const plannerResponse = await openrouter.chat.completions.create({
            model: "openai/gpt-4o",
            messages: [{role: "system", content: plannerPrompt}],
            response_format: { type: "json_object" }
        });

        let plannerTasks = [];
        const responseContent = plannerResponse.choices[0].message?.content;
        if (responseContent) {
            try {
                const parsedJson = JSON.parse(responseContent);
                if (Array.isArray(parsedJson.tasks)) {
                    plannerTasks = parsedJson.tasks;
                }
            } catch (e) {
                console.error("Failed to parse planner tasks JSON from AI response:", e);
            }
        }

        const user = await ctx.runQuery(internal.users.getUserForSession, { sessionId: args.sessionId });
        if (!user) throw new Error("User not found for this session.");

        // FIX: This loop will now work correctly
        for (const task of plannerTasks) {
            await ctx.runMutation(internal.planner.createPlannerEntry, {
                userId: user._id,
                sessionId: args.sessionId,
                type: task.type,
                title: task.title,
                description: task.description,
            });
        }

        return { success: true };
    }
});

// --- Helper Functions ---

export const addTranscriptChunk = internalMutation({
    args: {
        sessionId: v.id("sessions"),
        userId: v.id("users"),
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("transcriptChunks", { ...args, timestamp: Date.now() });
    },
});

export const getRecentTranscriptChunks = query({
    args: { sessionId: v.id("sessions") },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const session = await ctx.db.get(args.sessionId);
        if (!session) throw new Error("Session not found");

        const user = await ctx.db.get(session.userId);
        if (!user || user.clerkUserId !== identity.subject) {
             throw new Error("You are not authorized to view this transcript.");
        }

        return await ctx.db.query("transcriptChunks").withIndex("by_sessionId_timestamp", q => q.eq("sessionId", args.sessionId)).order("desc").take(20);
    },
});