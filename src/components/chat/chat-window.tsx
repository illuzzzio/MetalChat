'use client';

import type { Message, UserProfile, ChatParticipant } from '@/types';
import { MessageItem } from './message-item';
import { MessageInput } from './message-input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Bot, ArrowLeft, Search, Phone, Video, Info } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';
import { Timestamp } from 'firebase/firestore'; // For mock data
import { useUser } from '@clerk/nextjs'; // To get current user
import { summarizeChat as summarizeChatFlow, type SummarizeChatInput } from '@/ai/flows/summarize-chat';
import { useToast } from '@/hooks/use-toast';
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
import { LoadingSpinner } from '@/components/common/loading-spinner';
import Link from 'next/link';

interface ChatWindowProps {
  chatId: string;
  // These would typically be fetched based on chatId
  initialMessages?: Message[];
  chatParticipants?: ChatParticipant[];
  chatName?: string; // For group chats or to display user's name
}

// Mock current user for display purposes if Clerk user is not fully loaded
const MOCK_FALLBACK_USER_ID = 'current-user-id-fallback';


export function ChatWindow({ chatId, initialMessages = [], chatParticipants = [], chatName }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const { toast } = useToast();

  const currentUserId = isClerkLoaded && clerkUser ? clerkUser.id : MOCK_FALLBACK_USER_ID;

  // Mock messages if none provided initially
  useEffect(() => {
    if (initialMessages.length === 0 && isClerkLoaded) {
      const mockSenderId = chatParticipants.find(p => p.id !== currentUserId)?.id || 'other-user-id';
      const mockSenderPhotoURL = chatParticipants.find(p => p.id !== currentUserId)?.photoURL || 'https://placehold.co/40x40.png?text=OS';
      const mockSenderDisplayName = chatParticipants.find(p => p.id !== currentUserId)?.displayName || 'Other User';
      
      const currentUserPhotoURL = clerkUser?.imageUrl || 'https://placehold.co/40x40.png?text=ME';
      const currentUserDisplayName = clerkUser?.firstName || 'Me';

      setMessages([
        { id: '1', chatId, senderId: mockSenderId, senderPhotoURL: mockSenderPhotoURL, senderDisplayName: mockSenderDisplayName, text: 'Hey there! This is a mock message.', timestamp: Timestamp.now(), mediaUrl: 'https://placehold.co/300x200.png', mediaType: 'image', fileName: 'placeholder.png' },
        { id: '2', chatId, senderId: currentUserId, senderPhotoURL: currentUserPhotoURL, senderDisplayName: currentUserDisplayName, text: 'Hi! Nice to see this mock chat window.', timestamp: Timestamp.now() },
        { id: '3', chatId, senderId: mockSenderId, senderPhotoURL: mockSenderPhotoURL, senderDisplayName: mockSenderDisplayName, text: 'What do you think of MetalChat?', timestamp: Timestamp.now() },
        { id: '4', chatId, senderId: mockSenderId, senderPhotoURL: mockSenderPhotoURL, senderDisplayName: mockSenderDisplayName, text: 'Here is an audio file.', mediaType: 'audio', mediaUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3', fileName: 'SoundHelix-Song-1.mp3', timestamp: Timestamp.now() },

      ]);
    }
  }, [initialMessages, chatId, currentUserId, chatParticipants, isClerkLoaded, clerkUser]);

  useEffect(() => {
    // Scroll to bottom when messages change or component mounts
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async (text: string, file?: File) => {
    if (!isClerkLoaded || !clerkUser) {
      toast({ title: "Error", description: "User not loaded. Cannot send message.", variant: "destructive" });
      return;
    }
    // This is where you'd integrate with Firebase to send the message
    console.log('Sending message:', { chatId, text, file, senderId: clerkUser.id });
    const newMessage: Message = {
      id: String(Date.now()), // Temporary ID
      chatId,
      senderId: clerkUser.id,
      senderPhotoURL: clerkUser.imageUrl,
      senderDisplayName: clerkUser.firstName || clerkUser.username || 'Current User',
      text: text || undefined,
      mediaUrl: file ? URL.createObjectURL(file) : undefined, // Temporary display
      mediaType: file ? (file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'file') : undefined,
      fileName: file?.name,
      timestamp: Timestamp.now(),
    };
    setMessages((prevMessages) => [...prevMessages, newMessage]);
    // Simulate API call success
    toast({ title: "Message Sent", description: "Your message is on its way!", variant: "default" });
  };

  const handleSummarizeChat = async () => {
    if (messages.length === 0) {
      toast({ title: "Chat is Empty", description: "Nothing to summarize yet.", variant: "default" });
      return;
    }
    setIsLoadingSummary(true);
    setSummary(null); // Clear previous summary

    const chatHistoryText = messages
      .map(msg => `${msg.senderDisplayName || 'User'}: ${msg.text || (msg.fileName ? `[shared ${msg.mediaType}: ${msg.fileName}]` : '[shared media]')}`)
      .join('\n');

    try {
      const input: SummarizeChatInput = { chatHistory: chatHistoryText };
      const result = await summarizeChatFlow(input);
      setSummary(result.summary);
    } catch (error) {
      console.error("Failed to summarize chat:", error);
      toast({ title: "Summarization Failed", description: "Could not generate summary. Please try again.", variant: "destructive" });
      setSummary("Error: Could not generate summary.");
    } finally {
      setIsLoadingSummary(false);
    }
  };
  
  const otherParticipant = chatParticipants?.find(p => p.id !== currentUserId);
  const displayChatName = chatName || otherParticipant?.displayName || 'Chat';
  const displayChatAvatar = otherParticipant?.photoURL;

  return (
    <div className="flex flex-col h-full bg-background text-foreground">
      {/* Chat Header */}
      <header className="flex items-center p-3 border-b border-border bg-card shadow-sm sticky top-0 z-10 h-[65px]">
        <Link href="/chat" passHref className="md:hidden mr-2">
           <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
           </Button>
        </Link>
        <Avatar className="w-10 h-10 mr-3">
          <AvatarImage src={displayChatAvatar || `https://placehold.co/40x40.png?text=${displayChatName.charAt(0)}`} alt={displayChatName} data-ai-hint="avatar person" />
          <AvatarFallback>{displayChatName.substring(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="flex-grow">
          <h2 className="font-semibold text-lg text-foreground truncate">{displayChatName}</h2>
          <p className="text-xs text-muted-foreground">Online</p> {/* Placeholder status */}
        </div>
        <div className="flex items-center gap-1">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-accent" aria-label="Summarize Chat">
                <Bot className="w-5 h-5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="bg-card border-border">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-foreground">Chat Summary</AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground max-h-[400px] overflow-y-auto">
                  {isLoadingSummary && <div className="flex items-center justify-center p-4"><LoadingSpinner size={32} /> <span className="ml-2">Generating summary...</span></div>}
                  {!isLoadingSummary && summary && <p className="whitespace-pre-wrap">{summary}</p>}
                  {!isLoadingSummary && !summary && <p>Click "Summarize" to generate an AI summary of this conversation.</p>}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-muted-foreground hover:bg-secondary">Close</AlertDialogCancel>
                {!summary && <AlertDialogAction onClick={handleSummarizeChat} disabled={isLoadingSummary} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  {isLoadingSummary ? 'Summarizing...' : 'Summarize'}
                </AlertDialogAction>}
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {/* Placeholder for other actions like search, call, info */}
          {/* <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-accent"><Search className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-accent"><Phone className="w-5 h-5" /></Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-accent"><Info className="w-5 h-5" /></Button> */}
        </div>
      </header>

      {/* Messages Area */}
      <ScrollArea ref={scrollAreaRef} className="flex-grow p-4 overflow-y-auto transparent-scrollbar">
        <div className="space-y-2">
          {messages.map((msg) => (
            <MessageItem
              key={msg.id}
              message={msg}
              isCurrentUser={msg.senderId === currentUserId}
            />
          ))}
        </div>
      </ScrollArea>

      {/* Message Input */}
      <MessageInput onSendMessage={handleSendMessage} chatId={chatId} disabled={!isClerkLoaded} />
      <style jsx global>{`
        .transparent-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .transparent-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .transparent-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--border) / 0.5);
          border-radius: 4px;
        }
        .transparent-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--accent) / 0.7);
        }
      `}</style>
    </div>
  );
}
