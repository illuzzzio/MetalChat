
"use client";

import type { Conversation } from "@/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageSquareText, Search, PlusCircle, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import React, { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import Link from "next/link";


interface ChatSidebarProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onCreateConversation: (name: string) => void;
  currentUserId: string | null;
}

const ClientFormattedTime = ({ timestamp }: { timestamp: string }) => {
  const [formattedTime, setFormattedTime] = useState<string | null>(null);

  useEffect(() => {
    if (timestamp) {
      setFormattedTime(new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    } else {
      setFormattedTime(null); 
    }
  }, [timestamp]);

  return <>{formattedTime || ""}</>;
};

export default function ChatSidebar({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onCreateConversation,
  currentUserId
}: ChatSidebarProps) {
  const [newConversationName, setNewConversationName] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleCreateNewConversation = () => {
    if (newConversationName.trim()) {
      onCreateConversation(newConversationName.trim());
      setNewConversationName("");
      setIsCreateDialogOpen(false);
    }
  };

  const filteredConversations = conversations.filter(convo => 
    convo.name.toLowerCase().includes(searchTerm.toLowerCase())
  );


  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      <div className="p-4 border-b border-sidebar-border">
        <h2 className="text-2xl font-headline font-semibold text-sidebar-primary">MetalChat</h2>
        <div className="relative mt-2">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search chats..." 
            className="pl-8 bg-background focus-visible:ring-sidebar-ring" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        {filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground font-body">
            No conversations found.
          </div>
        ) : (
          <nav className="p-2 space-y-1">
            {filteredConversations.map((convo) => (
              <button
                key={convo.id}
                onClick={() => onSelectConversation(convo.id)}
                className={cn(
                  "flex items-center w-full p-3 rounded-md text-left transition-colors duration-150 ease-in-out",
                  selectedConversationId === convo.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/20 hover:text-sidebar-primary" 
                )}
              >
                <Avatar className="h-10 w-10 mr-3">
                  <AvatarImage src={convo.avatarUrl} alt={convo.name} data-ai-hint={convo.dataAiHint || "chat avatar"} />
                  <AvatarFallback>{convo.name.substring(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold font-body truncate">{convo.name}</p>
                  <p className="text-xs text-muted-foreground truncate font-body">{convo.lastMessage}</p>
                </div>
                {convo.timestamp && (
                    <span className="text-xs text-muted-foreground ml-2 self-start mt-1">
                        <ClientFormattedTime timestamp={convo.timestamp} />
                    </span>
                )}
              </button>
            ))}
          </nav>
        )}
      </ScrollArea>
      <div className="p-4 border-t border-sidebar-border space-y-2">
          <AlertDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="default" className="w-full bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90">
                <PlusCircle className="h-5 w-5 mr-2" />
                New Chat
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Create New Chat</AlertDialogTitle>
                <AlertDialogDescription>
                  Enter a name for your new chat or group.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    value={newConversationName}
                    onChange={(e) => setNewConversationName(e.target.value)}
                    className="col-span-3"
                    placeholder="e.g., Project Alpha Team"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newConversationName.trim()) {
                        e.preventDefault();
                        handleCreateNewConversation();
                      }
                    }}
                  />
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setNewConversationName("")}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleCreateNewConversation} disabled={!newConversationName.trim()}>
                  Create
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
    </div>
  );
}
