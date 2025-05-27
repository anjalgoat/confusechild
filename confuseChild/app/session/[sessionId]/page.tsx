"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";

const AGENT_WEBSOCKET_URL = "wss://agent.deepgram.com/v1/agent/converse";

export default function SessionPage() {
  const { sessionId } = useParams();
  const createDeepgramToken = useAction(api.deepgram.createToken);

  // --- State Management ---
  const [isListening, setIsListening] = useState(false);
  const [connectionState, setConnectionState] = useState("Closed");
  const [transcript, setTranscript] = useState("");
  const [debugMessages, setDebugMessages] = useState<string[]>([]); // NEW: For on-screen logging

  // --- Refs for WebSocket and Microphone ---
  const socketRef = useRef<WebSocket | null>(null);
  const microphoneRef = useRef<MediaRecorder | null>(null);
  const audioQueue = useRef<HTMLAudioElement[]>([]);

  // --- Helper to add debug messages ---
  const addDebug = useCallback((message: string) => {
    console.log(message); // Also log to console for good measure
    setDebugMessages(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  }, []);

  const processAudioQueue = useCallback(() => {
    if (audioQueue.current.length > 0) {
      const audio = audioQueue.current[0];
      audio.play().catch(e => addDebug(`Audio playback error: ${e.message}`));
      audio.onended = () => {
        audioQueue.current.shift();
        processAudioQueue();
      };
    }
  }, [addDebug]);

  const stopConversation = useCallback(() => {
    addDebug("Stop conversation requested.");
    if (microphoneRef.current && microphoneRef.current.state !== "inactive") {
      microphoneRef.current.stop();
      addDebug("Microphone stopped.");
    }
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.close();
      addDebug("WebSocket closing.");
    }
    microphoneRef.current = null;
    socketRef.current = null;
    setIsListening(false);
    setConnectionState("Closed");
  }, [addDebug]);

  const startConversation = useCallback(async () => {
    addDebug("--- Attempting to start conversation ---");
    setIsListening(true);
    setDebugMessages([]); // Clear previous logs

    try {
      addDebug("1. Fetching temporary API token from Convex...");
      const token = await createDeepgramToken();
      if (!token) {
        addDebug("ERROR: Failed to get a temporary API token. Token is null.");
        setIsListening(false);
        return;
      }
      addDebug("2. Successfully fetched token.");

      addDebug(`3. Creating WebSocket connection to: ${AGENT_WEBSOCKET_URL}`);
      const socket = new WebSocket(AGENT_WEBSOCKET_URL, ["token", token]);
      socketRef.current = socket;

      socket.onopen = () => {
        addDebug("✅ 4. WebSocket onopen event fired. Connection successful!");
        setConnectionState("Connected");

        addDebug("5. Sending agent configuration settings...");
        const settings = {
          type: "Settings",
          agent: {
            listen: { model: "nova-2" },
            think: { provider: "deepgram", prompt: "You are a helpful AI assistant." },
            speak: { model: "aura-asteria-en" },
          },
        };
        socket.send(JSON.stringify(settings));

        addDebug("6. Requesting microphone access...");
        navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true } })
          .then(stream => {
            addDebug("✅ 7. Microphone access granted.");
            const mic = new MediaRecorder(stream, { mimeType: "audio/webm" });
            microphoneRef.current = mic;
            mic.ondataavailable = (event) => {
              if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
                socket.send(event.data);
              }
            };
            mic.start(250);
            addDebug("8. Microphone recording started.");
          })
          .catch(micError => {
            addDebug(`❌ ERROR: Microphone access denied: ${micError.message}`);
            stopConversation();
          });
      };

      socket.onmessage = (event) => {
        if (typeof event.data === "string") {
          const message = JSON.parse(event.data);
          addDebug(`📬 Received message: ${message.type}`);
          if (message.type === "ConversationText") {
              setTranscript(prev => prev + `\n${message.role}: ${message.content}`);
          }
        } else if (event.data instanceof Blob) {
          addDebug("🎧 Received audio data blob.");
          const audioUrl = URL.createObjectURL(event.data);
          const audio = new Audio(audioUrl);
          audioQueue.current.push(audio);
          if (audioQueue.current.length === 1) {
            processAudioQueue();
          }
        }
      };

      socket.onerror = (error) => {
        addDebug("❌ WebSocket onerror event fired.");
        console.error("WebSocket Error Object:", error);
      };

      socket.onclose = (event) => {
        addDebug(`🔌 WebSocket onclose event fired. Code: ${event.code}, Reason: ${event.reason}`);
        setConnectionState("Closed");
      };

    } catch (e) {
      addDebug(`❌ CRITICAL ERROR in startConversation: ${e instanceof Error ? e.message : "Unknown error"}`);
      setIsListening(false);
    }
  }, [createDeepgramToken, stopConversation, processAudioQueue, addDebug]);

  useEffect(() => {
    return () => stopConversation();
  }, [stopConversation]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-2xl p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl text-left space-y-4">
        <h1 className="text-3xl font-bold mb-2 text-center">Therapy Session</h1>
        <p className="text-center capitalize">Connection: {connectionState}</p>
        
        <div>
          <h2 className="font-bold">Transcript:</h2>
          <pre className="text-gray-700 dark:text-gray-300 h-48 overflow-y-auto whitespace-pre-wrap font-sans">
            {transcript}
          </pre>
        </div>
      </div>

      <div className="mt-8">
        <Button onClick={isListening ? stopConversation : startConversation}>
          {isListening ? "Stop Conversation" : "Start Conversation"}
        </Button>
      </div>
      
      {/* --- NEW: On-Screen Debug Log --- */}
      <div className="w-full max-w-2xl mt-4 p-4 bg-gray-50 dark:bg-gray-800 border rounded-lg">
          <h3 className="font-bold text-lg mb-2">Debug Log</h3>
          <pre className="h-64 overflow-y-auto text-xs text-gray-600 dark:text-gray-300">
            {debugMessages.join('\n')}
          </pre>
      </div>
    </div>
  );
}