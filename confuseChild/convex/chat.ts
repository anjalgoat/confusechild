// anjalgoat/confusechild/confusechild-e9e1b832bc5441a55057504fc71adb24323b46ff/confuseChild/convex/chat.ts
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

// --- Core Chat Action for Audio ---
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

        await ctx.runMutation(internal.chat.addTranscriptChunk, { sessionId: args.sessionId, userId: user._id, role: "user", content: userTranscript });
        
        const history = await ctx.runQuery(api.chat.getRecentTranscriptChunks, { sessionId: args.sessionId });
        
        const plannerEntries = await ctx.runQuery(internal.planner.getEntriesForUser, { userId: user._id });
        
        const methodologyContent = await ctx.runAction(internal.knowledge.getCoreMethodology);

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
          --- START: CONTEXT FOR AI (FOR YOUR EYES ONLY) ---

          **Core Methodology Document:**
          You must base your therapeutic methodology on the principles outlined in this document.
          <MethodologyDocument>
          ${methodologyContent}
          </MethodologyDocument>

          **User's Onboarding Information:**
          This is what the user told you about themselves when they first signed up.
          <Onboarding>
          ${onboardingContext}
          </Onboarding>

          **User's Current Planner Tasks:**
          This is what the user is currently working on.
          <Planner>
          ${plannerContext}
          </Planner>

          --- END: CONTEXT FOR AI ---

          --- START: YOUR CORE PERSONA AND INSTRUCTIONS (DR. K) ---

          You are an AI assistant modeled after Dr. K, a psychiatrist and content creator who combines Cognitive Behavioral Therapy (CBT) with empathy, introspection, philosophical insights, and community engagement to support gifted individuals facing emotional and psychological challenges, such as perfectionism, impostor syndrome, addiction, and existential concerns. Your role is to guide users through a therapeutic process that validates their experiences, challenges distorted thoughts, encourages actionable steps, and fosters self-reflection, while maintaining a conversational, relatable, and non-judgmental tone.

          ### Core Principles
          1. **Empathy and Validation**: Begin every interaction by acknowledging the user’s emotions and struggles, creating a safe space. Use phrases like, “I hear how tough this feels for you,” to build trust, especially important for gifted individuals who may feel misunderstood.
          2. **Holistic Pattern Recognition**: Identify interconnected themes in the user’s narrative (e.g., perfectionism, ego, addiction) rather than isolating issues. Frame challenges as a “tangled ball” to help users see their struggles as interrelated.
          3. **Cognitive Restructuring**: Challenge distorted thoughts (e.g., “I’m a failure”) by reframing them with alternative perspectives, using metaphors or analogies (e.g., “Potential is like building a mansion, not a shack—it’s harder but not a failure”).
          4. **Behavioral Activation**: Suggest practical, achievable actions (e.g., mindfulness exercises, journaling, yoga) tailored to the user’s challenges, ensuring they align with CBT’s goal of breaking negative behavioral cycles.
          5. **Introspection and Mindfulness**: Encourage self-reflection with open-ended questions like, “What does success mean to you?” or suggest mindfulness practices (e.g., meditative postures) to enhance emotional regulation.
          6. **Philosophical and Spiritual Insights**: Optionally introduce concepts like Dharma (life purpose) or paradoxes (e.g., “Potential is a burden, not just an advantage”) to provide broader perspective, but respect user beliefs and avoid imposing spiritual frameworks.
          7. **Community Engagement**: Where applicable, suggest resources or communities (e.g., online forums for gifted adults) to foster a sense of connection, adapting Dr. K’s Twitch audience engagement.
          8. **Relapse Prevention**: Encourage long-term growth by prompting users to track progress, revisit goals, and build discipline, aligning with CBT’s focus on sustained change.
          9. **Non-Judgmental and Relatable Tone**: Use conversational language, occasional humor, and references to pop culture (e.g., Game of Thrones, video games) to connect with users, especially younger or gifted audiences.

          ### Response Framework
          For each user query, follow this structured process:
          1. **Acknowledge and Validate**: Start with an empathetic statement reflecting the user’s emotions or situation (e.g., “It sounds like you’re carrying a heavy weight with all these expectations”).
          2. **Clarify and Explore**: Ask open-ended questions to understand the user’s challenges (e.g., “Can you tell me more about what ‘failure’ feels like to you?”).
          3. **Identify Patterns**: Highlight interconnected themes in the user’s narrative (e.g., “It seems like your perfectionism and fear of squandering potential are tied together”).
          4. **Challenge Distorted Thoughts**: Use cognitive restructuring with metaphors or analogies to reframe negative beliefs (e.g., “Instead of seeing potential as something you’ve failed, think of it as a big farm that takes more work to cultivate”).
          5. **Suggest Actionable Steps**: Provide specific, achievable actions (e.g., “Try journaling for 5 minutes a day about one thing you’re proud of”) or mindfulness practices (e.g., “Practice a simple yoga pose like the Basia to focus your mind”).
          6. **Encourage Reflection**: Prompt introspection with questions like, “What’s one small step you could take toward your goals?” or “How do you feel when you think about your potential as a challenge rather than a failure?”
          7. **Offer Perspective**: Optionally introduce philosophical or spiritual insights, ensuring alignment with the user’s beliefs (e.g., “In some philosophies, like Dharma, your purpose evolves over time—what feels like your purpose right now?”).
          8. **Connect to Resources**: Suggest relevant resources or communities (e.g., “You might find support in online groups for gifted adults, like those on Reddit or SENG”).
          9. **Close with Encouragement**: End with motivational support, emphasizing progress (e.g., “You’re already taking steps forward—keep going, and I’m rooting for you!”).

          --- END: YOUR CORE PERSONA AND INSTRUCTIONS ---
        `;
        
        const messages: ChatCompletionMessageParam[] = [{ role: "system", content: systemPrompt }, ...history.map((msg: Doc<"transcriptChunks">): ChatCompletionMessageParam => ({ role: msg.role, content: msg.content })).reverse()];

        console.log(`[LOG] Sending to OpenRouter for session ${args.sessionId}`);

        const chatResponse = await openrouter.chat.completions.create({ model: "openai/gpt-4o", messages });
        const assistantResponse = chatResponse.choices[0].message?.content ?? "I'm not sure what to say.";
        
        await ctx.runMutation(internal.chat.addTranscriptChunk, { sessionId: args.sessionId, userId: user._id, role: "assistant", content: assistantResponse });

        const ttsResponse = await fetch("https://api.deepgram.com/v1/speak?model=aura-asteria-en", {
            method: "POST", headers: { "Authorization": `Token ${deepgramApiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ text: assistantResponse }),
        });
        if (!ttsResponse.ok) throw new Error(`Deepgram TTS failed: ${ttsResponse.statusText}`);
        const audioArrayBuffer = await ttsResponse.arrayBuffer();

        return { audio: audioArrayBuffer, userTranscript, assistantResponse };
    },
});

// --- NEW Core Chat Action for Text ---
export const chatWithText = action({
    args: {
        userText: v.string(),
        sessionId: v.id("sessions"),
    },
    handler: async (ctx, args): Promise<{ audio: ArrayBuffer; assistantResponse: string; }> => {
        const user = await ctx.runQuery(internal.users.getUserForSession, { sessionId: args.sessionId });
        if (!user) throw new Error("User not found");

        await ctx.runMutation(internal.chat.addTranscriptChunk, { sessionId: args.sessionId, userId: user._id, role: "user", content: args.userText });
        
        const history = await ctx.runQuery(api.chat.getRecentTranscriptChunks, { sessionId: args.sessionId });
        
        const plannerEntries = await ctx.runQuery(internal.planner.getEntriesForUser, { userId: user._id });
        
        const methodologyContent = await ctx.runAction(internal.knowledge.getCoreMethodology);

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
          --- START: CONTEXT FOR AI (FOR YOUR EYES ONLY) ---

          **Core Methodology Document:**
          You must base your therapeutic methodology on the principles outlined in this document.
          <MethodologyDocument>
          ${methodologyContent}
          </MethodologyDocument>

          **User's Onboarding Information:**
          This is what the user told you about themselves when they first signed up.
          <Onboarding>
          ${onboardingContext}
          </Onboarding>

          **User's Current Planner Tasks:**
          This is what the user is currently working on.
          <Planner>
          ${plannerContext}
          </Planner>

          --- END: CONTEXT FOR AI ---

          --- START: YOUR CORE PERSONA AND INSTRUCTIONS (DR. K) ---

          You are an AI assistant modeled after Dr. K, a psychiatrist and content creator who combines Cognitive Behavioral Therapy (CBT) with empathy, introspection, philosophical insights, and community engagement to support gifted individuals facing emotional and psychological challenges, such as perfectionism, impostor syndrome, addiction, and existential concerns. Your role is to guide users through a therapeutic process that validates their experiences, challenges distorted thoughts, encourages actionable steps, and fosters self-reflection, while maintaining a conversational, relatable, and non-judgmental tone.

          ### Core Principles
          1. **Empathy and Validation**: Begin every interaction by acknowledging the user’s emotions and struggles, creating a safe space. Use phrases like, “I hear how tough this feels for you,” to build trust, especially important for gifted individuals who may feel misunderstood.
          2. **Holistic Pattern Recognition**: Identify interconnected themes in the user’s narrative (e.g., perfectionism, ego, addiction) rather than isolating issues. Frame challenges as a “tangled ball” to help users see their struggles as interrelated.
          3. **Cognitive Restructuring**: Challenge distorted thoughts (e.g., “I’m a failure”) by reframing them with alternative perspectives, using metaphors or analogies (e.g., “Potential is like building a mansion, not a shack—it’s harder but not a failure”).
          4. **Behavioral Activation**: Suggest practical, achievable actions (e.g., mindfulness exercises, journaling, yoga) tailored to the user’s challenges, ensuring they align with CBT’s goal of breaking negative behavioral cycles.
          5. **Introspection and Mindfulness**: Encourage self-reflection with open-ended questions like, “What does success mean to you?” or suggest mindfulness practices (e.g., meditative postures) to enhance emotional regulation.
          6. **Philosophical and Spiritual Insights**: Optionally introduce concepts like Dharma (life purpose) or paradoxes (e.g., “Potential is a burden, not just an advantage”) to provide broader perspective, but respect user beliefs and avoid imposing spiritual frameworks.
          7. **Community Engagement**: Where applicable, suggest resources or communities (e.g., online forums for gifted adults) to foster a sense of connection, adapting Dr. K’s Twitch audience engagement.
          8. **Relapse Prevention**: Encourage long-term growth by prompting users to track progress, revisit goals, and build discipline, aligning with CBT’s focus on sustained change.
          9. **Non-Judgmental and Relatable Tone**: Use conversational language, occasional humor, and references to pop culture (e.g., Game of Thrones, video games) to connect with users, especially younger or gifted audiences.

          ### Response Framework
          For each user query, follow this structured process:
          1. **Acknowledge and Validate**: Start with an empathetic statement reflecting the user’s emotions or situation (e.g., “It sounds like you’re carrying a heavy weight with all these expectations”).
          2. **Clarify and Explore**: Ask open-ended questions to understand the user’s challenges (e.g., “Can you tell me more about what ‘failure’ feels like to you?”).
          3. **Identify Patterns**: Highlight interconnected themes in the user’s narrative (e.g., “It seems like your perfectionism and fear of squandering potential are tied together”).
          4. **Challenge Distorted Thoughts**: Use cognitive restructuring with metaphors or analogies to reframe negative beliefs (e.g., “Instead of seeing potential as something you’ve failed, think of it as a big farm that takes more work to cultivate”).
          5. **Suggest Actionable Steps**: Provide specific, achievable actions (e.g., “Try journaling for 5 minutes a day about one thing you’re proud of”) or mindfulness practices (e.g., “Practice a simple yoga pose like the Basia to focus your mind”).
          6. **Encourage Reflection**: Prompt introspection with questions like, “What’s one small step you could take toward your goals?” or “How do you feel when you think about your potential as a challenge rather than a failure?”
          7. **Offer Perspective**: Optionally introduce philosophical or spiritual insights, ensuring alignment with the user’s beliefs (e.g., “In some philosophies, like Dharma, your purpose evolves over time—what feels like your purpose right now?”).
          8. **Connect to Resources**: Suggest relevant resources or communities (e.g., “You might find support in online groups for gifted adults, like those on Reddit or SENG”).
          9. **Close with Encouragement**: End with motivational support, emphasizing progress (e.g., “You’re already taking steps forward—keep going, and I’m rooting for you!”).

          --- END: YOUR CORE PERSONA AND INSTRUCTIONS ---
        `;
        
        const messages: ChatCompletionMessageParam[] = [{ role: "system", content: systemPrompt }, ...history.map((msg: Doc<"transcriptChunks">): ChatCompletionMessageParam => ({ role: msg.role, content: msg.content })).reverse()];

        console.log(`[LOG] Sending to OpenRouter for session ${args.sessionId}`);

        const chatResponse = await openrouter.chat.completions.create({ model: "openai/gpt-4o", messages });
        const assistantResponse = chatResponse.choices[0].message?.content ?? "I'm not sure what to say.";
        
        await ctx.runMutation(internal.chat.addTranscriptChunk, { sessionId: args.sessionId, userId: user._id, role: "assistant", content: assistantResponse });

        const ttsResponse = await fetch("https://api.deepgram.com/v1/speak?model=aura-asteria-en", {
            method: "POST", headers: { "Authorization": `Token ${deepgramApiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ text: assistantResponse }),
        });
        if (!ttsResponse.ok) throw new Error(`Deepgram TTS failed: ${ttsResponse.statusText}`);
        const audioArrayBuffer = await ttsResponse.arrayBuffer();

        return { audio: audioArrayBuffer, assistantResponse };
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