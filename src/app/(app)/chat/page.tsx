import { MessageSquarePlus } from 'lucide-react';

export default function ChatPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-background">
      <div className="bg-card p-8 md:p-12 rounded-xl shadow-2xl border border-border max-w-md w-full">
        <MessageSquarePlus className="w-20 h-20 text-accent mx-auto mb-6" />
        <h1 className="text-3xl font-bold text-foreground mb-3">Welcome to MetalChat</h1>
        <p className="text-muted-foreground mb-6">
          Select a conversation from the sidebar to start chatting, or create a new one.
        </p>
        {/* Placeholder for a "New Chat" button or search */}
        {/* <Button variant="outline" className="border-accent text-accent hover:bg-accent/10">
          <PlusCircle className="mr-2 h-5 w-5" /> New Chat
        </Button> */}
      </div>
      <p className="mt-8 text-sm text-muted-foreground">
        Tip: Use the AI summarizer in chats to get quick overviews!
      </p>
    </div>
  );
}
