
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ChatSidebar from "@/components/chat/chat-sidebar";
import ChatArea from "@/components/chat/chat-area";
import IdeaList from "@/components/idea-storage/idea-list";
import type { Conversation, Message, Idea, UserProfile } from "@/types/chat";
import { initTone, addToneStartListener } from '@/lib/sounds';
import { db } from '@/lib/firebase'; 
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, doc, updateDoc, deleteDoc, getDoc, setDoc, where } from "firebase/firestore";
import { metalAIChat } from '@/ai/flows/metalai-chat-flow';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Lightbulb } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useUser, useAuth } from '@clerk/nextjs';
import AddFriendDialog from '@/components/add-friend-dialog';


const SHARED_CONVERSATION_ID = "global-chat"; // This will be less relevant with user-specific chats
const LOCAL_STORAGE_PROFILE_KEY = "metalChatUserProfile"; // For app-specific display name/photo
const LOCAL_STORAGE_ONBOARDING_COMPLETE_KEY = "metalChatOnboardingComplete";
const SELF_CHAT_PREFIX = "self-";

const initialGlobalConversation: Conversation = {
  id: SHARED_CONVERSATION_ID,
  name: "Global MetalAI Chat",
  avatarUrl: "https://placehold.co/100x100.png?text=GC",
  dataAiHint: "group chat",
  lastMessage: "Welcome to the global chat! MetalAI will respond to your messages.",
  timestamp: new Date().toISOString(),
  messages: [],
  isGroup: true,
};

const exampleConversations: Conversation[] = [
  // Example conversations can be loaded if desired, or removed if chats are purely user-driven
];


export default function HomePage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [storedIdeas, setStoredIdeas] = useState<Idea[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  const [appUserProfile, setAppUserProfile] = useState<UserProfile | null>(null); // App-specific profile
  const [hasMounted, setHasMounted] = useState(false);
  const [isAddFriendDialogOpen, setIsAddFriendDialogOpen] = useState(false);

  const { isSignedIn, user, isLoaded: isClerkLoaded } = useUser();
  const { userId: clerkUserId } = useAuth(); // clerkUserId can be null if not signed in


  useEffect(() => {
    setHasMounted(true);
  }, []);

  // Onboarding and App-Specific Profile loading
  useEffect(() => {
    if (!hasMounted || !isClerkLoaded) return;

    if (!isSignedIn) {
      // Clerk middleware should handle redirect to sign-in if this page is protected
      // router.push('/sign-in'); // This might conflict with Clerk's own redirection
      return;
    }
    
    // User is signed in with Clerk
    const onboardingComplete = localStorage.getItem(`${LOCAL_STORAGE_ONBOARDING_COMPLETE_KEY}_${clerkUserId}`);
    if (onboardingComplete !== 'true') {
      router.push('/onboarding');
    } else {
      const storedAppProfile = localStorage.getItem(`${LOCAL_STORAGE_PROFILE_KEY}_${clerkUserId}`);
      if (storedAppProfile) {
        try {
          setAppUserProfile(JSON.parse(storedAppProfile));
        } catch (e) {
          console.error("Failed to parse app profile from localStorage", e);
          localStorage.removeItem(`${LOCAL_STORAGE_PROFILE_KEY}_${clerkUserId}`);
          // Optionally reset onboarding if profile is corrupt and critical
          // localStorage.removeItem(`${LOCAL_STORAGE_ONBOARDING_COMPLETE_KEY}_${clerkUserId}`);
          // router.push('/onboarding');
        }
      }
      // If no app-specific profile, it's fine, we can rely on Clerk's data or defaults
    }
  }, [router, hasMounted, isSignedIn, isClerkLoaded, clerkUserId]);


  // Audio Init
  useEffect(() => {
    const initAudio = async () => { await initTone(); };
    initAudio();
    const removeListeners = addToneStartListener();
    return removeListeners;
  }, []);

  // Fetch conversations from Firestore (user-specific and general)
  useEffect(() => {
    if (!hasMounted || !clerkUserId) return;

    const conversationsRef = collection(db, "conversations");
    // Query for conversations created by the user OR where the user is a member (more complex, for later)
    // For now, let's fetch conversations created by the user, and the global one.
    // A more robust system would involve a 'members' array in conversation docs.
    const userConversationsQuery = query(
      conversationsRef, 
      where("createdBy", "==", clerkUserId), 
      orderBy("timestamp", "desc")
    );
    
    // Also fetch the global chat if it exists (or create it)
    // For "You" chat, it will be handled separately or via a special ID like `self-${clerkUserId}`

    const unsubscribeUserConvos = onSnapshot(userConversationsQuery, (querySnapshot) => {
      const fetchedUserConversations: Conversation[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedUserConversations.push({
          id: docSnap.id,
          name: data.name || "Unnamed Chat",
          avatarUrl: data.avatarUrl || `https://placehold.co/100x100.png?text=${data.name?.[0]?.toUpperCase() || 'C'}`,
          dataAiHint: data.dataAiHint || "chat group",
          lastMessage: data.lastMessage || "No messages yet.",
          timestamp: (data.timestamp as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
          messages: [],
          isGroup: data.isGroup !== undefined ? data.isGroup : true,
          createdBy: data.createdBy,
          isSelfChat: data.isSelfChat || false,
        });
      });
      
      // Combine with initialGlobalConversation and ensure no duplicates if it's also in Firestore
      setConversations(prevConvos => {
        const existingIds = new Set(prevConvos.map(c => c.id));
        const newConvos = [...fetchedUserConversations];

        // Add global chat if not already present from user's created list
        if (!newConvos.some(c => c.id === SHARED_CONVERSATION_ID)) {
           // Consider fetching global chat from Firestore too, or simply adding the local version
           // For now, let's assume global chat isn't user-created this way
        }

        // Filter out old versions of fetched convos if they were in prevConvos
        const updatedConvos = prevConvos.filter(pc => !fetchedUserConversations.some(fc => fc.id === pc.id));
        
        const combined = [...newConvos, ...updatedConvos, initialGlobalConversation]
          .filter((convo, index, self) => index === self.findIndex((c) => c.id === convo.id)) // Unique by ID
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (!selectedConversationId && combined.length > 0) {
          setSelectedConversationId(combined[0].id);
        } else if (selectedConversationId && !combined.find(c => c.id === selectedConversationId)) {
          setSelectedConversationId(combined[0]?.id || null);
        }
        return combined;
      });

    }, (error) => {
      console.error("Error fetching user conversations:", error);
      toast({ title: "Error", description: "Could not fetch your conversations.", variant: "destructive" });
    });
    
    // Add logic for fetching/creating "You" chat (self-chat)
    const selfChatId = `${SELF_CHAT_PREFIX}${clerkUserId}`;
    const selfChatDocRef = doc(db, "conversations", selfChatId);
    getDoc(selfChatDocRef).then(docSnap => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const selfConvo = {
          id: docSnap.id,
          name: "You",
          avatarUrl: user?.imageUrl || `https://placehold.co/100x100.png?text=U`,
          dataAiHint: "self chat note",
          lastMessage: data.lastMessage || "Notes to self...",
          timestamp: (data.timestamp as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
          messages: [],
          isGroup: false,
          createdBy: clerkUserId,
          isSelfChat: true,
        };
        setConversations(prev => {
          if (prev.find(c => c.id === selfConvo.id)) {
            return prev.map(c => c.id === selfConvo.id ? {...c, ...selfConvo, messages: c.messages} : c)
                       .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          }
          return [selfConvo, ...prev].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        });
      } else {
        // Create self-chat conversation if it doesn't exist
        const newSelfChatData = {
          name: "You",
          avatarUrl: user?.imageUrl || `https://placehold.co/100x100.png?text=U`,
          lastMessage: "Notes to self...",
          timestamp: serverTimestamp(),
          isGroup: false,
          createdBy: clerkUserId,
          isSelfChat: true,
        };
        setDoc(selfChatDocRef, newSelfChatData).then(() => {
           const localSelfConvo: Conversation = {
            id: selfChatId,
            ...newSelfChatData,
            timestamp: new Date().toISOString(), // client time for immediate display
            messages: [],
          };
          setConversations(prev => [localSelfConvo, ...prev].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        });
      }
    });


    return () => {
      unsubscribeUserConvos();
    };
  }, [hasMounted, clerkUserId, toast, user?.imageUrl]);


  // Fetch messages for the selected conversation
  useEffect(() => {
    if (!selectedConversationId || !clerkUserId) {
        setConversations(prevConvos => prevConvos.map(c => ({ ...c, messages: [] })));
        return;
    }

    const messagesRef = collection(db, "conversations", selectedConversationId, "messages");
    const qMessages = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribeMessages = onSnapshot(qMessages, (querySnapshot) => {
      const fetchedMessages: Message[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedMessages.push({
          id: docSnap.id,
          text: data.text,
          sender: data.sender, // 'user', 'metalAI'
          timestamp: (data.timestamp as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
          type: data.type,
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          duration: data.duration,
          isDeleted: data.isDeleted || false,
          deletedForUserIds: data.deletedForUserIds || [], 
          userId: data.userId, // Clerk User ID of the sender
          userDisplayName: data.userDisplayName, // Store for display
          userAvatarUrl: data.userAvatarUrl, // Store for display
        });
      });

      setConversations(prevConvos =>
        prevConvos.map(convo =>
          convo.id === selectedConversationId
            ? { 
                ...convo, 
                messages: fetchedMessages, 
                lastMessage: fetchedMessages.length > 0 ? (fetchedMessages[fetchedMessages.length -1]?.text || "Media shared") : convo.lastMessage, 
                timestamp: fetchedMessages.length > 0 ? (fetchedMessages[fetchedMessages.length -1]?.timestamp || convo.timestamp) : convo.timestamp 
              }
            : convo
        ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      );
    }, (error) => {
      console.error(`Error fetching messages for ${selectedConversationId}:`, error);
      toast({ title: "Error", description: "Could not fetch messages.", variant: "destructive" });
    });

    return () => unsubscribeMessages();
  }, [selectedConversationId, toast, clerkUserId]);

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
    imageDataUri?: string,
    duration?: number
  ) => {
    if (!conversationId || !clerkUserId || !user) {
        toast({ title: "Error", description: "Cannot send message. User not identified or not signed in.", variant: "destructive" });
        return;
    }

    const messagesRef = collection(db, "conversations", conversationId, "messages");
    const conversationRef = doc(db, "conversations", conversationId);
    
    const currentAppDisplayName = appUserProfile?.displayName || user.fullName || user.username || "User";
    const currentUserAvatarUrl = appUserProfile?.photoURL || user.imageUrl;


    const messageData: Partial<Message> & { timestamp: any } = {
        sender: 'user', // All messages sent by the human user are 'user'
        type,
        timestamp: serverTimestamp(),
        userId: clerkUserId,
        userDisplayName: currentAppDisplayName,
        userAvatarUrl: currentUserAvatarUrl,
        isDeleted: false,
        deletedForUserIds: [], 
    };
    
    let displayLastMessage = text;

    if (type === 'text') {
      messageData.text = text;
    } else if (imageDataUri && type === 'image') {
        messageData.fileUrl = imageDataUri; 
        messageData.fileName = `Pasted Image ${new Date().toISOString()}.png`;
        messageData.text = ""; // Pasted images don't have separate text
        displayLastMessage = `${currentAppDisplayName} shared an image`;
    } else if (file) {
      // For true sharing, upload to Firebase Storage and use the URL.
      // For now, use a local preview URL if it's not an image data URI
      // This part needs to be expanded with actual Firebase Storage uploads for shared media
      const localUrl = URL.createObjectURL(file); // This is temporary and local
      messageData.fileUrl = localUrl; // Placeholder: Replace with Firebase Storage URL after upload
      messageData.fileName = file.name;
      messageData.text = ""; 
      
      if (type === 'audio') {
        displayLastMessage = `${currentAppDisplayName} sent an audio message`;
        if (duration) messageData.duration = duration;
      } else if (type === 'video') {
        displayLastMessage = `${currentAppDisplayName} shared a video`;
      } else if (type === 'image') {
        displayLastMessage = `${currentAppDisplayName} shared an image`;
      }
       toast({
        title: `Local ${type} Preview`,
        description: `"${file.name}" is shown locally. For others to see/hear, backend file upload is needed.`,
        duration: 7000,
      });
    } else if (type !== 'text') {
      toast({ title: "Send Error", description: "Cannot send empty media message.", variant: "destructive"});
      return;
    }
    
    if (!messageData.text && !messageData.fileUrl && type !== 'text') { 
        messageData.text = 'Media Content';
        displayLastMessage = `${currentAppDisplayName} shared media`;
    }
    if (type === 'text' && !messageData.text) { // Don't send empty text messages
        return;
    }


    try {
      const finalMessageData = { ...messageData };
      if (!finalMessageData.text) finalMessageData.text = "";
      if (!finalMessageData.fileUrl) finalMessageData.fileUrl = null;
      if (!finalMessageData.fileName) finalMessageData.fileName = null;
      if (!finalMessageData.duration) finalMessageData.duration = null;


      await addDoc(messagesRef, finalMessageData);
      await updateDoc(conversationRef, {
        lastMessage: displayLastMessage,
        timestamp: serverTimestamp(),
      });
      
      // AI response logic for non-self chats
      const currentConvo = conversations.find(c => c.id === conversationId);
      if (type === 'text' && finalMessageData.sender === 'user' && currentConvo && !currentConvo.isSelfChat) {
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
                      userId: 'metalAI-bot',
                      userDisplayName: 'MetalAI',
                      userAvatarUrl: 'https://placehold.co/40x40.png?text=AI&bg=accent&fc=accent-foreground'
                    }],
                };
              }
              return convo;
            })
          );

        try {
          const chatHistoryForAI = currentConvo?.messages
            .filter(msg => !msg.isLoading && (msg.sender === 'user' || msg.sender === 'metalAI') && msg.type === 'text' && !msg.isDeleted && (!msg.deletedForUserIds || !msg.deletedForUserIds.includes(clerkUserId)))
            .slice(-10) 
            .map(msg => ({
              role: msg.sender === 'user' ? 'user' : 'model' as 'user' | 'model',
              parts: [{ text: msg.text as string }]
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
            userId: 'metalAI-bot',
            userDisplayName: 'MetalAI',
            userAvatarUrl: 'https://placehold.co/40x40.png?text=AI&bg=accent&fc=accent-foreground',
            isDeleted: false,
            deletedForUserIds: [],
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
          await addDoc(messagesRef, {
            text: "Sorry, I encountered an error and could not respond.",
            sender: 'metalAI',
            type: 'text',
            timestamp: serverTimestamp(),
            userId: 'metalAI-bot',
            userDisplayName: 'MetalAI',
            userAvatarUrl: 'https://placehold.co/40x40.png?text=AI&bg=accent&fc=accent-foreground',
            isDeleted: false,
            deletedForUserIds: [],
          });
           await updateDoc(conversationRef, {
            lastMessage: "Sorry, I encountered an error.",
            timestamp: serverTimestamp(),
          });
        }
      }

    } catch (error) {
      console.error("Error sending message:", error);
      toast({ title: "Send Error", description: `Could not send message. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
    }
  }, [toast, conversations, clerkUserId, user, appUserProfile]); 

  const handleDeleteMessageForMe = async (conversationId: string, messageId: string) => {
    if (!clerkUserId) return;
    
    const messageRef = doc(db, "conversations", conversationId, "messages", messageId);
    const messageDoc = await getDoc(messageRef);
    if (!messageDoc.exists()) return;

    const messageData = messageDoc.data();
    const updatedDeletedForUserIds = Array.isArray(messageData.deletedForUserIds) 
      ? [...messageData.deletedForUserIds, clerkUserId] 
      : [clerkUserId];
    
    await updateDoc(messageRef, {
      deletedForUserIds: updatedDeletedForUserIds
    });
    toast({ title: "Message Hidden", description: "The message is hidden in your view."});
  };

  const handleDeleteMessageForEveryone = async (conversationId: string, messageId: string) => {
    if (!conversationId || !messageId || !clerkUserId) return;
    
    const messageRef = doc(db, "conversations", conversationId, "messages", messageId);
    const messageSnap = await getDoc(messageRef);

    if (!messageSnap.exists() || messageSnap.data()?.userId !== clerkUserId) {
        toast({ title: "Deletion Failed", description: "You can only delete your own messages.", variant: "destructive" });
        return;
    }

    try {
      await updateDoc(messageRef, {
        text: "This message was deleted.",
        type: "text", 
        fileUrl: null,
        fileName: null,
        duration: null,
        isDeleted: true,
      });
      toast({ title: "Message Deleted", description: "The message has been deleted for everyone."});
      
      const convoRef = doc(db, "conversations", conversationId);
      // Update last message in conversation (complex logic, omitted for brevity here, needs to find new last visible message)
      // For simplicity, we might just set it to "Message deleted" or leave as is for this example.
      // A robust implementation would query the last non-deleted message.
       const currentConvo = conversations.find(c => c.id === conversationId);
       if (currentConvo) {
         const visibleMessages = currentConvo.messages.filter(m => m.id !== messageId && !m.isDeleted && !m.deletedForUserIds?.includes(clerkUserId));
         const newLastMessageText = visibleMessages.length > 0 ? (visibleMessages[visibleMessages.length - 1].text || "Media Content") : "No messages yet.";
         await updateDoc(convoRef, {
           lastMessage: newLastMessageText,
           timestamp: serverTimestamp()
         });
       }


    } catch (error) {
      console.error("Error deleting message for everyone:", error);
      toast({ title: "Deletion Error", description: "Could not delete the message for everyone.", variant: "destructive" });
    }
  };
  
  const handleCreateNewConversation = async (name: string) => {
    if (!name.trim() || !clerkUserId) {
      toast({ title: "Error", description: "Conversation name cannot be empty or user not identified.", variant: "destructive" });
      return;
    }
    const newConversationId = uuidv4();
    const newConversationRef = doc(db, "conversations", newConversationId);
    
    const currentAppDisplayName = appUserProfile?.displayName || user?.fullName || user?.username || "User";

    const newConversationData: Omit<Conversation, 'messages' | 'timestamp' | 'id' | 'isSelfChat'> & { id: string, timestamp: any, createdBy: string, createdByName: string, isSelfChat: boolean } = {
      id: newConversationId,
      name,
      avatarUrl: `https://placehold.co/100x100.png?text=${name.substring(0,1).toUpperCase()}`,
      dataAiHint: "group chat",
      lastMessage: "Conversation created.",
      timestamp: serverTimestamp(),
      isGroup: true, 
      createdBy: clerkUserId,
      createdByName: currentAppDisplayName, // For potential display later
      isSelfChat: false,
    };

    try {
      await setDoc(newConversationRef, newConversationData);
      const localNewConvo: Conversation = {
          ...newConversationData, 
          messages: [],
          timestamp: new Date().toISOString(),
      }
      setConversations(prev => [localNewConvo, ...prev].sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      setSelectedConversationId(newConversationId);
      toast({ title: "Conversation Created", description: `"${name}" is ready.` });
    } catch (error) {
      console.error("Error creating conversation:", error);
      toast({ title: "Creation Error", description: "Could not create conversation.", variant: "destructive" });
    }
  };


  const currentDisplayName = appUserProfile?.displayName || user?.fullName || user?.username || "User";

  if (!hasMounted || !isClerkLoaded) {
    return <div className="flex h-screen w-screen items-center justify-center bg-background"><p>Initializing MetalChat...</p></div>;
  }

  if (isClerkLoaded && !isSignedIn) {
    // Clerk should redirect via middleware. This is a fallback or can show a custom message.
    return <div className="flex h-screen w-screen items-center justify-center bg-background"><p>Redirecting to sign-in...</p></div>;
  }
  
  if (isSignedIn && localStorage.getItem(`${LOCAL_STORAGE_ONBOARDING_COMPLETE_KEY}_${clerkUserId}`) !== 'true') {
     return <div className="flex h-screen w-screen items-center justify-center bg-background"><p>Redirecting to onboarding...</p></div>;
  }


  const selectedConversation = conversations.find(c => c.id === selectedConversationId) || null;

  return (
    <div className="flex h-screen w-screen overflow-hidden antialiased text-foreground bg-background">
      <div className="w-full md:w-1/4 lg:w-1/5 max-w-xs hidden md:block h-full shrink-0">
        <ChatSidebar
          conversations={conversations} 
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
          onCreateConversation={handleCreateNewConversation}
          currentUserId={clerkUserId}
          onOpenAddFriendDialog={() => setIsAddFriendDialogOpen(true)}
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
              currentUserId={clerkUserId} // Pass Clerk User ID
              onDeleteMessageForMe={handleDeleteMessageForMe}
              onDeleteMessageForEveryone={handleDeleteMessageForEveryone}
            />
          </TabsContent>
          <TabsContent value="ideas" className="flex-1 overflow-y-auto p-4">
             <IdeaList ideas={storedIdeas} onDeleteIdea={handleDeleteIdea} />
          </TabsContent>
        </Tabs>
      </div>
      <AddFriendDialog isOpen={isAddFriendDialogOpen} onOpenChange={setIsAddFriendDialogOpen} />
    </div>
  );
}
