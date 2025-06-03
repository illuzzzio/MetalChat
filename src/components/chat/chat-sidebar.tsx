
"use client";

import type { Conversation, ParticipantDetails } from "@/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, PlusCircle, UserPlus, MessageCircle } from "lucide-react"; 
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
import { useUser } from "@clerk/nextjs"; 

const SELF_CHAT_ID_PREFIX = "self-";
const SHARED_CONVERSATION_ID = "global-metalai-chat"; // For identifying global chat

const ClientFormattedTime = ({ timestamp }: { timestamp: string }) => {
  const [formattedTime, setFormattedTime] = useState<string | null>(null);

  useEffect(() => {
    if (timestamp) {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) { // Check if date is valid
        setFormattedTime(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } else {
        setFormattedTime("..."); // Placeholder for invalid date
      }
    } else {
      setFormattedTime(null); 
    }
  }, [timestamp]);

  return <>{formattedTime || ""}</>;
};

interface ChatSidebarProps {
  conversations: Conversation[];
  selectedConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onCreateConversation: (name: string) => void; // For group chats
  currentUserId: string | null;
  onOpenAddFriendDialog: () => void;
}

export default function ChatSidebar({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onCreateConversation, // This is for creating new GROUP chats
  currentUserId,
  onOpenAddFriendDialog
}: ChatSidebarProps) {
  const [newConversationName, setNewConversationName] = useState("");
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { user: clerkUser } = useUser(); 

  const handleCreateNewGroupConversation = () => {
    if (newConversationName.trim()) {
      onCreateConversation(newConversationName.trim()); // Call prop for group chat creation
      setNewConversationName("");
      setIsCreateGroupDialogOpen(false);
    }
  };
  
  // Derive details for display
  const getDisplayDetails = (convo: Conversation): { name: string; avatarUrl?: string; dataAiHint: string } => {
    if (convo.id === SHARED_CONVERSATION_ID) {
        return { name: convo.name, avatarUrl: convo.avatarUrl, dataAiHint: convo.dataAiHint || "group chat" };
    }
    if (convo.isSelfChat && currentUserId && clerkUser) {
      return { 
        name: "You (Notes to self)", 
        avatarUrl: clerkUser.imageUrl, 
        dataAiHint: "self note" 
      };
    }
    if (!convo.isGroup && convo.members && convo.members.length === 2 && currentUserId && convo.participantDetails) {
      const otherUserId = convo.members.find(id => id !== currentUserId);
      if (otherUserId && convo.participantDetails[otherUserId]) {
        return { 
          name: convo.participantDetails[otherUserId].displayName, 
          avatarUrl: convo.participantDetails[otherUserId].avatarUrl, 
          dataAiHint: "person chat"
        };
      }
    }
    // Fallback for groups or if details are missing
    return { name: convo.name, avatarUrl: convo.avatarUrl, dataAiHint: convo.dataAiHint || (convo.isGroup ? "group team" : "chat direct") };
  };


  const filteredConversations = conversations.filter(convo => {
    const displayDetails = getDisplayDetails(convo);
    const nameMatch = displayDetails.name.toLowerCase().includes(searchTerm.toLowerCase());
    // Add specific search for "You" or "Notes to self" for self-chat
    const selfChatSearchTerms = ["you", "notes to self", "message yourself"];
    const selfChatMatch = convo.isSelfChat && selfChatSearchTerms.some(term => term.includes(searchTerm.toLowerCase()));
    
    return nameMatch || selfChatMatch;
  }).sort((a, b) => {
      // Prioritize self chat and global chat if needed, then by timestamp
      if (a.isSelfChat) return -1;
      if (b.isSelfChat) return 1;
      if (a.id === SHARED_CONVERSATION_ID) return -1; // Keep global at top after self
      if (b.id === SHARED_CONVERSATION_ID) return 1;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });


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
        <nav className="p-2 space-y-1">
          {filteredConversations.map((convo) => {
            const display = getDisplayDetails(convo);
            const fallbackInitial = display.name?.[0]?.toUpperCase() || (convo.isSelfChat ? 'Y' : 'C');
            return (
                <button
                key={convo.id}
                onClick={() => onSelectConversation(convo.id)}
                disabled={!convo.id}
                className={cn(
                    "flex items-center w-full p-3 rounded-md text-left transition-colors duration-150 ease-in-out",
                    selectedConversationId === convo.id
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/20 hover:text-sidebar-primary",
                    !convo.id && "opacity-50 cursor-not-allowed"
                )}
                >
                <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={display.avatarUrl} alt={display.name} data-ai-hint={display.dataAiHint} />
                    <AvatarFallback>{fallbackInitial}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                    <p className="font-semibold font-body truncate">{display.name}</p>
                    <p className="text-xs text-muted-foreground truncate font-body">
                    {convo.lastMessage}
                    </p>
                </div>
                {convo.timestamp && (
                    <span className="text-xs text-muted-foreground ml-2 self-start mt-1">
                        <ClientFormattedTime timestamp={convo.timestamp} />
                    </span>
                )}
                </button>
            );
        })}
           {filteredConversations.length === 0 && (
             <div className="p-4 text-center text-muted-foreground font-body">
                No conversations found.
             </div>
           )}
        </nav>
      </ScrollArea>
      <div className="p-4 border-t border-sidebar-border space-y-2">
          <Button variant="outline" className="w-full justify-start text-left" onClick={onOpenAddFriendDialog}>
            <UserPlus className="h-5 w-5 mr-2" />
            Add Friend / Start Chat
          </Button>
          <AlertDialog open={isCreateGroupDialogOpen} onOpenChange={setIsCreateGroupDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="default" className="w-full justify-start text-left bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90">
                <PlusCircle className="h-5 w-5 mr-2" />
                New Group Chat
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Create New Group Chat</AlertDialogTitle>
                <AlertDialogDescription>
                  Enter a name for your new group chat.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Group Name
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
                        handleCreateNewGroupConversation();
                      }
                    }}
                  />
                </div>
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setNewConversationName("")}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleCreateNewGroupConversation} disabled={!newConversationName.trim()}>
                  Create Group
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
    </div>
  );
}
