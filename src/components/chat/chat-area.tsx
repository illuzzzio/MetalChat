
"use client";

import type { Conversation, Message, Idea } from "@/types/chat";
import ChatHeader from "./chat-header";
import ChatMessages from "./chat-messages";
import ChatInput from "./chat-input";
import { summarizeChat, type SummarizeChatInput, type SummarizeChatOutput } from '@/ai/flows/summarize-chat';
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "../ui/scroll-area";

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
}

export default function ChatArea({ conversation, onSendMessage, onAddIdea }: ChatAreaProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
  const { toast } = useToast();

  const handleSummarizeChat = async () => {
    if (!conversation || conversation.messages.length === 0) {
      toast({ title: "Cannot Summarize", description: "No messages to summarize.", variant: "destructive" });
      return;
    }

    setIsSummaryLoading(true);
    const chatLog = conversation.messages
      .filter(msg => !msg.isLoading) 
      .map(msg => `${msg.sender === 'user' ? 'User' : (msg.sender === 'metalAI' ? 'MetalAI' : 'Other')}: ${msg.text}${msg.fileName ? ` [File: ${msg.fileName}]` : ''}`)
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

  return (
    <div className="flex flex-col h-full relative bg-background text-foreground overflow-hidden">
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-800 via-slate-900 to-zinc-900 opacity-50 dark:opacity-100"
        data-shader-placeholder
      >
      </div>
      
      <ChatHeader conversation={conversation} onSummarize={handleSummarizeChat} />
      
      {conversation ? (
        <>
          <ChatMessages messages={conversation.messages} />
          <ChatInput 
            onSendMessage={onSendMessage} 
            conversationId={conversation.id}
            onAddIdea={onAddIdea}
          />
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-lg font-body">Select a conversation to start chatting.</p>
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
            <AlertDialogDescription asChild className="max-h-[60vh]">
              <div>
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
