
import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { ClerkProvider } from '@clerk/nextjs';
import React, { useEffect } from 'react'; // Import useEffect

export const metadata: Metadata = {
  title: 'MetalChat',
  description: 'Real-time chat with a metallic touch.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!publishableKey) {
    // This console log will appear in your server logs if the key isn't loaded at build/runtime
    console.error("SERVER-SIDE: Clerk Publishable Key is not defined. Please check your .env file and ensure NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set.");
  } else {
    console.log("SERVER-SIDE: Clerk Publishable Key found in .env:", publishableKey !== 'pk_test_YOUR_KEY_HERE' ? "Looks like a real key (not the placeholder)" : "IT IS STILL THE PLACEHOLDER KEY!");
  }

  useEffect(() => {
    // This console log will appear in your BROWSER'S developer console.
    if (typeof window !== 'undefined') { // Ensure it runs only on client
      console.log("CLIENT-SIDE: ClerkProvider is attempting to use publishableKey:", publishableKey);
      if (!publishableKey) {
        console.error("CLIENT-SIDE: Clerk Publishable Key is UNDEFINED or EMPTY when passed to ClerkProvider! Check .env file and restart the server.");
        // It might be helpful to show an alert to the user in this critical case
        // alert("Clerk Publishable Key is missing. Check browser console and .env file, then restart the server.");
      } else if (publishableKey === "pk_test_YOUR_KEY_HERE") {
        console.error("CLIENT-SIDE: Clerk Publishable Key is still the PLACEHOLDER value ('pk_test_YOUR_KEY_HERE')! Update .env with your real key and restart the server.");
        // alert("Clerk Publishable Key is a placeholder. Update .env with your real key and restart the server.");
      } else if (!publishableKey.startsWith("pk_")) {
         console.error("CLIENT-SIDE: The value for publishableKey does not look like a Clerk publishable key. Value received:", `"${publishableKey}"`);
        //  alert("The Clerk key does not look like a publishable key. Check .env and restart server. Key seen: " + publishableKey);
      } else {
        console.log("CLIENT-SIDE: Clerk Publishable Key appears to be loaded and has the correct format:", publishableKey);
      }
    }
  }, [publishableKey]);

  return (
    <ClerkProvider publishableKey={publishableKey}>
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;700&family=Open+Sans:wght@400;700&display=swap" rel="stylesheet" />
        </head>
        <body className="font-body antialiased">
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
