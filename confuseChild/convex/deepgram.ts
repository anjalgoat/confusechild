// anjalgoat/confusechild/confusechild-4e02ccc8575e0002f8456ba867037f8f963ef573/confuseChild/convex/deepgram.ts

"use use node"; // Required for using the Deepgram SDK in Convex
import { action } from "./_generated/server";
import { createClient } from "@deepgram/sdk";

/**
 * Creates a short-lived, scoped API key for a client to connect to Deepgram.
 */
export const createToken = action({
  args: {},
  handler: async (ctx) => {
    // Ensure you have DEEPGRAM_API_KEY and DEEPGRAM_PROJECT_ID in your Convex dashboard
    const deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    const deepgramProjectId = process.env.DEEPGRAM_PROJECT_ID;

    if (!deepgramApiKey || !deepgramProjectId) {
      throw new Error("Deepgram API Key or Project ID is not set in environment variables.");
    }
    
    const deepgram = createClient(deepgramApiKey);

    // Using the correct v3 SDK syntax for creating a key
    const response = await deepgram.manage.createProjectKey(
      deepgramProjectId,
      {
        comment: "Temporary key for AI Therapist session",
        // --- FIX: Change the scope to "member" to allow conversational AI ---
        scopes: ["member"], 
        timeToLiveInSeconds: 60 * 10, // Key is valid for 10 minutes
      }
    );

    if (response.error) {
      throw new Error(`Failed to create Deepgram token: ${response.error.message}`);
    }
    
    const apiKey = response.result;

    if (!apiKey?.key) {
      throw new Error("Deepgram key object or key string is unexpectedly null.");
    }

    return apiKey.key; // Return only the key string
  },
});