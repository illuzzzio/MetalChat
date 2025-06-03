
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ChatSidebar from "@/components/chat/chat-sidebar";
import ChatArea from "@/components/chat/chat-area";
import IdeaList from "@/components/idea-storage/idea-list";
import type { Conversation, Message, Idea, UserProfile } from "@/types/chat";
import { initTone, addToneStartListener } from '@/lib/sounds';
import { db } from '@/lib/firebase'; 
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, doc, updateDoc, deleteDoc, getDoc, setDoc } from "firebase/firestore";
import { metalAIChat } from '@/ai/flows/metalai-chat-flow';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Lightbulb, UserCircle } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs

const SHARED_CONVERSATION_ID = "global-chat";
const LOCAL_STORAGE_PROFILE_KEY = "metalChatUserProfile";
const LOCAL_STORAGE_ONBOARDING_COMPLETE_KEY = "metalChatOnboardingComplete";
const LOCAL_STORAGE_USER_ID_KEY = "metalChatUserId";


const initialGlobalConversation: Conversation = {
  id: SHARED_CONVERSATION_ID,
  name: "Global MetalAI Chat",
  avatarUrl: "https://placehold.co/100x100.png?text=GC",
  dataAiHint: "group chat",
  lastMessage: "Welcome to the global chat!",
  timestamp: new Date().toISOString(),
  messages: [],
  isGroup: true,
};

const exampleConversations: Conversation[] = [
  {
    id: "dev-talk",
    name: "Dev Team Sync",
    avatarUrl: "https://placehold.co/100x100.png?text=DT",
    dataAiHint: "development team",
    lastMessage: "Let's discuss the new feature.",
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 mins ago
    messages: [],
    isGroup: true,
  },
  {
    id: "random- banter",
    name: "Random Banter",
    avatarUrl: "https://placehold.co/100x100.png?text=RB",
    dataAiHint: "casual chat",
    lastMessage: "Anyone seen that new movie?",
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
    messages: [],
    isGroup: true,
  },
];


export default function HomePage() {
  const [conversations, setConversations] = useState<Conversation[]>([initialGlobalConversation, ...exampleConversations]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(SHARED_CONVERSATION_ID);
  const [storedIdeas, setStoredIdeas] = useState<Idea[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Initialize or retrieve user ID
  useEffect(() => {
    let userId = localStorage.getItem(LOCAL_STORAGE_USER_ID_KEY);
    if (!userId) {
      userId = uuidv4();
      localStorage.setItem(LOCAL_STORAGE_USER_ID_KEY, userId);
    }
    setCurrentUserId(userId);
  }, []);


  // Onboarding and Profile loading
 useEffect(() => {
    const onboardingComplete = localStorage.getItem(LOCAL_STORAGE_ONBOARDING_COMPLETE_KEY);
    if (onboardingComplete !== 'true') {
      router.push('/onboarding');
    } else {
      const storedProfile = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
      if (storedProfile) {
        setUserProfile(JSON.parse(storedProfile));
      } else {
        // Should not happen if onboarding was complete, but as a fallback:
        router.push('/onboarding');
      }
    }
  }, [router]);

  // Audio Init
  useEffect(() => {
    const initAudio = async () => { await initTone(); };
    initAudio();
    const removeListeners = addToneStartListener();
    return removeListeners;
  }, []);

  // Fetch conversations from Firestore (initial load and updates)
  useEffect(() => {
    const conversationsRef = collection(db, "conversations");
    const q = query(conversationsRef, orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedConversations: Conversation[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedConversations.push({
          id: doc.id,
          name: data.name || "Unnamed Chat",
          avatarUrl: data.avatarUrl || `https://placehold.co/100x100.png?text=${data.name?.[0]?.toUpperCase() || 'C'}`,
          dataAiHint: data.dataAiHint || "chat group",
          lastMessage: data.lastMessage || "No messages yet.",
          timestamp: (data.timestamp as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
          messages: [], // Messages will be loaded when a conversation is selected
          isGroup: data.isGroup !== undefined ? data.isGroup : true,
          createdBy: data.createdBy,
        });
      });
      // Merge with any example/default conversations if they aren't already fetched
      const allConvoIds = new Set(fetchedConversations.map(c => c.id));
      const combinedConversations = [
        ...fetchedConversations,
        ...[initialGlobalConversation, ...exampleConversations].filter(ec => !allConvoIds.has(ec.id))
      ];
      
      setConversations(combinedConversations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      
      if (!selectedConversationId && combinedConversations.length > 0) {
        setSelectedConversationId(combinedConversations[0].id);
      } else if (selectedConversationId && !combinedConversations.find(c => c.id === selectedConversationId)) {
        // If selected convo was deleted or disappeared, select the first one
        setSelectedConversationId(combinedConversations[0]?.id || null);
      }

    }, (error) => {
      console.error("Error fetching conversations:", error);
      toast({ title: "Error", description: "Could not fetch conversations.", variant: "destructive" });
    });
    return () => unsubscribe();
  }, [toast]); // Removed selectedConversationId from deps as it might cause re-fetch loops

  // Fetch messages for the selected conversation
  useEffect(() => {
    if (!selectedConversationId) {
        setConversations(prevConvos => prevConvos.map(c => ({ ...c, messages: [] }))); // Clear messages for all convos
        return;
    }

    const messagesRef = collection(db, "conversations", selectedConversationId, "messages");
    const qMessages = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribeMessages = onSnapshot(qMessages, (querySnapshot) => {
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
          isDeleted: data.isDeleted || false,
          userId: data.userId, // Store the sender's user ID
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
      console.error(`Error fetching messages for ${selectedConversationId}:`, error);
      toast({ title: "Error", description: "Could not fetch messages.", variant: "destructive" });
    });

    return () => unsubscribeMessages();
  }, [selectedConversationId, toast]);

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
  };

  const handleAddIdea = (idea: Idea) => {
    setStoredIdeas(prevIdeas => [idea, ...prevIdeas].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
  };
  
  const handleDeleteIdea = (ideaId: string) => {
    setStoredIdeas(prevIdeas => prevIdeas.filter(idea => idea.id !== ideaId));
    toast({ title: "Idea Deleted", description: "The idea has been removed from your storage." });
  };

  const handleSendMessage = useCallback(async (
    conversationId: string, 
    text: string, 
    type: Message['type'] = 'text', 
    file?: File, 
    imageDataUri?: string, // For AI generated image (not directly sent now) or pasted image
    duration?: number
  ) => {
    if (!conversationId || !currentUserId) return;

    const messagesRef = collection(db, "conversations", conversationId, "messages");
    const conversationRef = doc(db, "conversations", conversationId);

    const messageDataToStore: Omit<Message, 'id' | 'timestamp' | 'deletedForMe'> & { timestamp: any } = { // Firestore will generate ID
      sender: 'user',
      type,
      timestamp: serverTimestamp(),
      text: '', 
      userId: currentUserId,
    };

    if (type === 'text') {
      messageDataToStore.text = text;
    } else if (imageDataUri && type === 'image') { // Pasted image or future AI direct send
        messageDataToStore.fileUrl = imageDataUri; // This is a data URI
        messageDataToStore.fileName = `Pasted Image ${new Date().toISOString()}.png`;
        messageDataToStore.text = messageDataToStore.fileName;
    } else if (file) { // User uploaded file (image, audio, video)
      // For now, use local URL for preview. Real upload to Firebase Storage needed for sharing.
      const localUrl = URL.createObjectURL(file);
      messageDataToStore.fileUrl = localUrl; 
      messageDataToStore.fileName = file.name;
      messageDataToStore.text = file.name;
      if (type === 'audio' && duration) {
          messageDataToStore.duration = duration;
      }
    } else {
      // Should not happen if logic is correct
      console.error("Attempted to send media message without file or imageDataUri");
      toast({ title: "Send Error", description: "Cannot send empty media message.", variant: "destructive"});
      return;
    }
    
    if (!messageDataToStore.text && type !== 'image') { // Images can have empty text if it's just the image
      messageDataToStore.text = 'Media Content';
    }

    try {
      const addedDocRef = await addDoc(messagesRef, messageDataToStore);
      await updateDoc(conversationRef, {
        lastMessage: type === 'text' ? text : (messageDataToStore.fileName || "Media shared"),
        timestamp: serverTimestamp(),
      });
      
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
                      userId: 'metalAI-bot'
                    }],
                };
              }
              return convo;
            })
          );

        try {
          const currentConvo = conversations.find(c => c.id === conversationId);
          const chatHistoryForAI = currentConvo?.messages
            .filter(msg => !msg.isLoading && (msg.sender === 'user' || msg.sender === 'metalAI') && msg.type === 'text' && !msg.isDeleted)
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
          
          const aiMessageRef = await addDoc(messagesRef, {
            text: aiResponse.aiResponse,
            sender: 'metalAI',
            type: 'text',
            timestamp: serverTimestamp(),
            userId: 'metalAI-bot'
          });
          await updateDoc(conversationRef, {
            lastMessage: aiResponse.aiResponse,
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
          const errorMsgRef = await addDoc(messagesRef, {
            text: "Sorry, I encountered an error and could not respond.",
            sender: 'metalAI',
            type: 'text',
            timestamp: serverTimestamp(),
            userId: 'metalAI-bot'
          });
           await updateDoc(conversationRef, {
            lastMessage: "Sorry, I encountered an error.",
            timestamp: serverTimestamp(),
          });
        }
      } else if ((type === 'image' || type === 'video' || type === 'audio') && file) {
         toast({
            title: `${type.charAt(0).toUpperCase() + type.slice(1)} Sent (Local Preview)`,
            description: `"${file.name}" is shown locally. For others to see/hear it, backend file upload (not yet implemented) is required.`,
            duration: 7000,
         });
      }

    } catch (error) {
      console.error("Error sending message:", error);
      toast({ title: "Send Error", description: `Could not send message. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
    }
  }, [toast, conversations, currentUserId]); 

  const handleDeleteMessageForMe = (conversationId: string, messageId: string) => {
    setConversations(prevConvos =>
      prevConvos.map(convo =>
        convo.id === conversationId
          ? {
              ...convo,
              messages: convo.messages.map(msg =>
                msg.id === messageId ? { ...msg, deletedForMe: true } : msg
              ),
            }
          : convo
      )
    );
    toast({ title: "Message Hidden", description: "The message is hidden in your view."});
  };

  const handleDeleteMessageForEveryone = async (conversationId: string, messageId: string) => {
    if (!conversationId || !messageId) return;
    const messageRef = doc(db, "conversations", conversationId, "messages", messageId);
    try {
      await updateDoc(messageRef, {
        text: "This message was deleted.",
        type: "text", // Change type to text to prevent rendering issues with media
        fileUrl: null,
        fileName: null,
        duration: null,
        isDeleted: true,
      });
      toast({ title: "Message Deleted", description: "The message has been deleted for everyone."});
      // Update last message if this was the last one
      const convoRef = doc(db, "conversations", conversationId);
      const convoSnap = await getDoc(convoRef);
      if (convoSnap.exists()) {
        const currentConvo = conversations.find(c => c.id === conversationId);
        if (currentConvo && currentConvo.messages[currentConvo.messages.length -1]?.id === messageId) {
            const newLastMessage = currentConvo.messages.filter(m => m.id !== messageId && !m.isDeleted).pop()?.text || "This message was deleted.";
             await updateDoc(convoRef, {
                lastMessage: newLastMessage,
                timestamp: serverTimestamp() 
            });
        }
      }
    } catch (error) {
      console.error("Error deleting message for everyone:", error);
      toast({ title: "Deletion Error", description: "Could not delete the message for everyone.", variant: "destructive" });
    }
  };
  
  const handleCreateNewConversation = async (name: string) => {
    if (!name.trim() || !currentUserId) {
      toast({ title: "Error", description: "Conversation name cannot be empty.", variant: "destructive" });
      return;
    }
    const newConversationId = uuidv4();
    const newConversationRef = doc(db, "conversations", newConversationId);
    const conversationData: Conversation = {
      id: newConversationId,
      name,
      avatarUrl: `https://placehold.co/100x100.png?text=${name.substring(0,1).toUpperCase()}`,
      dataAiHint: "group chat",
      lastMessage: "Conversation created.",
      timestamp: new Date().toISOString(),
      messages: [],
      isGroup: true,
      createdBy: currentUserId,
    };

    try {
      await setDoc(newConversationRef, {
        name: conversationData.name,
        avatarUrl: conversationData.avatarUrl,
        dataAiHint: conversationData.dataAiHint,
        lastMessage: conversationData.lastMessage,
        timestamp: serverTimestamp(),
        isGroup: conversationData.isGroup,
        createdBy: conversationData.createdBy,
      });
      // Add to local state, Firestore listener will eventually pick it up but this is faster for UI
      setConversations(prev => [conversationData, ...prev].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      setSelectedConversationId(newConversationId);
      toast({ title: "Conversation Created", description: `"${name}" is ready.` });
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast({ title: "Creation Error", description: "Could not create conversation.", variant: "destructive" });
    }
  };

  const selectedConversation = conversations.find(c => c.id === selectedConversationId) || null;
  const displayName = userProfile?.displayName || "User";

  if (!localStorage.getItem(LOCAL_STORAGE_ONBOARDING_COMPLETE_KEY)) {
    // router.push will be handled by useEffect, show loading or minimal UI
    return <div className="flex h-screen w-screen items-center justify-center bg-background"><p>Loading MetalChat...</p></div>;
  }


  return (
    <div className="flex h-screen w-screen overflow-hidden antialiased text-foreground bg-background">
      <div className="w-full md:w-1/4 lg:w-1/5 max-w-xs hidden md:block h-full shrink-0">
        <ChatSidebar
          conversations={conversations} 
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
          onCreateConversation={handleCreateNewConversation}
          currentUserId={currentUserId}
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
              currentUserDisplayName={displayName}
              currentUserId={currentUserId}
              onDeleteMessageForMe={handleDeleteMessageForMe}
              onDeleteMessageForEveryone={handleDeleteMessageForEveryone}
            />
          </TabsContent>
          <TabsContent value="ideas" className="flex-1 overflow-y-auto p-4">
             <IdeaList ideas={storedIdeas} onDeleteIdea={handleDeleteIdea} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
