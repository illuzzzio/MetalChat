
"use client";

import type { Conversation } from "@/types/chat";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Settings, TvMinimalPlay, Info } from "lucide-react"; // Added Info for future use
import SummarizeChatButton from "./summarize-chat-button";
import Link from "next/link";

interface ChatHeaderProps {
  conversation: Conversation | null;
  onSummarize: () => void;
}

export default function ChatHeader({ conversation, onSummarize }: ChatHeaderProps) {
  const handleConfigureShader = () => {
    console.log("Configure shader clicked - Placeholder");
    // Potentially open a modal here
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-10">
      <h2 className="text-xl font-headline font-semibold text-foreground truncate max-w-[calc(100%-160px)]">
        {conversation ? conversation.name : "Select a Chat"}
      </h2>
      <div className="flex items-center gap-1 md:gap-2">
        {conversation && conversation.messages && conversation.messages.filter(m => !m.isDeleted && !m.deletedForMe).length > 0 && (
          <SummarizeChatButton onSummarize={onSummarize} />
        )}
        <Button variant="ghost" size="icon" onClick={handleConfigureShader} aria-label="Configure Shaders (Placeholder)">
          <TvMinimalPlay className="h-5 w-5" />
        </Button>
        <Link href="/settings" passHref>
          <Button variant="ghost" size="icon" aria-label="Settings">
            <Settings className="h-5 w-5" />
          </Button>
        </Link>
        <ThemeToggle />
      </div>
    </div>
  );
}
