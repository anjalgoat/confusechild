"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Id } from "@/convex/_generated/dataModel";
import { LogOut } from "lucide-react";

type TranscriptMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function SessionPage() {
  const { sessionId } = useParams();
  const router = useRouter();
  const validSessionId = sessionId as Id<"sessions">;

  // State for UI and logic
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnding, setIsEnding] = useState(false); // New state for ending session
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);

  // Refs for audio recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Convex hooks
  const generateUploadUrl = useMutation(api.chat.generateUploadUrl);
  const chatWithAI = useAction(api.chat.chat);
  const startConversationAction = useAction(api.chat.startConversation);
  const endSessionAction = useAction(api.chat.endSession); // New action hook
  const historicTranscript = useQuery(api.chat.getRecentTranscriptChunks, {
    sessionId: validSessionId,
  });

  // Effect to load historic transcript
  useEffect(() => {
    if (historicTranscript) {
      const formattedHistory = historicTranscript
        .map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))
        .reverse();
      setTranscript(formattedHistory);
    }
  }, [historicTranscript]);


  // Effect to play initial greeting
  useEffect(() => {
    if (historicTranscript && historicTranscript.length === 0) {
      setIsPlaying(true);
      startConversationAction({ sessionId: validSessionId })
        .then((audioArrayBuffer) => {
          setTranscript([
            {
              role: "assistant",
              content: "Welcome back. What's been on your mind lately?",
            },
          ]);
          const audioBlob = new Blob([audioArrayBuffer], { type: "audio/mpeg" });
          const audioUrl = URL.createObjectURL(audioBlob);
          const audio = new Audio(audioUrl);
          audio.play();
          audio.onended = () => setIsPlaying(false);
        })
        .catch((e) => {
          console.error("Failed to start conversation:", e);
          setIsPlaying(false);
        });
    }
  }, [historicTranscript, startConversationAction, validSessionId]);


  // --- Recording and AI Interaction Logic (Unchanged) ---
  const handleStartRecording = async () => { /* ... existing code ... */ };
  const handleStopRecording = async () => { /* ... existing code ... */ };

  
  // --- NEW: End Session Handler ---
  const handleEndSession = async () => {
    setIsEnding(true);
    try {
        await endSessionAction({ sessionId: validSessionId });
        // On success, redirect to the dashboard
        router.push("/dashboard");
    } catch (error) {
        console.error("Failed to end session and analyze:", error);
        alert("There was an error ending the session. Please try again.");
        setIsEnding(false); // Reset state on error
    }
  };
  
  const buttonText = isRecording
    ? "Listening..."
    : isPlaying
    ? "AI is Speaking..."
    : "Hold to Speak";

  if (isEnding) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
            <h1 className="text-3xl font-bold mb-4">Analyzing your session...</h1>
            <p className="text-lg text-gray-600">Please wait while we generate your summary and insights.</p>
        </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <div className="w-full max-w-2xl relative">
            {/* End Session Button */}
            <Button
                variant="outline"
                size="icon"
                className="absolute top-4 right-4 z-10"
                onClick={handleEndSession}
                disabled={isRecording || isPlaying}
                title="End Session"
            >
                <LogOut className="h-4 w-4" />
            </Button>
            
            <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl text-left space-y-4">
                <h1 className="text-3xl font-bold mb-2 text-center">Therapy Session</h1>
                
                {/* Transcript Display */}
                <div className="h-96 overflow-y-auto p-4 border rounded-lg bg-gray-50 dark:bg-gray-700 space-y-4">
                {transcript.map((msg, index) => (
                    <div key={index} className={`flex ${ msg.role === "user" ? "justify-end" : "justify-start" }`}>
                    <p className={`max-w-xs md:max-w-md p-3 rounded-lg ${
                        msg.role === "user"
                            ? "bg-blue-500 text-white"
                            : "bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-200"
                        }`}
                    >
                        {msg.content}
                    </p>
                    </div>
                ))}
                {isPlaying && (
                    <div className="flex justify-start">
                    <div className="p-3 rounded-lg bg-gray-200 dark:bg-gray-600">
                        <div className="animate-pulse flex space-x-2">
                        <div className="w-2.5 h-2.5 bg-gray-400 rounded-full"></div>
                        <div className="w-2.5 h-2.5 bg-gray-400 rounded-full"></div>
                        <div className="w-2.5 h-2.5 bg-gray-400 rounded-full"></div>
                        </div>
                    </div>
                    </div>
                )}
                </div>
            </div>
        </div>

      {/* Control Button */}
      <div className="mt-8">
        <Button
          onMouseDown={handleStartRecording}
          onMouseUp={handleStopRecording}
          onTouchStart={handleStartRecording}
          onTouchEnd={handleStopRecording}
          disabled={isPlaying}
          className={`px-8 py-6 rounded-full text-lg font-semibold transition-all duration-200 ${
            isRecording ? "bg-red-600 hover:bg-red-700 scale-105" : "bg-green-600 hover:bg-green-700"
          } ${isPlaying ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {buttonText}
        </Button>
      </div>
    </div>
  );
}