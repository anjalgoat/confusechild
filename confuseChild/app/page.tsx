// app/page.tsx
import { SignInButton, SignUpButton, SignedIn, SignedOut } from "@clerk/nextjs"; // Added SignedIn, SignedOut
// No longer need 'auth' from "@clerk/nextjs/server" for this specific button logic
import Link from "next/link";
import { Button } from "@/components/ui/button"; // Assuming you use ShadCN UI Button or similar

export default function LandingPage() {
  // const { userId } = auth(); // This server-side check can still be useful for other page logic,
                              // but for button visibility, SignedIn/SignedOut is more direct.

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-6">Welcome to the AI GKS Therapist</h1>
        <p className="mb-8 text-lg">
          Navigate the challenges of Gifted Kid Syndrome with a dedicated AI companion.
          Understand patterns, explore emotions, and grow.
        </p>

        <div className="space-y-4">
          <section className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-3">What is GKS?</h2>
            <p>Gifted Kid Syndrome isn't a formal diagnosis but describes a common set of experiences...</p>
          </section>
          <section className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold mb-3">How can this app help?</h2>
            <p>Through voice conversations, personalized exercises, and insightful summaries...</p>
          </section>
        </div>

        <div className="mt-12 space-x-4">
          <SignedIn>
            {/* This content will render if the user is signed in */}
            <Button asChild>
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </SignedIn>
          <SignedOut>
            {/* This content will render if the user is signed out */}
            <>
              <SignInButton mode="modal">
                <Button>Sign In</Button>
              </SignInButton>
              <SignUpButton mode="modal">
                <Button variant="outline">Sign Up</Button>
              </SignUpButton>
            </>
          </SignedOut>
        </div>
        <div className="mt-8">
          <SignedOut> {/* Also protect this link */}
            <p className="text-sm text-gray-600">
              Already have an account? <SignInButton mode="modal"><span className="underline cursor-pointer">Sign In</span></SignInButton>
            </p>
          </SignedOut>
        </div>
      </div>
    </main>
  );
}