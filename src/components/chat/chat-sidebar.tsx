"use client";

import type { Conversation } from "@/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { MessageSquareText, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatSidebarProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
}

export default function ChatSidebar({
  conversations,
  selectedConversationId,
  onSelectConversation,
}: ChatSidebarProps) {
  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="text-2xl font-headline font-semibold text-sidebar-primary">MetalChat</h2>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search chats..." className="pl-8 bg-background focus-visible:ring-accent" />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground font-body">
            No conversations yet.
          </div>
        ) : (
          <nav className="p-2 space-y-1">
            {conversations.map((convo) => (
              <button
                key={convo.id}
                onClick={() => onSelectConversation(convo.id)}
                className={cn(
                  "flex items-center w-full p-3 rounded-md text-left transition-colors duration-150 ease-in-out",
                  selectedConversationId === convo.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                )}
              >
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarImage src={convo.avatarUrl} alt={convo.name} data-ai-hint="profile avatar" />
                  <AvatarFallback>{convo.name.substring(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold font-body truncate">{convo.name}</p>
                  <p className="text-xs text-muted-foreground truncate font-body">{convo.lastMessage}</p>
                </div>
                <span className="text-xs text-muted-foreground ml-2">
                  {new Date(convo.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </button>
            ))}
          </nav>
        )}
      </ScrollArea>
      <div className="p-4 border-t border-sidebar-border">
          <button className="w-full flex items-center justify-center p-2 rounded-md bg-accent text-accent-foreground hover:bg-accent/90 transition-colors">
            <MessageSquareText className="h-5 w-5 mr-2" />
            <span className="font-body">New Chat</span>
          </button>
        </div>
    </div>
  );
}
