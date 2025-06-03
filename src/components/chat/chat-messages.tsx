
"use client";

import type { Message } from "@/types/chat";
import MessageItem from "./message-item";
import { ScrollArea } from "@/components/ui/scroll-area";
import React, { useEffect, useRef } from "react";

interface ChatMessagesProps {
  messages: Message[];
  currentUserId: string | null;
  onDeleteMessageForMe: (conversationId: string, messageId: string) => void;
  onDeleteMessageForEveryone: (conversationId: string, messageId: string) => void;
  conversationId: string | null;
}

export default function ChatMessages({ 
    messages, 
    currentUserId, 
    onDeleteMessageForMe, 
    onDeleteMessageForEveryone,
    conversationId 
}: ChatMessagesProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
    }
  }, [messages]);

  const visibleMessages = messages.filter(msg => !msg.deletedForMe);

  if (!visibleMessages || visibleMessages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-muted-foreground font-body">No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1 p-4 md:p-6" ref={scrollAreaRef}>
      <div ref={viewportRef} className="h-full">
        {visibleMessages.map((msg) => (
          <MessageItem 
            key={msg.id} 
            message={msg}
            currentUserId={currentUserId}
            onDeleteMessageForMe={onDeleteMessageForMe}
            onDeleteMessageForEveryone={onDeleteMessageForEveryone}
            conversationId={conversationId}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
