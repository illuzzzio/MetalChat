
import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { ClerkProviderWrapper } from '@/components/clerk-provider-wrapper'; // Import the new wrapper

export const metadata: Metadata = {
  title: 'MetalChat',
  description: 'Real-time chat with a metallic touch.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Server-side check (process.env is available here)
  const serverSidePublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  // This check ensures it only runs on the server.
  // Important: This log runs during build or server render, not for every client request in dev.
  if (typeof window === 'undefined') { 
    console.log("SERVER-SIDE (RootLayout): Checking NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY value from process.env:", serverSidePublishableKey);
    if (!serverSidePublishableKey) {
      console.error("SERVER-SIDE (RootLayout): Clerk Publishable Key is UNDEFINED or EMPTY in .env on the server. Ensure NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set and the server restarted.");
    } else if (serverSidePublishableKey === "pk_test_YOUR_KEY_HERE" || serverSidePublishableKey.includes("YOUR_KEY_HERE")) {
      console.error("SERVER-SIDE (RootLayout): Clerk Publishable Key is STILL THE PLACEHOLDER ('pk_test_YOUR_KEY_HERE') in .env on the server! Update .env with your real key and restart server. Value received:", `"${serverSidePublishableKey}"`);
    } else if (!serverSidePublishableKey.startsWith("pk_")) {
      console.error("SERVER-SIDE (RootLayout): The value for publishableKey in .env on the server does not look like a Clerk publishable key. Value received:", `"${serverSidePublishableKey}"`);
    } else {
      console.log("SERVER-SIDE (RootLayout): Clerk Publishable Key appears to be loaded correctly from .env on server:", serverSidePublishableKey);
    }
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;700&family=Open+Sans:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <ClerkProviderWrapper> {/* Use the client component wrapper */}
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </ThemeProvider>
        </ClerkProviderWrapper>
      </body>
    </html>
  );
}
