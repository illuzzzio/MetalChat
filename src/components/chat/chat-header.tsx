
"use client";

import type { Conversation, UserProfile, SearchedUser } from "@/types/chat";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Settings, TvMinimalPlay, Menu, Users as UsersIcon } from "lucide-react"; 
import SummarizeChatButton from "./summarize-chat-button";
import Link from "next/link";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import ChatSidebar from "./chat-sidebar"; 
import { UserButton } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import React from "react";


interface ChatHeaderProps {
  conversation: Conversation | null;
  onSummarize: () => void;
  conversations?: Conversation[]; 
  selectedConversationId?: string | null;
  onSelectConversation?: (id: string) => void;
  onOpenCreateGroupDialog?: () => void; 
  currentUserId?: string | null;
  // onOpenFindUsersDialog is removed
  appUserProfile?: UserProfile | null; 
  onOpenManageMembersDialog?: (conversation: Conversation) => void; 
  onHideConversation?: (conversationId: string) => void; 
  allOtherUsersForSheet?: SearchedUser[]; // New prop
  onStartChatWithUserForSheet?: (user: SearchedUser) => void; // New prop
}

export default function ChatHeader({ 
  conversation, 
  onSummarize,
  conversations: mobileSheetConversations,
  selectedConversationId: mobileSheetSelectedConvoId,
  onSelectConversation: mobileSheetOnSelectConvo,
  onOpenCreateGroupDialog: mobileSheetOnOpenCreateGroupDialog, 
  currentUserId: mobileSheetCurrentUserId,
  // onOpenFindUsersDialog is removed
  appUserProfile: mobileSheetAppUserProfile,
  onOpenManageMembersDialog,
  onHideConversation: mobileSheetOnHideConversation,
  allOtherUsersForSheet, // New prop
  onStartChatWithUserForSheet, // New prop
}: ChatHeaderProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();


  const handleConfigureShader = () => {
    toast({title: "Shader Configuration", description: "This feature is coming soon!", duration: 3000});
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-10">
      <div className="flex items-center gap-2">
        {isMobile && mobileSheetOnSelectConvo && mobileSheetOnOpenCreateGroupDialog && mobileSheetCurrentUserId && mobileSheetOnHideConversation && allOtherUsersForSheet && onStartChatWithUserForSheet && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" /> 
                <span className="sr-only">Open navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-full max-w-xs bg-sidebar text-sidebar-foreground">
               <ChatSidebar
                  conversations={mobileSheetConversations || []} 
                  selectedConversationId={mobileSheetSelectedConvoId}
                  onSelectConversation={mobileSheetOnSelectConvo}
                  onOpenCreateGroupDialog={mobileSheetOnOpenCreateGroupDialog} 
                  currentUserId={mobileSheetCurrentUserId}
                  appUserProfile={mobileSheetAppUserProfile} 
                  onHideConversation={mobileSheetOnHideConversation} 
                  allOtherUsers={allOtherUsersForSheet}
                  onStartChatWithUser={onStartChatWithUserForSheet}
                />
            </SheetContent>
          </Sheet>
        )}
        <h2 className="text-xl font-headline font-semibold text-foreground truncate max-w-[calc(100%-300px)] sm:max-w-[calc(100%-250px)]">
          {conversation ? conversation.name : "Select a Chat"}
        </h2>
      </div>
      <div className="flex items-center gap-1 md:gap-2">
        {conversation && conversation.messages && conversation.messages.filter(m => !m.isDeleted && (!m.deletedForUserIds || !m.deletedForUserIds.includes(mobileSheetCurrentUserId || ""))).length > 0 && (
          <SummarizeChatButton onSummarize={onSummarize} />
        )}
        {conversation && conversation.isGroup && onOpenManageMembersDialog && (
            <Button variant="ghost" size="icon" onClick={() => onOpenManageMembersDialog(conversation)} aria-label="Manage Group Members">
                <UsersIcon className="h-5 w-5" />
            </Button>
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
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    </div>
  );
}

    