"use client";

import type { Conversation } from "@/types/chat";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Settings, TvMinimalPlay } from "lucide-react";
import SummarizeChatButton from "./summarize-chat-button";

interface ChatHeaderProps {
  conversation: Conversation | null;
  onSummarize: () => void;
}

export default function ChatHeader({ conversation, onSummarize }: ChatHeaderProps) {
  const handleConfigureShader = () => {
    // Placeholder for shader configuration logic
    console.log("Configure shader clicked");
    // Potentially open a modal here
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-10">
      <h2 className="text-xl font-headline font-semibold text-foreground">
        {conversation ? conversation.name : "Select a Chat"}
      </h2>
      <div className="flex items-center gap-2">
        {conversation && conversation.messages.length > 0 && (
          <SummarizeChatButton onSummarize={onSummarize} />
        )}
        <Button variant="ghost" size="icon" onClick={handleConfigureShader} aria-label="Configure Shaders">
          <TvMinimalPlay className="h-5 w-5" />
        </Button>
        <ThemeToggle />
      </div>
    </div>
  );
}
