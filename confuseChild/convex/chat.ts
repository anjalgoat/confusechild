import { v } from "convex/values";
import { action, mutation, query, internalMutation } from "./_generated/server";
import { api, internal } from "./_generated/api";
import OpenAI from 'openai';
import { Doc } from "./_generated/dataModel";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// Initialize the OpenAI client for OpenRouter (LLM Brain)
const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "ConfuseChild AI Therapist",
  },
});

const deepgramApiKey = process.env.DEEPGRAM_API_KEY!;

// --- Part 1: Core Conversation Loop ---

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const chat = action({
    args: {
        storageId: v.id("_storage"),
        sessionId: v.id("sessions"),
    },
    handler: async (ctx, args): Promise<{ 
        audio: ArrayBuffer; 
        userTranscript: string; 
        assistantResponse: string; 
    }> => {
        const audioBlob = await ctx.storage.get(args.storageId);
        if (!audioBlob) throw new Error("Audio not found in storage.");
        
        const transcribeResponse = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true", {
            method: "POST",
            headers: {
                "Authorization": `Token ${deepgramApiKey}`,
                "Content-Type": "audio/webm",
            },
            body: audioBlob,
        });
        if (!transcribeResponse.ok) {
            throw new Error(`Deepgram transcription failed with status ${transcribeResponse.status}`);
        }
        const transcriptData = await transcribeResponse.json();
        const userTranscript = transcriptData.results.channels[0].alternatives[0].transcript;

        const user = await ctx.runQuery(internal.users.getUserForSession, { sessionId: args.sessionId });
        if (!user) throw new Error("User not found for this session.");

        await ctx.runMutation(internal.chat.addTranscriptChunk, {
            sessionId: args.sessionId,
            userId: user._id,
            role: "user",
            content: userTranscript,
        });

        const history: Doc<"transcriptChunks">[] = await ctx.runQuery(api.chat.getRecentTranscriptChunks, { sessionId: args.sessionId });
        
        const systemPrompt = `
          You are an advanced AI psychiatrist specializing in the challenges faced by adults who identify with "Gifted Kid Syndrome." Your primary goal is to provide a safe, empathetic, and insightful space for the user to explore their thoughts and feelings.
          **Your Core Therapeutic Framework:**
          1.  **Deep Empathy & Validation:** Always start by acknowledging and validating the user's feelings.
          2.  **Socratic Questioning:** Do not give direct advice. Instead, guide the user to their own insights with thoughtful, open-ended questions.
          3.  **Focus on Core GKS Themes:** Listen for mentions of: Perfectionism, Fear of Failure, Imposter Syndrome, Procrastination, Identity tied to Achievement, and Emotional Intensity.
          4.  **Promote Self-Acceptance & Growth Mindset:** Gently challenge all-or-nothing thinking. Help the user separate their identity from their achievements.
          **Your Conversational Style:** Warm, personable, concise, and patient.
        `;
        
        const messages: ChatCompletionMessageParam[] = [
            { role: "system", content: systemPrompt },
            ...history.map((msg: Doc<"transcriptChunks">): ChatCompletionMessageParam => ({ role: msg.role, content: msg.content })).reverse() 
        ];

        const chatResponse = await openrouter.chat.completions.create({
             model: "openai/gpt-4o",
             messages: messages 
        });
        const assistantResponse = chatResponse.choices[0].message?.content ?? "I'm not sure what to say.";

        await ctx.runMutation(internal.chat.addTranscriptChunk, {
            sessionId: args.sessionId,
            userId: user._id,
            role: "assistant",
            content: assistantResponse,
        });

        const ttsResponse = await fetch("https://api.deepgram.com/v1/speak?model=aura-asteria-en", {
            method: "POST",
            headers: {
                "Authorization": `Token ${deepgramApiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ text: assistantResponse }),
        });
        if (!ttsResponse.ok) {
            throw new Error(`Deepgram TTS failed with status ${ttsResponse.status}`);
        }
        const audioArrayBuffer = await ttsResponse.arrayBuffer();

        return { 
            audio: audioArrayBuffer, 
            userTranscript: userTranscript, 
            assistantResponse: assistantResponse 
        };
    },
});

// --- Part 2: Therapeutic Flow Management ---

export const startConversation = action({
    args: { sessionId: v.id("sessions") },
    handler: async (ctx, args): Promise<ArrayBuffer> => {
        const greeting = "Welcome back. What's been on your mind lately?";
        
        const user = await ctx.runQuery(internal.users.getUserForSession, { sessionId: args.sessionId });
        if (!user) throw new Error("User not found for this session.");

        const history = await ctx.runQuery(api.chat.getRecentTranscriptChunks, { sessionId: args.sessionId });
        if (history.length === 0) {
            await ctx.runMutation(internal.chat.addTranscriptChunk, {
                sessionId: args.sessionId,
                userId: user._id,
                role: "assistant",
                content: greeting,
            });
        }
        
        const ttsResponse = await fetch("https://api.deepgram.com/v1/speak?model=aura-asteria-en", {
            method: "POST",
            headers: {
                "Authorization": `Token ${deepgramApiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ text: greeting }),
        });
        if (!ttsResponse.ok) {
            throw new Error(`Deepgram TTS failed with status ${ttsResponse.status}`);
        }
        return await ttsResponse.arrayBuffer();
    }
});


export const endSession = action({
    args: { sessionId: v.id("sessions") },
    handler: async (ctx, args): Promise<{ success: boolean }> => {
        await ctx.runAction(api.chat.summarizeSession, { sessionId: args.sessionId });

        const history = await ctx.runQuery(api.chat.getRecentTranscriptChunks, { sessionId: args.sessionId });
        const user = await ctx.runQuery(internal.users.getUserForSession, { sessionId: args.sessionId });

        if (history.length === 0 || !user) {
            return { success: false };
        }

        const analysisPrompt = `
            As a clinical psychologist, analyze the following therapy session transcript for a user with Gifted Kid Syndrome.
            Your task is to update their long-term psychological profile.
            
            Current Profile Summary: "${user.longTermProfileSummary || 'No previous summary available.'}"
            
            Transcript (in reverse chronological order):
            ${history.map((m: Doc<"transcriptChunks">) => `${m.role}: ${m.content}`).join("\n")}

            Based on the transcript and the current summary, generate a response with the following JSON structure:
            {
              "longTermProfileSummary": "A dense, clinical paragraph summarizing the user's core struggles, cognitive patterns, emotional state, and any progress made. This summary should be cumulative, building on the previous one.",
              "keyInsights": [
                {
                  "belief": "A core belief the user holds. e.g., 'My worth is tied to my achievements.'",
                  "trigger": "The situation or feeling that reveals this belief. e.g., 'Discussing career dissatisfaction.'"
                }
              ]
            }

            Produce ONLY the JSON object and nothing else. The "keyInsights" array should contain 3 to 5 insight objects.
        `;

        const analysisResponse = await openrouter.chat.completions.create({
            model: "openai/gpt-4o",
            messages: [{ role: "system", content: analysisPrompt }],
            response_format: { type: "json_object" }
        });

        const responseContent = analysisResponse.choices[0].message?.content;
        if (responseContent) {
            try {
                const parsedJson = JSON.parse(responseContent);
                const { longTermProfileSummary, keyInsights } = parsedJson;
                
                if (longTermProfileSummary && Array.isArray(keyInsights)) {
                     await ctx.runMutation(internal.users.updateUserProfileInsights, {
                        userId: user._id,
                        longTermProfileSummary,
                        keyInsights,
                    });
                }
            } catch (e) {
                console.error("Failed to parse analysis JSON from AI response:", e);
                return { success: false };
            }
        }
        return { success: true };
    }
});


export const summarizeSession = action({
    args: { sessionId: v.id("sessions") },
    handler: async (ctx, args): Promise<{ success: boolean; reason?: string }> => {
        const history = await ctx.runQuery(api.chat.getRecentTranscriptChunks, { sessionId: args.sessionId });
        if (history.length === 0) return { success: false, reason: "No transcript to summarize."};

        const summaryPrompt = `Please act as a therapist and provide a concise summary of this session's key themes, emotional patterns, and core beliefs. Address the user directly in the second person. Transcript: ${history.map((m: Doc<"transcriptChunks">) => `${m.role}: ${m.content}`).join("\n")}`;
        
        const summaryResponse = await openrouter.chat.completions.create({ model: "openai/gpt-4o", messages: [{role: "system", content: summaryPrompt}] });
        const summary = summaryResponse.choices[0].message?.content ?? "Could not generate a summary.";

        await ctx.runMutation(internal.sessions.updateSessionSummary, { sessionId: args.sessionId, summary: summary });

        const plannerPrompt = `Based on the following session summary, generate a JSON object with a single key "tasks". This key should contain an array of 3 actionable tasks. Use these types: 'journal_prompt', 'mindfulness_exercise', 'reflection_question'. Each object should have 'type', 'title', and 'description' keys. Return ONLY the JSON object. Summary: ${summary}`;
        
        const plannerResponse = await openrouter.chat.completions.create({
            model: "openai/gpt-4o",
            messages: [{role: "system", content: plannerPrompt}],
            response_format: { type: "json_object" }
        });

        let plannerTasks: any[] = [];
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

        for (const task of plannerTasks) {
            if (task.type && task.title && task.description) {
                await ctx.runMutation(internal.planner.createPlannerEntry, {
                    userId: user._id,
                    sessionId: args.sessionId,
                    type: task.type,
                    title: task.title,
                    description: task.description,
                });
            }
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
    handler: async (ctx, args): Promise<Doc<"transcriptChunks">[]> => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const session = await ctx.db.get(args.sessionId);
        if (!session) {
            // It's better to return an empty array or handle gracefully than to throw
            // if the session might not exist yet during page loads.
            return [];
        }

        const user = await ctx.db.get(session.userId);
        if (!user || user.clerkUserId !== identity.subject) {
             throw new Error("You are not authorized to view this transcript.");
        }

        return await ctx.db.query("transcriptChunks")
            .withIndex("by_sessionId_timestamp", q => q.eq("sessionId", args.sessionId))
            .order("desc")
            .take(50);
    },
});