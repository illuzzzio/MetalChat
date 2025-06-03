
"use client";

import type { Conversation, ParticipantDetails, UserProfile } from "@/types/chat";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, PlusCircle, Users, X } from "lucide-react"; // Added X icon
import { cn } from "@/lib/utils";
import React, { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs"; 

const SELF_CHAT_ID_PREFIX = "self-";
const SHARED_CONVERSATION_ID = "global-metalai-chat"; 

const ClientFormattedTime = ({ timestamp }: { timestamp: string }) => {
  const [formattedTime, setFormattedTime] = useState<string | null>(null);

  useEffect(() => {
    if (timestamp) {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) { 
        setFormattedTime(date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      } else {
        setFormattedTime("..."); 
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
  onOpenCreateGroupDialog: () => void; 
  currentUserId: string | null;
  onOpenFindUsersDialog: () => void; // Renamed from onOpenAddFriendDialog
  appUserProfile: UserProfile | null; 
  onHideConversation: (conversationId: string) => void; // New prop
}

export default function ChatSidebar({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onOpenCreateGroupDialog,
  currentUserId,
  onOpenFindUsersDialog, // Renamed
  appUserProfile,
  onHideConversation // New prop
}: ChatSidebarProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const { user: clerkUser } = useUser(); 

  const getDisplayDetails = (convo: Conversation): { name: string; avatarUrl?: string; dataAiHint: string } => {
    if (convo.id === SHARED_CONVERSATION_ID) {
        return { name: convo.name, avatarUrl: convo.avatarUrl, dataAiHint: convo.dataAiHint || "group chat" };
    }
    if (convo.isSelfChat && currentUserId && clerkUser) {
      const selfAvatar = appUserProfile?.photoURL || clerkUser.imageUrl;
      return { 
        name: "You (Notes to self)", 
        avatarUrl: selfAvatar || `https://placehold.co/100x100.png?text=Y`,
        dataAiHint: "self note user" 
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
    return { 
        name: convo.name, 
        avatarUrl: convo.avatarUrl || `https://placehold.co/100x100.png?text=${convo.name?.[0]?.toUpperCase() || 'G'}`, 
        dataAiHint: convo.dataAiHint || (convo.isGroup ? "group team" : "chat direct") 
    };
  };


  const filteredConversations = conversations.filter(convo => {
    const displayDetails = getDisplayDetails(convo);
    const nameMatch = displayDetails.name.toLowerCase().includes(searchTerm.toLowerCase());
    const selfChatSearchTerms = ["you", "notes to self", "message yourself"];
    const selfChatMatch = convo.isSelfChat && selfChatSearchTerms.some(term => term.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return nameMatch || selfChatMatch;
  }).sort((a, b) => {
      if (a.isSelfChat && !b.isSelfChat) return -1;
      if (b.isSelfChat && !a.isSelfChat) return 1;
      if (a.id === SHARED_CONVERSATION_ID && b.id !== SHARED_CONVERSATION_ID && !b.isSelfChat) return -1; 
      if (b.id === SHARED_CONVERSATION_ID && a.id !== SHARED_CONVERSATION_ID && !a.isSelfChat) return 1;
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
            const canBeHidden = !convo.isSelfChat && convo.id !== SHARED_CONVERSATION_ID;
            return (
                <div key={convo.id} className="group relative">
                    <button
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
                    {canBeHidden && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-1 text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-destructive/20 hover:text-destructive transition-opacity"
                            onClick={(e) => {
                                e.stopPropagation(); // Prevent selecting the chat
                                onHideConversation(convo.id);
                            }}
                            title="Hide Chat"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
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
          <Button variant="outline" className="w-full justify-start text-left" onClick={onOpenFindUsersDialog}> {/* Renamed */}
            <Users className="h-5 w-5 mr-2" /> {/* Changed icon to Users */}
            Find Users / Start Chat
          </Button>
          <Button 
            variant="default" 
            className="w-full justify-start text-left bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/90"
            onClick={onOpenCreateGroupDialog}
            >
            <PlusCircle className="h-5 w-5 mr-2" /> 
            New Group Chat
          </Button>
        </div>
    </div>
  );
}
