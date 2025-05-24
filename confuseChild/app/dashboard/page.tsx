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

  // Ensure user exists in Convex and get their profile
  const ensureConvexUser = useMutation(api.users.ensureUser);
  const userProfile = useQuery(api.users.getMyUserProfile); // Fetches the full Convex user profile

  useEffect(() => {
    if (clerkUserLoaded && isSignedIn) {
      // Once Clerk user is loaded and signed in, ensure they exist in Convex.
      // This will create the user if they don't exist, with onboardingCompleted: false
      ensureConvexUser({});
    }
  }, [clerkUserLoaded, isSignedIn, ensureConvexUser]);

  useEffect(() => {
    if (clerkUserLoaded) {
      if (!isSignedIn) {
        router.push("/sign-in"); // Redirect if not signed in
      } else if (userProfile !== undefined) { // Check if userProfile query has resolved
        if (userProfile === null) {
          // This case means ensureUser might not have completed or user somehow not found after ensure.
          // Could be a transient state or an issue with ensureUser logic.
          // For now, we can let it be handled by the loading state or ensure ensureUser is robust.
          // console.log("User profile is null, waiting for ensureUser or refetch");
        } else if (!userProfile.onboardingCompleted) {
          router.push("/onboarding/gks-questions"); // Redirect if onboarding is not complete
        }
      }
    }
  }, [clerkUserLoaded, isSignedIn, userProfile, router]);


  // Loading states:
  // 1. Clerk user loading
  // 2. Convex user profile loading (after Clerk user is loaded and ensureUser might have run)
  // 3. Onboarding not complete (handled by redirect)
  if (!clerkUserLoaded || userProfile === undefined ) {
    return <div className="flex justify-center items-center min-h-screen">Loading dashboard...</div>;
  }

  // If onboarding is not complete, userProfile.onboardingCompleted will be false,
  // and the useEffect above should have redirected.
  // If we reach here, and userProfile is available, it means onboarding is complete.
  if (userProfile && !userProfile.onboardingCompleted) {
     // This is a fallback, the useEffect should catch this.
    return <div className="flex justify-center items-center min-h-screen">Redirecting to onboarding...</div>;
  }
  
  if (!isSignedIn || !userProfile) {
    // This should also be caught by useEffects, but as a safeguard
    return <div className="flex justify-center items-center min-h-screen">Authorizing...</div>;
  }

  // --- Dashboard Content ---
  return (
    <div className="flex flex-col items-center p-4 md:p-8">
      <header className="w-full flex justify-between items-center mb-10 p-4 bg-gray-100 shadow-md rounded-lg">
        <h1 className="text-2xl md:text-3xl font-semibold">
          Welcome, {clerkUser?.firstName || userProfile.email || 'User'}!
        </h1>
        <UserButton afterSignOutUrl="/" />
      </header>

      <div className="w-full max-w-4xl">
        <section className="mb-8 p-6 bg-white shadow rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Your Onboarding Insights:</h2>
          {userProfile.onboardingResponses ? (
            <ul className="list-disc pl-5 space-y-1">
              {Object.entries(userProfile.onboardingResponses).map(([key, value]) => (
                <li key={key}><span className="font-semibold">{key.replace(/_/g, ' ')}:</span> {String(value)}</li>
              ))}
            </ul>
          ) : (
            <p>No onboarding responses found.</p>
          )}
        </section>

        <section className="mb-8 p-6 bg-white shadow rounded-lg">
          <h2 className="text-xl font-semibold mb-3">Start a Session</h2>
          <p className="mb-4">Ready to talk? Begin your voice conversation with the AI therapist.</p>
          <button
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition duration-150"
            onClick={() => alert("Start Session functionality to be implemented!")}
          >
            Start New Session
          </button>
        </section>

        <section className="p-6 bg-white shadow rounded-lg">
            <h2 className="text-xl font-semibold mb-3">My Planner & Exercises</h2>
            <p>Your personalized tasks and reflections will appear here.</p>
        </section>
      </div>

      <footer className="mt-20 text-center text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} AI GKS Therapist. All rights reserved.</p>
        <Link href="/" className="text-blue-500 hover:underline">Back to Landing Page</Link>
      </footer>
    </div>
  );
}