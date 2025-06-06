// anjalgoat/confusechild/confusechild-e9e1b832bc5441a55057504fc71adb24323b46ff/confuseChild/app/session/[sessionId]/page.tsx
"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useRef, useEffect, FormEvent } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Id } from "@/convex/_generated/dataModel";
import { LogOut, Mic, Square, Send } from "lucide-react";

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
  const [isEnding, setIsEnding] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [textInput, setTextInput] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Refs for audio recording
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Convex hooks
  const generateUploadUrl = useMutation(api.chat.generateUploadUrl);
  const chatWithAI = useAction(api.chat.chat);
  const chatWithText = useAction(api.chat.chatWithText);
  const startConversationAction = useAction(api.chat.startConversation);
  const endSessionAction = useAction(api.chat.endSession);
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
              content: "Welcome. To start, could you tell me a bit about what makes you feel you're labeled as 'gifted'?",
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

  const handleStartRecording = async () => {
    setIsRecording(true);
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      mediaRecorderRef.current.start();
    } catch (error) {
      console.error("Microphone access denied:", error);
      alert("Microphone access is required. Please enable it in your browser settings.");
      setIsRecording(false);
    }
  };

  const handleStopRecording = async () => {
    setIsRecording(false);
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();

      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setIsPlaying(true);

        try {
          const uploadUrl = await generateUploadUrl();
          const uploadResponse = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": "audio/webm" },
            body: audioBlob,
          });
          const { storageId } = await uploadResponse.json();

          const result = await chatWithAI({
            storageId,
            sessionId: validSessionId,
          });

          setTranscript((prev) => [
            ...prev,
            { role: "user", content: result.userTranscript },
            { role: "assistant", content: result.assistantResponse },
          ]);

          const audioPlayer = new Audio(URL.createObjectURL(
            new Blob([result.audio], { type: "audio/mpeg" })
          ));
          audioPlayer.play();
          audioPlayer.onended = () => {
            setIsPlaying(false);
          };
        } catch (error) {
          console.error("Error in AI chat flow:", error);
          alert("There was an error processing your request. Please try again.");
          setIsPlaying(false);
        }
      };
    }
  };
  
  const handleSendTextMessage = async (e: FormEvent) => {
    e.preventDefault();
    if (textInput.trim() === "" || isPlaying || isRecording || isSending) return;

    const messageToSend = textInput;
    setTextInput("");
    setIsSending(true);
    
    setTranscript((prev) => [...prev, { role: "user", content: messageToSend }]);

    try {
      const result = await chatWithText({
        userText: messageToSend,
        sessionId: validSessionId,
      });

      setTranscript((prev) => [
        ...prev,
        { role: "assistant", content: result.assistantResponse },
      ]);
      
      setIsPlaying(true);
      const audioPlayer = new Audio(URL.createObjectURL(
        new Blob([result.audio], { type: "audio/mpeg" })
      ));
      audioPlayer.play();
      audioPlayer.onended = () => {
        setIsPlaying(false);
      };

    } catch (error) {
      console.error("Error in text chat flow:", error);
      alert("There was an error sending your message. Please try again.");
      setTranscript(prev => prev.slice(0, -1)); 
    } finally {
      setIsSending(false);
    }
  };


  const handleEndSession = async () => {
    setIsEnding(true);
    if (isRecording) {
      handleStopRecording();
    }
    try {
      await endSessionAction({ sessionId: validSessionId });
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to end session and analyze:", error);
      alert("There was an error ending the session. Please try again.");
      setIsEnding(false);
    }
  };

  if (isEnding) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
        <h1 className="text-3xl font-bold mb-4">Analyzing your session...</h1>
        <p className="text-lg text-gray-600">Please wait while we generate your summary and insights.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-2xl relative">
        <Button
          variant="outline"
          size="icon"
          className="absolute top-4 right-4 z-10"
          onClick={handleEndSession}
          disabled={isRecording || isPlaying || isSending}
          title="End Session"
        >
          <LogOut className="h-4 w-4" />
        </Button>
        
        <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl text-left space-y-4">
          <h1 className="text-3xl font-bold mb-2 text-center">Therapy Session</h1>
          <div className="h-96 overflow-y-auto p-4 border rounded-lg bg-gray-50 dark:bg-gray-700 space-y-4">
            {transcript.map((msg, index) => (
              <div key={index} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <p className={`max-w-xs md:max-w-md p-3 rounded-lg ${
                  msg.role === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-gray-200"
                }`}>
                  {msg.content}
                </p>
              </div>
            ))}
            {(isPlaying || isSending) && !isRecording && (
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

      <div className="mt-8 w-full max-w-2xl">
        <div className="flex justify-center mb-4">
          {!isRecording ? (
            <Button
              onClick={handleStartRecording}
              disabled={isPlaying || isSending}
              className="px-8 py-6 rounded-full text-lg font-semibold transition-all duration-200 bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              <Mic className="mr-2 h-6 w-6" />
              Speak
            </Button>
          ) : (
            <Button
              onClick={handleStopRecording}
              className="px-8 py-6 rounded-full text-lg font-semibold transition-all duration-200 bg-red-600 hover:bg-red-700 animate-pulse"
            >
              <Square className="mr-2 h-6 w-6" />
              Stop
            </Button>
          )}
        </div>
        
        <form onSubmit={handleSendTextMessage} className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Or type your message here..."
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            disabled={isRecording || isPlaying || isSending}
            className="flex-grow"
          />
          <Button type="submit" size="icon" disabled={isRecording || isPlaying || isSending || textInput.trim() === ""}>
            <Send className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}