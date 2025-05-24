// app/providers.tsx
"use client"; // This directive is crucial

import { PropsWithChildren } from "react";
import { ClerkProvider, useAuth } from '@clerk/nextjs';
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react"; // Keep this import

// You pass the initialized Convex client as a prop to this component
interface ClientProvidersProps extends PropsWithChildren {
  convex: ConvexReactClient;
  clerkPublishableKey: string;
}

export function ClientProviders({
  children,
  convex,
  clerkPublishableKey,
}: ClientProvidersProps) {
  return (
    <ClerkProvider publishableKey={clerkPublishableKey}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}