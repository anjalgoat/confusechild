"use client";

import { UserButton, useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrainCircuit, ClipboardList, PlayCircle, MessageSquarePlus } from "lucide-react"; 

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
    // This will be handled by Clerk's middleware or redirect, but good practice
    return null; 
  }

  return (
    <div className="flex flex-col items-center min-h-screen bg-gradient-to-br from-slate-50 to-sky-100 dark:from-slate-900 dark:to-sky-950 p-4 md:p-8">
      {/* Header Section */}
      <header className="w-full max-w-5xl flex justify-between items-center mb-12 p-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md shadow-lg rounded-xl">
        <div className="flex flex-col">
            <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-slate-100">
            Welcome, {clerkUser?.firstName || userProfile?.email || 'User'}!
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">Ready to continue your journey?</p>
        </div>
        <UserButton afterSignOutUrl="/" />
      </header>

      {/* Main Content Area */}
      <div className="w-full max-w-5xl space-y-10">
        
        {/* Primary Action: Start New Session */}
        <Card className="shadow-xl hover:shadow-2xl transition-shadow duration-300 bg-white dark:bg-slate-800 overflow-hidden">
          <CardHeader className="bg-blue-600 dark:bg-blue-700 text-white p-6">
            <div className="flex items-center gap-3">
              <MessageSquarePlus className="h-8 w-8" />
              <CardTitle className="text-2xl font-semibold">Start a New Session</CardTitle>
            </div>
            <CardDescription className="text-blue-100 dark:text-blue-200 pt-1">
              Engage in a meaningful conversation with your AI therapist to explore your thoughts and feelings.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 flex flex-col items-center">
            <p className="text-slate-600 dark:text-slate-300 mb-6 text-center">
              Each session is an opportunity for discovery and growth. Click below when you're ready to begin.
            </p>
            <Button
              size="lg"
              className="w-full max-w-xs px-8 py-6 bg-blue-600 dark:bg-blue-700 text-white font-semibold rounded-lg hover:bg-blue-700 dark:hover:bg-blue-800 transition duration-150 text-lg shadow-md hover:shadow-lg"
              onClick={handleStartSession}
            >
              <PlayCircle className="mr-2 h-6 w-6" />
              Begin Session
            </Button>
          </CardContent>
        </Card>

        {/* Secondary Actions: Mind Map & Planner */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white dark:bg-slate-800">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BrainCircuit className="h-6 w-6 text-sky-600 dark:text-sky-400" />
                <CardTitle>Your Cognitive Mind</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                Visualize the AI's understanding of your cognitive patterns and insights from your sessions.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/mind-map">
                  Explore Mind Map
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white dark:bg-slate-800">
            <CardHeader>
                <div className="flex items-center gap-2">
                    <ClipboardList className="h-6 w-6 text-green-600 dark:text-green-400" />
                    <CardTitle>AI-Powered Planner</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-slate-600 dark:text-slate-300 text-sm">
                Track personalized activities and habits suggested by the AI to support your journey.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link href="/planner">
                  Open Planner
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-20 text-center text-sm text-slate-500 dark:text-slate-400">
        <p>&copy; {new Date().getFullYear()} AI GKS Therapist. All rights reserved.</p>
        <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">
          Back to Landing Page
        </Link>
      </footer>
    </div>
  );
}