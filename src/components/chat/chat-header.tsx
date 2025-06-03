
"use client";

import type { Conversation } from "@/types/chat";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Settings, TvMinimalPlay, Menu, LogOut } from "lucide-react"; // Changed ChevronLeft to Menu
import SummarizeChatButton from "./summarize-chat-button";
import Link from "next/link";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import ChatSidebar from "./chat-sidebar"; // To render sidebar in sheet
import { UserButton, useClerk } from "@clerk/nextjs";
import { useToast } from "@/hooks/use-toast";
import React from "react";


interface ChatHeaderProps {
  conversation: Conversation | null;
  onSummarize: () => void;
  // Props for mobile sidebar sheet content
  conversations?: Conversation[]; 
  selectedConversationId?: string | null;
  onSelectConversation?: (id: string) => void;
  onCreateConversation?: (name: string) => void;
  currentUserId?: string | null;
  onOpenAddFriendDialog?: () => void;
}

export default function ChatHeader({ 
  conversation, 
  onSummarize,
  // For mobile sheet
  conversations: mobileSheetConversations,
  selectedConversationId: mobileSheetSelectedConvoId,
  onSelectConversation: mobileSheetOnSelectConvo,
  onCreateConversation: mobileSheetOnCreateConvo,
  currentUserId: mobileSheetCurrentUserId,
  onOpenAddFriendDialog: mobileSheetOnOpenAddFriendDialog,
}: ChatHeaderProps) {
  const isMobile = useIsMobile();
  const { signOut } = useClerk();
  const { toast } = useToast();
  const router = typeof window !== "undefined" ? require("next/navigation").useRouter() : null;


  const handleConfigureShader = () => {
    toast({title: "Shader Configuration", description: "This feature is coming soon!", duration: 3000});
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-10">
      <div className="flex items-center gap-2">
        {isMobile && mobileSheetOnSelectConvo && mobileSheetOnCreateConvo && mobileSheetCurrentUserId && mobileSheetOnOpenAddFriendDialog && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" /> {/* Changed icon here */}
                <span className="sr-only">Open navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-full max-w-xs bg-sidebar text-sidebar-foreground">
               <ChatSidebar
                  conversations={mobileSheetConversations || []} // Pass empty array if undefined
                  selectedConversationId={mobileSheetSelectedConvoId}
                  onSelectConversation={mobileSheetOnSelectConvo}
                  onCreateConversation={mobileSheetOnCreateConvo}
                  currentUserId={mobileSheetCurrentUserId}
                  onOpenAddFriendDialog={mobileSheetOnOpenAddFriendDialog}
                />
            </SheetContent>
          </Sheet>
        )}
        <h2 className="text-xl font-headline font-semibold text-foreground truncate max-w-[calc(100%-250px)] sm:max-w-[calc(100%-200px)]">
          {conversation ? conversation.name : "Select a Chat"}
        </h2>
      </div>
      <div className="flex items-center gap-1 md:gap-2">
        {conversation && conversation.messages && conversation.messages.filter(m => !m.isDeleted && (!m.deletedForUserIds || !m.deletedForUserIds.includes(mobileSheetCurrentUserId || ""))).length > 0 && (
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
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    </div>
  );
}
