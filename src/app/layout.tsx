
import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { ClerkProvider } from '@clerk/nextjs';
// import { dark } from '@clerk/themes'; // Optional: if you want Clerk components to match your dark theme

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
    console.error("Clerk Publishable Key is not defined. Please check your .env file and ensure NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is set.");
    // You might want to render an error page or a loading state here
    // For now, we'll let Clerk handle its own error display for missing key
  }

  return (
    <ClerkProvider
      publishableKey={publishableKey} // Explicitly passing the key
      // appearance={{
      //   // baseTheme: dark, 
      //   variables: { colorPrimary: 'hsl(var(--accent))' } 
      // }}
    >
      <html lang="en" suppressHydrationWarning>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          <link href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@400;700&family=Open+Sans:wght@400;700&display=swap" rel="stylesheet" />
        </head>
        <body className="font-body antialiased">
          <ThemeProvider
            attribute="class"
            defaultTheme="dark" // Your app's default theme
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
