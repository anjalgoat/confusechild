"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BrainCircuit, ClipboardList } from "lucide-react"; // Add ClipboardList icon

export default function DashboardPage() {
  const { isSignedIn, user: clerkUser, isLoaded: clerkLoaded } = useUser();
  const router = useRouter();

  const ensureConvexUser = useMutation(api.users.ensureUser);
  const userProfile = useQuery(api.users.getMyUserProfile);
  
  const createSession = useMutation(api.sessions.createSession);

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
    if (clerkLoaded && isSignedIn) {
      ensureConvexUser({});
    }
  }, [clerkLoaded, isSignedIn, ensureConvexUser]);

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
    <div className="flex flex-col items-center p-4 md:p-8 bg-gray-50 min-h-screen">
      <header className="w-full max-w-5xl flex justify-between items-center mb-10 p-4 bg-white shadow-md rounded-lg">
        <h1 className="text-2xl md:text-3xl font-semibold text-gray-800">
          Welcome, {clerkUser?.firstName || userProfile?.email || 'User'}!
        </h1>
        <UserButton afterSignOutUrl="/" />
      </header>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Start Session Card */}
        <section className="p-6 bg-white shadow rounded-lg flex flex-col items-center text-center">
          <h2 className="text-xl font-semibold mb-3">Start a Session</h2>
          <p className="mb-4 text-gray-600 flex-grow">Ready to talk? Begin your voice conversation with the AI therapist.</p>
          <Button
            className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-150"
            onClick={handleStartSession}
          >
            Start New Session
          </Button>
        </section>
        
        {/* Cognitive Mind Card */}
        <section className="p-6 bg-white shadow rounded-lg flex flex-col items-center text-center">
          <h2 className="text-xl font-semibold mb-3">View Your Profile</h2>
          <p className="mb-4 text-gray-600 flex-grow">Explore the AI's understanding of your cognitive and emotional patterns.</p>
          <Button
            asChild
            variant="outline"
            className="w-full px-6 py-3 font-semibold rounded-lg"
          >
            <Link href="/mind-map">
              <BrainCircuit className="mr-2 h-5 w-5" />
              View Cognitive Mind
            </Link>
          </Button>
        </section>

        {/* --- NEW AI PLANNER CARD --- */}
        <section className="p-6 bg-white shadow rounded-lg flex flex-col items-center text-center">
          <h2 className="text-xl font-semibold mb-3">Your AI Planner</h2>
          <p className="mb-4 text-gray-600 flex-grow">Track personalized activities and habits suggested by the AI to support your growth.</p>
           <Button
            asChild
            variant="outline"
            className="w-full px-6 py-3 font-semibold rounded-lg"
          >
            <Link href="/planner">
              <ClipboardList className="mr-2 h-5 w-5" />
              Open Planner
            </Link>
          </Button>
        </section>
      </div>

      <footer className="mt-20 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} AI GKS Therapist. All rights reserved.</p>
        <Link href="/" className="text-blue-500 hover:underline">Back to Landing Page</Link>
      </footer>
    </div>
  );
}