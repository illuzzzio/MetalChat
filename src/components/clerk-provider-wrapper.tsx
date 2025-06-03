
"use client";

import { ClerkProvider } from '@clerk/nextjs';
import React, { useEffect } from 'react';

export function ClerkProviderWrapper({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  useEffect(() => {
    // This console log will appear in your BROWSER'S developer console.
    if (typeof window !== 'undefined') { // Ensure it runs only on client
      console.log("CLIENT-SIDE (ClerkProviderWrapper): ClerkProvider is attempting to use publishableKey from process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY. Value found:", publishableKey);
      if (!publishableKey) {
        console.error("CLIENT-SIDE (ClerkProviderWrapper): Clerk Publishable Key is UNDEFINED or EMPTY when read by ClerkProvider! Check your .env file (ensure it's NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY), and restart the Next.js server.");
      } else if (publishableKey === "pk_test_YOUR_KEY_HERE" || publishableKey.includes("YOUR_KEY_HERE")) {
        console.error("CLIENT-SIDE (ClerkProviderWrapper): Clerk Publishable Key is STILL THE PLACEHOLDER value ('pk_test_YOUR_KEY_HERE')! Update .env with your real key and restart the Next.js server. Value being used:", `"${publishableKey}"`);
      } else if (!publishableKey.startsWith("pk_")) {
         console.error("CLIENT-SIDE (ClerkProviderWrapper): The value for publishableKey being used by ClerkProvider does not look like a valid Clerk publishable key (should start with 'pk_'). Value received:", `"${publishableKey}"`);
      } else {
        console.log("CLIENT-SIDE (ClerkProviderWrapper): Clerk Publishable Key appears to be loaded and has the correct format. Passing to ClerkProvider:", publishableKey);
      }
    }
  }, [publishableKey]); // Dependency array for useEffect

  // ClerkProvider itself will throw an error if publishableKey is invalid or missing.
  // It's important that process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is correctly populated.
  return (
    <ClerkProvider publishableKey={publishableKey}>
      {children}
    </ClerkProvider>
  );
}
