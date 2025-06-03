"use client";

import React, { useState, useEffect, useCallback } from 'react';
import ChatSidebar from "@/components/chat/chat-sidebar";
import ChatArea from "@/components/chat/chat-area";
import type { Conversation, Message } from "@/types/chat";
import { initTone, addToneStartListener } from '@/lib/sounds';
import { db } from '@/lib/firebase'; // Firebase setup
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { metalAIChat } from '@/ai/flows/metalai-chat-flow';
import { useToast } from '@/hooks/use-toast';

// For simplicity, using a single hardcoded conversation ID for real-time demo
const SHARED_CONVERSATION_ID = "global-chat";

const initialGlobalConversation: Conversation = {
  id: SHARED_CONVERSATION_ID,
  name: "Global MetalAI Chat",
  avatarUrl: "https://placehold.co/100x100.png?text=GC",
  lastMessage: "Welcome to the global chat!",
  timestamp: new Date().toISOString(),
  messages: [],
};

export default function HomePage() {
  const [conversations, setConversations] = useState<Conversation[]>([initialGlobalConversation]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(SHARED_CONVERSATION_ID);
  const { toast } = useToast();

  useEffect(() => {
    const initAudio = async () => {
      await initTone();
    };
    initAudio();
    const removeListeners = addToneStartListener();
    return removeListeners;
  }, []);

  // Subscribe to Firestore messages for the selected conversation
  useEffect(() => {
    if (!selectedConversationId) return;

    const messagesRef = collection(db, "conversations", selectedConversationId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedMessages: Message[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedMessages.push({
          id: doc.id,
          text: data.text,
          sender: data.sender,
          timestamp: (data.timestamp as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
          type: data.type,
          fileUrl: data.fileUrl,
          fileName: data.fileName,
        });
      });

      setConversations(prevConvos =>
        prevConvos.map(convo =>
          convo.id === selectedConversationId
            ? { ...convo, messages: fetchedMessages, lastMessage: fetchedMessages[fetchedMessages.length -1]?.text || convo.lastMessage, timestamp: fetchedMessages[fetchedMessages.length -1]?.timestamp || convo.timestamp }
            : convo
        ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      );
    }, (error) => {
      console.error("Error fetching messages:", error);
      toast({ title: "Error", description: "Could not fetch messages.", variant: "destructive" });
    });

    return () => unsubscribe();
  }, [selectedConversationId, toast]);


  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
  };

  const handleSendMessage = useCallback(async (conversationId: string, text: string, type: Message['type'] = 'text', file?: File, imageDataUri?: string) => {
    if (!conversationId) return;

    const messagesRef = collection(db, "conversations", conversationId, "messages");

    const userMessageData: Omit<Message, 'id' | 'timestamp'> & { timestamp: any } = {
      text: type === 'text' ? text : (file?.name || 'Shared Media'),
      sender: 'user',
      type,
      fileUrl: type !== 'text' ? (imageDataUri || (file ? URL.createObjectURL(file) : undefined)) : undefined, // Use imageDataUri if provided (for AI images)
      fileName: file?.name || (type === 'image' && !file ? 'AI Generated Image' : text),
      timestamp: serverTimestamp(), // Use Firestore server timestamp
    };

    try {
      const userMessageDocRef = await addDoc(messagesRef, userMessageData);
      
      // If it's a text message from the user, trigger MetalAI response
      if (type === 'text' && userMessageData.sender === 'user') {
        // Add a temporary loading message for AI
        const loadingAiMessageId = `metalai-loading-${Date.now()}`;
         setConversations(prevConvos =>
            prevConvos.map(convo => {
              if (convo.id === conversationId) {
                return {
                  ...convo,
                  messages: [...convo.messages, {
                      id: loadingAiMessageId,
                      text: "MetalAI is thinking...",
                      sender: 'metalAI',
                      timestamp: new Date().toISOString(),
                      type: 'text',
                      isLoading: true,
                    }],
                };
              }
              return convo;
            })
          );

        try {
          const currentConvo = conversations.find(c => c.id === conversationId);
          const chatHistoryForAI = currentConvo?.messages
            .filter(msg => !msg.isLoading && (msg.sender === 'user' || msg.sender === 'metalAI') && msg.type === 'text')
            .slice(-10) // Get last 10 messages for history
            .map(msg => ({
              role: msg.sender === 'user' ? 'user' : 'model' as 'user' | 'model',
              parts: [{ text: msg.text }]
            })) || [];


          const aiResponse = await metalAIChat({ userInput: text, chatHistory: chatHistoryForAI });
          
          // Remove loading message
          setConversations(prevConvos =>
            prevConvos.map(convo => {
              if (convo.id === conversationId) {
                return {
                  ...convo,
                  messages: convo.messages.filter(msg => msg.id !== loadingAiMessageId),
                };
              }
              return convo;
            })
          );
          
          await addDoc(messagesRef, {
            text: aiResponse.aiResponse,
            sender: 'metalAI',
            type: 'text',
            timestamp: serverTimestamp(),
          });
        } catch (aiError) {
          console.error("MetalAI chat error:", aiError);
          toast({ title: "MetalAI Error", description: "MetalAI could not respond.", variant: "destructive" });
           // Remove loading message on error
           setConversations(prevConvos =>
            prevConvos.map(convo => {
              if (convo.id === conversationId) {
                return {
                  ...convo,
                  messages: convo.messages.filter(msg => msg.id !== loadingAiMessageId),
                };
              }
              return convo;
            })
          );
          await addDoc(messagesRef, {
            text: "Sorry, I encountered an error.",
            sender: 'metalAI',
            type: 'text',
            timestamp: serverTimestamp(),
          });
        }
      } else if ((type === 'image' || type === 'video' || type === 'audio') && !imageDataUri) {
        // This is a user file upload. In a real app, upload to Firebase Storage here.
        // For now, it's just added to Firestore with a local blob URL if 'file' exists.
        // The 'fileUrl' in userMessageData already has URL.createObjectURL(file)
        // Or if it's an AI generated image, imageDataUri will be set and used.
         if(type === 'video' && file){
             toast({
                title: "Video Handling",
                description: `"${file.name}" is shown locally. Real-time video sharing requires backend upload, which is not fully implemented in this version.`,
                duration: 5000,
             });
         }
      }

    } catch (error) {
      console.error("Error sending message:", error);
      toast({ title: "Send Error", description: "Could not send message.", variant: "destructive" });
    }
  }, [toast, conversations]); // Added conversations to dependency array for chatHistoryForAI
  
  const selectedConversation = conversations.find(c => c.id === selectedConversationId) || null;

  return (
    <div className="flex h-screen w-screen overflow-hidden antialiased text-foreground bg-background">
      <div className="w-full md:w-1/4 lg:w-1/5 max-w-xs hidden md:block h-full shrink-0">
        <ChatSidebar
          conversations={conversations} // Already sorted by onSnapshot update
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