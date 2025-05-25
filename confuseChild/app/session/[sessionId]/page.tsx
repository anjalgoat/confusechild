"use client";

import { useParams } from "next/navigation";
import { useVAD, VADOptions } from "@ricky0123/vad-react";
import { useState } from "react";

export default function SessionPage() {
  const { sessionId } = useParams();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [vadError, setVadError] = useState<string | null>(null);

  const vad = useVAD({
    onSpeechStart: () => {
      console.log("Speech started");
      setIsSpeaking(true);
    },
    onSpeechEnd: () => {
      console.log("Speech ended");
      setIsSpeaking(false);
    },
    onError: (error: Error) => {
      setVadError(error.message);
    }
  });

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <h1 className="text-4xl font-bold mb-4">Voice Session</h1>
      <p className="text-sm text-gray-500 mb-8">Session ID: {sessionId}</p>

      <div className="w-full max-w-lg p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <span className="text-lg font-medium">Mic Status</span>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isSpeaking ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></div>
            <span className={`text-lg font-semibold ${isSpeaking ? 'text-green-500' : 'text-gray-400'}`}>
              {isSpeaking ? "Speaking" : "Listening..."}
            </span>
          </div>
        </div>

        {/* Speech Wave Indicator */}
        <div className="relative w-full h-24 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
          {isSpeaking && (
            <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
              <div className="w-full h-1/2 bg-gradient-to-r from-blue-400 to-purple-500 opacity-75 animate-pulse"></div>
            </div>
          )}
        </div>

        {vadError && (
          <div className="mt-4 text-center text-red-500">
            <p>Error: {vadError}</p>
            <p>Please ensure you have given microphone permissions.</p>
          </div>
        )}
      </div>

       <div className="mt-8">
        <button
          onClick={vad.start}
          className="px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition duration-150 mr-4"
        >
          Start Listening
        </button>
        <button
          onClick={vad.pause}
          className="px-6 py-3 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 transition duration-150 mr-4"
        >
          Pause
        </button>
        <button
          onClick={vad.destroy}
          className="px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition duration-150"
        >
          Stop
        </button>
      </div>
    </div>
  );
}