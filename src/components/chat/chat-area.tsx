
"use client";

import type { Conversation, Message, Idea, UserProfile } from "@/types/chat";
import ChatHeader from "./chat-header";
import ChatMessages from "./chat-messages";
import ChatInput from "./chat-input";
import { summarizeChat, type SummarizeChatInput, type SummarizeChatOutput } from '@/ai/flows/summarize-chat';
import React, { useState, useCallback, useEffect, useRef } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "../ui/scroll-area";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";

interface ChatAreaProps {
  conversation: Conversation | null;
  onSendMessage: (
    conversationId: string,
    text: string,
    type?: Message['type'],
    file?: File,
    imageDataUri?: string,
    duration?: number,
  ) => void;
  onAddIdea: (idea: Idea) => void;
  currentUserId: string | null; // Clerk User ID
  onDeleteMessageForMe: (conversationId: string, messageId: string) => void;
  onDeleteMessageForEveryone: (conversationId: string, messageId: string) => void;
   // Props for mobile sheet in ChatHeader
  allConversationsForSheet?: Conversation[];
  onSelectConversationForSheet?: (id: string) => void;
  onOpenCreateGroupDialogForSheet?: () => void; // Changed from onCreateConversationForSheet
  onOpenAddFriendDialogForSheet?: () => void;
  appUserProfileForSheet?: UserProfile | null; // For mobile sidebar
}

export default function ChatArea({ 
    conversation, 
    onSendMessage, 
    onAddIdea, 
    currentUserId, 
    onDeleteMessageForMe,
    onDeleteMessageForEveryone,
    allConversationsForSheet,
    onSelectConversationForSheet,
    onOpenCreateGroupDialogForSheet, // Updated prop name
    onOpenAddFriendDialogForSheet,
    appUserProfileForSheet
}: ChatAreaProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const { user } = useUser(); 

  const handleSummarizeChat = async () => {
    if (!conversation || !currentUserId || conversation.messages.filter(m => !m.isDeleted && !m.deletedForUserIds?.includes(currentUserId)).length === 0) {
      toast({ title: "Cannot Summarize", description: "No messages to summarize or user not identified.", variant: "destructive" });
      return;
    }

    setIsSummaryLoading(true);
    const chatLog = conversation.messages
      .filter(msg => !msg.isLoading && !msg.isDeleted && !msg.deletedForUserIds?.includes(currentUserId)) 
      .map(msg => {
        let senderName = msg.userDisplayName || 'System';
        if (msg.sender === 'user' && msg.userId === currentUserId) {
          senderName = user?.fullName || user?.username || msg.userDisplayName || 'You';
        } else if (msg.sender === 'metalAI') {
          senderName = 'MetalAI';
        }
        return `${senderName}: ${msg.text}${msg.fileName ? ` [File: ${msg.fileName}]` : ''}`;
      })
      .join('\n');
    
    try {
      const input: SummarizeChatInput = { chatLog };
      const result: SummarizeChatOutput = await summarizeChat(input);
      setSummary(result.summary);
    } catch (error) {
      console.error("Error summarizing chat:", error);
      toast({ title: "Summarization Failed", description: "Could not summarize the chat. Please try again.", variant: "destructive" });
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
        setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  }, [isDragging]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!conversation) {
        toast({ title: "Error", description: "No conversation selected.", variant: "destructive" });
        return;
    }
    if (!currentUserId) { 
        toast({ title: "Error", description: "User not identified.", variant: "destructive" });
        return;
    }

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      for (const file of Array.from(files)) {
        let fileType: Message['type'] = 'image'; 
        if (file.type.startsWith('audio/')) fileType = 'audio';
        else if (file.type.startsWith('video/')) fileType = 'video';
        else if (file.type.startsWith('image/')) fileType = 'image';
        else {
          toast({ title: "Unsupported File", description: `File type for "${file.name}" is not supported for drag & drop.`, variant: "destructive"});
          continue; 
        }
        onSendMessage(conversation.id, file.name, fileType, file); 
      }
    }
  }, [conversation, onSendMessage, toast, currentUserId]);


  return (
    <div 
      ref={dropZoneRef}
      className={cn(
        "flex flex-col h-full relative bg-background text-foreground overflow-hidden transition-colors duration-200",
        isDragging && "bg-accent/20 ring-2 ring-accent ring-offset-2 ring-offset-background"
      )}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-800 via-slate-900 to-zinc-900 opacity-50 dark:opacity-100"
        data-shader-placeholder
      >
      </div>
       {isDragging && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none">
          <p className="text-2xl font-semibold text-white drop-shadow-lg">Drop files to upload</p>
        </div>
      )}
      
      <ChatHeader 
        conversation={conversation} 
        onSummarize={handleSummarizeChat}
        // Pass sheet props
        conversations={allConversationsForSheet}
        selectedConversationId={conversation?.id}
        onSelectConversation={onSelectConversationForSheet}
        onOpenCreateGroupDialog={onOpenCreateGroupDialogForSheet} // Pass updated prop
        currentUserId={currentUserId}
        onOpenAddFriendDialog={onOpenAddFriendDialogForSheet}
        appUserProfile={appUserProfileForSheet} 
      />
      
      {conversation ? (
        <>
          <ChatMessages 
            messages={conversation.messages}
            currentUserId={currentUserId} 
            onDeleteMessageForMe={onDeleteMessageForMe}
            onDeleteMessageForEveryone={onDeleteMessageForEveryone}
            conversationId={conversation.id}
          />
          <ChatInput 
            onSendMessage={onSendMessage} 
            conversationId={conversation.id}
            onAddIdea={onAddIdea}
            currentUserId={currentUserId} 
          />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-lg font-body">Select or create a conversation to start chatting.</p>
        </div>
      )}

      {isSummaryLoading && (
         <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="p-4 bg-card rounded-lg shadow-xl">
              <p className="font-semibold animate-pulse">Generating summary...</p>
            </div>
         </div>
      )}

      <AlertDialog open={!!summary} onOpenChange={(open) => !open && setSummary(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline">Chat Summary</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="max-h-[60vh]">
                <ScrollArea className="h-full pr-2">
                 {summary}
                </ScrollArea>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setSummary(null)}>Close</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

