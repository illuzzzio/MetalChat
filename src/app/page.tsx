
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import ChatSidebar from "@/components/chat/chat-sidebar";
import ChatArea from "@/components/chat/chat-area";
import IdeaList from "@/components/idea-storage/idea-list";
import type { Conversation, Message, Idea } from "@/types/chat";
import { initTone, addToneStartListener } from '@/lib/sounds';
import { db } from '@/lib/firebase'; 
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { metalAIChat } from '@/ai/flows/metalai-chat-flow';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Lightbulb } from 'lucide-react';

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
  const [storedIdeas, setStoredIdeas] = useState<Idea[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const initAudio = async () => {
      await initTone();
    };
    initAudio();
    const removeListeners = addToneStartListener();
    return removeListeners;
  }, []);

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
          duration: data.duration,
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

  const handleAddIdea = (idea: Idea) => {
    setStoredIdeas(prevIdeas => [idea, ...prevIdeas].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  };

  const handleSendMessage = useCallback(async (
    conversationId: string, 
    text: string, 
    type: Message['type'] = 'text', 
    file?: File, 
    imageDataUri?: string,
    duration?: number
  ) => {
    if (!conversationId) return;

    const messagesRef = collection(db, "conversations", conversationId, "messages");

    const messageDataToStore: {
      sender: 'user';
      type: Message['type'];
      timestamp: any; 
      text: string;
      fileUrl?: string;
      fileName?: string;
      duration?: number;
    } = {
      sender: 'user',
      type,
      timestamp: serverTimestamp(),
      text: '', 
    };

    if (type === 'text') {
      messageDataToStore.text = text;
    } else { // For media types: 'image', 'video', 'audio'
      let url: string | undefined = imageDataUri; // AI generated image
      if (file) { // User uploaded file
        url = URL.createObjectURL(file); // Create local blob URL for preview
      }
      
      if (url) {
        messageDataToStore.fileUrl = url;
      }

      if (imageDataUri && type === 'image') { // AI-generated image (already handled by IdeaStorage, this case might be for future direct send)
        messageDataToStore.fileName = 'AI Generated Image';
        messageDataToStore.text = `AI Image: ${text.substring(0,100)}${text.length > 100 ? '...' : ''}`;
      } else if (file) {
        messageDataToStore.fileName = file.name;
        messageDataToStore.text = file.name; 
        if (type === 'audio' && duration) {
            messageDataToStore.duration = duration;
        }
      } else {
        messageDataToStore.text = text || 'Shared Media File';
      }
      
      if (!messageDataToStore.text) {
        messageDataToStore.text = 'Media Content';
      }
    }

    try {
      await addDoc(messagesRef, messageDataToStore);
      
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
      } else if ((type === 'image' || type === 'video' || type === 'audio') && file) {
         if(type === 'video' && file){
             toast({
                title: "Video Upload",
                description: `"${file.name}" is shown locally. Real-time video sharing for others requires backend upload, which is not fully implemented in this version.`,
                duration: 7000,
             });
         }
         if(type === 'audio' && file){
             toast({
                title: "Audio Recording Sent",
                description: `"${file.name}" sent as a local preview. For others to hear it, backend upload is needed (not fully implemented).`,
                duration: 7000,
             });
         }
          if(type === 'image' && file){
             toast({
                title: "Image Upload",
                description: `"${file.name}" is shown locally. Real-time image sharing for others requires backend upload, which is not fully implemented in this version.`,
                duration: 7000,
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
        <Tabs defaultValue="chat" className="h-full flex flex-col">
          <div className="p-2 border-b">
            <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-flex">
              <TabsTrigger value="chat"><MessageSquare className="w-4 h-4 mr-2"/>Chat</TabsTrigger>
              <TabsTrigger value="ideas"><Lightbulb className="w-4 h-4 mr-2"/>Idea Storage ({storedIdeas.length})</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="chat" className="flex-1 overflow-hidden flex flex-col">
            <ChatArea
              conversation={selectedConversation}
              onSendMessage={handleSendMessage}
              onAddIdea={handleAddIdea}
            />
          </TabsContent>
          <TabsContent value="ideas" className="flex-1 overflow-y-auto p-4">
             <IdeaList ideas={storedIdeas} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
