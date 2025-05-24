// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "./providers"; // Import your new client component
import { ConvexReactClient } from "convex/react"; // For initializing the client server-side

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI GKS Therapist",
  description: "Your personal AI guide for Gifted Kid Syndrome",
};

// Initialize the Convex client here (server-side, once per server instance)
// Ensure NEXT_PUBLIC_CONVEX_URL is defined in your .env.local
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// Ensure NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is defined
const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!;
if (!clerkPublishableKey) {
  throw new Error("Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY in .env.local");
}
if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
  throw new Error("Missing NEXT_PUBLIC_CONVEX_URL in .env.local");
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ClientProviders convex={convex} clerkPublishableKey={clerkPublishableKey}>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}