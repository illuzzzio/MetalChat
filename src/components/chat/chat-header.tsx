
"use client";

import type { Conversation } from "@/types/chat";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Settings, TvMinimalPlay, Info, ChevronLeft } from "lucide-react"; 
import SummarizeChatButton from "./summarize-chat-button";
import Link from "next/link";
import { useIsMobile } from "@/hooks/use-mobile"; // Assuming you have this hook
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"
import ChatSidebar from "./chat-sidebar"; // To render sidebar in sheet

interface ChatHeaderProps {
  conversation: Conversation | null;
  onSummarize: () => void;
  // For mobile sheet to show sidebar content
  // These props are usually available in HomePage and can be passed down
  // conversations?: Conversation[]; 
  // selectedConversationId?: string | null;
  // onSelectConversation?: (id: string) => void;
  // onCreateConversation?: (name: string) => void;
  // currentUserId?: string | null;
}

export default function ChatHeader({ conversation, onSummarize }: ChatHeaderProps) {
  const isMobile = useIsMobile();

  const handleConfigureShader = () => {
    console.log("Configure shader clicked - Placeholder");
    // Potentially open a modal here or navigate
    // This feature is not yet implemented.
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-10">
      <div className="flex items-center gap-2">
        {isMobile && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <ChevronLeft className="h-5 w-5" /> {/* Or Menu icon */}
                <span className="sr-only">Open navigation</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-full max-w-xs">
              {/* 
                To render the ChatSidebar here, you'd need to pass its props through ChatHeader.
                This can make ChatHeader props complex. 
                Alternatively, manage sheet state in HomePage and render ChatSidebar there.
                For now, this is a placeholder trigger. The actual sidebar rendering needs prop drilling or state lift.
              */}
               <div className="p-4 text-center"> {/* Placeholder content */}
                <p className="text-sm text-muted-foreground">Navigation (Mobile Sidebar)</p>
                 <p className="text-xs mt-2">Actual sidebar content to be integrated here.</p>
              </div>
            </SheetContent>
          </Sheet>
        )}
        <h2 className="text-xl font-headline font-semibold text-foreground truncate max-w-[calc(100%-200px)] sm:max-w-[calc(100%-160px)]">
          {conversation ? conversation.name : "Select a Chat"}
        </h2>
      </div>
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
