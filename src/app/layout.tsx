import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from '@/components/ui/toaster';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'MetalChat',
  description: 'Real-time messaging with AI-powered chat summarization.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        baseTheme: undefined, // Will inherit styles from globals.css due to ShadCN theme
        variables: {
          colorPrimary: '#BE70FF', // Electric Purple for Clerk components
          colorBackground: '#1A1A1A', // Near black
          colorText: '#F5F5F5', // Light text
          colorInputBackground: '#333333',
          colorInputText: '#F5F5F5',
        },
        elements: {
          card: 'bg-card shadow-xl border-border',
          formButtonPrimary: 'bg-accent text-accent-foreground hover:bg-accent/90',
          footerActionLink: 'text-accent hover:text-accent/90',
          headerTitle: 'text-foreground',
          headerSubtitle: 'text-muted-foreground',
          socialButtonsBlockButton: 'border-border hover:bg-secondary',
          dividerLine: 'bg-border',
          formFieldLabel: 'text-foreground',
          formFieldInput: 'bg-input border-border text-foreground focus:ring-ring focus:border-ring',
          identityPreviewEditButtonIcon: 'text-accent',
        }
      }}
    >
      <html lang="en" className="dark">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
        >
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
