"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardPage() {
  const { isSignedIn, user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const router = useRouter();

  const ensureConvexUser = useMutation(api.users.ensureUser);
  const userProfile = useQuery(api.users.getMyUserProfile);
  
  // --- Add this mutation hook ---
  const createSession = useMutation(api.sessions.createSession);

  // --- Add this handler function ---
  const handleStartSession = async () => {
    try {
      const sessionId = await createSession();
      router.push(`/session/${sessionId}`);
    } catch (error) {
      console.error("Failed to create session:", error);
      alert("Failed to start a new session. Please try again.");
    }
  };

  // Effect 1: Create the user record in Convex as soon as Clerk is ready.
  useEffect(() => {
    if (clerkLoaded && isSignedIn) {
      ensureConvexUser({});
    }
  }, [clerkLoaded, isSignedIn, ensureConvexUser]);

  // Effect 2: Handle redirection based on the result of the userProfile query.
  useEffect(() => {
    if (clerkLoaded && isSignedIn && userProfile !== undefined) {
      if (userProfile === null) {
        return;
      }
      if (!userProfile.onboardingCompleted) {
        router.push("/onboarding/gks-questions");
      }
    }
  }, [clerkLoaded, isSignedIn, userProfile, router]);


  const isLoading = !clerkLoaded || (isSignedIn && userProfile === undefined);

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen text-lg">Loading...</div>;
  }
  
  if (!isSignedIn) {
    return null;
  }

  return (
    <div className="flex flex-col items-center p-4 md:p-8">
      <header className="w-full flex justify-between items-center mb-10 p-4 bg-gray-100 shadow-md rounded-lg">
        <h1 className="text-2xl md:text-3xl font-semibold">
          Welcome, {clerkUser?.firstName || userProfile?.email || 'User'}!
        </h1>
        <UserButton afterSignOutUrl="/" />
      </header>

      <div className="w-full max-w-4xl">
        {/* ... other sections */}

        <section className="mb-8 p-6 bg-white shadow rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Start a Session</h2>
          <p className="mb-4">Ready to talk? Begin your voice conversation with the AI therapist.</p>
          {/* --- Add the onClick handler back to this button --- */}
          <button
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-150"
            onClick={handleStartSession}
          >
            Start New Session
          </button>
        </section>

        {/* ... other sections */}
      </div>

      <footer className="mt-20 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} AI GKS Therapist. All rights reserved.</p>
        <Link href="/" className="text-blue-500 hover:underline">Back to Landing Page</Link>
      </footer>
    </div>
  );
}