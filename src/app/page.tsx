
"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ChatSidebar from "@/components/chat/chat-sidebar";
import ChatArea from "@/components/chat/chat-area";
import IdeaList from "@/components/idea-storage/idea-list";
import type { Conversation, Message, Idea, UserProfile, SearchedUser, ParticipantDetails } from "@/types/chat";
import { initTone, addToneStartListener } from '@/lib/sounds';
import { db } from '@/lib/firebase'; 
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, doc, updateDoc, deleteDoc, getDoc, setDoc, where, writeBatch } from "firebase/firestore";
import { metalAIChat } from '@/ai/flows/metalai-chat-flow';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, Lightbulb } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { useUser, useAuth } from '@clerk/nextjs';
import AddFriendDialog from '@/components/add-friend-dialog';


const LOCAL_STORAGE_PROFILE_KEY_PREFIX = "metalChatUserProfile_";
const LOCAL_STORAGE_ONBOARDING_COMPLETE_KEY_PREFIX = "metalChatOnboardingComplete_";
const SELF_CHAT_ID_PREFIX = "self-"; // For user's self-chat

// Global Chat - kept client-side for now
const SHARED_CONVERSATION_ID = "global-metalai-chat";
const initialGlobalConversation: Conversation = {
  id: SHARED_CONVERSATION_ID,
  name: "Global MetalAI Chat",
  avatarUrl: "https://placehold.co/100x100.png?text=GC",
  dataAiHint: "group chat",
  lastMessage: "Welcome to the global chat! MetalAI will respond to your messages.",
  timestamp: new Date(0).toISOString(), // Old timestamp to ensure it's sorted last if no real activity
  messages: [],
  isGroup: true,
  members: ["everyone"], // Placeholder for global
};


export default function HomePage() {
  const [conversations, setConversations] = useState<Conversation[]>([initialGlobalConversation]);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [storedIdeas, setStoredIdeas] = useState<Idea[]>([]);
  const { toast } = useToast();
  const router = useRouter();
  const [appUserProfile, setAppUserProfile] = useState<UserProfile | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [isAddFriendDialogOpen, setIsAddFriendDialogOpen] = useState(false);

  const { isSignedIn, user, isLoaded: isClerkLoaded } = useUser();
  const { userId: clerkUserId } = useAuth();


  useEffect(() => {
    setHasMounted(true);
    const initAudio = async () => { await initTone(); };
    initAudio();
    const removeListeners = addToneStartListener();
    return removeListeners;
  }, []);

  // Onboarding and App-Specific Profile loading
  useEffect(() => {
    if (!hasMounted || !isClerkLoaded || !clerkUserId) return;

    if (!isSignedIn) return; // Middleware should handle this
    
    const onboardingComplete = localStorage.getItem(`${LOCAL_STORAGE_ONBOARDING_COMPLETE_KEY_PREFIX}${clerkUserId}`);
    if (onboardingComplete !== 'true') {
      router.push('/onboarding');
    } else {
      const storedAppProfile = localStorage.getItem(`${LOCAL_STORAGE_PROFILE_KEY_PREFIX}${clerkUserId}`);
      if (storedAppProfile) {
        try {
          setAppUserProfile(JSON.parse(storedAppProfile));
        } catch (e) { console.error("Failed to parse app profile", e); }
      }
    }
  }, [router, hasMounted, isSignedIn, isClerkLoaded, clerkUserId]);

  // Fetch conversations from Firestore
  useEffect(() => {
    if (!hasMounted || !clerkUserId || !user) return;

    const conversationsRef = collection(db, "conversations");
    // Fetch conversations where the current user is a member
    const userConversationsQuery = query(
      conversationsRef,
      where("members", "array-contains", clerkUserId),
      orderBy("timestamp", "desc")
    );

    const unsubscribeUserConvos = onSnapshot(userConversationsQuery, (querySnapshot) => {
      const fetchedUserConversations: Conversation[] = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedUserConversations.push({
          id: docSnap.id,
          name: data.name || "Unnamed Chat",
          avatarUrl: data.avatarUrl || `https://placehold.co/100x100.png?text=${data.name?.[0]?.toUpperCase() || 'C'}`,
          dataAiHint: data.dataAiHint || (data.isGroup ? "group chat" : "person chat"),
          lastMessage: data.lastMessage || "No messages yet.",
          timestamp: (data.timestamp as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
          messages: [], // Messages loaded separately
          isGroup: data.isGroup !== undefined ? data.isGroup : true,
          isSelfChat: data.isSelfChat || false,
          createdBy: data.createdBy,
          members: data.members || [],
          participantDetails: data.participantDetails || {},
        });
      });
      
      // Combine with initialGlobalConversation, ensuring no duplicates if global chat were ever in Firestore
      setConversations(prevConvos => {
        const combined = [...fetchedUserConversations, initialGlobalConversation]
          .filter((convo, index, self) => index === self.findIndex((c) => c.id === convo.id))
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        
        if (!selectedConversationId && combined.length > 0) {
          // Default to the first non-global chat if available, else global
          const firstUserChat = combined.find(c => c.id !== SHARED_CONVERSATION_ID);
          setSelectedConversationId(firstUserChat?.id || combined[0]?.id || null);
        } else if (selectedConversationId && !combined.find(c => c.id === selectedConversationId)) {
          const firstUserChat = combined.find(c => c.id !== SHARED_CONVERSATION_ID);
          setSelectedConversationId(firstUserChat?.id || combined[0]?.id || null);
        }
        return combined;
      });

    }, (error) => {
      console.error("Error fetching user conversations:", error);
      toast({ title: "Error", description: "Could not fetch your conversations.", variant: "destructive" });
    });
    
    // Ensure "You" (self-chat) conversation exists
    const selfChatId = `${SELF_CHAT_ID_PREFIX}${clerkUserId}`;
    const selfChatDocRef = doc(db, "conversations", selfChatId);
    getDoc(selfChatDocRef).then(docSnap => {
      if (!docSnap.exists()) {
        const selfParticipantDetails: ParticipantDetails = {
            displayName: appUserProfile?.displayName || user.fullName || user.username || "You",
            avatarUrl: appUserProfile?.photoURL || user.imageUrl || undefined
        };
        const newSelfChatData = {
          name: "You",
          avatarUrl: selfParticipantDetails.avatarUrl || `https://placehold.co/100x100.png?text=U`,
          lastMessage: "Notes to self...",
          timestamp: serverTimestamp(),
          isGroup: false,
          isSelfChat: true,
          createdBy: clerkUserId,
          members: [clerkUserId],
          participantDetails: { [clerkUserId]: selfParticipantDetails },
        };
        setDoc(selfChatDocRef, newSelfChatData).catch(err => console.error("Error creating self chat:", err));
      }
    });

    return () => unsubscribeUserConvos();
  }, [hasMounted, clerkUserId, toast, user, appUserProfile]);


  // Fetch messages for the selected conversation
  useEffect(() => {
    if (!selectedConversationId || !clerkUserId || selectedConversationId === SHARED_CONVERSATION_ID) {
        // Clear messages for global chat or if no selection, global chat messages are not in Firestore this way
        setConversations(prevConvos => prevConvos.map(c => 
            c.id === selectedConversationId ? { ...c, messages: c.id === SHARED_CONVERSATION_ID ? c.messages : [] } : c
        ));
        if (selectedConversationId === SHARED_CONVERSATION_ID && initialGlobalConversation.messages.length === 0) {
            // Simulate some welcome messages for global chat if empty (client-side only)
            setConversations(prev => prev.map(c => c.id === SHARED_CONVERSATION_ID ? {
                ...c, messages: [
                    { id: 'global-welcome-1', text: 'Welcome to the global chat!', sender: 'metalAI', timestamp: new Date().toISOString(), type: 'text', userId: 'metalAI-bot', userDisplayName: 'MetalAI' },
                    { id: 'global-welcome-2', text: 'Feel free to discuss anything. MetalAI will respond if mentioned or in general context.', sender: 'metalAI', timestamp: new Date().toISOString(), type: 'text', userId: 'metalAI-bot', userDisplayName: 'MetalAI' }
                ]
            } : c));
        }
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
          sender: data.sender,
          timestamp: (data.timestamp as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
          type: data.type,
          fileUrl: data.fileUrl,
          fileName: data.fileName,
          duration: data.duration,
          isDeleted: data.isDeleted || false,
          deletedForUserIds: data.deletedForUserIds || [], 
          userId: data.userId,
          userDisplayName: data.userDisplayName,
          userAvatarUrl: data.userAvatarUrl,
        });
      });

      setConversations(prevConvos =>
        prevConvos.map(convo =>
          convo.id === selectedConversationId
            ? { 
                ...convo, 
                messages: fetchedMessages, 
                // Update lastMessage and timestamp based on fetched messages
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
        toast({ title: "Error", description: "Cannot send message. User not identified.", variant: "destructive" });
        return;
    }

    // Handle global chat messages client-side for now
    if (conversationId === SHARED_CONVERSATION_ID) {
        const currentAppDisplayName = appUserProfile?.displayName || user.fullName || user.username || "User";
        const currentUserAvatarUrl = appUserProfile?.photoURL || user.imageUrl;
        const newMessage: Message = {
            id: uuidv4(),
            text: text,
            sender: 'user',
            type: type,
            timestamp: new Date().toISOString(),
            userId: clerkUserId,
            userDisplayName: currentAppDisplayName,
            userAvatarUrl: currentUserAvatarUrl,
        };
        if (imageDataUri && type==='image') newMessage.fileUrl = imageDataUri;
        // Add more properties for file if needed for global client-side

        setConversations(prev => prev.map(c => c.id === SHARED_CONVERSATION_ID ? {
            ...c,
            messages: [...c.messages, newMessage],
            lastMessage: text || "Shared media",
            timestamp: new Date().toISOString(),
        }:c).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

        // Simulate AI response for global chat
        setTimeout(async () => {
             try {
                const chatHistoryForAI = conversations.find(c=>c.id === SHARED_CONVERSATION_ID)?.messages
                    .filter(msg => (msg.sender === 'user' || msg.sender === 'metalAI') && msg.type === 'text')
                    .slice(-5) 
                    .map(msg => ({
                    role: msg.sender === 'user' ? 'user' : 'model' as 'user' | 'model',
                    parts: [{ text: msg.text as string }]
                    })) || [];

                const aiResponse = await metalAIChat({ userInput: text, chatHistory: chatHistoryForAI });
                const aiMessage: Message = {
                    id: uuidv4(),
                    text: aiResponse.aiResponse,
                    sender: 'metalAI',
                    type: 'text',
                    timestamp: new Date().toISOString(),
                    userId: 'metalAI-bot',
                    userDisplayName: 'MetalAI',
                    userAvatarUrl: 'https://placehold.co/40x40.png?text=AI&bg=accent&fc=accent-foreground',
                };
                 setConversations(prev => prev.map(c => c.id === SHARED_CONVERSATION_ID ? {
                    ...c,
                    messages: [...c.messages, aiMessage],
                    lastMessage: aiResponse.aiResponse,
                    timestamp: new Date().toISOString(),
                }:c).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));

            } catch (aiError) {
                console.error("Global MetalAI chat error:", aiError);
            }
        }, 1000);
        return;
    }

    const messagesRef = collection(db, "conversations", conversationId, "messages");
    const conversationRef = doc(db, "conversations", conversationId);
    
    const currentAppDisplayName = appUserProfile?.displayName || user.fullName || user.username || "User";
    const currentUserAvatarUrl = appUserProfile?.photoURL || user.imageUrl;

    const messageData: Partial<Message> & { timestamp: any } = {
        sender: 'user',
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
        messageData.text = ""; 
        displayLastMessage = `${currentAppDisplayName} shared an image`;
    } else if (file) {
      const localUrl = URL.createObjectURL(file); 
      messageData.fileUrl = localUrl; 
      messageData.fileName = file.name;
      messageData.text = ""; 
      if (type === 'audio') { displayLastMessage = `${currentAppDisplayName} sent an audio message`; if (duration) messageData.duration = duration; }
      else if (type === 'video') { displayLastMessage = `${currentAppDisplayName} shared a video`; }
      else if (type === 'image') { displayLastMessage = `${currentAppDisplayName} shared an image`; }
       toast({ title: `Local ${type} Preview`, description: `"${file.name}" is shown locally. File upload needed for sharing.`, duration: 7000 });
    } else if (type !== 'text') {
      toast({ title: "Send Error", description: "Cannot send empty media message.", variant: "destructive"});
      return;
    }
    
    if (!messageData.text && !messageData.fileUrl && type !== 'text') { 
        messageData.text = 'Media Content'; displayLastMessage = `${currentAppDisplayName} shared media`;
    }
    if (type === 'text' && !messageData.text) return;

    try {
      const finalMessageData = { ...messageData };
      if (!finalMessageData.text) finalMessageData.text = "";
      if (!finalMessageData.fileUrl) finalMessageData.fileUrl = null; // Use null for Firestore
      if (!finalMessageData.fileName) finalMessageData.fileName = null;
      if (!finalMessageData.duration) finalMessageData.duration = null;

      await addDoc(messagesRef, finalMessageData);
      await updateDoc(conversationRef, { lastMessage: displayLastMessage, timestamp: serverTimestamp() });
      
      const currentConvo = conversations.find(c => c.id === conversationId);
      if (type === 'text' && finalMessageData.sender === 'user' && currentConvo && !currentConvo.isSelfChat && currentConvo.isGroup) { // Only AI response for group chats for now
        const loadingAiMessageId = `metalai-loading-${Date.now()}`;
         setConversations(prevConvos =>
            prevConvos.map(convo => convo.id === conversationId ? { ...convo, messages: [...convo.messages, { id: loadingAiMessageId, text: "MetalAI is thinking...", sender: 'metalAI', timestamp: new Date().toISOString(), type: 'text', isLoading: true, userId: 'metalAI-bot', userDisplayName: 'MetalAI', userAvatarUrl: 'https://placehold.co/40x40.png?text=AI&bg=accent&fc=accent-foreground'}] } : convo)
          );
        try {
          const chatHistoryForAI = currentConvo?.messages
            .filter(msg => !msg.isLoading && (msg.sender === 'user' || msg.sender === 'metalAI') && msg.type === 'text' && !msg.isDeleted && !msg.deletedForUserIds?.includes(clerkUserId))
            .slice(-10) 
            .map(msg => ({ role: msg.sender === 'user' ? 'user' : 'model' as 'user' | 'model', parts: [{ text: msg.text as string }] })) || [];
          const aiResponse = await metalAIChat({ userInput: text, chatHistory: chatHistoryForAI });
          setConversations(prevConvos => prevConvos.map(convo => convo.id === conversationId ? { ...convo, messages: convo.messages.filter(msg => msg.id !== loadingAiMessageId) } : convo ));
          await addDoc(messagesRef, { text: aiResponse.aiResponse, sender: 'metalAI', type: 'text', timestamp: serverTimestamp(), userId: 'metalAI-bot', userDisplayName: 'MetalAI', userAvatarUrl: 'https://placehold.co/40x40.png?text=AI&bg=accent&fc=accent-foreground', isDeleted: false, deletedForUserIds: [] });
          await updateDoc(conversationRef, { lastMessage: aiResponse.aiResponse, timestamp: serverTimestamp() });
        } catch (aiError) {
          console.error("MetalAI chat error:", aiError);
          toast({ title: "MetalAI Error", description: "MetalAI could not respond.", variant: "destructive" });
          setConversations(prevConvos => prevConvos.map(convo => convo.id === conversationId ? { ...convo, messages: convo.messages.filter(msg => msg.id !== loadingAiMessageId) } : convo ));
          await addDoc(messagesRef, { text: "Sorry, I encountered an error.", sender: 'metalAI', type: 'text', timestamp: serverTimestamp(), userId: 'metalAI-bot', userDisplayName: 'MetalAI', userAvatarUrl: 'https://placehold.co/40x40.png?text=AI&bg=accent&fc=accent-foreground',isDeleted: false, deletedForUserIds: [] });
          await updateDoc(conversationRef, { lastMessage: "Sorry, I encountered an error.", timestamp: serverTimestamp() });
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast({ title: "Send Error", description: `Could not send message. ${error instanceof Error ? error.message : ''}`, variant: "destructive" });
    }
  }, [toast, conversations, clerkUserId, user, appUserProfile]); 

  const handleDeleteMessageForMe = async (conversationId: string, messageId: string) => {
    if (!clerkUserId || conversationId === SHARED_CONVERSATION_ID) return; // No deletion for global chat messages
    
    const messageRef = doc(db, "conversations", conversationId, "messages", messageId);
    const messageDoc = await getDoc(messageRef);
    if (!messageDoc.exists()) return;

    const messageData = messageDoc.data();
    const updatedDeletedForUserIds = Array.isArray(messageData.deletedForUserIds) 
      ? [...messageData.deletedForUserIds, clerkUserId] 
      : [clerkUserId];
    
    await updateDoc(messageRef, { deletedForUserIds: updatedDeletedForUserIds });
    toast({ title: "Message Hidden", description: "The message is hidden in your view."});
  };

  const handleDeleteMessageForEveryone = async (conversationId: string, messageId: string) => {
    if (!conversationId || !messageId || !clerkUserId || conversationId === SHARED_CONVERSATION_ID) return;
    
    const messageRef = doc(db, "conversations", conversationId, "messages", messageId);
    const messageSnap = await getDoc(messageRef);

    if (!messageSnap.exists() || messageSnap.data()?.userId !== clerkUserId) {
        toast({ title: "Deletion Failed", description: "You can only delete your own messages.", variant: "destructive" });
        return;
    }
    try {
      await updateDoc(messageRef, { text: "This message was deleted.", type: "text", fileUrl: null, fileName: null, duration: null, isDeleted: true });
      toast({ title: "Message Deleted", description: "The message has been deleted for everyone."});
      
       const currentConvo = conversations.find(c => c.id === conversationId);
       if (currentConvo) {
         const visibleMessages = currentConvo.messages.filter(m => m.id !== messageId && !m.isDeleted && !m.deletedForUserIds?.includes(clerkUserId));
         const newLastMessageText = visibleMessages.length > 0 ? (visibleMessages[visibleMessages.length - 1].text || "Media Content") : "No messages yet.";
         await updateDoc(doc(db, "conversations", conversationId), { lastMessage: newLastMessageText, timestamp: serverTimestamp() });
       }
    } catch (error) {
      console.error("Error deleting message for everyone:", error);
      toast({ title: "Deletion Error", variant: "destructive" });
    }
  };
  
  // For creating user-named group chats
  const handleCreateNewGroupConversation = async (name: string) => {
    if (!name.trim() || !clerkUserId || !user) {
      toast({ title: "Error", description: "Conversation name cannot be empty or user not identified.", variant: "destructive" });
      return;
    }
    const newConversationId = uuidv4();
    const newConversationRef = doc(db, "conversations", newConversationId);
    
    const currentAppUser = appUserProfile || { displayName: user.fullName || user.username || "User", photoURL: user.imageUrl };
    const creatorDetails: ParticipantDetails = { displayName: currentAppUser.displayName, avatarUrl: currentAppUser.photoURL };

    const newConversationData = {
      id: newConversationId,
      name,
      avatarUrl: `https://placehold.co/100x100.png?text=${name.substring(0,1).toUpperCase()}`,
      dataAiHint: "group chat",
      lastMessage: "Conversation created.",
      timestamp: serverTimestamp(),
      isGroup: true, 
      isSelfChat: false,
      createdBy: clerkUserId,
      createdByName: currentAppUser.displayName,
      members: [clerkUserId], // Creator is the first member
      participantDetails: { [clerkUserId]: creatorDetails },
    };

    try {
      await setDoc(newConversationRef, newConversationData);
      // Client-side update handled by Firestore snapshot listener
      setSelectedConversationId(newConversationId);
      toast({ title: "Conversation Created", description: `"${name}" is ready.` });
    } catch (error) {
      console.error("Error creating group conversation:", error);
      toast({ title: "Creation Error", description: "Could not create group conversation.", variant: "destructive" });
    }
  };

  const handleStartChatWithUser = async (targetUser: SearchedUser) => {
    if (!clerkUserId || !user || !targetUser) {
      toast({ title: "Error", description: "Cannot start chat. User information missing.", variant: "destructive" });
      return;
    }

    // Generate a consistent ID for 1-on-1 chats
    const ids = [clerkUserId, targetUser.id].sort();
    const chatID = ids.join('_');
    const chatDocRef = doc(db, "conversations", chatID);

    try {
        const docSnap = await getDoc(chatDocRef);
        if (docSnap.exists()) {
            // Chat already exists, select it
            setSelectedConversationId(chatID);
            toast({ title: "Chat Opened", description: `Opened existing chat with ${targetUser.username || targetUser.primaryEmailAddress}.`});
        } else {
            // Create new 1-on-1 chat
            const currentUserAppProfile = appUserProfile || { displayName: user.fullName || user.username || "Current User", photoURL: user.imageUrl };
            
            const currentUserDetails: ParticipantDetails = {
                displayName: currentUserAppProfile.displayName,
                avatarUrl: currentUserAppProfile.photoURL || undefined,
            };
            const targetUserDetails: ParticipantDetails = {
                displayName: targetUser.username || targetUser.primaryEmailAddress || "User",
                avatarUrl: targetUser.imageUrl || undefined,
            };

            const newChatData = {
                id: chatID,
                name: `Chat with ${targetUserDetails.displayName}`, // Store a descriptive name
                avatarUrl: targetUserDetails.avatarUrl || `https://placehold.co/100x100.png?text=${targetUserDetails.displayName[0]}`, // Other user's avatar
                lastMessage: "Chat started.",
                timestamp: serverTimestamp(),
                isGroup: false,
                isSelfChat: false,
                createdBy: clerkUserId,
                members: [clerkUserId, targetUser.id],
                participantDetails: {
                    [clerkUserId]: currentUserDetails,
                    [targetUser.id]: targetUserDetails,
                },
            };
            await setDoc(chatDocRef, newChatData);
            setSelectedConversationId(chatID);
            toast({ title: "Chat Started!", description: `You can now chat with ${targetUserDetails.displayName}.`});
        }
        setIsAddFriendDialogOpen(false); // Close dialog
    } catch (error) {
        console.error("Error starting 1-on-1 chat:", error);
        toast({ title: "Chat Error", description: "Could not start or open chat.", variant: "destructive" });
    }
  };


  if (!hasMounted || !isClerkLoaded) {
    return <div className="flex h-screen w-screen items-center justify-center bg-background"><p>Initializing MetalChat...</p></div>;
  }
  if (isClerkLoaded && !isSignedIn) {
    return <div className="flex h-screen w-screen items-center justify-center bg-background"><p>Redirecting to sign-in...</p></div>;
  }
  if (isSignedIn && clerkUserId && localStorage.getItem(`${LOCAL_STORAGE_ONBOARDING_COMPLETE_KEY_PREFIX}${clerkUserId}`) !== 'true') {
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
          onCreateConversation={handleCreateNewGroupConversation} // For creating new group chats
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
              currentUserId={clerkUserId}
              onDeleteMessageForMe={handleDeleteMessageForMe}
              onDeleteMessageForEveryone={handleDeleteMessageForEveryone}
              // For mobile sheet to pass down to ChatHeader within ChatArea
              allConversationsForSheet={conversations}
              onSelectConversationForSheet={handleSelectConversation}
              onCreateConversationForSheet={handleCreateNewGroupConversation}
              onOpenAddFriendDialogForSheet={() => setIsAddFriendDialogOpen(true)}
            />
          </TabsContent>
          <TabsContent value="ideas" className="flex-1 overflow-y-auto p-4">
             <IdeaList ideas={storedIdeas} onDeleteIdea={handleDeleteIdea} />
          </TabsContent>
        </Tabs>
      </div>
      {clerkUserId && (
        <AddFriendDialog 
            isOpen={isAddFriendDialogOpen} 
            onOpenChange={setIsAddFriendDialogOpen}
            onStartChatWithUser={handleStartChatWithUser}
            currentUserId={clerkUserId}
        />
      )}
    </div>
  );
}
