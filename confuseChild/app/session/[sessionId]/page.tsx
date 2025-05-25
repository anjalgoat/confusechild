"use client";

import { useParams } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  LiveClient,
  LiveTranscriptionEvents,
  createClient,
  LiveConnectionState,
} from "@deepgram/sdk";

// --- Step 1: Bare-minimum options for a transcription-only connection
const transcriptionOptions = {
  model: "nova-2-speech",
  language: "en-US",
  smart_format: true,
};

// --- Step 2: Options for a full conversational agent (Aura)
const conversationalOptions = {
  model: "aura-asteria-en", // Using a specific conversational agent model
  smart_format: true,
};

export default function SessionPage() {
  const { sessionId } = useParams();
  const createDeepgramToken = useAction(api.deepgram.createToken);

  const [connection, setConnection] = useState<LiveClient | null>(null);
  const [connectionState, setConnectionState] = useState<LiveConnectionState>(LiveConnectionState.CLOSED);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  const microphoneRef = useRef<MediaRecorder | null>(null);
  const audioQueue = useRef<HTMLAudioElement[]>([]);

  // Function to play audio from the queue
  const processAudioQueue = useCallback(() => {
    if (audioQueue.current.length > 0) {
      const audio = audioQueue.current[0];
      audio.play().catch(e => console.error("Audio playback error:", e));
      audio.onended = () => {
        audioQueue.current.shift();
        processAudioQueue();
      };
    }
  }, []);

  // Function to stop the conversation and clean up resources
  const stopConversation = useCallback(() => {
    if (microphoneRef.current) {
      microphoneRef.current.stop();
      microphoneRef.current = null;
    }
    if (connection) {
      connection.finish();
      setConnection(null);
    }
    setIsListening(false);
    setConnectionState(LiveConnectionState.CLOSED);
  }, [connection]);

  // Function to start the conversation
  const startConversation = useCallback(async () => {
    setIsListening(true);
    try {
      const token = await createDeepgramToken();
      const deepgram = createClient(token);
      
      // --- Let's start with the conversational options ---
      const conn = deepgram.listen.live(conversationalOptions);

      conn.on(LiveTranscriptionEvents.Open, () => {
        setConnectionState(LiveConnectionState.OPEN);
      });

      conn.on(LiveTranscriptionEvents.Transcript, (data) => {
        const text = data.channel.alternatives[0].transcript;
        if (data.is_final && text) {
          setTranscript(prev => prev + " " + text);
        }
      });

      conn.on(LiveTranscriptionEvents.Message, (message) => {
        const data = message.data;
        if (typeof data !== "string") {
          const audio = new Audio(URL.createObjectURL(new Blob([data])));
          audioQueue.current.push(audio);
          if (audioQueue.current.length === 1) {
            processAudioQueue();
          }
        }
      });

      conn.on(LiveTranscriptionEvents.Error, (e) => console.error("Deepgram Error:", JSON.stringify(e, null, 2)));
      conn.on(LiveTranscriptionEvents.Close, () => stopConversation());

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mic = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mic.ondataavailable = (event) => {
        if (event.data.size > 0 && conn.getReadyState() === 1) {
          conn.send(event.data);
        }
      };
      
      microphoneRef.current = mic;
      mic.start(250);
      setConnection(conn);

    } catch (e) {
      console.error("Could not start conversation", e);
      setIsListening(false);
    }
  }, [createDeepgramToken, stopConversation, processAudioQueue]);

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
          <p className="text-gray-700 dark:text-gray-300 h-24 overflow-y-auto">
            {transcript}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <Button
          onClick={isListening ? stopConversation : startConversation}
          disabled={isListening && connectionState !== "open"}
        >
          {isListening ? "Stop Conversation" : "Start Conversation"}
        </Button>
      </div>
    </div>
  );
}