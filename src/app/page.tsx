
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
  dataAiHint: "group chat",
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

    const messageDataToStore: {
      text: string;
      sender: 'user';
      type: Message['type'];
      timestamp: any; // Firestore ServerTimestampPlaceholder
      fileUrl?: string;
      fileName?: string;
    } = {
      sender: 'user',
      type,
      timestamp: serverTimestamp(),
      text: '', // Will be definitively set below
    };

    if (type === 'text') {
      messageDataToStore.text = text;
      // For text messages, fileUrl and fileName are not applicable and will be omitted.
    } else { // For media types: 'image', 'video', 'audio'
      const url = imageDataUri || (file ? URL.createObjectURL(file) : undefined);
      if (url) {
        messageDataToStore.fileUrl = url;
      }

      if (imageDataUri && type === 'image') {
        // For AI-generated images, 'text' is the prompt passed to handleSendMessage
        messageDataToStore.fileName = 'AI Generated Image';
        messageDataToStore.text = `AI Image: ${text.substring(0,100)}${text.length > 100 ? '...' : ''}`; // Use prompt as text
      } else if (file) {
        messageDataToStore.fileName = file.name;
        messageDataToStore.text = file.name; // Use file name as the message text for actual files
      } else {
        // Media type, but no specific file or imageDataUri was provided or successfully generated
        // 'text' (the original input string to handleSendMessage) serves as the description or fallback.
        messageDataToStore.text = text || 'Shared Media File';
        // fileName remains omitted if no file or AI image context.
      }
      // Ensure text has a fallback for media messages if it somehow wasn't set
      if (!messageDataToStore.text) {
        messageDataToStore.text = 'Media Content';
      }
    }

    try {
      // Firestore SDK will omit fields that are undefined in messageDataToStore
      const userMessageDocRef = await addDoc(messagesRef, messageDataToStore);
      
      if (type === 'text' && messageDataToStore.sender === 'user') {
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
            .slice(-10) 
            .map(msg => ({
              role: msg.sender === 'user' ? 'user' : 'model' as 'user' | 'model',
              parts: [{ text: msg.text }]
            })) || [];

          const aiResponse = await metalAIChat({ userInput: text, chatHistory: chatHistoryForAI });
          
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
      toast({ title: "Send Error", description: `Could not send message. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
    }
  }, [toast, conversations]); 
  
  const selectedConversation = conversations.find(c => c.id === selectedConversationId) || null;

  return (
    <div className="flex h-screen w-screen overflow-hidden antialiased text-foreground bg-background">
      <div className="w-full md:w-1/4 lg:w-1/5 max-w-xs hidden md:block h-full shrink-0">
        <ChatSidebar
          conversations={conversations} 
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
