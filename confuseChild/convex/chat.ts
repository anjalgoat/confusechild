import { v } from "convex/values";
import { action, mutation, query, internalMutation, internalAction, ActionCtx } from "./_generated/server";
import { api, internal } from "./_generated/api";
import OpenAI from 'openai';
import { Doc, Id } from "./_generated/dataModel";
import { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// Initialize the OpenAI client for OpenRouter (LLM Brain)
const openrouter = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000", // Replace with your deployed app's URL in production
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
        
        let onboardingContext = "The user has not yet completed the onboarding questionnaire or the responses are not available.";
        if (user.onboardingCompleted && user.onboardingResponses) {
            const responses = user.onboardingResponses;
            onboardingContext = `
                The user has shared the following during their onboarding, which may provide context to their current struggles. Use this information to guide your understanding and empathy, but do not refer to these answers explicitly unless the user brings up these topics in the current conversation:
                - On perfectionism pressure: ${responses.q1_perfectionism_pressure || 'Not specified'}
                - Feelings about fear of failure: ${responses.q2_fear_of_failure_feeling || 'Not specified'}
                - Doubts related to imposter syndrome: ${responses.q3_imposter_syndrome_doubt || 'Not specified'}
                - Procrastination under pressure: ${responses.q4_procrastination_pressure || 'Not specified'}
                - Sense of alienation: ${responses.q5_sense_of_alienation || 'Not specified'}
                - Career dissatisfaction: ${responses.q6_career_dissatisfaction || 'Not specified'}
            `;
        }
        
        const systemPrompt = `
            You are an advanced AI psychiatrist with deep expertise in adult psychology, particularly in individuals experiencing "Gifted Kid Syndrome" (GKS). Your approach combines insights from Cognitive Behavioral Therapy (CBT), schema therapy, and contemporary psychiatry to help users identify and transform unhelpful cognitive patterns, emotional triggers, and behavioral loops. You do not just reflect the user’s thoughts; you actively analyze, interpret, and gently challenge them — taking some responsibility in offering insights and guidance.

            You are not a passive therapist. Your role includes:

            - Diagnosing patterns of cognitive bias (even without a formal label).
            - Pointing out maladaptive beliefs or defense mechanisms *when observed*.
            - Reframing destructive self-talk into more grounded perspectives.
            - Naming psychological mechanisms that may be occurring, using accessible and non-clinical language.
            - Validating feelings **and** offering a professional interpretation to help the user understand their mental processes.
            - Holding a collaborative, yet slightly directive role — like a real psychiatrist who can explain what’s happening in the mind.

            ---

            **User Context (from Onboarding - for your understanding, do not quote directly):**
            ${onboardingContext}

            ---

            **Your Advanced Framework for Therapy (CBT + Schema-Informed for GKS):**

            1. **Deep Empathy First:** Always begin by validating the user's emotional experience. Make them feel truly seen and safe.

            2. **Pattern Detection:** Identify internalized rules ("I must always achieve"), early maladaptive schemas (e.g., defectiveness, unrelenting standards), and repeated emotional cycles. Reflect these back to the user when appropriate.

            3. **Bias Interpretation:** Actively point out and name common cognitive distortions and biases when they arise:
            - **All-or-Nothing Thinking**
            - **Catastrophizing**
            - **Overgeneralization**
            - **Mind Reading**
            - **Discounting the Positive**
            - **Should Statements**
            - **Emotional Reasoning**
            - etc.

            Frame these not as judgments, but as common *glitches* in human cognition — especially for gifted minds under chronic internal pressure.

            4. **GKS-Focused Themes (Your Specialty):**
            - **Perfectionism:** Help the user *see* how high standards were internalized early. Identify what they’re afraid will happen if they "fail."
            - **Fear of Failure:** Explore the user's implicit definitions of success/failure. Reframe fear through evidence, not encouragement alone.
            - **Imposter Syndrome:** Highlight and challenge how the user discounts their abilities. Reflect their actual achievements without sounding cheerlead-y.
            - **Procrastination:** Explain the neuroscience of avoidance (e.g., threat-response loop). Help the user untangle emotional blocks beneath task avoidance.
            - **Alienation:** Validate the sense of feeling “different,” and explore how early praise or alienation shaped their relational style.

            5. **Guide with Interpretation (Not Just Questions):**
            You are allowed to interpret patterns *before* the user is fully aware of them — like a psychiatrist would — but always do this gently and collaboratively. Use phrases like:
            - “It sounds like you might be internalizing a ‘critical voice’ that says...”
            - “That sounds like a classic example of catastrophizing — assuming the worst will definitely happen.”
            - “Can I offer a perspective I’m seeing emerge here?”

            6. **Language Style & Emotional Tone:**
            - Warm, emotionally intelligent, and insightful.
            - Use metaphor, reframe narratives, and clarify psychological concepts when helpful.
            - No excessive jargon — use real, human, clear phrasing.
            - Mirror the user's energy, but always lead toward calm, clarity, and groundedness.

            7. **Structure Your Session Gently:**
            While free-flowing, periodically check:
            - What emotion is strongest right now?
            - What core belief is driving their discomfort?
            - What insight or reframing might help them move forward?

            ---

            You are not just here to reflect. You are here to **help them see**, **name**, and **understand** the internal patterns holding them back — and gently guide them toward more adaptive ways of thinking and feeling.

            Start the conversation with warmth and openness. Let them lead, but do not hesitate to offer a mirror to their mind.
            `;

        
        const messages: ChatCompletionMessageParam[] = [
            { role: "system", content: systemPrompt },
            ...history.map((msg: Doc<"transcriptChunks">): ChatCompletionMessageParam => ({ role: msg.role, content: msg.content })).reverse() 
        ];

        // --- ADDED LOGGING HERE ---
        console.log(`[LOG] Sending messages to OpenRouter for session ${args.sessionId}:`);
        console.log(JSON.stringify(messages, null, 2)); // Pretty-print JSON for readability

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
        const greeting = "Welcome. It's good to connect. What's on your mind today?";
        
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
        const summaryResult = await ctx.runAction(internal.chat.summarizeSessionAndGenerateTasks, { sessionId: args.sessionId });
        if(!summaryResult.success){
            console.warn(`[LOG] Session summarization and task generation may have failed for session ${args.sessionId}: ${summaryResult.reason}`);
        }

        const history = await ctx.runQuery(api.chat.getRecentTranscriptChunks, { sessionId: args.sessionId });
        const user = await ctx.runQuery(internal.users.getUserForSession, { sessionId: args.sessionId });

        if (history.length === 0 || !user) {
             console.error(`[LOG] Insufficient data to update user profile: No history or user not found for session ${args.sessionId}`);
            return { success: false };
        }

        const analysisPrompt = `
            As a clinical psychologist, analyze the following therapy session transcript for a user with Gifted Kid Syndrome.
            The user's previous long-term profile summary is: "${user.longTermProfileSummary || 'No previous summary available.'}"
            The user's previous key insights were: ${user.keyInsights ? JSON.stringify(user.keyInsights) : "'No previous key insights.'"}

            Transcript (newest messages first):
            ${history.map((m: Doc<"transcriptChunks">) => `${m.role}: ${m.content}`).join("\n\n")}

            Based ONLY on the provided transcript and the existing profile information, generate a response with the following JSON structure.
            Update the longTermProfileSummary to be a CUMULATIVE and REFINED summary. It should integrate new learnings from THIS session into the existing summary, making it more nuanced. Do not just append; synthesize.
            The keyInsights should also be CUMULATIVE. Review the existing key insights. If new insights from this session are variations of existing ones, refine the existing insight. If they are genuinely new, add them. Aim for 3-5 highly relevant key insights in total. Each insight should represent a core, often subconscious, belief and a common situation/feeling that typically reveals or activates this belief for this user.

            {
              "longTermProfileSummary": "A dense, clinical paragraph summarizing the user's core struggles, cognitive patterns, emotional state, and any progress made. This summary should be cumulative, building on the previous one by integrating insights from the current session.",
              "keyInsights": [
                {
                  "belief": "A core belief the user holds (e.g., 'My worth is tied to my achievements.' or 'I must always be highly competent.')",
                  "trigger": "The situation, thought, or feeling that reveals this belief (e.g., 'Receiving critical feedback,' or 'Feeling unsure how to proceed on a complex task.')"
                }
              ]
            }

            Produce ONLY the JSON object and nothing else.
        `;
        
        // --- ADDED LOGGING HERE ---
        console.log(`[LOG] Sending analysis prompt to OpenRouter for session ${args.sessionId}:`);
        console.log(JSON.stringify([{ role: "system", content: analysisPrompt }], null, 2));


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
                
                if (longTermProfileSummary && Array.isArray(keyInsights) && keyInsights.every(insight => insight.belief && insight.trigger)) {
                     await ctx.runMutation(internal.users.updateUserProfileInsights, {
                        userId: user._id,
                        longTermProfileSummary,
                        keyInsights,
                    });
                } else {
                     console.error(`[LOG] Parsed JSON from AI for profile update is missing required fields or has incorrect structure for session ${args.sessionId}:`, parsedJson);
                     return { success: false};
                }
            } catch (e) {
                console.error(`[LOG] Failed to parse analysis JSON from AI response for profile update on session ${args.sessionId}:`, e, "Raw content:", responseContent);
                return { success: false };
            }
        } else {
            console.error(`[LOG] No content in AI response for profile update for session ${args.sessionId}.`);
            return { success: false };
        }
        return { success: true };
    }
});

export const summarizeSessionAndGenerateTasks = internalAction({
    args: { sessionId: v.id("sessions") },
    handler: async (ctx: ActionCtx, args: { sessionId: Id<"sessions"> }): Promise<{ success: boolean; reason?: string }> => {
        const history = await ctx.runQuery(api.chat.getRecentTranscriptChunks, { sessionId: args.sessionId });
        if (history.length === 0) return { success: false, reason: "No transcript to summarize."};

        const summaryPrompt = `Please act as a therapist and provide a concise, empathetic summary of this therapy session's key themes, emotional patterns, and core beliefs discussed. Address the user directly in the second person (e.g., "In this session, you explored..."). Focus on what was most significant. Transcript (newest messages first): ${history.map((m: Doc<"transcriptChunks">) => `${m.role}: ${m.content}`).join("\n")}`;
        
        // --- ADDED LOGGING HERE ---
        console.log(`[LOG] Sending summary prompt to OpenRouter for session ${args.sessionId}:`);
        console.log(JSON.stringify([{role: "system", content: summaryPrompt}], null, 2));

        const summaryResponse = await openrouter.chat.completions.create({ model: "openai/gpt-4o", messages: [{role: "system", content: summaryPrompt}] });
        const summary = summaryResponse.choices[0].message?.content ?? "Could not generate a summary for this session.";

        await ctx.runMutation(internal.sessions.updateSessionSummary, { sessionId: args.sessionId, summary: summary });

        const user = await ctx.runQuery(internal.users.getUserForSession, { sessionId: args.sessionId });
        if (!user) {
            console.error(`[LOG] User not found when trying to generate planner tasks for session: ${args.sessionId}`);
            return { success: false, reason: "User not found for this session." };
        }
        
        let onboardingContext = "";
        if (user.onboardingCompleted && user.onboardingResponses) {
            const responses = user.onboardingResponses;
            onboardingContext = `
                Consider these user's initial self-reported challenges when generating tasks:
                - Perfectionism pressure: ${responses.q1_perfectionism_pressure || 'N/A'}
                - Fear of failure: ${responses.q2_fear_of_failure_feeling || 'N/A'}
                - Imposter syndrome: ${responses.q3_imposter_syndrome_doubt || 'N/A'}
                - Procrastination: ${responses.q4_procrastination_pressure || 'N/A'}
                - Alienation: ${responses.q5_sense_of_alienation || 'N/A'}
                - Career dissatisfaction: ${responses.q6_career_dissatisfaction || 'N/A'}
            `;
        }

        const plannerPrompt = `
            Based on the following therapy session summary and user's initial context, generate a JSON object with a single key "tasks". 
            This key should contain an array of 2-3 actionable and personalized tasks that could help the user continue their reflection and growth. 
            Use these types: 'journal_prompt' (for introspection), 'mindfulness_exercise' (for grounding/awareness), 'reflection_question' (for deeper thought), or 'small_action' (a small behavioral step).
            Each task object should have 'type', 'title' (concise), and 'description' (clear instructions or prompt) keys.
            Tasks should be directly relevant to what was discussed or implied in the summary and align with CBT principles (e.g. identifying thoughts, challenging beliefs, behavioral activation).
            Return ONLY the JSON object.

            User's Initial Context:
            ${onboardingContext}

            Session Summary: 
            ${summary}
        `;
        
        // --- ADDED LOGGING HERE ---
        console.log(`[LOG] Sending planner prompt to OpenRouter for session ${args.sessionId}:`);
        console.log(JSON.stringify([{role: "system", content: plannerPrompt}], null, 2));
        
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
                console.error(`[LOG] Failed to parse planner tasks JSON from AI response for session ${args.sessionId}:`, e, "Raw content:", responseContent);
            }
        }

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
            return [];
        }

        const user = await ctx.db.get(session.userId);
        if (!user || user.clerkUserId !== identity.subject) {
             console.warn(`[LOG] User not authorized to view transcript for session ${args.sessionId} or user/session mismatch.`);
             return []; 
        }

        return await ctx.db.query("transcriptChunks")
            .withIndex("by_sessionId_timestamp", q => q.eq("sessionId", args.sessionId))
            .order("desc")
            .take(50);
    },
});