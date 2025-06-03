"use client";

import React, { useState, useEffect } from 'react';
import ChatSidebar from "@/components/chat/chat-sidebar";
import ChatArea from "@/components/chat/chat-area";
import type { Conversation, Message } from "@/types/chat";
import { initTone, addToneStartListener } from '@/lib/sounds';

const mockConversations: Conversation[] = [
  {
    id: "1",
    name: "Project Phoenix",
    avatarUrl: "https://placehold.co/100x100.png?text=PP",
    lastMessage: "Let's discuss the new schematics.",
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
    messages: [
      { id: "m1", text: "Hey, how's the new design coming along?", sender: "other", timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), type: 'text' },
      { id: "m2", text: "Pretty good! Just finishing up the final touches. Here's a preview.", sender: "user", timestamp: new Date(Date.now() - 1000 * 60 * 8).toISOString(), type: 'text' },
      { id: "m3", text: "Looks great!", sender: "other", timestamp: new Date(Date.now() - 1000 * 60 * 7).toISOString(), type: 'text' },
      { id: "m4", text: "Let's discuss the new schematics.", sender: "user", timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), type: 'text' },
    ],
  },
  {
    id: "2",
    name: "Marketing Campaign",
    avatarUrl: "https://placehold.co/100x100.png?text=MC",
    lastMessage: "Can you send over the latest ad copy?",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    messages: [
      { id: "m5", text: "Meeting at 3 PM today.", sender: "other", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), type: 'text' },
      { id: "m6", text: "Can you send over the latest ad copy?", sender: "user", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), type: 'text' },
    ],
  },
  {
    id: "3",
    name: "General Discussion",
    avatarUrl: "https://placehold.co/100x100.png?text=GD",
    lastMessage: "Sure, I'll join the call.",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    messages: [
      {id: "m7", text: "Anyone free for a quick sync-up?", sender: "other", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 25).toISOString(), type: 'text'},
      {id: "m8", text: "Sure, I'll join the call.", sender: "user", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), type: 'text'}
    ],
  },
];


export default function HomePage() {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  useEffect(() => {
    // Initialize Tone.js on component mount and user interaction
    const initAudio = async () => {
      await initTone();
    };
    initAudio();
    const removeListeners = addToneStartListener();
    return removeListeners;
  }, []);
  
  // Auto-select the first conversation if none is selected
  useEffect(() => {
    if (!selectedConversationId && conversations.length > 0) {
      setSelectedConversationId(conversations[0].id);
    }
  }, [conversations, selectedConversationId]);

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
  };

  const handleSendMessage = (conversationId: string, text: string, type: 'text' | 'image' | 'audio' | 'video' = 'text', file?: File) => {
    const newMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      text: type === 'text' ? text : '', // Text is primary for text messages
      sender: 'user',
      timestamp: new Date().toISOString(),
      type,
      fileUrl: file ? URL.createObjectURL(file) : undefined, // Mock URL for display
      fileName: file ? file.name : text, // Use text as filename for text type for simplicity or file.name
    };

    setConversations(prevConvos =>
      prevConvos.map(convo => {
        if (convo.id === conversationId) {
          return {
            ...convo,
            messages: [...convo.messages, newMessage],
            lastMessage: type === 'text' ? text : `[${type.charAt(0).toUpperCase() + type.slice(1)}] ${newMessage.fileName}`,
            timestamp: newMessage.timestamp,
          };
        }
        return convo;
      })
    );

    // Simulate a reply after a short delay
    if (type === 'text') { // Only auto-reply to text messages for now
      setTimeout(() => {
        const replyMessage: Message = {
          id: `msg-${Date.now()}-reply-${Math.random().toString(36).substring(2, 9)}`,
          text: `Got it: "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}"`,
          sender: 'other',
          timestamp: new Date().toISOString(),
          type: 'text',
        };
        setConversations(prevConvos =>
          prevConvos.map(convo => {
            if (convo.id === conversationId) {
              return {
                ...convo,
                messages: [...convo.messages, replyMessage],
                lastMessage: replyMessage.text,
                timestamp: replyMessage.timestamp,
              };
            }
            return convo;
          }).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        );
      }, 1500);
    }
  };
  
  const selectedConversation = conversations.find(c => c.id === selectedConversationId) || null;

  return (
    <div className="flex h-screen w-screen overflow-hidden antialiased text-foreground bg-background">
      <div className="w-full md:w-1/4 lg:w-1/5 max-w-xs hidden md:block h-full shrink-0">
        <ChatSidebar
          conversations={conversations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
        />
      </div>
      <div className="flex-1 h-full">
        <ChatArea
          conversation={selectedConversation}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}
