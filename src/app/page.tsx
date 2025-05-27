import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { MessageSquare, Zap } from 'lucide-react';

export default function HomePage() {
  const { userId } = auth();

  if (userId) {
    redirect('/chat');
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-background to-primary p-6 text-center">
      <header className="mb-12">
        <h1 className="text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-accent via-purple-400 to-pink-500 mb-4">
          MetalChat
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Experience the future of communication. Seamless, intelligent, and secure messaging with AI-powered chat summarization.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 max-w-4xl w-full">
        <div className="bg-card p-6 rounded-xl shadow-2xl border border-border transform hover:scale-105 transition-transform duration-300">
          <MessageSquare className="w-12 h-12 text-accent mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-foreground mb-2">Real-time Messaging</h2>
          <p className="text-muted-foreground">
            Connect instantly with friends and colleagues. Share text, images, videos, and voice messages with ease.
          </p>
        </div>
        <div className="bg-card p-6 rounded-xl shadow-2xl border border-border transform hover:scale-105 transition-transform duration-300">
          <Zap className="w-12 h-12 text-accent mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-foreground mb-2">AI Chat Summaries</h2>
          <p className="text-muted-foreground">
            Never miss a beat. Get quick AI-generated summaries of your long chat conversations.
          </p>
        </div>
      </div>

      <div className="space-x-4">
        <Button asChild size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90 transition-transform transform hover:scale-105">
          <Link href="/sign-up">Get Started</Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="border-accent text-accent hover:bg-accent/10 transition-transform transform hover:scale-105">
          <Link href="/sign-in">Sign In</Link>
        </Button>
      </div>

      <footer className="mt-16 text-muted-foreground text-sm">
        <p>&copy; {new Date().getFullYear()} MetalChat. All rights reserved.</p>
        <p>Built with Next.js, Clerk, and Firebase.</p>
      </footer>
    </div>
  );
}
