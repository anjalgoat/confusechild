// convex/chat.ts
import { v } from "convex/values";
import { action, mutation, query, internalMutation, internalAction, ActionCtx } // Ensure ActionCtx is imported if used, though not explicitly in this snippet's corrections
  from "./_generated/server";
import { api, internal } from "./_generated/api";
import OpenAI from 'openai';
import { Doc, Id } from "./_generated/dataModel";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000", // Replace with your deployed app's URL in production
    "X-Title": "ConfuseChild AI Therapist",
  },
});
const deepgramApiKey = process.env.DEEPGRAM_API_KEY!;

// --- Core Chat Action ---
export const chat = action({
    args: {
        storageId: v.id("_storage"),
        sessionId: v.id("sessions"),
    },
    handler: async (ctx, args): Promise<{ audio: ArrayBuffer; userTranscript: string; assistantResponse: string; }> => {
        const audioBlob = await ctx.storage.get(args.storageId);
        if (!audioBlob) throw new Error("Audio not found");
        const transcribeResponse = await fetch("https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true", {
            method: "POST", headers: { "Authorization": `Token ${deepgramApiKey}`, "Content-Type": "audio/webm" }, body: audioBlob,
        });
        if (!transcribeResponse.ok) throw new Error(`Deepgram failed: ${transcribeResponse.statusText}`);
        const transcriptData = await transcribeResponse.json();
        const userTranscript = transcriptData.results.channels[0].alternatives[0].transcript;

        const user = await ctx.runQuery(internal.users.getUserForSession, { sessionId: args.sessionId });
        if (!user) throw new Error("User not found");

        // Note: If 'internal.chat.addTranscriptChunk' errors, ensure 'addTranscriptChunk' is correctly
        // exported as an internalMutation from this file and 'npx convex dev' has run successfully.
        await ctx.runMutation(internal.chat.addTranscriptChunk, { sessionId: args.sessionId, userId: user._id, role: "user", content: userTranscript });
        
        // Note: If 'api.chat.getRecentTranscriptChunks' errors, ensure 'getRecentTranscriptChunks' is correctly
        // exported as a query from this file and 'npx convex dev' has run successfully.
        const history = await ctx.runQuery(api.chat.getRecentTranscriptChunks, { sessionId: args.sessionId });
        
        // Error TS2339 for internal.planner.getEntriesForUser:
        // This suggests 'getEntriesForUser' is not correctly appearing in the 'internal.planner' API map.
        // Ensure 'getEntriesForUser' is exported as 'export const getEntriesForUser = internalQuery({...});'
        // from 'convex/planner.ts' and that 'npx convex dev' has completed without errors.
        const plannerEntries = await ctx.runQuery(internal.planner.getEntriesForUser, { userId: user._id });
        const methodologyContent = await ctx.runQuery(internal.knowledge.getCoreMethodology);

        if (!methodologyContent) {
            throw new Error("Core methodology document not found. Please upload and register it via the addCoreMethodologyFile mutation.");
        }

        let onboardingContext = "No onboarding data available.";
        if (user.onboardingCompleted && user.onboardingResponses) {
            const responsesArray = user.onboardingResponses as { question: string; answer: string }[];
            onboardingContext = "From onboarding, the user answered:\n" + responsesArray
                .map((r: { question: string; answer: string }) => `- Q: ${r.question}\n  A: ${r.answer}`)
                .join("\n");
        }

        let plannerContext = "The user has no active tasks in their planner.";
        if (plannerEntries?.length > 0) {
            const activeTasks = plannerEntries.filter((e: Doc<"plannerEntries">) => e.status === 'pending' || e.status === 'in_progress');
            if (activeTasks.length > 0) {
                plannerContext = "The user is working on:\n" + activeTasks.map((t: Doc<"plannerEntries">) => `- ${t.title} (${t.status})`).join("\n");
            }
        }
        
        const systemPrompt = `
          You are an AI psychiatrist. Your entire methodology for thinking and responding is based on the expert analysis provided in the document below.

          **Core Instructions:**
          1.  **Adopt the Persona:** Think and respond like the psychiatrist in the document. Your style is empathetic, insightful, and you focus on empowering users by reframing their problems.
          2.  **Follow the Methodology:** Use the document's deconstruction of motivation (External vs. Internal), the concept of "freedom vs. burnout," and the focus on "autonomy" as your primary therapeutic tools.
          3.  **Use the "Actionable Questions":** The ultimate goal is to guide the user towards asking themselves the key questions from the document, like "What do I want to say about myself at the end of today?".
          4.  **Integrate User Context:** Use the user's onboarding and planner data to tailor your application of the document's principles to their specific situation.
          5.  **Do Not Mention the Document:** Do not tell the user you are referencing a document. Simply embody its principles.

          <ExampleDocument>
          ${methodologyContent}
          </ExampleDocument>

          **User's Personal Context (For Your Eyes Only):**
          <Onboarding>
          ${onboardingContext}
          </Onboarding>
          <Planner>
          ${plannerContext}
          </Planner>
        `;
        
        const messages: ChatCompletionMessageParam[] = [{ role: "system", content: systemPrompt }, ...history.map((msg: Doc<"transcriptChunks">): ChatCompletionMessageParam => ({ role: msg.role, content: msg.content })).reverse()];

        console.log(`[LOG] Sending to OpenRouter for session ${args.sessionId}`);

        const chatResponse = await openrouter.chat.completions.create({ model: "openai/gpt-4o", messages });
        const assistantResponse = chatResponse.choices[0].message?.content ?? "I'm not sure what to say.";
        
        // Note: If 'internal.chat.addTranscriptChunk' errors, see comment above.
        await ctx.runMutation(internal.chat.addTranscriptChunk, { sessionId: args.sessionId, userId: user._id, role: "assistant", content: assistantResponse });

        const ttsResponse = await fetch("https://api.deepgram.com/v1/speak?model=aura-asteria-en", {
            method: "POST", headers: { "Authorization": `Token ${deepgramApiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ text: assistantResponse }),
        });
        if (!ttsResponse.ok) throw new Error(`Deepgram TTS failed: ${ttsResponse.statusText}`);
        const audioArrayBuffer = await ttsResponse.arrayBuffer();

        return { audio: audioArrayBuffer, userTranscript, assistantResponse };
    },
});

// --- Other Functions (fully defined) ---
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const startConversation = action({
    args: { sessionId: v.id("sessions") },
    handler: async (ctx, args): Promise<ArrayBuffer> => {
        const greeting = "Welcome. To start, could you tell me a bit about what makes you feel you're labeled as 'gifted'?";
        const user = await ctx.runQuery(internal.users.getUserForSession, { sessionId: args.sessionId });
        if (!user) throw new Error("User not found");
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
            headers: { "Authorization": `Token ${deepgramApiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ text: greeting }),
        });
        if (!ttsResponse.ok) throw new Error(`Deepgram TTS failed: ${ttsResponse.statusText}`);
        return await ttsResponse.arrayBuffer();
    }
});

export const endSession = action({
    args: { sessionId: v.id("sessions") },
    handler: async (ctx, args): Promise<{ success: boolean }> => {
        const summaryResult = await ctx.runAction(internal.chat.summarizeSessionAndGenerateTasks, { sessionId: args.sessionId });
        if(!summaryResult.success){
            console.warn(`[LOG] Session summarization may have failed for session ${args.sessionId}: ${summaryResult.reason}`);
        }
        const history = await ctx.runQuery(api.chat.getRecentTranscriptChunks, { sessionId: args.sessionId });
        const user = await ctx.runQuery(internal.users.getUserForSession, { sessionId: args.sessionId });
        if (history.length === 0 || !user) {
             console.error(`[LOG] Insufficient data to update user profile for session ${args.sessionId}`);
            return { success: false };
        }
        const analysisPrompt = `
            As a clinical psychologist, analyze the following therapy session transcript for a user with Gifted Kid Syndrome.
            Previous long-term summary: "${user.longTermProfileSummary || 'N/A'}"
            Previous key insights: ${user.keyInsights ? JSON.stringify(user.keyInsights) : "'N/A'"}
            Transcript (newest first):
            ${history.map((m) => `${m.role}: ${m.content}`).join("\n\n")}
            Instructions:
            1. Refine the "longTermProfileSummary" by integrating new learnings from this session. It must be a CUMULATIVE synthesis.
            2. Refine the "keyInsights" array. Update existing insights or add new ones discovered in this session. Aim for 3-5 core insights.
            3. Return ONLY the following JSON object.
            {
              "longTermProfileSummary": "A dense, clinical paragraph summarizing the user's core struggles, cognitive patterns, emotional state, and progress. This should be a cumulative summary.",
              "keyInsights": [
                { "belief": "A core belief...", "trigger": "A corresponding trigger..." }
              ]
            }`;
        console.log(`[LOG] Sending analysis prompt to OpenRouter for session ${args.sessionId}:`);
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
                     await ctx.runMutation(internal.users.updateUserProfileInsights, { userId: user._id, longTermProfileSummary, keyInsights });
                } else {
                     console.error(`[LOG] Parsed JSON for profile update has incorrect structure for session ${args.sessionId}:`, parsedJson);
                     return { success: false};
                }
            } catch (e) {
                console.error(`[LOG] Failed to parse analysis JSON for session ${args.sessionId}:`, e, "Raw content:", responseContent);
                return { success: false };
            }
        } else {
            console.error(`[LOG] No content in AI analysis response for session ${args.sessionId}.`);
            return { success: false };
        }
        return { success: true };
    }
});

export const summarizeSessionAndGenerateTasks = internalAction({
    args: { sessionId: v.id("sessions") },
    handler: async (ctx: ActionCtx, args: { sessionId: Id<"sessions"> }): Promise<{ success: boolean; reason?: string }> => {
        const history = await ctx.runQuery(api.chat.getRecentTranscriptChunks, { sessionId: args.sessionId });
        if (history.length === 0) return { success: false, reason: "No transcript."};
        const summaryPrompt = `Provide a concise, empathetic summary of this therapy session's key themes and emotional patterns. Address the user in the second person (e.g., "you explored..."). Transcript (newest first): ${history.map((m) => `${m.role}: ${m.content}`).join("\n")}`;
        const summaryResponse = await openrouter.chat.completions.create({ model: "openai/gpt-4o", messages: [{role: "system", content: summaryPrompt}] });
        const summary = summaryResponse.choices[0].message?.content ?? "Could not generate a summary.";
        await ctx.runMutation(internal.sessions.updateSessionSummary, { sessionId: args.sessionId, summary: summary });
        const user = await ctx.runQuery(internal.users.getUserForSession, { sessionId: args.sessionId });
        if (!user) {
            console.error(`[LOG] User not found for session ${args.sessionId} during task generation.`);
            return { success: false, reason: "User not found." };
        }
        const plannerPrompt = `
            Based on the following session summary, generate a JSON object with a key "tasks" containing an array of 2-3 actionable tasks. 
            Use types: 'journal_prompt', 'mindfulness_exercise', 'reflection_question', 'small_action'.
            Each task object needs 'type', 'title', and 'description' keys.
            Tasks must be relevant to the summary and align with CBT principles. Return ONLY the JSON object.
            Session Summary: 
            ${summary}`;
        const plannerResponse = await openrouter.chat.completions.create({
            model: "openai/gpt-4o",
            messages: [{role: "system", content: plannerPrompt}],
            response_format: { type: "json_object" }
        });
        let plannerTasks: any[] = [];
        const responseContent = plannerResponse.choices[0].message?.content;
        if (responseContent) {
            try {
                plannerTasks = JSON.parse(responseContent).tasks || [];
            } catch (e) {
                console.error(`[LOG] Failed to parse planner tasks JSON for session ${args.sessionId}:`, e);
            }
        }
        for (const task of plannerTasks) {
            if (task.type && task.title && task.description) {
                await ctx.runMutation(internal.planner.createPlannerEntry, { userId: user._id, sessionId: args.sessionId, type: task.type, title: task.title, description: task.description });
            }
        }
        return { success: true };
    }
});

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
        if (!session) return [];
        const user = await ctx.db.get(session.userId);
        if (!user || user.clerkUserId !== identity.subject) {
             console.warn(`[LOG] Unauthorized attempt to view transcript for session ${args.sessionId}.`);
             return []; 
        }
        return await ctx.db.query("transcriptChunks")
            .withIndex("by_sessionId_timestamp", q => q.eq("sessionId", args.sessionId))
            .order("desc")
            .take(50);
    },
});