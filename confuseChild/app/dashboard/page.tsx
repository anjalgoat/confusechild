// app/dashboard/page.tsx
"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { isSignedIn, user: clerkUser, isLoaded: clerkUserLoaded } = useUser();
  const router = useRouter();
  const createSession = useMutation(api.sessions.createSession); // This should now work with the proper types

  // Ensure user exists in Convex and get their profile
  const ensureConvexUser = useMutation(api.users.ensureUser);
  const userProfile = useQuery(api.users.getMyUserProfile); // Fetches the full Convex user profile

  useEffect(() => {
    if (clerkUserLoaded && isSignedIn) {
      ensureConvexUser();
    }
  }, [clerkUserLoaded, isSignedIn, ensureConvexUser]);

  const handleStartSession = async () => {
    try {
      const sessionId = await createSession();
      router.push(`/session/${sessionId}`);
    } catch (error) {
      console.error("Failed to create session:", error);
      alert("Failed to start a new session. Please try again.");
    }
  };

  useEffect(() => {
    if (clerkUserLoaded) {
      if (!isSignedIn) {
        router.push("/sign-in");
      }
    }
  }, [clerkUserLoaded, isSignedIn, router]);

  if (!clerkUserLoaded || !isSignedIn) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <UserButton afterSignOutUrl="/" />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Section */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold mb-2">Welcome, {clerkUser?.firstName || "User"}!</h2>
          <p className="text-gray-600">
            Here you can manage your therapy sessions and track your progress.
          </p>
        </div>

        {/* Start Session Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold mb-2">Start a New Session</h3>
          <p className="mb-4">Ready to talk? Begin your voice conversation with the AI therapist.</p>
          <button
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-150"
            onClick={handleStartSession}
          >
            Start New Session
          </button>
        </div>
      </main>
    </div>
  );
}