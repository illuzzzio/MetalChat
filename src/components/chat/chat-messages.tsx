
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
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (viewportRef.current) {
      // Delay scroll to allow images/media to potentially load and affect scrollHeight
      setTimeout(() => {
        if (viewportRef.current) {
            viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [messages]);

  // Filter out messages marked as deleted for the current user, unless they are also marked isDeleted (for everyone)
  const visibleMessages = messages.filter(msg => {
    if (msg.isDeleted) return true; // Always show "This message was deleted"
    if (msg.deletedForMe && msg.userId === currentUserId) return false; // Hide if current user deleted for themselves
    return true;
  });


  if (!visibleMessages || visibleMessages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <p className="text-muted-foreground font-body">No messages yet. Start the conversation!</p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1" viewportRef={viewportRef}>
      <div className="p-4 md:p-6 space-y-1">
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
